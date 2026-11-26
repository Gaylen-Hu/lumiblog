// Acceptance against the built Nest module, over disposable localhost HTTP.
// No AppModule, .env files, database, Redis, external provider or pet checkout.
require('reflect-metadata');
const test = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID, randomBytes } = require('node:crypto');
const { mkdtemp, readFile, rm, access } = require('node:fs/promises');
const { tmpdir } = require('node:os');
const { join, resolve, dirname } = require('node:path');
const { pathToFileURL } = require('node:url');
const { Test } = require('@nestjs/testing');
const { ConfigService } = require('@nestjs/config');
const { Module, VersioningType } = require('@nestjs/common');
const { json } = require('express');
const { CompanionModule } = require('../dist/src/companion/companion.module');
const { PublicModule } = require('../dist/src/public/public.module');
const { PublicService } = require('../dist/src/public/public.service');
class PublicFixtureModule {}
Module({ providers: [{ provide: PublicService, useValue: { getArticleForCompanion: async () => null } }], exports: [PublicService] })(PublicFixtureModule);
const { configureCompanionHttp } = require('../dist/src/companion/companion.http');
const { COMPANION_ENGINE, COMPANION_PREFIX, COMPANION_BODY_LIMIT } = require('../dist/src/companion/companion.constants');

const nativeFetch = globalThis.fetch;
// Even an accidental use of the default model transport cannot incur a charge.
globalThis.fetch = (input, options) => {
  const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
  assert.equal(url.protocol, 'http:', 'Acceptance requests must stay on localhost HTTP');
  assert.equal(url.hostname, '127.0.0.1', 'External network calls are forbidden in this check');
  return nativeFetch(input, options);
};
test.after(() => { globalThis.fetch = nativeFetch; });

const state = { motion: 'idle', mode: 'room', visible: true, paused: false };
const capabilities = { actions: ['paw', 'sit'], moves: [], modes: [], repeat: false };
const configured = {
  CAT_COMPANION_ENABLED: 'true', NODE_ENV: 'dev', CAT_AGENT_PROVIDER: 'deepseek',
  CAT_AGENT_API_KEY: 'acceptance-only-not-a-real-api-key', CAT_AGENT_MODEL: 'acceptance-fixture',
};

function deferred() {
  let resolve, reject;
  const promise = new Promise((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
}

async function within(promise, label, timeoutMs = 2000) {
  let timer;
  try {
    return await Promise.race([promise, new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(label + ' did not complete within ' + timeoutMs + ' ms')), timeoutMs);
      timer.unref();
    })]);
  } finally { clearTimeout(timer); }
}

function modelResponse({ text = '我在这里陪你。', steps } = {}) {
  const frames = [];
  for (const content of [text.slice(0, 2), text.slice(2)]) {
    frames.push({ choices: [{ index: 0, delta: { content }, finish_reason: null }] });
  }
  if (steps) {
    const args = JSON.stringify({ steps });
    frames.push({ choices: [{ index: 0, delta: { tool_calls: [{ index: 0, id: 'call-' + randomUUID(), type: 'function', function: { name: 'control_cat', arguments: '' } }] }, finish_reason: null }] });
    for (const part of [args.slice(0, 7), args.slice(7)]) {
      frames.push({ choices: [{ index: 0, delta: { tool_calls: [{ index: 0, function: { arguments: part } }] }, finish_reason: null }] });
    }
  }
  frames.push({ choices: [{ index: 0, delta: {}, finish_reason: steps ? 'tool_calls' : 'stop' }] });
  const bytes = new TextEncoder().encode(frames.map(frame => 'data: ' + JSON.stringify(frame) + '\n\n').join('') + 'data: [DONE]\n\n');
  return new Response(new ReadableStream({ start(controller) {
    for (let i = 0; i < bytes.length; i += 13) controller.enqueue(bytes.slice(i, i + 13));
    controller.close();
  } }), { headers: { 'content-type': 'text/event-stream' } });
}

async function builtFactory(fetchImpl = async () => modelResponse(), options = {}) {
  const filename = join(__dirname, '../dist/src/companion/runtime/agent-handler.mjs');
  const { createAgentHandler } = await import(pathToFileURL(filename).href);
  return async (env, apiPrefix, resolveArticle) => createAgentHandler({ env, apiPrefix, resolveArticle, fetchImpl, ...options });
}

async function application(t, values = {}, engineFactory) {
  const config = new ConfigService(values);
  // ConfigService normally falls back to process.env. Tests must not pick up
  // private model keys or a configured persistent directory from the host.
  config.skipProcessEnv = true;
  let builder = Test.createTestingModule({ imports: [CompanionModule] })
    .overrideModule(PublicModule).useModule(PublicFixtureModule)
    .overrideProvider(ConfigService).useValue(config);
  if (engineFactory) builder = builder.overrideProvider(COMPANION_ENGINE).useValue(engineFactory);
  const module = await builder.compile();
  const app = module.createNestApplication({ logger: false, bodyParser: false });
  app.getHttpAdapter().getInstance().set('trust proxy', 1);
  configureCompanionHttp(app);
  app.use(json({ limit: '10mb' }));
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1', prefix: 'v' });
  let closePromise;
  const close = () => closePromise ??= app.close();
  t.after(close);
  await app.listen(0, '127.0.0.1');
  const base = 'http://127.0.0.1:' + app.getHttpServer().address().port;
  return {
    app, base, close,
    client({ cookie: initialCookie = '', headers: initialHeaders = {} } = {}) {
      let cookie = initialCookie;
      async function request(route, { method = 'POST', body = {}, headers = {}, signal } = {}) {
        const outgoing = { origin: base, ...initialHeaders, ...(cookie ? { cookie } : {}), ...headers };
        if (method === 'POST' && !('content-type' in outgoing)) outgoing['content-type'] = 'application/json';
        for (const key of Object.keys(outgoing)) if (outgoing[key] === undefined) delete outgoing[key];
        const response = await fetch(base + COMPANION_PREFIX + '/' + route, {
          method, headers: outgoing, signal: signal ?? AbortSignal.timeout(6000),
          ...(method === 'POST' ? { body: typeof body === 'string' ? body : JSON.stringify(body) } : {}),
        });
        const issued = response.headers.get('set-cookie');
        if (issued) cookie = issued.split(';')[0];
        return response;
      }
      return {
        request, get cookie() { return cookie; },
        status: (headers = {}) => request('status', { method: 'GET', headers }),
        post: (route, body, headers = {}) => request(route, { body, headers }),
        async session() {
          const response = await request('sessions');
          assert.equal(response.status, 200, await response.clone().text());
          const data = await response.json();
          assert.match(data.sessionId, /^[a-f\d-]{36}$/i);
          return data.sessionId;
        },
        chat: (sessionId, extra = {}, { signal } = {}) => request('chat', { signal, body: {
          sessionId, turnId: randomUUID(), message: '你好', state, capabilities, ...extra,
        } }),
      };
    },
  };
}

async function ndjson(response) {
  assert.equal(response.status, 200, await response.clone().text());
  assert.match(response.headers.get('content-type'), /^application\/x-ndjson/);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(response.headers.get('x-accel-buffering'), 'no');
  const raw = await response.text();
  assert.ok(!raw.includes(configured.CAT_AGENT_API_KEY));
  return raw.trim().split('\n').filter(Boolean).map(line => JSON.parse(line));
}

test('built Nest module defaults to disabled without initializing an engine', async t => {
  const app = await application(t);
  const client = app.client();
  const status = await client.status();
  assert.equal(status.status, 200);
  assert.equal(status.headers.get('cache-control'), 'no-store');
  assert.equal(status.headers.get('set-cookie'), null);
  assert.deepEqual(Object.assign({}, await status.json(), { message: undefined }), {
    configured: false, code: 'COMPANION_DISABLED', message: undefined,
  });
  const post = await client.post('sessions', {});
  assert.equal(post.status, 503);
  assert.equal((await post.json()).code, 'COMPANION_DISABLED');
});

test('built default dynamic loader finds packaged runtime and creates a real session', async t => {
  // Intentionally no engine override: this catches misplaced/missing .mjs assets.
  const app = await application(t, { CAT_COMPANION_ENABLED: 'true', NODE_ENV: 'dev' });
  const client = app.client();
  const status = await client.status();
  const data = await status.json();
  assert.equal(data.code, undefined, 'Built runtime must load; rebuild before running this check');
  assert.equal(data.configured, false);
  assert.equal(data.provider, 'DeepSeek');
  const id = await client.session();
  assert.match(client.cookie, /^cat-agent-dev=/);
  const unconfigured = await client.chat(id);
  assert.equal(unconfigured.status, 503);
  assert.equal((await unconfigured.json()).code, 'NOT_CONFIGURED');
  assert.equal((await fetch(app.base + '/api/agent/status')).status, 404);
});

test('built HTTP streams NDJSON, scopes actions, pairs real receipts and rejects duplicate turns', async t => {
  let calls = 0, history;
  const steps = [{ kind: 'action', value: 'paw' }];
  const app = await application(t, configured, await builtFactory(async (_url, options) => {
    calls++;
    const body = JSON.parse(options.body); history = body.messages;
    const schema = body.tools[0].function.parameters;
    assert.ok(!schema.properties.steps.items.properties.kind.enum.includes('move'));
    return calls === 1 ? modelResponse({ text: '我这就伸爪。', steps }) : modelResponse();
  }));
  const client = app.client(), id = await client.session(), turnId = randomUUID();
  const frames = await ndjson(await client.chat(id, { turnId, message: '伸爪' }));
  assert.equal(frames[0].type, 'status');
  assert.equal(frames.at(-1).type, 'done');
  const plan = frames.find(frame => frame.type === 'plan');
  assert.deepEqual(plan.steps, steps);
  const duplicate = await client.chat(id, { turnId, message: '伸爪' });
  assert.equal(duplicate.status, 409); assert.equal(calls, 1);
  const receipt = { sessionId: id, turnId, planId: plan.planId,
    results: [{ index: 0, ...steps[0], status: 'succeeded' }], state };
  const result = await client.post('result', receipt);
  assert.equal(result.status, 200); const confirmed = await result.json();
  assert.match(confirmed.reply, /伸爪/);
  assert.deepEqual(await (await client.post('result', receipt)).json(), confirmed);
  assert.equal((await client.post('result', { ...receipt, results: [{ ...receipt.results[0], status: 'blocked' }] })).status, 409);
  const next = await ndjson(await client.chat(id));
  assert.ok(next.some(frame => frame.type === 'text'));
  assert.ok(history.some(message => message.role === 'tool' && message.tool_call_id));
  assert.equal(calls, 2);
});

test('built HTTP rejects unlisted action plans and isolates every visitor operation', async t => {
  let calls = 0;
  const app = await application(t, configured, await builtFactory(async () => {
    calls++; return modelResponse({ steps: [{ kind: 'move', value: 'table' }] });
  }));
  const alice = app.client(), bob = app.client(), id = await alice.session();
  await bob.session(); assert.notEqual(alice.cookie, bob.cookie);
  for (const route of ['chat', 'cancel', 'result', 'clear']) {
    const denied = await bob.post(route, { sessionId: id, turnId: randomUUID(), message: '你好', state, capabilities });
    assert.equal(denied.status, 404); assert.equal((await denied.json()).code, 'SESSION_EXPIRED');
  }
  assert.equal(calls, 0);
  const frames = await ndjson(await alice.chat(id, { message: '到桌子上' }));
  assert.ok(!frames.some(frame => frame.type === 'plan'));
  assert.match(frames.filter(frame => frame.type === 'text').map(frame => frame.delta).join(''), /当前页面暂不支持/);
  assert.equal(calls, 1);
});

test('built HTTP cancellation aborts upstream and leaves the visitor ready for the next turn', async t => {
  const started = deferred(); let calls = 0, aborted = 0;
  const app = await application(t, configured, await builtFactory(async (_url, options) => {
    calls++;
    if (calls > 1) return modelResponse();
    started.resolve();
    return new Promise((_, reject) => options.signal.addEventListener('abort', () => {
      aborted++; reject(options.signal.reason);
    }, { once: true }));
  }));
  const client = app.client(), id = await client.session(), turnId = randomUUID();
  const pending = client.chat(id, { turnId }).then(response => response.text());
  await started.promise;
  const cancelled = await client.post('cancel', { sessionId: id, turnId });
  assert.equal(cancelled.status, 200); assert.equal((await cancelled.json()).cancelled, true);
  assert.ok(!(await pending).includes('"type":"plan"')); assert.equal(aborted, 1);
  const next = await ndjson(await client.chat(id));
  assert.ok(next.some(frame => frame.type === 'text')); assert.equal(calls, 2);
});

test('built HTTP delivers thinking before the model replies and browser disconnect aborts upstream', async t => {
  const upstreamStarted = deferred(), upstreamAborted = deferred();
  let calls = 0, aborted = false;
  const app = await application(t, { ...configured, CAT_AGENT_MODEL_CONCURRENCY_GLOBAL: '1' }, await builtFactory(async (_url, options) => {
    if (++calls > 1) return modelResponse();
    upstreamStarted.resolve();
    // No model response is supplied. Receiving the first HTTP chunk must not
    // depend on provider completion or the handler's returned Promise.
    return new Promise((_, reject) => options.signal.addEventListener('abort', () => {
      aborted = true; upstreamAborted.resolve(); reject(options.signal.reason);
    }, { once: true }));
  }));
  const client = app.client(), id = await client.session(), browser = new AbortController();
  let reader;
  try {
    const response = await within(client.chat(id, {}, { signal: browser.signal }), 'Streaming response headers');
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type'), /^application\/x-ndjson/);
    reader = response.body.getReader();
    const first = await within(reader.read(), 'First thinking chunk');
    assert.equal(first.done, false);
    const chunk = new TextDecoder().decode(first.value);
    assert.deepEqual(chunk.trim().split('\n').map(line => JSON.parse(line)), [{ type: 'status', state: 'thinking' }]);
    await within(upstreamStarted.promise, 'Provider start');
    assert.equal(calls, 1); assert.equal(aborted, false);
    browser.abort();
    await within(upstreamAborted.promise, 'Provider abort after browser disconnect');
    assert.equal(aborted, true);
    await reader.cancel().catch(() => undefined); reader.releaseLock(); reader = undefined;
    const next = await ndjson(await client.chat(id));
    assert.ok(next.some(frame => frame.type === 'text')); assert.equal(calls, 2);
  } finally {
    browser.abort();
    if (reader) { await reader.cancel().catch(() => undefined); reader.releaseLock(); }
  }
});

test('built HTTP timeout emits one terminal error and clears the concurrency slot', async t => {
  let calls = 0;
  const app = await application(t, { ...configured, CAT_AGENT_TIMEOUT_MS: '1000', CAT_AGENT_MODEL_CONCURRENCY_GLOBAL: '1' }, await builtFactory(async (_url, options) => {
    if (++calls > 1) return modelResponse();
    return new Promise((_, reject) => options.signal.addEventListener('abort', () => reject(options.signal.reason), { once: true }));
  }));
  const client = app.client(), id = await client.session();
  const frames = await ndjson(await client.chat(id));
  assert.deepEqual(frames.filter(frame => frame.type === 'error').map(frame => frame.code), ['TIMEOUT']);
  assert.equal(frames.at(-1).type, 'done');
  assert.ok(!frames.some(frame => frame.type === 'plan'));
  assert.ok((await ndjson(await client.chat(id))).some(frame => frame.type === 'text'));
});

test('built HTTP expires sessions while the signed visitor can start a fresh conversation', async t => {
  let now = Date.UTC(2026, 10, 13, 6), calls = 0;
  const app = await application(t, { ...configured, CAT_AGENT_SESSION_TTL_MS: '1000' }, await builtFactory(async () => {
    calls++; return modelResponse();
  }, { now: () => now }));
  const client = app.client(), id = await client.session(), cookie = client.cookie;
  await ndjson(await client.chat(id)); now += 1001;
  const expired = await client.chat(id);
  assert.equal(expired.status, 404); assert.equal((await expired.json()).code, 'SESSION_EXPIRED');
  assert.equal(calls, 1);
  await ndjson(await client.chat(await client.session()));
  assert.equal(client.cookie, cookie); assert.equal(calls, 2);
});

test('built HTTP enforces JSON and 16000 raw bytes before the blog parser including chunked bodies', async t => {
  let calls = 0;
  const app = await application(t, configured, await builtFactory(async () => { calls++; return modelResponse(); }));
  const client = app.client();
  for (const [body, headers, status, code] of [
    ['{}', { 'content-type': 'text/plain' }, 415, 'CONTENT_TYPE'],
    ['{', {}, 400, 'BAD_REQUEST'], ['[]', {}, 400, 'BAD_REQUEST'], ['null', {}, 400, 'BAD_REQUEST'],
    [{ padding: 'x'.repeat(COMPANION_BODY_LIMIT) }, {}, 413, 'BODY_LIMIT'],
    [{ padding: '猫'.repeat(6000) }, {}, 413, 'BODY_LIMIT'],
  ]) {
    const result = await client.post('sessions', body, headers);
    assert.equal(result.status, status); assert.equal((await result.json()).code, code);
  }
  const overhead = Buffer.byteLength(JSON.stringify({ padding: '' }));
  assert.equal((await client.post('sessions', { padding: 'x'.repeat(COMPANION_BODY_LIMIT - overhead) })).status, 200);
  const chunked = new ReadableStream({ start(controller) {
    controller.enqueue(new TextEncoder().encode(' '.repeat(COMPANION_BODY_LIMIT - 1)));
    controller.enqueue(new TextEncoder().encode('{}')); controller.close();
  } });
  const rawLimit = await fetch(app.base + COMPANION_PREFIX + '/sessions', {
    method: 'POST', headers: { origin: app.base, 'content-type': 'application/json' },
    body: chunked, duplex: 'half', signal: AbortSignal.timeout(6000),
  });
  assert.equal(rawLimit.status, 413); assert.equal((await rawLimit.json()).code, 'BODY_LIMIT');
  assert.equal(calls, 0);
});

test('built production mode requires proxy proof and persists the global daily budget across restarts', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'blog-companion-built-'));
  // Resolve and verify the only recursive cleanup target before using rm.
  const target = resolve(directory), temporaryRoot = resolve(tmpdir());
  assert.equal(dirname(target), temporaryRoot);
  assert.ok(target.startsWith(join(temporaryRoot, 'blog-companion-built-')));
  const apps = [];
  t.after(async () => { for (const app of apps) await app.close(); await rm(target, { recursive: true, force: true }); });
  const cookieSecret = randomBytes(48).toString('hex'), proxyToken = randomBytes(48).toString('hex');
  const values = { ...configured, NODE_ENV: 'prod', CAT_AGENT_ALLOWED_ORIGINS: 'https://companion.example',
    CAT_AGENT_COOKIE_SECRET: cookieSecret, CAT_AGENT_PROXY_TOKEN: proxyToken, CAT_AGENT_STATE_DIR: directory,
    CAT_AGENT_MODEL_PER_DAY_GLOBAL: '1' };
  const headers = { origin: 'https://companion.example', 'x-cat-origin': 'https://companion.example',
    'x-cat-proxy-token': proxyToken, 'x-cat-client-ip': '203.0.113.8', 'sec-fetch-site': 'same-origin' };
  let calls = 0;
  const engine = await builtFactory(async () => { calls++; return modelResponse(); });
  const factory = async (env, prefix) => { assert.equal(env.NODE_ENV, 'production'); return engine(env, prefix); };
  const first = await application(t, values, factory); apps.push(first);
  const client = first.client({ headers });
  const status = await client.status({ origin: undefined });
  assert.equal(status.status, 200); assert.equal((await status.json()).configured, true);
  assert.equal(status.headers.get('set-cookie'), null);
  for (const bad of [
    { 'x-cat-proxy-token': undefined }, { origin: 'https://evil.example' },
    { 'x-cat-client-ip': '203.0.113.8, 127.0.0.1' }, { 'x-cat-client-ip': undefined, 'x-forwarded-for': '203.0.113.8' },
  ]) assert.equal((await client.post('sessions', {}, bad)).status, 403);
  const id = await client.session(); assert.match(client.cookie, /^__Host-cat-agent=/);
  await ndjson(await client.chat(id)); assert.equal(calls, 1);
  await first.close();
  await assert.rejects(access(join(directory, 'security.lock')), { code: 'ENOENT' });
  const second = await application(t, values, factory); apps.push(second);
  const fresh = second.client({ headers: { ...headers, 'x-cat-client-ip': '203.0.113.9' } });
  const newId = await fresh.session(); assert.notEqual(fresh.cookie, client.cookie);
  const limited = await fresh.chat(newId);
  assert.equal(limited.status, 429); assert.equal((await limited.json()).code, 'RATE_LIMITED');
  assert.ok(Number(limited.headers.get('retry-after')) > 0); assert.equal(calls, 1);
  const persisted = await readFile(join(directory, 'security-ledger.json'), 'utf8');
  for (const privateValue of [cookieSecret, proxyToken, configured.CAT_AGENT_API_KEY, '203.0.113.8', '203.0.113.9']) assert.ok(!persisted.includes(privateValue));
  assert.equal(JSON.parse(persisted).counters['day:g:all'].count, 1);
});

test('built production configuration fails closed without disabling the module HTTP status', async t => {
  const app = await application(t, { ...configured, NODE_ENV: 'prod' });
  const client = app.client();
  const status = await client.status();
  assert.equal(status.status, 200);
  const body = await status.json();
  assert.equal(body.configured, false); assert.equal(body.code, 'COMPANION_UNAVAILABLE');
  assert.ok(!JSON.stringify(body).includes(configured.CAT_AGENT_API_KEY));
  const post = await client.post('sessions', {});
  assert.equal(post.status, 503); assert.equal((await post.json()).code, 'COMPANION_UNAVAILABLE');
});
