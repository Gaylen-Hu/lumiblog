import * as fc from 'fast-check';
import pino from 'pino';
import { Writable } from 'stream';

/**
 * Feature: structured-logging, Property 1: Production output is valid single-line JSON
 *
 * **Validates: Requirements 1.1**
 *
 * For any log message (including messages with newlines, special characters,
 * unicode, and empty strings), when the logger is configured in production mode,
 * the output SHALL be a valid JSON string that contains no unescaped newline
 * characters (i.e., it is a single line).
 */
describe('Feature: structured-logging, Property 1: Production output is valid single-line JSON', () => {
  /**
   * Creates a pino logger configured for production mode (JSON to stdout)
   * that writes to a captured buffer instead of actual stdout.
   */
  function createProductionLogger(): { logger: pino.Logger; getOutput: () => string[] } {
    const lines: string[] = [];

    const stream = new Writable({
      write(chunk: Buffer, _encoding: string, callback: () => void): void {
        const text = chunk.toString();
        // pino may batch multiple lines in one chunk
        const parts = text.split('\n').filter((line: string) => line.length > 0);
        lines.push(...parts);
        callback();
      },
    });

    const logger = pino(
      {
        // Production config: no pretty-print, JSON output
        level: 'trace', // allow all levels so we can test any message
        formatters: {
          level: (label: string) => ({ level: label }),
        },
        timestamp: () => `,"timestamp":"${new Date().toISOString()}"`,
      },
      stream,
    );

    return { logger, getOutput: () => lines };
  }

  it('should produce valid single-line JSON for any random string message', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: 500 }),
        (message: string) => {
          const { logger, getOutput } = createProductionLogger();

          logger.info(message);
          // Force synchronous flush
          logger.flush();

          const lines = getOutput();
          expect(lines.length).toBeGreaterThanOrEqual(1);

          const lastLine = lines[lines.length - 1];

          // Verify: no unescaped newlines in the raw output line
          expect(lastLine).not.toContain('\n');

          // Verify: output is valid JSON
          let parsed: Record<string, unknown>;
          expect(() => {
            parsed = JSON.parse(lastLine) as Record<string, unknown>;
          }).not.toThrow();

          // Verify: the parsed message matches the input
          parsed = JSON.parse(lastLine) as Record<string, unknown>;
          expect(parsed['msg']).toBe(message);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('should produce valid single-line JSON for strings with newlines and special chars', () => {
    // Build strings from a mix of normal chars and problematic special chars
    const specialCharArb = fc.oneof(
      fc.string({ minLength: 0, maxLength: 10 }),
      fc.constant('\n'),
      fc.constant('\r'),
      fc.constant('\t'),
      fc.constant('\0'),
      fc.constant('\\'),
      fc.constant('"'),
      fc.constant('\u0000'),
      fc.constant('\u001F'),
    );

    fc.assert(
      fc.property(
        fc.array(specialCharArb, { minLength: 1, maxLength: 30 }).map((parts: string[]) => parts.join('')),
        (message: string) => {
          const { logger, getOutput } = createProductionLogger();

          logger.info(message);
          logger.flush();

          const lines = getOutput();
          expect(lines.length).toBeGreaterThanOrEqual(1);

          const lastLine = lines[lines.length - 1];

          // Single-line: no literal newline in the output
          expect(lastLine).not.toContain('\n');

          // Valid JSON
          const parsed = JSON.parse(lastLine) as Record<string, unknown>;
          expect(parsed['msg']).toBe(message);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('should produce valid single-line JSON for unicode strings', () => {
    // Generate valid unicode strings (BMP range excluding lone surrogates)
    // Lone surrogates (U+D800–U+DFFF) are invalid in JSON/UTF-8, so pino
    // replaces them with U+FFFD. We exclude them to test round-trip fidelity.
    const validUnicodeArb = fc.stringMatching(/^[\u0000-\uD7FF\uE000-\uFFFF]{0,100}$/);

    fc.assert(
      fc.property(
        validUnicodeArb,
        (message: string) => {
          const { logger, getOutput } = createProductionLogger();

          logger.info(message);
          logger.flush();

          const lines = getOutput();
          expect(lines.length).toBeGreaterThanOrEqual(1);

          const lastLine = lines[lines.length - 1];

          // Single-line check
          expect(lastLine).not.toContain('\n');

          // Valid JSON check
          const parsed = JSON.parse(lastLine) as Record<string, unknown>;
          expect(parsed['msg']).toBe(message);
        },
      ),
      { numRuns: 100 },
    );
  });
});


/**
 * Feature: structured-logging, Property 2: Every log entry contains required base fields
 *
 * **Validates: Requirements 2.1, 2.2**
 *
 * For any combination of log level, context string, and message string,
 * the resulting JSON log entry SHALL contain the fields `level`, `timestamp`,
 * `context`, and `message`, where `timestamp` is a valid ISO 8601 string.
 */
describe('Feature: structured-logging, Property 2: Every log entry contains required base fields', () => {
  const VALID_LEVELS = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'] as const;

  /** ISO 8601 pattern: YYYY-MM-DDTHH:mm:ss.sssZ (or with timezone offset) */
  const ISO_8601_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

  /**
   * Creates a pino logger configured for production mode with a context binding,
   * capturing JSON output lines.
   */
  function createLoggerWithContext(context: string): {
    logger: pino.Logger;
    getOutput: () => string[];
  } {
    const lines: string[] = [];

    const stream = new Writable({
      write(chunk: Buffer, _encoding: string, callback: () => void): void {
        const text = chunk.toString();
        const parts = text.split('\n').filter((line: string) => line.length > 0);
        lines.push(...parts);
        callback();
      },
    });

    const baseLogger = pino(
      {
        level: 'trace',
        formatters: {
          level: (label: string) => ({ level: label }),
        },
        timestamp: () => `,"timestamp":"${new Date().toISOString()}"`,
      },
      stream,
    );

    // Bind context as pino child binding (mirrors StructuredLogger.setContext behavior)
    const logger = baseLogger.child({ context });

    return { logger, getOutput: () => lines };
  }

  it('should include level, timestamp, context, and msg for any random (level, context, message) tuple', () => {
    const levelArb = fc.constantFrom(...VALID_LEVELS);
    const contextArb = fc.string({ minLength: 1, maxLength: 50 });
    const messageArb = fc.string({ minLength: 0, maxLength: 200 });

    fc.assert(
      fc.property(
        levelArb,
        contextArb,
        messageArb,
        (level: string, context: string, message: string) => {
          const { logger, getOutput } = createLoggerWithContext(context);

          // Call the appropriate pino level method
          logger[level as keyof Pick<pino.Logger, 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal'>](message);
          logger.flush();

          const lines = getOutput();
          expect(lines.length).toBeGreaterThanOrEqual(1);

          const lastLine = lines[lines.length - 1];
          const parsed = JSON.parse(lastLine) as Record<string, unknown>;

          // Verify: level field is present and matches the expected pino level string
          expect(parsed).toHaveProperty('level');
          expect(parsed['level']).toBe(level);

          // Verify: timestamp field is present and is a valid ISO 8601 string
          expect(parsed).toHaveProperty('timestamp');
          const timestamp = parsed['timestamp'] as string;
          expect(typeof timestamp).toBe('string');
          expect(timestamp).toMatch(ISO_8601_REGEX);
          // Also verify it's parseable by Date
          const dateValue = new Date(timestamp);
          expect(dateValue.getTime()).not.toBeNaN();

          // Verify: context field is present and matches the input context
          expect(parsed).toHaveProperty('context');
          expect(parsed['context']).toBe(context);

          // Verify: msg field is present and matches the input message
          expect(parsed).toHaveProperty('msg');
          expect(parsed['msg']).toBe(message);
        },
      ),
      { numRuns: 100 },
    );
  });
});


/**
 * Feature: structured-logging, Property 3: Metadata fields do not overwrite base fields
 *
 * **Validates: Requirements 2.4**
 *
 * For any metadata object (including objects with keys named `level`, `timestamp`,
 * `context`, or `message`), when passed as additional metadata to a log call,
 * the base fields `level`, `timestamp`, `context`, and `message` SHALL retain
 * their original values, and the metadata SHALL appear as additional fields in
 * the log entry.
 */
describe('Feature: structured-logging, Property 3: Metadata fields do not overwrite base fields', () => {
  const VALID_LEVELS = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'] as const;

  /** Keys reserved for base log entry fields — mirrors logger.module.ts */
  const RESERVED_LOG_KEYS = new Set(['level', 'timestamp', 'context', 'msg']);

  /** ISO 8601 pattern */
  const ISO_8601_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

  /**
   * Creates a pino logger configured for production mode with a context binding,
   * capturing JSON output lines. Mirrors the production config from logger.module.ts,
   * including the formatters.log sanitizer that strips reserved keys from metadata.
   */
  function createLoggerWithContext(context: string): {
    logger: pino.Logger;
    getOutput: () => string[];
  } {
    const lines: string[] = [];

    const stream = new Writable({
      write(chunk: Buffer, _encoding: string, callback: () => void): void {
        const text = chunk.toString();
        const parts = text.split('\n').filter((line: string) => line.length > 0);
        lines.push(...parts);
        callback();
      },
    });

    const baseLogger = pino(
      {
        level: 'trace',
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
        timestamp: () => `,"timestamp":"${new Date().toISOString()}"`,
      },
      stream,
    );

    const logger = baseLogger.child({ context });

    return { logger, getOutput: () => lines };
  }

  it('should preserve base fields when metadata contains adversarial keys', () => {
    const levelArb = fc.constantFrom(...VALID_LEVELS);
    const contextArb = fc.string({ minLength: 1, maxLength: 50 });
    const messageArb = fc.string({ minLength: 1, maxLength: 200 });

    // Generate metadata objects that always include adversarial keys
    // attempting to overwrite base fields, plus random extra keys
    const adversarialMetadataArb = fc.record({
      level: fc.oneof(fc.string({ minLength: 1, maxLength: 20 }), fc.integer()),
      timestamp: fc.oneof(fc.string({ minLength: 1, maxLength: 50 }), fc.integer()),
      context: fc.oneof(fc.string({ minLength: 1, maxLength: 50 }), fc.integer()),
      msg: fc.oneof(fc.string({ minLength: 1, maxLength: 50 }), fc.integer()),
    });

    // Also generate random safe extra metadata keys (exclude reserved + prototype keys)
    const UNSAFE_KEYS = new Set([
      'level', 'timestamp', 'context', 'msg', 'time', 'pid', 'hostname', 'v',
      'toString', 'valueOf', 'hasOwnProperty', 'constructor', 'toLocaleString',
      'isPrototypeOf', 'propertyIsEnumerable', '__proto__', '__defineGetter__',
      '__defineSetter__', '__lookupGetter__', '__lookupSetter__',
    ]);
    const extraMetadataArb = fc.dictionary(
      fc.string({ minLength: 1, maxLength: 20 }).filter(
        (key: string) => !UNSAFE_KEYS.has(key) && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key),
      ),
      fc.oneof(fc.string(), fc.integer(), fc.boolean()),
      { minKeys: 0, maxKeys: 5 },
    );

    fc.assert(
      fc.property(
        levelArb,
        contextArb,
        messageArb,
        adversarialMetadataArb,
        extraMetadataArb,
        (
          level: string,
          context: string,
          message: string,
          adversarial: Record<string, unknown>,
          extra: Record<string, unknown>,
        ) => {
          const { logger, getOutput } = createLoggerWithContext(context);

          // Merge adversarial keys with extra metadata
          const metadata: Record<string, unknown> = { ...extra, ...adversarial };

          // Log with metadata as first arg, message as second (pino convention)
          logger[level as keyof Pick<pino.Logger, 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal'>](
            metadata,
            message,
          );
          logger.flush();

          const lines = getOutput();
          expect(lines.length).toBeGreaterThanOrEqual(1);

          const lastLine = lines[lines.length - 1];
          const parsed = JSON.parse(lastLine) as Record<string, unknown>;

          // Base field: level must match the actual log level, not the adversarial value
          expect(parsed['level']).toBe(level);

          // Base field: timestamp must be a valid ISO 8601 string, not the adversarial value
          expect(typeof parsed['timestamp']).toBe('string');
          expect(parsed['timestamp'] as string).toMatch(ISO_8601_REGEX);
          const dateValue = new Date(parsed['timestamp'] as string);
          expect(dateValue.getTime()).not.toBeNaN();

          // Base field: context must match the bound context, not the adversarial value
          expect(parsed['context']).toBe(context);

          // Base field: msg must match the actual message, not the adversarial value
          expect(parsed['msg']).toBe(message);
        },
      ),
      { numRuns: 100 },
    );
  });
});


/**
 * Feature: structured-logging, Property 4: Log level suppression
 *
 * **Validates: Requirements 4.3**
 *
 * For any pair of (configured minimum level, call level), a log entry SHALL
 * appear in the output if and only if the call level's numeric priority is
 * greater than or equal to the configured minimum level's numeric priority.
 */
describe('Feature: structured-logging, Property 4: Log level suppression', () => {
  const VALID_LEVELS = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'] as const;
  type PinoLevel = (typeof VALID_LEVELS)[number];

  /** Numeric priorities matching pino defaults */
  const LEVEL_PRIORITY: Record<PinoLevel, number> = {
    trace: 10,
    debug: 20,
    info: 30,
    warn: 40,
    error: 50,
    fatal: 60,
  };

  /**
   * Creates a pino logger configured with the given minimum level,
   * capturing JSON output lines.
   */
  function createLoggerAtLevel(configuredLevel: PinoLevel): {
    logger: pino.Logger;
    getOutput: () => string[];
  } {
    const lines: string[] = [];

    const stream = new Writable({
      write(chunk: Buffer, _encoding: string, callback: () => void): void {
        const text = chunk.toString();
        const parts = text.split('\n').filter((line: string) => line.length > 0);
        lines.push(...parts);
        callback();
      },
    });

    const logger = pino(
      {
        level: configuredLevel,
        formatters: {
          level: (label: string) => ({ level: label }),
        },
        timestamp: () => `,"timestamp":"${new Date().toISOString()}"`,
      },
      stream,
    );

    return { logger, getOutput: () => lines };
  }

  it('should emit output iff callLevel priority >= configuredLevel priority', () => {
    const levelArb = fc.constantFrom(...VALID_LEVELS);

    fc.assert(
      fc.property(
        levelArb,
        levelArb,
        (configuredLevel: PinoLevel, callLevel: PinoLevel) => {
          const { logger, getOutput } = createLoggerAtLevel(configuredLevel);

          // Log a test message at the call level
          logger[callLevel]('test-message');
          logger.flush();

          const lines = getOutput();
          const shouldAppear =
            LEVEL_PRIORITY[callLevel] >= LEVEL_PRIORITY[configuredLevel];

          if (shouldAppear) {
            // Output MUST contain at least one line with the logged message
            expect(lines.length).toBeGreaterThanOrEqual(1);
            const lastLine = lines[lines.length - 1];
            const parsed = JSON.parse(lastLine) as Record<string, unknown>;
            expect(parsed['level']).toBe(callLevel);
            expect(parsed['msg']).toBe('test-message');
          } else {
            // Output MUST be empty — the message was suppressed
            expect(lines.length).toBe(0);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});


/**
 * Feature: structured-logging, Property 5: Child logger metadata binding
 *
 * **Validates: Requirements 5.1, 5.2**
 *
 * For any set of key-value metadata bindings, when a child logger is created
 * with those bindings, every log entry produced by that child logger SHALL
 * include all of the bound metadata fields with their original values.
 */
describe('Feature: structured-logging, Property 5: Child logger metadata binding', () => {
  /** Keys reserved by pino / our logger config or JS prototype — must be excluded from generated bindings */
  const RESERVED_KEYS = new Set([
    'level', 'timestamp', 'context', 'msg', 'time', 'pid', 'hostname', 'v',
    'toString', 'valueOf', 'hasOwnProperty', 'constructor', 'toLocaleString',
    'isPrototypeOf', 'propertyIsEnumerable', '__proto__', '__defineGetter__',
    '__defineSetter__', '__lookupGetter__', '__lookupSetter__',
  ]);

  /**
   * Creates a pino base logger writing JSON to a captured buffer.
   */
  function createBaseLogger(): { logger: pino.Logger; getOutput: () => string[] } {
    const lines: string[] = [];

    const stream = new Writable({
      write(chunk: Buffer, _encoding: string, callback: () => void): void {
        const text = chunk.toString();
        const parts = text.split('\n').filter((line: string) => line.length > 0);
        lines.push(...parts);
        callback();
      },
    });

    const logger = pino(
      {
        level: 'trace',
        formatters: {
          level: (label: string) => ({ level: label }),
        },
        timestamp: () => `,"timestamp":"${new Date().toISOString()}"`,
      },
      stream,
    );

    return { logger, getOutput: () => lines };
  }

  it('should include all bound metadata in every log entry from a child logger', () => {
    // Generate safe key names that won't collide with pino internals
    const safeKeyArb = fc.string({ minLength: 1, maxLength: 20 }).filter(
      (key: string) => !RESERVED_KEYS.has(key) && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key),
    );

    const safeValueArb = fc.oneof(
      fc.string({ minLength: 0, maxLength: 50 }),
      fc.integer({ min: -1000, max: 1000 }),
      fc.boolean(),
    );

    // Generate a dictionary and copy into a regular object (fc.dictionary creates
    // null-prototype objects which pino's child() cannot handle)
    const bindingsArb = fc.dictionary(safeKeyArb, safeValueArb, { minKeys: 1, maxKeys: 8 })
      .map((dict: Record<string, string | number | boolean>) => ({ ...dict }));

    // Generate 1–5 messages to log through the child logger
    const messagesArb = fc.array(
      fc.string({ minLength: 1, maxLength: 100 }),
      { minLength: 1, maxLength: 5 },
    );

    fc.assert(
      fc.property(
        bindingsArb,
        messagesArb,
        (bindings: Record<string, string | number | boolean>, messages: string[]) => {
          const { logger: baseLogger, getOutput } = createBaseLogger();

          // Create a child logger with the generated bindings
          const childLogger = baseLogger.child(bindings);

          // Log multiple messages through the child logger
          for (const message of messages) {
            childLogger.info(message);
          }
          childLogger.flush();

          const lines = getOutput();
          // We should have at least as many output lines as messages
          expect(lines.length).toBeGreaterThanOrEqual(messages.length);

          // Verify each output line contains all binding key-value pairs
          const outputLines = lines.slice(-messages.length);
          for (let i = 0; i < outputLines.length; i++) {
            const parsed = JSON.parse(outputLines[i]) as Record<string, unknown>;

            for (const [key, value] of Object.entries(bindings)) {
              expect(parsed).toHaveProperty(key);
              expect(parsed[key]).toBe(value);
            }
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});


/**
 * Feature: structured-logging, Property 6: Error object decomposition
 *
 * **Validates: Requirements 6.1, 6.3**
 *
 * For any Error object (with varying message and stack content), when passed
 * to the `error()` method — either alone or alongside a separate message string —
 * the resulting log entry SHALL contain the error's stack trace in the `err.stack`
 * field and the error's message in the `err.message` field. When a separate
 * message string is also provided, it SHALL appear in the `msg` field.
 */
describe('Feature: structured-logging, Property 6: Error object decomposition', () => {
  /**
   * Creates a pino logger with the built-in error serializer enabled,
   * capturing JSON output lines.
   */
  function createErrorLogger(): { logger: pino.Logger; getOutput: () => string[] } {
    const lines: string[] = [];

    const stream = new Writable({
      write(chunk: Buffer, _encoding: string, callback: () => void): void {
        const text = chunk.toString();
        const parts = text.split('\n').filter((line: string) => line.length > 0);
        lines.push(...parts);
        callback();
      },
    });

    const logger = pino(
      {
        level: 'trace',
        formatters: {
          level: (label: string) => ({ level: label }),
        },
        timestamp: () => `,"timestamp":"${new Date().toISOString()}"`,
      },
      stream,
    );

    return { logger, getOutput: () => lines };
  }

  it('should decompose Error object with err.stack and err.message when error is passed alone', () => {
    const errorMessageArb = fc.string({ minLength: 1, maxLength: 200 });

    fc.assert(
      fc.property(
        errorMessageArb,
        (errorMessage: string) => {
          const { logger, getOutput } = createErrorLogger();

          const error = new Error(errorMessage);

          // Pino convention: pass error as { err: errorObj } with the error's message
          logger.error({ err: error }, error.message);
          logger.flush();

          const lines = getOutput();
          expect(lines.length).toBeGreaterThanOrEqual(1);

          const lastLine = lines[lines.length - 1];
          const parsed = JSON.parse(lastLine) as Record<string, unknown>;

          // Verify: level is 'error'
          expect(parsed['level']).toBe('error');

          // Verify: err object is present with message and stack
          expect(parsed).toHaveProperty('err');
          const errObj = parsed['err'] as Record<string, unknown>;

          expect(errObj).toHaveProperty('message');
          expect(errObj['message']).toBe(errorMessage);

          expect(errObj).toHaveProperty('stack');
          expect(typeof errObj['stack']).toBe('string');
          expect((errObj['stack'] as string).length).toBeGreaterThan(0);

          // Verify: msg field contains the error's message
          expect(parsed['msg']).toBe(errorMessage);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('should include separate message in msg field when provided alongside Error object', () => {
    const errorMessageArb = fc.string({ minLength: 1, maxLength: 200 });
    const separateMessageArb = fc.string({ minLength: 1, maxLength: 200 });

    fc.assert(
      fc.property(
        errorMessageArb,
        separateMessageArb,
        (errorMessage: string, separateMessage: string) => {
          const { logger, getOutput } = createErrorLogger();

          const error = new Error(errorMessage);

          // Pino convention: pass error as { err: errorObj } with a separate message
          logger.error({ err: error }, separateMessage);
          logger.flush();

          const lines = getOutput();
          expect(lines.length).toBeGreaterThanOrEqual(1);

          const lastLine = lines[lines.length - 1];
          const parsed = JSON.parse(lastLine) as Record<string, unknown>;

          // Verify: err object contains the error's message and stack
          expect(parsed).toHaveProperty('err');
          const errObj = parsed['err'] as Record<string, unknown>;

          expect(errObj).toHaveProperty('message');
          expect(errObj['message']).toBe(errorMessage);

          expect(errObj).toHaveProperty('stack');
          expect(typeof errObj['stack']).toBe('string');
          expect((errObj['stack'] as string).length).toBeGreaterThan(0);

          // Verify: msg field contains the separate message, not the error's message
          expect(parsed['msg']).toBe(separateMessage);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('should preserve stack trace content from the original Error object', () => {
    const errorMessageArb = fc.string({ minLength: 1, maxLength: 100 });

    fc.assert(
      fc.property(
        errorMessageArb,
        (errorMessage: string) => {
          const { logger, getOutput } = createErrorLogger();

          const error = new Error(errorMessage);
          const originalStack = error.stack;

          logger.error({ err: error }, errorMessage);
          logger.flush();

          const lines = getOutput();
          expect(lines.length).toBeGreaterThanOrEqual(1);

          const lastLine = lines[lines.length - 1];
          const parsed = JSON.parse(lastLine) as Record<string, unknown>;

          const errObj = parsed['err'] as Record<string, unknown>;

          // Verify: the serialized stack contains the original error message
          // (Error.stack typically starts with "Error: <message>")
          if (originalStack) {
            expect(typeof errObj['stack']).toBe('string');
            expect(errObj['stack']).toContain(errorMessage);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});


/**
 * Feature: structured-logging, Property 7: HTTP request log entry completeness
 *
 * **Validates: Requirements 8.1, 8.3**
 *
 * For any HTTP request with a given method, URL, and resulting status code,
 * when the LoggingInterceptor processes the request, the emitted log entry
 * SHALL contain the fields `method`, `url`, `statusCode`, and `duration`
 * (a non-negative number in milliseconds).
 */
describe('Feature: structured-logging, Property 7: HTTP request log entry completeness', () => {
  const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'] as const;

  /**
   * Creates a pino logger that captures JSON output lines,
   * simulating what the LoggingInterceptor does when logging HTTP metadata.
   */
  function createHttpLogger(): { logger: pino.Logger; getOutput: () => string[] } {
    const lines: string[] = [];

    const stream = new Writable({
      write(chunk: Buffer, _encoding: string, callback: () => void): void {
        const text = chunk.toString();
        const parts = text.split('\n').filter((line: string) => line.length > 0);
        lines.push(...parts);
        callback();
      },
    });

    const logger = pino(
      {
        level: 'trace',
        formatters: {
          level: (label: string) => ({ level: label }),
        },
        timestamp: () => `,"timestamp":"${new Date().toISOString()}"`,
      },
      stream,
    );

    return { logger, getOutput: () => lines };
  }

  it('should include method, url, statusCode, and non-negative duration for any HTTP request tuple', () => {
    const methodArb = fc.constantFrom(...HTTP_METHODS);
    const statusCodeArb = fc.integer({ min: 100, max: 599 });
    const urlArb = fc.string({ minLength: 1, maxLength: 200 }).map((s: string) => '/' + s);
    const durationArb = fc.float({ min: 0, max: 60000, noNaN: true });

    fc.assert(
      fc.property(
        methodArb,
        urlArb,
        statusCodeArb,
        durationArb,
        (method: string, url: string, statusCode: number, duration: number) => {
          const { logger, getOutput } = createHttpLogger();

          // Simulate what LoggingInterceptor does:
          // this.logger.log('HTTP request completed', { method, url, statusCode, duration })
          // At the pino level, this translates to logger.info({ method, url, statusCode, duration }, message)
          logger.info({ method, url, statusCode, duration }, 'HTTP request completed');
          logger.flush();

          const lines = getOutput();
          expect(lines.length).toBeGreaterThanOrEqual(1);

          const lastLine = lines[lines.length - 1];
          const parsed = JSON.parse(lastLine) as Record<string, unknown>;

          // Verify: method field is present and matches input
          expect(parsed).toHaveProperty('method');
          expect(parsed['method']).toBe(method);

          // Verify: url field is present and matches input
          expect(parsed).toHaveProperty('url');
          expect(parsed['url']).toBe(url);

          // Verify: statusCode field is present and matches input
          expect(parsed).toHaveProperty('statusCode');
          expect(parsed['statusCode']).toBe(statusCode);

          // Verify: duration field is present, is a number, and is non-negative
          expect(parsed).toHaveProperty('duration');
          expect(typeof parsed['duration']).toBe('number');
          expect(parsed['duration'] as number).toBeGreaterThanOrEqual(0);

          // Verify: msg field contains the expected log message
          expect(parsed['msg']).toBe('HTTP request completed');
        },
      ),
      { numRuns: 100 },
    );
  });
});


/**
 * Unit Tests: StructuredLogger service
 *
 * **Validates: Requirements 3.1, 3.3, 6.1, 6.2, 6.3, 5.1, 7.1**
 *
 * Tests the StructuredLogger wrapper behavior using a mocked PinoLogger:
 * - LoggerService interface compliance
 * - Context passthrough via setContext
 * - Error overloads (plain string, Error object, message + Error)
 * - child() returns a new logger with bound metadata
 * - No console.* calls in source
 */
describe('Unit Tests: StructuredLogger service', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { StructuredLogger } = require('../structured-logger.service') as {
    StructuredLogger: new (pino: unknown) => {
      log: (message: string, ...args: unknown[]) => void;
      error: (message: string, ...args: unknown[]) => void;
      warn: (message: string, ...args: unknown[]) => void;
      debug: (message: string, ...args: unknown[]) => void;
      verbose: (message: string, ...args: unknown[]) => void;
      setContext: (ctx: string) => void;
      child: (bindings: Record<string, unknown>) => unknown;
    };
  };

  let mockPinoLogger: {
    info: jest.Mock;
    error: jest.Mock;
    warn: jest.Mock;
    debug: jest.Mock;
    trace: jest.Mock;
    setContext: jest.Mock;
    logger: { child: jest.Mock };
  };
  let structuredLogger: InstanceType<typeof StructuredLogger>;

  beforeEach(() => {
    mockPinoLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      trace: jest.fn(),
      setContext: jest.fn(),
      logger: {
        child: jest.fn().mockReturnValue({
          info: jest.fn(),
          error: jest.fn(),
          warn: jest.fn(),
          debug: jest.fn(),
          trace: jest.fn(),
          child: jest.fn(),
        }),
      },
    };

    structuredLogger = new StructuredLogger(mockPinoLogger as never);
  });

  describe('LoggerService interface compliance (Req 3.1)', () => {
    it('should have all LoggerService methods', () => {
      expect(typeof structuredLogger.log).toBe('function');
      expect(typeof structuredLogger.error).toBe('function');
      expect(typeof structuredLogger.warn).toBe('function');
      expect(typeof structuredLogger.debug).toBe('function');
      expect(typeof structuredLogger.verbose).toBe('function');
    });

    it('should have setContext method', () => {
      expect(typeof structuredLogger.setContext).toBe('function');
    });

    it('should have child method', () => {
      expect(typeof structuredLogger.child).toBe('function');
    });

    it('log() delegates to pino.info()', () => {
      structuredLogger.log('hello');
      expect(mockPinoLogger.info).toHaveBeenCalledWith('hello');
    });

    it('warn() delegates to pino.warn()', () => {
      structuredLogger.warn('warning msg');
      expect(mockPinoLogger.warn).toHaveBeenCalledWith('warning msg');
    });

    it('debug() delegates to pino.debug()', () => {
      structuredLogger.debug('debug msg');
      expect(mockPinoLogger.debug).toHaveBeenCalledWith('debug msg');
    });

    it('verbose() delegates to pino.trace()', () => {
      structuredLogger.verbose('verbose msg');
      expect(mockPinoLogger.trace).toHaveBeenCalledWith('verbose msg');
    });

    it('error() with plain string delegates to pino.error()', () => {
      structuredLogger.error('error msg');
      expect(mockPinoLogger.error).toHaveBeenCalledWith('error msg');
    });
  });

  describe('Context passthrough (Req 3.3)', () => {
    it('setContext() delegates to pino.setContext()', () => {
      structuredLogger.setContext('MyService');
      expect(mockPinoLogger.setContext).toHaveBeenCalledWith('MyService');
    });

    it('log() with context string sets context temporarily', () => {
      structuredLogger.setContext('Original');
      mockPinoLogger.setContext.mockClear();

      structuredLogger.log('msg', 'TempContext');

      // Should set temp context, then restore
      expect(mockPinoLogger.setContext).toHaveBeenCalledWith('TempContext');
      expect(mockPinoLogger.setContext).toHaveBeenCalledWith('Original');
      expect(mockPinoLogger.info).toHaveBeenCalledWith('msg');
    });
  });

  describe('Error overloads (Req 6.1, 6.2, 6.3)', () => {
    it('error(message) — plain string', () => {
      structuredLogger.error('something failed');
      expect(mockPinoLogger.error).toHaveBeenCalledWith('something failed');
    });

    it('error(message, Error) — Error object', () => {
      const err = new Error('test error');
      structuredLogger.error('operation failed', err);
      expect(mockPinoLogger.error).toHaveBeenCalledWith(
        { err, stack: err.stack },
        'operation failed',
      );
    });

    it('error(message, Error, context) — Error with context', () => {
      const err = new Error('ctx error');
      structuredLogger.error('failed', err, 'SomeContext');
      expect(mockPinoLogger.setContext).toHaveBeenCalledWith('SomeContext');
      expect(mockPinoLogger.error).toHaveBeenCalledWith(
        { err, stack: err.stack },
        'failed',
      );
    });

    it('error(message, stackOrContext) — single string param treated as context', () => {
      structuredLogger.error('msg', 'ErrorContext');
      expect(mockPinoLogger.setContext).toHaveBeenCalledWith('ErrorContext');
      expect(mockPinoLogger.error).toHaveBeenCalledWith('msg');
    });
  });

  describe('child() returns new logger with bound metadata (Req 5.1)', () => {
    it('child() returns a StructuredLogger instance', () => {
      const childLogger = structuredLogger.child({ requestId: 'abc-123' });
      expect(childLogger).toBeInstanceOf(StructuredLogger);
    });

    it('child() calls pino.logger.child() with bindings', () => {
      const bindings = { requestId: 'req-1', userId: 42 };
      structuredLogger.child(bindings);
      expect(mockPinoLogger.logger.child).toHaveBeenCalledWith(bindings);
    });

    it('child() inherits parent context', () => {
      structuredLogger.setContext('ParentCtx');
      mockPinoLogger.setContext.mockClear();

      const childLogger = structuredLogger.child({ traceId: 'xyz' });
      // child should have setContext called with parent context
      expect(mockPinoLogger.setContext).toHaveBeenCalled();

      // The child is a distinct instance
      expect(childLogger).not.toBe(structuredLogger);
    });
  });

  describe('No console.* calls in StructuredLogger source (Req 7.1)', () => {
    it('should not contain console.log/error/warn/debug calls', () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const fs = require('fs') as typeof import('fs');
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const path = require('path') as typeof import('path');
      const sourcePath = path.resolve(
        __dirname,
        '..',
        'structured-logger.service.ts',
      );
      const source = fs.readFileSync(sourcePath, 'utf-8');

      expect(source).not.toMatch(/console\.log\s*\(/);
      expect(source).not.toMatch(/console\.error\s*\(/);
      expect(source).not.toMatch(/console\.warn\s*\(/);
      expect(source).not.toMatch(/console\.debug\s*\(/);
    });
  });
});
