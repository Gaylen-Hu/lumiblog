import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';
import { StructuredLogger } from './structured-logger.service';

/** Valid pino log levels */
const VALID_LOG_LEVELS = new Set([
  'fatal',
  'error',
  'warn',
  'info',
  'debug',
  'trace',
]);

/** Keys reserved for base log entry fields — must not be overwritten by metadata */
const RESERVED_LOG_KEYS = new Set(['level', 'timestamp', 'context', 'msg']);

/**
 * Resolve the effective log level.
 * Falls back to environment default when the provided value is invalid.
 */
function resolveLogLevel(
  rawLevel: string | undefined,
  isProd: boolean,
): string {
  const envDefault = isProd ? 'info' : 'debug';
  if (!rawLevel) return envDefault;
  return VALID_LOG_LEVELS.has(rawLevel) ? rawLevel : envDefault;
}

@Module({
  imports: [
    PinoLoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const nodeEnv = config.get<string>('NODE_ENV', 'dev');
        const isProd = nodeEnv === 'prod';
        const level = resolveLogLevel(
          config.get<string>('LOG_LEVEL'),
          isProd,
        );

        return {
          pinoHttp: {
            level,
            transport: isProd
              ? undefined
              : {
                  target: 'pino-pretty',
                  options: { colorize: true, singleLine: true },
                },
            formatters: {
              level: (label: string) => ({ level: label }),
              log: (obj: Record<string, unknown>) => {
                const sanitized: Record<string, unknown> = {};
                for (const key of Object.keys(obj)) {
                  if (!RESERVED_LOG_KEYS.has(key)) {
                    sanitized[key] = obj[key];
                  }
                }
                return sanitized;
              },
            },
            timestamp: () =>
              `,"timestamp":"${new Date().toISOString()}"`,
            serializers: {
              req: (req: Record<string, unknown>) => ({
                method: req.method,
                url: req.url,
              }),
              res: (res: Record<string, unknown>) => ({
                statusCode: res.statusCode,
              }),
            },
          },
        };
      },
    }),
  ],
  providers: [StructuredLogger],
  exports: [StructuredLogger, PinoLoggerModule],
})
export class LoggerModule {}
