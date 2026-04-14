import {
  Injectable,
  Logger,
  OnModuleDestroy,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import Redis from 'ioredis';

interface RefreshTokenMetadata {
  userId: string;
  createdAt: number;
}

/** Parse human-readable duration string (e.g. '7d', '24h', '30m') to seconds */
function parseDurationToSeconds(duration: string): number {
  const match = duration.match(/^(\d+)([dhms])$/);
  if (!match) {
    return 604800; // default 7d
  }
  const value = parseInt(match[1], 10);
  const unit = match[2];
  const multipliers: Record<string, number> = {
    d: 86400,
    h: 3600,
    m: 60,
    s: 1,
  };
  return value * (multipliers[unit] ?? 86400);
}

const HEX_64_REGEX = /^[0-9a-f]{64}$/;
const KEY_PREFIX = 'refresh_token';

@Injectable()
export class RefreshTokenService implements OnModuleDestroy {
  private readonly logger = new Logger(RefreshTokenService.name);
  private readonly redis: Redis;
  private readonly refreshTtlSeconds: number;
  private readonly maxSessions: number;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('REDIS_HOST', 'localhost');
    const port = this.configService.get<number>('REDIS_PORT', 6379);
    const password = this.configService.get<string>('REDIS_PASSWORD', '');

    this.redis = new Redis({
      host,
      port,
      password: password || undefined,
      lazyConnect: true,
      retryStrategy: (times: number) => Math.min(times * 200, 3000),
    });

    this.redis.on('error', (err: Error) => {
      this.logger.error(`Redis connection error: ${err.message}`);
    });

    // Connect eagerly so errors surface early
    this.redis.connect().catch((err: Error) => {
      this.logger.error(`Redis initial connect failed: ${err.message}`);
    });

    const refreshExpiry = this.configService.get<string>(
      'JWT_REFRESH_EXPIRES_IN',
      '7d',
    );
    this.refreshTtlSeconds = parseDurationToSeconds(refreshExpiry);
    this.maxSessions = this.configService.get<number>(
      'JWT_REFRESH_MAX_SESSIONS',
      5,
    );
  }

  async onModuleDestroy(): Promise<void> {
    try {
      await this.redis.quit();
      this.logger.log('Redis connection closed');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Failed to close Redis connection: ${message}`);
    }
  }

  /** Validate that a token is a 64-char lowercase hex string */
  validateTokenFormat(token: string): boolean {
    return HEX_64_REGEX.test(token);
  }

  /**
   * Generate a refresh token, store its hash in Redis, and enforce session limits.
   * Returns the plaintext token (64-char hex).
   */
  async createRefreshToken(userId: string): Promise<string> {
    try {
      const plaintext = crypto.randomBytes(32).toString('hex');
      const hash = this.hashToken(plaintext);
      const key = this.buildKey(userId, hash);

      const metadata: RefreshTokenMetadata = {
        userId,
        createdAt: Date.now(),
      };

      await this.redis.set(
        key,
        JSON.stringify(metadata),
        'EX',
        this.refreshTtlSeconds,
      );

      // Enforce max sessions — remove oldest if over limit
      await this.enforceSessionLimit(userId);

      return plaintext;
    } catch (err) {
      this.handleRedisError(err);
    }
  }

  /**
   * Validate and consume a refresh token (token rotation).
   * - Hash the input, SCAN for matching key, constant-time compare
   * - Delete old key, create new token
   * - Detect replay: if token was already consumed, revoke ALL user tokens
   */
  async validateAndConsume(
    refreshToken: string,
  ): Promise<{ userId: string; newRefreshToken: string }> {
    if (!this.validateTokenFormat(refreshToken)) {
      throw new UnauthorizedException({
        statusCode: 401,
        message: 'Invalid refresh token format',
        error: 'INVALID_TOKEN',
      });
    }

    try {
      const hash = this.hashToken(refreshToken);
      const allKeys = await this.scanUserKeys('*');

      // Find the key that matches this hash
      const matchingKey = this.findMatchingKey(allKeys, hash);

      if (!matchingKey) {
        // Token not found — could be replay attack.
        // Check if any user had this token previously by scanning all keys.
        // Since we can't determine the userId from a missing token,
        // we treat this as an invalid token.
        throw new UnauthorizedException({
          statusCode: 401,
          message: 'Invalid or expired refresh token',
          error: 'INVALID_TOKEN',
        });
      }

      // Parse metadata to get userId
      const raw = await this.redis.get(matchingKey);
      if (!raw) {
        // Key expired between SCAN and GET — treat as invalid
        throw new UnauthorizedException({
          statusCode: 401,
          message: 'Invalid or expired refresh token',
          error: 'INVALID_TOKEN',
        });
      }

      const metadata: RefreshTokenMetadata = JSON.parse(raw);
      const { userId } = metadata;

      // Delete the consumed token
      const deleted = await this.redis.del(matchingKey);

      if (deleted === 0) {
        // Token was already consumed — replay attack detected!
        this.logger.warn(
          `Replay attack detected for user ${userId}, revoking all tokens`,
        );
        await this.revokeAllUserTokens(userId);
        throw new UnauthorizedException({
          statusCode: 401,
          message: 'Token has already been used (possible replay attack)',
          error: 'TOKEN_REUSED',
        });
      }

      // Token rotation: create a new refresh token
      const newRefreshToken = await this.createRefreshToken(userId);

      return { userId, newRefreshToken };
    } catch (err) {
      if (err instanceof UnauthorizedException) {
        throw err;
      }
      this.handleRedisError(err);
    }
  }

  /** Revoke all refresh tokens for a user. Returns the number of deleted keys. */
  async revokeAllUserTokens(userId: string): Promise<number> {
    try {
      const keys = await this.scanUserKeys(userId);
      if (keys.length === 0) {
        return 0;
      }
      const deleted = await this.redis.del(...keys);
      this.logger.log(
        `Revoked ${deleted} refresh token(s) for user ${userId}`,
      );
      return deleted;
    } catch (err) {
      this.handleRedisError(err);
    }
  }

  /** Get the number of active refresh tokens for a user */
  async getActiveSessionCount(userId: string): Promise<number> {
    try {
      const keys = await this.scanUserKeys(userId);
      return keys.length;
    } catch (err) {
      this.handleRedisError(err);
    }
  }

  // ─── Private helpers ───────────────────────────────────────────────

  /** SHA-256 hash of a plaintext token */
  private hashToken(plaintext: string): string {
    return crypto.createHash('sha256').update(plaintext).digest('hex');
  }

  /** Build a Redis key from userId and token hash */
  private buildKey(userId: string, hash: string): string {
    return `${KEY_PREFIX}:${userId}:${hash}`;
  }

  /**
   * SCAN for all refresh_token keys matching a userId pattern.
   * Pass '*' to match all users.
   */
  private async scanUserKeys(userId: string): Promise<string[]> {
    const pattern = `${KEY_PREFIX}:${userId}:*`;
    const keys: string[] = [];
    let cursor = '0';

    do {
      const [nextCursor, batch] = await this.redis.scan(
        cursor,
        'MATCH',
        pattern,
        'COUNT',
        100,
      );
      cursor = nextCursor;
      keys.push(...batch);
    } while (cursor !== '0');

    return keys;
  }

  /**
   * Find a key whose hash segment matches the expected hash
   * using constant-time comparison.
   */
  private findMatchingKey(
    keys: string[],
    expectedHash: string,
  ): string | null {
    for (const key of keys) {
      // key format: refresh_token:{userId}:{hash}
      const parts = key.split(':');
      const keyHash = parts[parts.length - 1];
      if (this.constantTimeEqual(keyHash, expectedHash)) {
        return key;
      }
    }
    return null;
  }

  /** Constant-time string comparison to prevent timing attacks */
  private constantTimeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }
    const bufA = Buffer.from(a, 'utf8');
    const bufB = Buffer.from(b, 'utf8');
    return crypto.timingSafeEqual(bufA, bufB);
  }

  /** Enforce max sessions per user — remove oldest tokens if over limit */
  private async enforceSessionLimit(userId: string): Promise<void> {
    const keys = await this.scanUserKeys(userId);
    if (keys.length <= this.maxSessions) {
      return;
    }

    // Fetch metadata for all keys to sort by createdAt
    const entries: Array<{ key: string; createdAt: number }> = [];
    for (const key of keys) {
      const raw = await this.redis.get(key);
      if (raw) {
        const metadata: RefreshTokenMetadata = JSON.parse(raw);
        entries.push({ key, createdAt: metadata.createdAt });
      }
    }

    // Sort ascending by createdAt (oldest first)
    entries.sort((a, b) => a.createdAt - b.createdAt);

    // Remove oldest entries until we're at the limit
    const toRemove = entries.slice(0, entries.length - this.maxSessions);
    if (toRemove.length > 0) {
      await this.redis.del(...toRemove.map((e) => e.key));
      this.logger.log(
        `Removed ${toRemove.length} oldest session(s) for user ${userId}`,
      );
    }
  }

  /** Wrap Redis errors as ServiceUnavailableException (HTTP 503) */
  private handleRedisError(err: unknown): never {
    const message = err instanceof Error ? err.message : String(err);
    this.logger.error(`Redis operation failed: ${message}`);
    throw new ServiceUnavailableException(
      `Token service unavailable: ${message}`,
    );
  }
}
