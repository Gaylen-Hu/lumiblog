import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * 统一异常响应格式
 */
interface ErrorResponse {
  readonly statusCode: number;
  readonly message: string;
  readonly error: string;
  readonly path: string;
  readonly timestamp: string;
}

/**
 * 全局 HTTP 异常过滤器
 * 统一处理所有 HTTP 异常，返回标准格式
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { statusCode, message, error } = this.extractErrorInfo(exception);

    const errorResponse: ErrorResponse = {
      statusCode,
      message,
      error,
      path: request.url,
      timestamp: new Date().toISOString(),
    };

    this.logException(exception, request, statusCode);

    response.status(statusCode).json(errorResponse);
  }

  /**
   * 提取异常信息
   */
  private extractErrorInfo(exception: unknown): {
    statusCode: number;
    message: string;
    error: string;
  } {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        return {
          statusCode: status,
          message: exceptionResponse,
          error: exception.name,
        };
      }

      const responseObj = exceptionResponse as Record<string, unknown>;
      return {
        statusCode: status,
        message: this.extractMessage(responseObj),
        error: (responseObj.error as string) || exception.name,
      };
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: '服务器内部错误',
      error: 'Internal Server Error',
    };
  }

  /**
   * 提取错误消息
   */
  private extractMessage(responseObj: Record<string, unknown>): string {
    const msg = responseObj.message;
    if (Array.isArray(msg)) {
      return msg.join('; ');
    }
    return (msg as string) || '请求失败';
  }

  /**
   * 记录异常日志
   */
  private logException(
    exception: unknown,
    request: Request,
    statusCode: number,
  ): void {
    const logMessage = `${request.method} ${request.url} - ${statusCode}`;

    if (statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(logMessage, exception instanceof Error ? exception.stack : '');
    } else if (statusCode >= HttpStatus.BAD_REQUEST) {
      this.logger.warn(logMessage);
    }
  }
}
