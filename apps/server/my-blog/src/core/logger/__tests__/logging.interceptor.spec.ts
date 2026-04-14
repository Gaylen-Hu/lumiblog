import { of } from 'rxjs';
import { LoggingInterceptor } from '../../interceptors/logging.interceptor';
import { StructuredLogger } from '../structured-logger.service';
import { ExecutionContext, CallHandler } from '@nestjs/common';

/**
 * Unit tests for LoggingInterceptor.
 *
 * Verifies that the interceptor:
 * - Injects and uses StructuredLogger instead of built-in Logger (Req 8.2)
 * - Logs structured fields: method, url, statusCode, duration (Req 8.1)
 * - Duration is a non-negative number (Req 8.3)
 */
describe('LoggingInterceptor', () => {
  let interceptor: LoggingInterceptor;
  let mockLogger: jest.Mocked<StructuredLogger>;

  beforeEach(() => {
    mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      verbose: jest.fn(),
      setContext: jest.fn(),
      child: jest.fn(),
    } as unknown as jest.Mocked<StructuredLogger>;

    interceptor = new LoggingInterceptor(mockLogger);
  });

  /**
   * Helper to create a mock ExecutionContext with given request/response values.
   */
  function createMockContext(
    method: string,
    url: string,
    statusCode: number,
  ): ExecutionContext {
    const mockRequest = { method, url };
    const mockResponse = { statusCode };

    return {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
        getResponse: () => mockResponse,
      }),
      getClass: jest.fn(),
      getHandler: jest.fn(),
      getArgs: jest.fn(),
      getArgByIndex: jest.fn(),
      switchToRpc: jest.fn(),
      switchToWs: jest.fn(),
      getType: jest.fn(),
    } as unknown as ExecutionContext;
  }

  /**
   * Helper to create a mock CallHandler that completes immediately.
   */
  function createMockCallHandler(): CallHandler {
    return {
      handle: () => of(undefined),
    };
  }

  describe('StructuredLogger injection (Req 8.2)', () => {
    it('should call setContext with LoggingInterceptor name on construction', () => {
      expect(mockLogger.setContext).toHaveBeenCalledWith('LoggingInterceptor');
    });

    it('should use StructuredLogger.log for HTTP request logging', (done) => {
      const context = createMockContext('GET', '/api/test', 200);
      const callHandler = createMockCallHandler();

      interceptor.intercept(context, callHandler).subscribe({
        complete: () => {
          expect(mockLogger.log).toHaveBeenCalledTimes(1);
          done();
        },
      });
    });
  });

  describe('structured fields logging (Req 8.1, 8.3)', () => {
    it('should log method, url, statusCode, and duration fields', (done) => {
      const context = createMockContext('POST', '/api/articles', 201);
      const callHandler = createMockCallHandler();

      interceptor.intercept(context, callHandler).subscribe({
        complete: () => {
          expect(mockLogger.log).toHaveBeenCalledWith(
            'HTTP request completed',
            expect.objectContaining({
              method: 'POST',
              url: '/api/articles',
              statusCode: 201,
              duration: expect.any(Number),
            }),
          );
          done();
        },
      });
    });

    it('should log correct method and url from the request', (done) => {
      const context = createMockContext('DELETE', '/api/users/123', 204);
      const callHandler = createMockCallHandler();

      interceptor.intercept(context, callHandler).subscribe({
        complete: () => {
          const loggedFields = mockLogger.log.mock.calls[0][1] as Record<string, unknown>;
          expect(loggedFields['method']).toBe('DELETE');
          expect(loggedFields['url']).toBe('/api/users/123');
          done();
        },
      });
    });

    it('should log statusCode from the response', (done) => {
      const context = createMockContext('GET', '/api/health', 404);
      const callHandler = createMockCallHandler();

      interceptor.intercept(context, callHandler).subscribe({
        complete: () => {
          const loggedFields = mockLogger.log.mock.calls[0][1] as Record<string, unknown>;
          expect(loggedFields['statusCode']).toBe(404);
          done();
        },
      });
    });

    it('should log duration as a non-negative number', (done) => {
      const context = createMockContext('GET', '/api/test', 200);
      const callHandler = createMockCallHandler();

      interceptor.intercept(context, callHandler).subscribe({
        complete: () => {
          const loggedFields = mockLogger.log.mock.calls[0][1] as Record<string, unknown>;
          const duration = loggedFields['duration'] as number;
          expect(typeof duration).toBe('number');
          expect(duration).toBeGreaterThanOrEqual(0);
          done();
        },
      });
    });
  });

  describe('log message format (Req 8.3)', () => {
    it('should emit a single log entry per request', (done) => {
      const context = createMockContext('PUT', '/api/tags/5', 200);
      const callHandler = createMockCallHandler();

      interceptor.intercept(context, callHandler).subscribe({
        complete: () => {
          expect(mockLogger.log).toHaveBeenCalledTimes(1);
          expect(mockLogger.log.mock.calls[0][0]).toBe('HTTP request completed');
          done();
        },
      });
    });
  });
});
