import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import { CacheKeyRegistry } from '../redis';

/**
 * ThrottlerModule 配置单元测试
 * Validates: Requirements 5.4, 5.5
 *
 * 验证 ThrottlerModule.forRootAsync() 的三级限流配置和 Redis 存储配置。
 * 通过注入 THROTTLER:MODULE_OPTIONS 令牌获取解析后的配置进行断言。
 */
describe('AppModule - ThrottlerModule configuration', () => {
  const THROTTLER_OPTIONS = 'THROTTLER:MODULE_OPTIONS';

  let module: TestingModule;
  let resolvedOptions: {
    throttlers: Array<{ name: string; ttl: number; limit: number }>;
    storage: ThrottlerStorageRedisService;
  };

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [
            () => ({
              REDIS_HOST: '127.0.0.1',
              REDIS_PORT: 6380,
              REDIS_PASSWORD: 'test-pass',
            }),
          ],
        }),
        ThrottlerModule.forRootAsync({
          inject: [ConfigService],
          useFactory: (config: ConfigService) => ({
            throttlers: [
              { name: 'short', ttl: 10000, limit: 10 },
              { name: 'medium', ttl: 60000, limit: 30 },
              { name: 'long', ttl: 3600000, limit: 100 },
            ],
            storage: new ThrottlerStorageRedisService({
              host: config.get<string>('REDIS_HOST', 'localhost'),
              port: config.get<number>('REDIS_PORT', 6379),
              password: config.get<string>('REDIS_PASSWORD', ''),
              keyPrefix: CacheKeyRegistry.THROTTLER_PREFIX,
            }),
          }),
        }),
      ],
    }).compile();

    resolvedOptions = module.get(THROTTLER_OPTIONS);
  });

  afterAll(async () => {
    await module.close();
  });

  /**
   * Validates: Requirements 5.4
   * 保留现有三级限流配置（short: 10次/10秒、medium: 30次/60秒、long: 100次/3600秒）
   */
  describe('三级限流配置', () => {
    it('should configure exactly 3 throttlers', () => {
      expect(resolvedOptions.throttlers).toHaveLength(3);
    });

    it('should configure "short" throttler: ttl=10000, limit=10', () => {
      const short = resolvedOptions.throttlers.find(
        (t) => t.name === 'short',
      );
      expect(short).toBeDefined();
      expect(short!.ttl).toBe(10000);
      expect(short!.limit).toBe(10);
    });

    it('should configure "medium" throttler: ttl=60000, limit=30', () => {
      const medium = resolvedOptions.throttlers.find(
        (t) => t.name === 'medium',
      );
      expect(medium).toBeDefined();
      expect(medium!.ttl).toBe(60000);
      expect(medium!.limit).toBe(30);
    });

    it('should configure "long" throttler: ttl=3600000, limit=100', () => {
      const long = resolvedOptions.throttlers.find(
        (t) => t.name === 'long',
      );
      expect(long).toBeDefined();
      expect(long!.ttl).toBe(3600000);
      expect(long!.limit).toBe(100);
    });
  });

  /**
   * Validates: Requirements 5.5
   * 使用 ThrottlerStorageRedisService 作为存储，keyPrefix 为 CacheKeyRegistry.THROTTLER_PREFIX
   */
  describe('Redis 存储配置', () => {
    it('should use ThrottlerStorageRedisService as storage', () => {
      expect(resolvedOptions.storage).toBeInstanceOf(
        ThrottlerStorageRedisService,
      );
    });

    it('should configure storage with CacheKeyRegistry.THROTTLER_PREFIX as keyPrefix', () => {
      const redis = (resolvedOptions.storage as ThrottlerStorageRedisService)
        .redis;
      const options = redis.options;
      expect(options.keyPrefix).toBe(CacheKeyRegistry.THROTTLER_PREFIX);
    });
  });
});
