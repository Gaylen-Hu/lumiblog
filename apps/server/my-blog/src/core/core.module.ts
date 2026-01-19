import { Module, Global } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { HttpExceptionFilter } from './filters';
import { LoggingInterceptor } from './interceptors';
import { AppLogger } from './logger';
import { RequestContextService } from './context';

/**
 * 核心模块
 * 提供全局异常过滤器、日志拦截器、请求上下文等基础设施
 */
@Global()
@Module({
  providers: [
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    AppLogger,
    RequestContextService,
  ],
  exports: [AppLogger, RequestContextService],
})
export class CoreModule {}
