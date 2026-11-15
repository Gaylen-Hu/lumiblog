import type { INestApplication } from '@nestjs/common';
import { json } from 'express';
import type {
  Request,
  Response,
  NextFunction,
  ErrorRequestHandler,
} from 'express';
import { COMPANION_BODY_LIMIT, COMPANION_PREFIX } from './companion.constants';

// Must be registered before the blog's general-purpose 10 MB article parser.
// Parse once, and preserve machine-readable errors for the portable cat client.
export function configureCompanionHttp(app: INestApplication): void {
  const parser = json({ limit: COMPANION_BODY_LIMIT, strict: true });
  const failure = (
    res: Response,
    status: number,
    code: string,
    message: string,
  ) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.status(status).json({ code, message, error: { code, message } });
  };
  const contentType = (req: Request, res: Response, next: NextFunction) => {
    if (req.method === 'POST' && !req.is('application/json')) {
      failure(res, 415, 'CONTENT_TYPE', '请使用 JSON 请求。');
      return;
    }
    next();
  };
  const parseError: ErrorRequestHandler = (error: unknown, _req, res, next) => {
    if (!error || typeof error !== 'object') {
      next(error);
      return;
    }
    const kind = 'type' in error ? error.type : undefined;
    if (kind === 'entity.too.large') {
      failure(res, 413, 'BODY_LIMIT', '这条消息太长了。');
    } else {
      failure(res, 400, 'BAD_REQUEST', '请求格式不正确。');
    }
  };
  app.use(COMPANION_PREFIX, contentType, parser, parseError);
}
