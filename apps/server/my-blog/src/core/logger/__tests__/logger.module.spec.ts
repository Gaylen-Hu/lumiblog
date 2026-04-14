import { ConfigService } from '@nestjs/config';
import { LoggerModule } from '../logger.module';

/**
 * Unit tests for LoggerModule configuration.
 *
 * Tests the useFactory behavior by extracting it from the module metadata
 * and invoking it with a mock ConfigService.
 *
 * _Requirements: 1.1, 1.2, 1.3, 4.1, 4.2, 4.4_
 */
describe('LoggerModule', () => {
  /**
   * Extract the useFactory function from LoggerModule's import metadata.
   * The module uses PinoLoggerModule.forRootAsync({ useFactory, inject })
   * which is stored in the module's imports array.
   */
  function getUseFactory(): (config: ConfigService) => Record<string, unknown> {
    // Reflect module metadata to get the imports array
    const imports = Reflect.getMetadata('imports', LoggerModule) as Array<{
      module?: unknown;
      providers?: Array<{ useFactory?: (...args: unknown[]) => unknown }>;
    }>;

    // The PinoLoggerModule.forRootAsync result is a dynamic module
    // with providers that contain the useFactory
    for (const imp of imports) {
      if (imp.providers) {
        for (const provider of imp.providers) {
          if (typeof provider.useFactory === 'function') {
            return provider.useFactory as (config: ConfigService) => Record<string, unknown>;
          }
        }
      }
    }

    throw new Error('Could not find useFactory in LoggerModule imports');
  }

  /**
   * Create a mock ConfigService that returns values from the given map.
   */
  function createMockConfig(values: Record<string, string | undefined>): ConfigService {
    return {
      get: jest.fn((key: string, defaultValue?: string) => {
        const val = values[key];
        return val !== undefined ? val : defaultValue;
      }),
    } as unknown as ConfigService;
  }

  /**
   * Helper to extract pinoHttp config from the factory result.
   */
  function getPinoHttpConfig(
    envValues: Record<string, string | undefined>,
  ): Record<string, unknown> {
    const factory = getUseFactory();
    const config = createMockConfig(envValues);
    const result = factory(config) as { pinoHttp: Record<string, unknown> };
    return result.pinoHttp;
  }

  describe('dev mode transport selection (Req 1.2)', () => {
    it('should configure pino-pretty transport when NODE_ENV=dev', () => {
      const pinoHttp = getPinoHttpConfig({ NODE_ENV: 'dev' });

      expect(pinoHttp.transport).toBeDefined();
      const transport = pinoHttp.transport as { target: string; options: Record<string, unknown> };
      expect(transport.target).toBe('pino-pretty');
      expect(transport.options).toEqual(
        expect.objectContaining({ colorize: true, singleLine: true }),
      );
    });

    it('should configure pino-pretty transport when NODE_ENV is not set (defaults to dev)', () => {
      const pinoHttp = getPinoHttpConfig({});

      expect(pinoHttp.transport).toBeDefined();
      const transport = pinoHttp.transport as { target: string };
      expect(transport.target).toBe('pino-pretty');
    });
  });

  describe('prod mode transport (Req 1.1)', () => {
    it('should not configure pino-pretty transport when NODE_ENV=prod', () => {
      const pinoHttp = getPinoHttpConfig({ NODE_ENV: 'prod' });

      expect(pinoHttp.transport).toBeUndefined();
    });
  });

  describe('format determined at startup (Req 1.3)', () => {
    it('should return a static config object (transport set once, not re-evaluated)', () => {
      const factory = getUseFactory();
      const config = createMockConfig({ NODE_ENV: 'prod' });

      const result1 = factory(config) as { pinoHttp: Record<string, unknown> };
      const result2 = factory(config) as { pinoHttp: Record<string, unknown> };

      // Both calls produce the same structure — transport is determined by the factory call
      expect(result1.pinoHttp.transport).toBeUndefined();
      expect(result2.pinoHttp.transport).toBeUndefined();
    });
  });

  describe('default log levels (Req 4.2)', () => {
    it('should default to "info" level in prod when LOG_LEVEL is not set', () => {
      const pinoHttp = getPinoHttpConfig({ NODE_ENV: 'prod' });

      expect(pinoHttp.level).toBe('info');
    });

    it('should default to "debug" level in dev when LOG_LEVEL is not set', () => {
      const pinoHttp = getPinoHttpConfig({ NODE_ENV: 'dev' });

      expect(pinoHttp.level).toBe('debug');
    });

    it('should default to "debug" level when NODE_ENV is not set', () => {
      const pinoHttp = getPinoHttpConfig({});

      expect(pinoHttp.level).toBe('debug');
    });
  });

  describe('valid LOG_LEVEL values (Req 4.1, 4.4)', () => {
    const validLevels = ['fatal', 'error', 'warn', 'info', 'debug', 'trace'];

    it.each(validLevels)(
      'should accept LOG_LEVEL="%s" in prod mode',
      (level: string) => {
        const pinoHttp = getPinoHttpConfig({ NODE_ENV: 'prod', LOG_LEVEL: level });

        expect(pinoHttp.level).toBe(level);
      },
    );

    it.each(validLevels)(
      'should accept LOG_LEVEL="%s" in dev mode',
      (level: string) => {
        const pinoHttp = getPinoHttpConfig({ NODE_ENV: 'dev', LOG_LEVEL: level });

        expect(pinoHttp.level).toBe(level);
      },
    );

    it('should fall back to env default when LOG_LEVEL is invalid in prod', () => {
      const pinoHttp = getPinoHttpConfig({ NODE_ENV: 'prod', LOG_LEVEL: 'invalid' });

      expect(pinoHttp.level).toBe('info');
    });

    it('should fall back to env default when LOG_LEVEL is invalid in dev', () => {
      const pinoHttp = getPinoHttpConfig({ NODE_ENV: 'dev', LOG_LEVEL: 'invalid' });

      expect(pinoHttp.level).toBe('debug');
    });
  });

  describe('formatters configuration', () => {
    it('should configure level formatter to output label string', () => {
      const pinoHttp = getPinoHttpConfig({ NODE_ENV: 'prod' });
      const formatters = pinoHttp.formatters as { level: (label: string) => Record<string, string> };

      expect(formatters.level('info')).toEqual({ level: 'info' });
      expect(formatters.level('error')).toEqual({ level: 'error' });
    });

    it('should configure ISO 8601 timestamp', () => {
      const pinoHttp = getPinoHttpConfig({ NODE_ENV: 'prod' });
      const timestampFn = pinoHttp.timestamp as () => string;

      const result = timestampFn();
      // Should produce ,"timestamp":"<ISO string>"
      expect(result).toMatch(/^,"timestamp":"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });

  describe('serializers configuration', () => {
    it('should serialize req to { method, url }', () => {
      const pinoHttp = getPinoHttpConfig({ NODE_ENV: 'prod' });
      const serializers = pinoHttp.serializers as {
        req: (req: Record<string, unknown>) => Record<string, unknown>;
      };

      const result = serializers.req({
        method: 'GET',
        url: '/api/test',
        headers: { host: 'localhost' },
        extra: 'should-be-dropped',
      });

      expect(result).toEqual({ method: 'GET', url: '/api/test' });
    });

    it('should serialize res to { statusCode }', () => {
      const pinoHttp = getPinoHttpConfig({ NODE_ENV: 'prod' });
      const serializers = pinoHttp.serializers as {
        res: (res: Record<string, unknown>) => Record<string, unknown>;
      };

      const result = serializers.res({
        statusCode: 200,
        headers: { 'content-type': 'application/json' },
      });

      expect(result).toEqual({ statusCode: 200 });
    });
  });
});
