import { Module, Global } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { HttpExceptionFilter } from './filters';
import { LoggingInterceptor } from './interceptors';
import { LoggerModule } from './logger/logger.module';
import { RequestContextService } from './context';

/**
 * 核心模块
 * 提供全局异常过滤器、日志拦截器、请求上下文等基础设施
 */
@Global()
@Module({
  imports: [LoggerModule],
  providers: [
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    RequestContextService,
  ],
  exports: [RequestContextService],
})
export class CoreModule {}
