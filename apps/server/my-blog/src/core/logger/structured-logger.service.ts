import { Injectable, LoggerService, Scope } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';

/**
 * Structured logger service wrapping PinoLogger from nestjs-pino.
 * Drop-in replacement for AppLogger — implements NestJS LoggerService
 * and maps NestJS log levels to pino levels (verbose → trace, log → info).
 */
@Injectable({ scope: Scope.TRANSIENT })
export class StructuredLogger implements LoggerService {
  private context = '';

  constructor(private readonly pino: PinoLogger) {}

  /**
   * Set the logging context (source module/class name).
   */
  setContext(context: string): void {
    this.context = context;
    this.pino.setContext(context);
  }

  /**
   * Create a child logger with additional bound metadata.
   * Every log entry from the child includes the bound fields.
   */
  child(bindings: Record<string, unknown>): StructuredLogger {
    const childPino = Object.create(this.pino) as PinoLogger;
    const parentLogger = this.pino.logger;
    const childLogger = parentLogger.child(bindings);

    Object.defineProperty(childPino, 'logger', { get: () => childLogger });

    const child = new StructuredLogger(childPino);
    if (this.context) {
      child.setContext(this.context);
    }
    return child;
  }

  /**
   * NestJS `log` level → pino `info`.
   */
  log(message: string, ...optionalParams: unknown[]): void {
    const { ctx, extra } = this.extractContextAndExtra(optionalParams);
    if (ctx) this.pino.setContext(ctx);
    if (extra) {
      this.pino.info(extra, message);
    } else {
      this.pino.info(message);
    }
    if (ctx) this.restoreContext();
  }

  /**
   * NestJS `error` level → pino `error`.
   * Handles overloads:
   *  - error(message: string)
   *  - error(message: string, stackOrContext?: string)
   *  - error(message: string, error?: Error, context?: string)
   *  - error(message: string, ...optionalParams: unknown[])
   */
  error(message: string, ...optionalParams: unknown[]): void {
    if (optionalParams.length === 0) {
      this.pino.error(message);
      return;
    }

    const first = optionalParams[0];
    const second = optionalParams[1];

    // error(message, Error, context?)
    if (first instanceof Error) {
      const ctx = typeof second === 'string' ? second : undefined;
      if (ctx) this.pino.setContext(ctx);
      this.pino.error({ err: first, stack: first.stack }, message);
      if (ctx) this.restoreContext();
      return;
    }

    // error(message, stackOrContext) — single string param
    if (typeof first === 'string' && optionalParams.length === 1) {
      // NestJS convention: last string param is context
      this.pino.setContext(first);
      this.pino.error(message);
      this.restoreContext();
      return;
    }

    // error(message, ...optionalParams) — generic fallback
    const { ctx, extra } = this.extractContextAndExtra(optionalParams);
    if (ctx) this.pino.setContext(ctx);
    if (extra) {
      this.pino.error(extra, message);
    } else {
      this.pino.error(message);
    }
    if (ctx) this.restoreContext();
  }

  /**
   * NestJS `warn` level → pino `warn`.
   */
  warn(message: string, ...optionalParams: unknown[]): void {
    const { ctx, extra } = this.extractContextAndExtra(optionalParams);
    if (ctx) this.pino.setContext(ctx);
    if (extra) {
      this.pino.warn(extra, message);
    } else {
      this.pino.warn(message);
    }
    if (ctx) this.restoreContext();
  }

  /**
   * NestJS `debug` level → pino `debug`.
   */
  debug(message: string, ...optionalParams: unknown[]): void {
    const { ctx, extra } = this.extractContextAndExtra(optionalParams);
    if (ctx) this.pino.setContext(ctx);
    if (extra) {
      this.pino.debug(extra, message);
    } else {
      this.pino.debug(message);
    }
    if (ctx) this.restoreContext();
  }

  /**
   * NestJS `verbose` level → pino `trace`.
   */
  verbose(message: string, ...optionalParams: unknown[]): void {
    const { ctx, extra } = this.extractContextAndExtra(optionalParams);
    if (ctx) this.pino.setContext(ctx);
    if (extra) {
      this.pino.trace(extra, message);
    } else {
      this.pino.trace(message);
    }
    if (ctx) this.restoreContext();
  }

  /**
   * Extract context string and extra metadata from optionalParams.
   * NestJS convention: the last string argument is the context.
   */
  private extractContextAndExtra(
    optionalParams: unknown[],
  ): { ctx: string | undefined; extra: Record<string, unknown> | undefined } {
    if (optionalParams.length === 0) {
      return { ctx: undefined, extra: undefined };
    }

    let ctx: string | undefined;
    let params = optionalParams;

    // Last string param is treated as context (NestJS convention)
    const last = optionalParams[optionalParams.length - 1];
    if (typeof last === 'string') {
      ctx = last;
      params = optionalParams.slice(0, -1);
    }

    // If remaining params contain an object, use it as extra metadata
    if (params.length === 1 && typeof params[0] === 'object' && params[0] !== null) {
      return { ctx, extra: params[0] as Record<string, unknown> };
    }

    return { ctx, extra: undefined };
  }

  /**
   * Restore the original context after a temporary override.
   */
  private restoreContext(): void {
    this.pino.setContext(this.context);
  }
}
