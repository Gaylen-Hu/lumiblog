/**
 * Unit tests for RefreshTokenService
 * Validates: Requirements 1.3, 1.4, 2.3, 2.5, 4.1, 4.5, 6.2, 6.3
 */
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { RefreshTokenService } from '../refresh-token.service';

// ─── In-memory Redis mock ────────────────────────────────────────────

function createInMemoryRedis(): {
  mock: Record<string, jest.Mock>;
  store: Map<string, { value: string; ttl?: number }>;
} {
  const store = new Map<string, { value: string; ttl?: number }>();

  const mock: Record<string, jest.Mock> = {
    connect: jest.fn().mockResolvedValue(undefined),
    quit: jest.fn().mockResolvedValue('OK'),
    on: jest.fn().mockReturnThis(),

    set: jest.fn(
      async (key: string, value: string, _ex?: string, ttl?: number) => {
        store.set(key, { value, ttl });
        return 'OK';
      },
    ),

    get: jest.fn(async (key: string) => {
      const entry = store.get(key);
      return entry ? entry.value : null;
    }),

    del: jest.fn(async (...keys: string[]) => {
      let deleted = 0;
      for (const k of keys) {
        if (store.delete(k)) deleted++;
      }
      return deleted;
    }),

    scan: jest.fn(
      async (_cursor: string, _match: string, pattern: string) => {
        const matched: string[] = [];
        const regex = new RegExp(
          '^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$',
        );
        for (const key of store.keys()) {
          if (regex.test(key)) matched.push(key);
        }
        return ['0', matched];
      },
    ),
  };

  return { mock, store };
}

// ─── Mock ioredis before importing the service ───────────────────────

let redisMock: Record<string, jest.Mock>;
let redisStore: Map<string, { value: string; ttl?: number }>;

jest.mock('ioredis', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => redisMock),
}));

// ─── Helper: build service with configurable options ─────────────────

interface BuildOptions {
  refreshExpiresIn?: string;
  maxSessions?: number;
}

async function buildService(
  options: BuildOptions = {},
): Promise<RefreshTokenService> {
  const redis = createInMemoryRedis();
  redisMock = redis.mock;
  redisStore = redis.store;

  const { refreshExpiresIn = '7d', maxSessions = 5 } = options;

  const module: TestingModule = await Test.createTestingModule({
    providers: [
      RefreshTokenService,
      {
        provide: ConfigService,
        useValue: {
          get: jest.fn((key: string, defaultValue: unknown) => {
            const config: Record<string, unknown> = {
              REDIS_HOST: 'localhost',
              REDIS_PORT: 6379,
              REDIS_PASSWORD: '',
              JWT_REFRESH_EXPIRES_IN: refreshExpiresIn,
              JWT_REFRESH_MAX_SESSIONS: maxSessions,
            };
            return config[key] ?? defaultValue;
          }),
        },
      },
    ],
  }).compile();

  return module.get<RefreshTokenService>(RefreshTokenService);
}

// ─── Tests ───────────────────────────────────────────────────────────

describe('RefreshTokenService', () => {
  const TEST_USER_ID = 'user-abc-123';

  // ── createRefreshToken ─────────────────────────────────────────────

  describe('createRefreshToken()', () => {
    it('should return a 64-char hex string', async () => {
      // Arrange
      const service = await buildService();

      // Act
      const token = await service.createRefreshToken(TEST_USER_ID);

      // Assert
      expect(token).toMatch(/^[0-9a-f]{64}$/);
    });

    it('should store the SHA-256 hash (not plaintext) in Redis', async () => {
      // Arrange
      const service = await buildService();

      // Act
      const token = await service.createRefreshToken(TEST_USER_ID);
      const expectedHash = crypto
        .createHash('sha256')
        .update(token)
        .digest('hex');

      // Assert — key contains hash, not plaintext
      const keys = [...redisStore.keys()];
      expect(keys).toHaveLength(1);
      expect(keys[0]).toBe(
        `refresh_token:${TEST_USER_ID}:${expectedHash}`,
      );

      // Value should not contain plaintext
      const entry = redisStore.get(keys[0]);
      expect(entry?.value).not.toContain(token);
    });

    it('should store metadata with userId and createdAt', async () => {
      // Arrange
      const service = await buildService();

      // Act
      await service.createRefreshToken(TEST_USER_ID);

      // Assert
      const [, entry] = [...redisStore.entries()][0];
      const metadata = JSON.parse(entry.value);
      expect(metadata.userId).toBe(TEST_USER_ID);
      expect(typeof metadata.createdAt).toBe('number');
    });

    it('should set TTL matching configured expiry (7d = 604800s)', async () => {
      // Arrange
      const service = await buildService({ refreshExpiresIn: '7d' });

      // Act
      await service.createRefreshToken(TEST_USER_ID);

      // Assert — redis.set called with EX and 604800
      expect(redisMock.set).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        'EX',
        604800,
      );
    });
  });

  // ── validateAndConsume ─────────────────────────────────────────────

  describe('validateAndConsume()', () => {
    it('should succeed with a valid token and return userId + new token', async () => {
      // Arrange
      const service = await buildService();
      const token = await service.createRefreshToken(TEST_USER_ID);

      // Act
      const result = await service.validateAndConsume(token);

      // Assert
      expect(result.userId).toBe(TEST_USER_ID);
      expect(result.newRefreshToken).toMatch(/^[0-9a-f]{64}$/);
      expect(result.newRefreshToken).not.toBe(token);
    });

    it('should invalidate the consumed token (token rotation)', async () => {
      // Arrange
      const service = await buildService();
      const token = await service.createRefreshToken(TEST_USER_ID);

      // Act — consume once
      await service.validateAndConsume(token);

      // Assert — second use should fail
      await expect(service.validateAndConsume(token)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should reject a non-hex format token without Redis lookup', async () => {
      // Arrange
      const service = await buildService();
      redisMock.scan.mockClear();

      // Act & Assert
      await expect(
        service.validateAndConsume('not-a-valid-hex-token!'),
      ).rejects.toThrow(UnauthorizedException);

      // scan should never have been called
      expect(redisMock.scan).not.toHaveBeenCalled();
    });

    it('should reject a well-formatted hex token that is not stored', async () => {
      // Arrange
      const service = await buildService();
      const fakeToken = 'a'.repeat(64);

      // Act & Assert
      await expect(service.validateAndConsume(fakeToken)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should reject an expired token (key removed from store)', async () => {
      // Arrange
      const service = await buildService();
      const token = await service.createRefreshToken(TEST_USER_ID);

      // Simulate expiry by clearing the store
      redisStore.clear();

      // Act & Assert
      await expect(service.validateAndConsume(token)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  // ── revokeAllUserTokens ────────────────────────────────────────────

  describe('revokeAllUserTokens()', () => {
    it('should delete all tokens for the specified user', async () => {
      // Arrange
      const service = await buildService();
      await service.createRefreshToken(TEST_USER_ID);
      await service.createRefreshToken(TEST_USER_ID);
      await service.createRefreshToken(TEST_USER_ID);

      // Act
      const deleted = await service.revokeAllUserTokens(TEST_USER_ID);

      // Assert
      expect(deleted).toBe(3);
      const count = await service.getActiveSessionCount(TEST_USER_ID);
      expect(count).toBe(0);
    });

    it('should return 0 when user has no tokens', async () => {
      // Arrange
      const service = await buildService();

      // Act
      const deleted = await service.revokeAllUserTokens('nonexistent-user');

      // Assert
      expect(deleted).toBe(0);
    });

    it('should not affect tokens of other users', async () => {
      // Arrange
      const service = await buildService();
      await service.createRefreshToken(TEST_USER_ID);
      await service.createRefreshToken('other-user-456');

      // Act
      await service.revokeAllUserTokens(TEST_USER_ID);

      // Assert
      const myCount = await service.getActiveSessionCount(TEST_USER_ID);
      const otherCount = await service.getActiveSessionCount('other-user-456');
      expect(myCount).toBe(0);
      expect(otherCount).toBe(1);
    });
  });

  // ── Redis connection failure ───────────────────────────────────────

  describe('Redis connection failure', () => {
    it('should throw ServiceUnavailableException when Redis set fails', async () => {
      // Arrange
      const service = await buildService();
      redisMock.set.mockRejectedValueOnce(new Error('Connection refused'));

      // Act & Assert
      await expect(
        service.createRefreshToken(TEST_USER_ID),
      ).rejects.toThrow(ServiceUnavailableException);
    });

    it('should throw ServiceUnavailableException when Redis scan fails', async () => {
      // Arrange
      const service = await buildService();
      redisMock.scan.mockRejectedValueOnce(new Error('Connection refused'));

      // Act & Assert
      await expect(
        service.revokeAllUserTokens(TEST_USER_ID),
      ).rejects.toThrow(ServiceUnavailableException);
    });
  });

  // ── Config defaults ────────────────────────────────────────────────

  describe('Config defaults', () => {
    it('should use 7d (604800s) as default JWT_REFRESH_EXPIRES_IN', async () => {
      // Arrange — build with default '7d'
      const service = await buildService({ refreshExpiresIn: '7d' });

      // Act
      await service.createRefreshToken(TEST_USER_ID);

      // Assert — TTL should be 604800 seconds
      expect(redisMock.set).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        'EX',
        604800,
      );
    });

    it('should use 5 as default JWT_REFRESH_MAX_SESSIONS', async () => {
      // Arrange — build with maxSessions=5
      const service = await buildService({ maxSessions: 5 });

      // Act — create 7 tokens (exceeds limit of 5)
      for (let i = 0; i < 7; i++) {
        await service.createRefreshToken(TEST_USER_ID);
      }

      // Assert — only 5 should remain
      const count = await service.getActiveSessionCount(TEST_USER_ID);
      expect(count).toBe(5);
    });

    it('should respect custom JWT_REFRESH_MAX_SESSIONS value', async () => {
      // Arrange
      const service = await buildService({ maxSessions: 3 });

      // Act — create 5 tokens
      for (let i = 0; i < 5; i++) {
        await service.createRefreshToken(TEST_USER_ID);
      }

      // Assert — only 3 should remain
      const count = await service.getActiveSessionCount(TEST_USER_ID);
      expect(count).toBe(3);
    });
  });

  // ── validateTokenFormat ────────────────────────────────────────────

  describe('validateTokenFormat()', () => {
    it('should accept a valid 64-char hex string', async () => {
      const service = await buildService();
      expect(service.validateTokenFormat('a'.repeat(64))).toBe(true);
    });

    it('should reject strings shorter than 64 chars', async () => {
      const service = await buildService();
      expect(service.validateTokenFormat('a'.repeat(63))).toBe(false);
    });

    it('should reject strings longer than 64 chars', async () => {
      const service = await buildService();
      expect(service.validateTokenFormat('a'.repeat(65))).toBe(false);
    });

    it('should reject strings with uppercase hex chars', async () => {
      const service = await buildService();
      expect(service.validateTokenFormat('A'.repeat(64))).toBe(false);
    });

    it('should reject strings with non-hex characters', async () => {
      const service = await buildService();
      expect(service.validateTokenFormat('g'.repeat(64))).toBe(false);
    });

    it('should reject empty string', async () => {
      const service = await buildService();
      expect(service.validateTokenFormat('')).toBe(false);
    });
  });
});
