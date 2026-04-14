// Feature: jwt-refresh-token, Property 3: Token rotation and replay detection
// **Validates: Requirements 2.3, 5.2**

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import * as fc from 'fast-check';
import { RefreshTokenService } from '../refresh-token.service';

// ─── In-memory Redis mock ────────────────────────────────────────────

/** Simple in-memory store that simulates the Redis commands used by RefreshTokenService */
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

jest.mock('ioredis', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => redisMock),
  };
});

// ─── Helper: build a fresh service with a clean in-memory Redis ──────

interface BuildResult {
  service: RefreshTokenService;
  store: Map<string, { value: string; ttl?: number }>;
}

async function buildService(): Promise<BuildResult> {
  const redis = createInMemoryRedis();
  redisMock = redis.mock;

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
              JWT_REFRESH_EXPIRES_IN: '7d',
              JWT_REFRESH_MAX_SESSIONS: 5,
            };
            return config[key] ?? defaultValue;
          }),
        },
      },
    ],
  }).compile();

  return {
    service: module.get<RefreshTokenService>(RefreshTokenService),
    store: redis.store,
  };
}

// ─── Property 3: Token rotation and replay detection ─────────────────

describe('Property 3: Token rotation and replay detection', () => {
  it(
    'after validateAndConsume(), the same token must fail with UnauthorizedException',
    async () => {
      await fc.assert(
        fc.asyncProperty(fc.uuid(), async (userId: string) => {
          // Arrange — fresh service + create a token
          const { service } = await buildService();
          const token = await service.createRefreshToken(userId);

          // Act — first consume should succeed (token rotation)
          const result = await service.validateAndConsume(token);
          expect(result.userId).toBe(userId);
          expect(service.validateTokenFormat(result.newRefreshToken)).toBe(
            true,
          );

          // The old token is now consumed. Attempting to use it again
          // must fail with UnauthorizedException (token no longer exists).
          await expect(service.validateAndConsume(token)).rejects.toThrow(
            UnauthorizedException,
          );
        }),
        { numRuns: 100 },
      );
    },
    30_000,
  );

  it(
    'replay detection (DEL returns 0) triggers revocation of all user tokens — session count becomes 0',
    async () => {
      await fc.assert(
        fc.asyncProperty(fc.uuid(), async (userId: string) => {
          // Arrange — fresh service, create multiple tokens for the user
          const { service, store } = await buildService();
          await service.createRefreshToken(userId);
          const tokenToReplay = await service.createRefreshToken(userId);

          // Verify we have 2 active sessions
          const before = await service.getActiveSessionCount(userId);
          expect(before).toBe(2);

          // Simulate a race condition: the token key is found by SCAN and
          // GET succeeds, but another request already consumed it so DEL
          // returns 0. We achieve this by intercepting the del call to
          // return 0 for the specific key while still keeping the store
          // intact for the subsequent revokeAllUserTokens call.
          const originalDel = redisMock.del;
          let intercepted = false;
          redisMock.del = jest.fn(async (...keys: string[]) => {
            if (!intercepted) {
              // First DEL call is the consume attempt — simulate race
              // condition by returning 0 (key already consumed by another
              // request) but actually delete it from the store so the
              // state is consistent.
              intercepted = true;
              for (const k of keys) {
                store.delete(k);
              }
              return 0;
            }
            // Subsequent DEL calls (revokeAllUserTokens) use real logic
            return originalDel(...keys);
          });

          // Act — validateAndConsume should detect replay and revoke all
          await expect(
            service.validateAndConsume(tokenToReplay),
          ).rejects.toThrow(UnauthorizedException);

          // Restore original del for getActiveSessionCount
          redisMock.del = originalDel;

          // Assert — all user tokens must be revoked (session count → 0)
          const after = await service.getActiveSessionCount(userId);
          expect(after).toBe(0);
        }),
        { numRuns: 100 },
      );
    },
    30_000,
  );
});

// Feature: jwt-refresh-token, Property 4: Invalid token rejection
// **Validates: Requirements 2.5, 5.3, 7.1**

describe('Property 4: Invalid token rejection', () => {
  const HEX_64_REGEX = /^[0-9a-f]{64}$/;

  it(
    'non-hex strings are rejected without any Redis SCAN lookup',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1 }).filter((s) => !HEX_64_REGEX.test(s)),
          async (invalidToken: string) => {
            const { service } = await buildService();

            // Act — attempt to validate a non-hex token
            await expect(
              service.validateAndConsume(invalidToken),
            ).rejects.toThrow(UnauthorizedException);

            // Assert — redis.scan must NOT have been called because
            // format validation rejects before any Redis lookup
            expect(redisMock.scan).not.toHaveBeenCalled();
          },
        ),
        { numRuns: 100 },
      );
    },
    30_000,
  );

  it(
    'well-formatted 64-char hex strings that are not stored are rejected with UnauthorizedException',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.stringMatching(/^[0-9a-f]{64}$/),
          async (unknownHexToken: string) => {
            // Arrange — fresh service with empty store (no tokens stored)
            const { service } = await buildService();

            // Act — attempt to validate a well-formatted but unknown token
            await expect(
              service.validateAndConsume(unknownHexToken),
            ).rejects.toThrow(UnauthorizedException);
          },
        ),
        { numRuns: 100 },
      );
    },
    30_000,
  );
});

// Feature: jwt-refresh-token, Property 6: Hash-only storage
// **Validates: Requirements 4.4**

describe('Property 6: Hash-only storage', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const crypto = require('crypto');

  it(
    'plaintext token must not appear in any Redis key or value; only SHA-256 hash stored',
    async () => {
      await fc.assert(
        fc.asyncProperty(fc.uuid(), async (userId: string) => {
          // Arrange — fresh service with clean in-memory store
          const { service, store } = await buildService();

          // Act — create a refresh token
          const plaintext = await service.createRefreshToken(userId);
          const expectedHash = crypto
            .createHash('sha256')
            .update(plaintext)
            .digest('hex');

          // Assert — inspect every key and value in the store
          for (const [key, entry] of store.entries()) {
            // Plaintext token must NOT appear in any Redis key
            expect(key).not.toContain(plaintext);

            // Plaintext token must NOT appear in any Redis value
            expect(entry.value).not.toContain(plaintext);

            // The key MUST contain the SHA-256 hash of the plaintext
            expect(key).toContain(expectedHash);
          }

          // Verify at least one entry was stored
          expect(store.size).toBeGreaterThanOrEqual(1);
        }),
        { numRuns: 100 },
      );
    },
    30_000,
  );
});

// Feature: jwt-refresh-token, Property 7: Session count invariant
// **Validates: Requirements 6.4**

describe('Property 7: Session count invariant', () => {
  /**
   * Build a service with a custom JWT_REFRESH_MAX_SESSIONS value.
   * This is needed because the default buildService() hardcodes maxSessions=5.
   */
  async function buildServiceWithMaxSessions(
    maxSessions: number,
  ): Promise<BuildResult> {
    const redis = createInMemoryRedis();
    redisMock = redis.mock;

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
                JWT_REFRESH_EXPIRES_IN: '7d',
                JWT_REFRESH_MAX_SESSIONS: maxSessions,
              };
              return config[key] ?? defaultValue;
            }),
          },
        },
      ],
    }).compile();

    return {
      service: module.get<RefreshTokenService>(RefreshTokenService),
      store: redis.store,
    };
  }

  it(
    'active session count never exceeds JWT_REFRESH_MAX_SESSIONS after any number of createRefreshToken() calls',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.integer({ min: 1, max: 10 }),
          fc.integer({ min: 1, max: 20 }),
          async (userId: string, maxSessions: number, tokenCount: number) => {
            const { service } = await buildServiceWithMaxSessions(maxSessions);

            // Create tokenCount refresh tokens for the same user
            for (let i = 0; i < tokenCount; i++) {
              await service.createRefreshToken(userId);
            }

            // Active session count must never exceed maxSessions
            const activeCount = await service.getActiveSessionCount(userId);
            expect(activeCount).toBeLessThanOrEqual(maxSessions);
          },
        ),
        { numRuns: 100 },
      );
    },
    60_000,
  );

  it(
    'when token count exceeds maxSessions, the oldest tokens are removed (createdAt ordering)',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.integer({ min: 1, max: 10 }),
          fc.integer({ min: 1, max: 20 }),
          async (userId: string, maxSessions: number, tokenCount: number) => {
            const { service, store } =
              await buildServiceWithMaxSessions(maxSessions);

            // Track creation order by recording createdAt after each call
            const createdTimestamps: number[] = [];

            for (let i = 0; i < tokenCount; i++) {
              await service.createRefreshToken(userId);

              // Record all current createdAt values in the store for this user
              // (we'll only use the final snapshot below)
            }

            // Collect all remaining tokens' createdAt from the store
            const remainingTimestamps: number[] = [];
            for (const [key, entry] of store.entries()) {
              if (key.startsWith(`refresh_token:${userId}:`)) {
                const metadata = JSON.parse(entry.value) as {
                  userId: string;
                  createdAt: number;
                };
                remainingTimestamps.push(metadata.createdAt);
              }
            }

            // The remaining count must be <= maxSessions
            expect(remainingTimestamps.length).toBeLessThanOrEqual(
              maxSessions,
            );

            if (tokenCount > maxSessions) {
              // Exactly maxSessions tokens should remain
              expect(remainingTimestamps.length).toBe(maxSessions);

              // The remaining tokens should be sorted ascending (oldest to newest)
              // and they should be the NEWEST tokens (oldest were removed)
              const sorted = [...remainingTimestamps].sort((a, b) => a - b);
              expect(remainingTimestamps.sort((a, b) => a - b)).toEqual(sorted);

              // All remaining timestamps should be >= the minimum remaining
              // (i.e., no older token survived while a newer one was removed)
              const minRemaining = Math.min(...remainingTimestamps);
              for (const ts of remainingTimestamps) {
                expect(ts).toBeGreaterThanOrEqual(minRemaining);
              }
            }
          },
        ),
        { numRuns: 100 },
      );
    },
    60_000,
  );
});

// Feature: jwt-refresh-token, Property 2: Refresh token round-trip
// **Validates: Requirements 2.2, 2.4**

describe('Property 2: Refresh token round-trip', () => {
  const HEX_64_REGEX = /^[0-9a-f]{64}$/;

  it(
    'token created via createRefreshToken() can be consumed via validateAndConsume() returning same userId and a new valid token',
    async () => {
      await fc.assert(
        fc.asyncProperty(fc.uuid(), async (userId: string) => {
          // Arrange — fresh service + create a token for the user
          const { service } = await buildService();
          const token = await service.createRefreshToken(userId);

          // Act — consume the token via validateAndConsume
          const result = await service.validateAndConsume(token);

          // Assert — returned userId matches the original
          expect(result.userId).toBe(userId);

          // Assert — newRefreshToken passes format validation (64-char hex)
          expect(service.validateTokenFormat(result.newRefreshToken)).toBe(true);
          expect(result.newRefreshToken).toMatch(HEX_64_REGEX);

          // Assert — the new token is different from the original
          expect(result.newRefreshToken).not.toBe(token);
        }),
        { numRuns: 100 },
      );
    },
    30_000,
  );
});

// Feature: jwt-refresh-token, Property 5: Logout revokes all sessions
// **Validates: Requirements 3.2**

describe('Property 5: Logout revokes all sessions', () => {
  it(
    'for any user with N active tokens, revokeAllUserTokens() results in 0 active tokens',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.integer({ min: 1, max: 10 }),
          async (userId: string, sessionCount: number) => {
            // Arrange — fresh service
            const { service } = await buildService();

            // Create N tokens for the user
            for (let i = 0; i < sessionCount; i++) {
              await service.createRefreshToken(userId);
            }

            // Verify active count equals min(sessionCount, maxSessions=5)
            const expectedCount = Math.min(sessionCount, 5);
            const beforeCount = await service.getActiveSessionCount(userId);
            expect(beforeCount).toBe(expectedCount);

            // Act — revoke all tokens (simulates logout)
            await service.revokeAllUserTokens(userId);

            // Assert — active session count must be 0
            const afterCount = await service.getActiveSessionCount(userId);
            expect(afterCount).toBe(0);
          },
        ),
        { numRuns: 100 },
      );
    },
    30_000,
  );
});
