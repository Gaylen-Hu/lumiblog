import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PublicService } from '../public/public.service';
import type { Request, Response } from 'express';
import {
  COMPANION_CONFIG_KEYS,
  COMPANION_ENGINE,
  COMPANION_PREFIX,
} from './companion.constants';
import type {
  CompanionEngineFactory,
  CompanionEnvironment,
  CompanionHandler,
} from './companion.engine';

@Injectable()
export class CompanionService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CompanionService.name);
  private handler?: CompanionHandler;
  private unavailable = false;
  private stopping = false;

  constructor(
    private readonly config: ConfigService,
    @Inject(COMPANION_ENGINE)
    private readonly createEngine: CompanionEngineFactory,
    private readonly publicService: PublicService,
  ) {}

  async onModuleInit(): Promise<void> {
    const enabled = this.config.get<string>('CAT_COMPANION_ENABLED', 'false');
    if (enabled === 'false') return;
    if (enabled !== 'true') {
      this.unavailable = true;
      this.logger.warn('Companion disabled: invalid feature configuration');
      return;
    }
    const env: CompanionEnvironment = {};
    const mode = this.config.get<string>('NODE_ENV', 'dev');
    env.NODE_ENV = ['prod', 'production'].includes(mode)
      ? 'production'
      : 'development';
    for (const key of COMPANION_CONFIG_KEYS) {
      const value = this.config.get<string>(key);
      if (value !== undefined) env[key] = String(value);
    }
    env.CAT_AGENT_PROVIDER ??= 'deepseek';
    let candidate: CompanionHandler | undefined;
    try {
      if (!['deepseek', 'anthropic'].includes(env.CAT_AGENT_PROVIDER)) {
        throw new Error('Unsupported companion provider');
      }
      candidate = await this.createEngine(
        env,
        COMPANION_PREFIX,
        ({ slug, locale }) =>
          this.publicService.getArticleForCompanion(slug, locale),
      );
      await candidate.ready;
      if (this.stopping) await candidate.close();
      else this.handler = candidate;
    } catch {
      this.unavailable = true;
      await candidate?.close().catch(() => undefined);
      // Optional companion failure must neither expose keys nor take the blog down.
      this.logger.warn(
        'Companion unavailable: check private configuration and storage',
      );
    }
  }

  async handle(request: Request, response: Response): Promise<void> {
    if (response.destroyed || response.writableEnded) return;
    if (!this.handler || this.stopping) {
      const code = this.unavailable
        ? 'COMPANION_UNAVAILABLE'
        : this.stopping
          ? 'SERVICE_STOPPING'
          : 'COMPANION_DISABLED';
      const message = '聊天服务暂未开启，小灰的本地动作仍可使用。';
      response.setHeader('Cache-Control', 'no-store');
      response.setHeader('X-Content-Type-Options', 'nosniff');
      if (request.method === 'GET') {
        response.status(200).json({ configured: false, code, message });
      } else {
        response.status(503).json({ code, message, error: { code, message } });
      }
      return;
    }
    try {
      const handled = await this.handler(request, response);
      if (!handled && !response.headersSent) {
        response
          .status(404)
          .json({ code: 'NOT_FOUND', message: '接口不存在。' });
      }
    } catch {
      // After the first stream frame never pass errors to the global JSON filter.
      this.logger.warn('Companion request failed');
      if (response.destroyed || response.writableEnded) return;
      const error = {
        code: 'COMPANION_UNAVAILABLE',
        message: '聊天暂时不可用，请稍后重试。',
      };
      if (response.headersSent) {
        if (String(response.getHeader('content-type')).includes('ndjson')) {
          response.write(JSON.stringify({ type: 'error', ...error }) + '\n');
          response.write('{"type":"done"}\n');
        }
        response.end();
      } else {
        response.setHeader('Cache-Control', 'no-store');
        response.status(503).json({ ...error, error });
      }
    }
  }

  async onModuleDestroy(): Promise<void> {
    this.stopping = true;
    await this.handler?.close();
    this.handler = undefined;
  }
}
