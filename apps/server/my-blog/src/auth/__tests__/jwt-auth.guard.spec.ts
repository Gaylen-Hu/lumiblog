// Unit tests for JwtAuthGuard TOKEN_EXPIRED behavior
// **Validates: Requirements 5.5**

import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { ApiKeyService } from '../../api-key/api-key.service';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let mockApiKeyService: jest.Mocked<Pick<ApiKeyService, 'validateKey'>>;

  beforeEach(() => {
    mockApiKeyService = {
      validateKey: jest.fn(),
    };
    guard = new JwtAuthGuard(mockApiKeyService as unknown as ApiKeyService);
  });

  describe('handleRequest', () => {
    it('should throw UnauthorizedException with TOKEN_EXPIRED when info.name is TokenExpiredError', () => {
      const info = { name: 'TokenExpiredError', message: 'jwt expired' } as Error;

      expect(() => guard.handleRequest(null, null, info)).toThrow(
        UnauthorizedException,
      );

      try {
        guard.handleRequest(null, null, info);
      } catch (e) {
        const response = (e as UnauthorizedException).getResponse();
        expect(response).toEqual({
          statusCode: 401,
          message: 'Token expired',
          error: 'TOKEN_EXPIRED',
        });
      }
    });

    it('should return the user when user is valid and no error/info', () => {
      const user = { userId: 'user-123', email: 'test@example.com' };

      const result = guard.handleRequest(null, user, null);

      expect(result).toBe(user);
    });

    it('should throw standard UnauthorizedException when err is provided', () => {
      const err = new Error('Some JWT error');

      expect(() => guard.handleRequest(err, null, null)).toThrow(err);
    });

    it('should throw standard UnauthorizedException when no user and no specific info', () => {
      expect(() => guard.handleRequest(null, null, null)).toThrow(
        UnauthorizedException,
      );

      try {
        guard.handleRequest(null, null, null);
      } catch (e) {
        const response = (e as UnauthorizedException).getResponse();
        // Standard NestJS UnauthorizedException format
        expect(response).toEqual({
          message: 'Unauthorized',
          statusCode: 401,
        });
      }
    });

    it('should throw standard UnauthorizedException for non-TokenExpiredError info', () => {
      const info = { name: 'JsonWebTokenError', message: 'invalid signature' } as Error;

      expect(() => guard.handleRequest(null, null, info)).toThrow(
        UnauthorizedException,
      );

      try {
        guard.handleRequest(null, null, info);
      } catch (e) {
        const response = (e as UnauthorizedException).getResponse();
        expect(response).toEqual({
          message: 'Unauthorized',
          statusCode: 401,
        });
      }
    });
  });

  describe('canActivate - API Key path', () => {
    function createMockExecutionContext(authHeader?: string): ExecutionContext {
      const mockRequest = {
        headers: { authorization: authHeader },
        user: undefined as unknown,
      };

      return {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
      } as unknown as ExecutionContext;
    }

    it('should authenticate via ApiKeyService when token starts with sk-', async () => {
      const apiKeyUser = { userId: 'user-456', email: 'api@example.com' };
      mockApiKeyService.validateKey.mockResolvedValue(apiKeyUser);

      const context = createMockExecutionContext('Bearer sk-test-api-key-123');
      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockApiKeyService.validateKey).toHaveBeenCalledWith('sk-test-api-key-123');
    });

    it('should throw UnauthorizedException for invalid API Key', async () => {
      mockApiKeyService.validateKey.mockResolvedValue(null);

      const context = createMockExecutionContext('Bearer sk-invalid-key');

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockApiKeyService.validateKey).toHaveBeenCalledWith('sk-invalid-key');
    });

    it('should throw UnauthorizedException when no authorization header', async () => {
      const context = createMockExecutionContext(undefined);

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
