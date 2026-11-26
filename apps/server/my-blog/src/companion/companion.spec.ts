import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { Module, VersioningType, type INestApplication } from '@nestjs/common';
import { json } from 'express';
import type { Server } from 'node:http';
import request, { type Response } from 'supertest';
import { CompanionModule } from './companion.module';
import { COMPANION_ENGINE, COMPANION_PREFIX } from './companion.constants';
import type {
  CompanionEngineFactory,
  CompanionHandler,
} from './companion.engine';
import { configureCompanionHttp } from './companion.http';
import { PublicModule } from '../public/public.module';
import { PublicService } from '../public/public.service';

type HandlerRun = (
  ...args: Parameters<CompanionHandler>
) => ReturnType<CompanionHandler>;

function makeHandler(run?: HandlerRun) {
  return Object.assign(
    jest.fn<ReturnType<HandlerRun>, Parameters<HandlerRun>>(
      run ??
        ((_req, res) => {
          res.json({ ok: true });
          return Promise.resolve(true);
        }),
    ),
    {
      ready: Promise.resolve(),
      close: jest.fn<Promise<void>, []>().mockResolvedValue(undefined),
    },
  );
}

function makeFactory(handler = makeHandler()) {
  return jest
    .fn<
      ReturnType<CompanionEngineFactory>,
      Parameters<CompanionEngineFactory>
    >()
    .mockResolvedValue(handler);
}

function typedServer(app: INestApplication<Server>): Server {
  return app.getHttpServer();
}

function parseObject(text: string): Record<string, unknown> {
  const value: unknown = JSON.parse(text);
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Expected a JSON object');
  }
  return value as Record<string, unknown>;
}

function responseBody(response: Response): Record<string, unknown> {
  return parseObject(response.text);
}

async function application(
  values: Record<string, string> = {},
  factory = makeFactory(),
  resolveArticle = jest.fn().mockResolvedValue(null),
) {
  const config = new ConfigService(values);
  // ConfigModule normally sets this accessor; isolate fixtures from host secrets.
  Reflect.set(config, 'skipProcessEnv', true);
  @Module({
    providers: [
      {
        provide: PublicService,
        useValue: { getArticleForCompanion: resolveArticle },
      },
    ],
    exports: [PublicService],
  })
  class PublicFixtureModule {}
  const module = await Test.createTestingModule({ imports: [CompanionModule] })
    .overrideModule(PublicModule)
    .useModule(PublicFixtureModule)
    .overrideProvider(ConfigService)
    .useValue(config)
    .overrideProvider(COMPANION_ENGINE)
    .useValue(factory)
    .compile();
  const app = module.createNestApplication<INestApplication<Server>>({
    logger: false,
    bodyParser: false,
  });
  configureCompanionHttp(app);
  app.use(json({ limit: '10mb' }));
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
  await app.init();
  return { app, factory };
}

describe('website CompanionModule', () => {
  let app: INestApplication<Server> | undefined;
  afterEach(async () => {
    await app?.close();
    app = undefined;
  });

  it('is disabled by default and does not initialize private storage or a model', async () => {
    const result = await application();
    app = result.app;
    const status = await request(typedServer(app)).get(
      COMPANION_PREFIX + '/status',
    );
    expect(status.status).toBe(200);
    expect(responseBody(status)).toMatchObject({
      configured: false,
      code: 'COMPANION_DISABLED',
    });
    expect(status.headers['cache-control']).toBe('no-store');
    expect(result.factory).not.toHaveBeenCalled();
    const session = await request(typedServer(app))
      .post(COMPANION_PREFIX + '/sessions')
      .send({});
    expect(session.status).toBe(503);
    expect(responseBody(session).code).toBe('COMPANION_DISABLED');
  });

  it.each(['chat', 'sessions', 'result', 'cancel', 'clear'])(
    'registers POST %s in the existing URI-versioned API',
    async (endpoint) => {
      const handler = makeHandler((req, res) => {
        const received: unknown = req.body;
        res.json({ path: req.path, received });
        return Promise.resolve(true);
      });
      const result = await application(
        { CAT_COMPANION_ENABLED: 'true' },
        makeFactory(handler),
      );
      app = result.app;
      const response = await request(typedServer(app))
        .post(COMPANION_PREFIX + '/' + endpoint)
        .send({ test: 'parsed once' });
      expect(response.status).toBe(200);
      expect(responseBody(response)).toEqual({
        path: COMPANION_PREFIX + '/' + endpoint,
        received: { test: 'parsed once' },
      });
    },
  );

  it('passes explicit cat settings only and maps the website prod mode safely', async () => {
    const result = await application({
      CAT_COMPANION_ENABLED: 'true',
      NODE_ENV: 'prod',
      CAT_AGENT_MODEL: 'fixture',
      CAT_AGENT_COOKIE_SECRET: 'cookie-fixture',
      ANTHROPIC_API_KEY: 'unrelated',
      DATABASE_URL: 'unrelated',
    });
    app = result.app;
    expect(result.factory).toHaveBeenCalledWith(
      {
        NODE_ENV: 'production',
        CAT_AGENT_PROVIDER: 'deepseek',
        CAT_AGENT_MODEL: 'fixture',
        CAT_AGENT_COOKIE_SECRET: 'cookie-fixture',
      },
      COMPANION_PREFIX,
      expect.any(Function),
    );
  });

  it('injects only the read-only public article resolver into the runtime', async () => {
    const article = {
      slug: 'sample',
      locale: 'zh' as const,
      title: '公开文章',
      content: '已发布正文',
    };
    const resolveArticle = jest.fn().mockResolvedValue(article);
    const result = await application(
      { CAT_COMPANION_ENABLED: 'true' },
      makeFactory(),
      resolveArticle,
    );
    app = result.app;
    const resolver = result.factory.mock.calls[0][2];
    expect(resolver).toBeDefined();
    await expect(resolver!({ slug: 'sample', locale: 'zh' })).resolves.toEqual(
      article,
    );
    expect(resolveArticle).toHaveBeenCalledWith('sample', 'zh');
  });

  it('bad configuration makes only companion unavailable, without exposing the error', async () => {
    const result = await application(
      { CAT_COMPANION_ENABLED: 'true' },
      makeFactory().mockRejectedValue(Error('private-key-and-path')),
    );
    app = result.app;
    const response = await request(typedServer(app)).get(
      COMPANION_PREFIX + '/status',
    );
    expect(responseBody(response).code).toBe('COMPANION_UNAVAILABLE');
    expect(response.text).not.toContain('private-key');
  });

  it('invalid feature flag is not silently enabled', async () => {
    const result = await application({ CAT_COMPANION_ENABLED: 'yes' });
    app = result.app;
    expect(result.factory).not.toHaveBeenCalled();
    const response = await request(typedServer(app)).get(
      COMPANION_PREFIX + '/status',
    );
    expect(responseBody(response).code).toBe('COMPANION_UNAVAILABLE');
  });

  it('rejects an unsupported provider without loading the engine', async () => {
    const result = await application({
      CAT_COMPANION_ENABLED: 'true',
      CAT_AGENT_PROVIDER: 'deepseak',
    });
    app = result.app;
    expect(result.factory).not.toHaveBeenCalled();
    const response = await request(typedServer(app)).get(
      COMPANION_PREFIX + '/status',
    );
    expect(responseBody(response)).toMatchObject({
      configured: false,
      code: 'COMPANION_UNAVAILABLE',
    });
  });

  it('closes the candidate when security initialization fails', async () => {
    const handler = makeHandler();
    handler.ready = Promise.reject(Error('private ledger'));
    handler.ready.catch(() => undefined);
    const result = await application(
      { CAT_COMPANION_ENABLED: 'true' },
      makeFactory(handler),
    );
    app = result.app;
    expect(handler.close).toHaveBeenCalledTimes(1);
    const response = await request(typedServer(app)).get(
      COMPANION_PREFIX + '/status',
    );
    expect(responseBody(response).configured).toBe(false);
  });

  it('enforces 16,000 bytes before the blog 10 MB parser and preserves error codes', async () => {
    const handler = makeHandler();
    const result = await application(
      { CAT_COMPANION_ENABLED: 'true' },
      makeFactory(handler),
    );
    app = result.app;
    const response = await request(typedServer(app))
      .post(COMPANION_PREFIX + '/chat')
      .send({ message: 'x'.repeat(16000) });
    expect(response.status).toBe(413);
    expect(responseBody(response).code).toBe('BODY_LIMIT');
    expect(handler).not.toHaveBeenCalled();
  });

  it('rejects non-JSON and malformed JSON before engine execution', async () => {
    const handler = makeHandler();
    const result = await application(
      { CAT_COMPANION_ENABLED: 'true' },
      makeFactory(handler),
    );
    app = result.app;
    const type = await request(typedServer(app))
      .post(COMPANION_PREFIX + '/chat')
      .type('text')
      .send('hello');
    expect(type.status).toBe(415);
    expect(responseBody(type).code).toBe('CONTENT_TYPE');
    const malformed = await request(typedServer(app))
      .post(COMPANION_PREFIX + '/chat')
      .type('json')
      .send('{');
    expect(malformed.status).toBe(400);
    expect(responseBody(malformed).code).toBe('BAD_REQUEST');
    expect(handler).not.toHaveBeenCalled();
  });

  it('keeps NDJSON unwrapped and terminates an unexpected post-header failure safely', async () => {
    const handler = makeHandler((_req, res) => {
      res.setHeader('content-type', 'application/x-ndjson');
      res.write('{"type":"status","state":"thinking"}\n');
      return Promise.reject(Error('upstream-secret'));
    });
    const result = await application(
      { CAT_COMPANION_ENABLED: 'true' },
      makeFactory(handler),
    );
    app = result.app;
    const response = await request(typedServer(app))
      .post(COMPANION_PREFIX + '/chat')
      .send({});
    expect(response.status).toBe(200);
    expect(response.text).not.toContain('upstream-secret');
    expect(
      response.text
        .trim()
        .split('\n')
        .map((line) => parseObject(line).type),
    ).toEqual(['status', 'error', 'done']);
  });

  it('sanitizes pre-header failures and closes the engine with Nest lifecycle', async () => {
    const handler = makeHandler(() =>
      Promise.reject(Error('private-provider-key')),
    );
    const result = await application(
      { CAT_COMPANION_ENABLED: 'true' },
      makeFactory(handler),
    );
    app = result.app;
    const response = await request(typedServer(app))
      .post(COMPANION_PREFIX + '/chat')
      .send({});
    expect(response.status).toBe(503);
    expect(response.text).not.toContain('private-provider');
    await app.close();
    app = undefined;
    expect(handler.close).toHaveBeenCalledTimes(1);
  });
});
