import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';
import { StructuredLogger } from '../logger/structured-logger.service';

/**
 * 全局日志拦截器
 * 记录请求和响应的结构化日志信息
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: StructuredLogger) {
    this.logger.setContext(LoggingInterceptor.name);
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const httpCtx = context.switchToHttp();
    const request = httpCtx.getRequest<Request>();
    const { method, url } = request;
    const startTime = Date.now();

    return next.handle().pipe(
      tap(() => {
        const response = httpCtx.getResponse<Response>();
        const statusCode: number = response.statusCode;
        const duration: number = Date.now() - startTime;

        this.logger.log('HTTP request completed', {
          method,
          url,
          statusCode,
          duration,
        });
      }),
    );
  }
}
