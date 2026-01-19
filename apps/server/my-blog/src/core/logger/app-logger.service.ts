import { Injectable, LoggerService, Scope } from '@nestjs/common';

/**
 * 日志级别
 */
type LogLevel = 'log' | 'error' | 'warn' | 'debug' | 'verbose';

/**
 * 应用日志服务
 * 提供统一的日志接口，支持上下文信息
 */
@Injectable({ scope: Scope.TRANSIENT })
export class AppLogger implements LoggerService {
  private context?: string;

  /**
   * 设置日志上下文
   */
  setContext(context: string): void {
    this.context = context;
  }

  log(message: string, context?: string): void {
    this.printMessage('log', message, context);
  }

  error(message: string, trace?: string, context?: string): void {
    this.printMessage('error', message, context);
    if (trace) {
      console.error(trace);
    }
  }

  warn(message: string, context?: string): void {
    this.printMessage('warn', message, context);
  }

  debug(message: string, context?: string): void {
    this.printMessage('debug', message, context);
  }

  verbose(message: string, context?: string): void {
    this.printMessage('verbose', message, context);
  }

  /**
   * 格式化并输出日志
   */
  private printMessage(level: LogLevel, message: string, context?: string): void {
    const timestamp = new Date().toISOString();
    const ctx = context || this.context || 'Application';
    const formattedMessage = `[${timestamp}] [${level.toUpperCase()}] [${ctx}] ${message}`;

    switch (level) {
      case 'error':
        console.error(formattedMessage);
        break;
      case 'warn':
        console.warn(formattedMessage);
        break;
      case 'debug':
      case 'verbose':
        console.debug(formattedMessage);
        break;
      default:
        console.log(formattedMessage);
    }
  }
}
