import {
  Global,
  Inject,
  Logger,
  Module,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cache, CacheModule, CACHE_MANAGER } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-yet';
import { BlogCacheService } from './blog-cache.service';

/** 从 ConfigService 构建 Redis URL */
function buildRedisUrl(config: ConfigService): string {
  const host = config.get<string>('REDIS_HOST', 'localhost');
  const port = config.get<number>('REDIS_PORT', 6379);
  const password = config.get<string>('REDIS_PASSWORD', '');

  if (password) {
    return `redis://:${password}@${host}:${port}`;
  }
  return `redis://${host}:${port}`;
}

@Global()
@Module({
  imports: [
    CacheModule.registerAsync({
      isGlobal: true,
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => {
        const store = await redisStore({ url: buildRedisUrl(config) });
        return {
          stores: [store],
          ttl: 600 * 1000, // 默认 TTL 10 分钟（毫秒）
        };
      },
    }),
  ],
  providers: [BlogCacheService],
  exports: [BlogCacheService],
})
export class RedisModule implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisModule.name);

  constructor(
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  async onModuleInit(): Promise<void> {
    try {
      // 验证 Redis 连接：尝试一次 set + del 操作
      await this.cacheManager.set('blog:health-check', 'ok', 5000);
      await this.cacheManager.del('blog:health-check');
      this.logger.log('Redis connection established successfully');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `Redis connection failed, cache degraded: ${message}`,
      );
      // 缓存降级，不阻止启动
    }
  }

  async onModuleDestroy(): Promise<void> {
    try {
      const stores = (this.cacheManager as unknown as { store?: { client?: { quit?: () => Promise<void> } } }).store;
      if (stores?.client?.quit) {
        await stores.client.quit();
        this.logger.log('Redis connection closed');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Failed to close Redis connection: ${message}`);
    }
  }
}
