import { Inject, Injectable, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

/**
 * 缓存服务封装 - 提供带日志和降级的 Redis 缓存操作
 *
 * 所有 Redis 操作用 try/catch 包裹：
 * - get 失败返回 undefined（降级为缓存 miss）
 * - set/del 失败静默忽略
 * - wrap 失败直接执行 fn（降级为无缓存）
 * - 异常记录 Warn 日志
 */
@Injectable()
export class BlogCacheService {
  private readonly logger = new Logger(BlogCacheService.name);

  constructor(
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  /**
   * 获取缓存值，miss 或异常时返回 undefined
   * @param key 缓存键
   */
  async get<T>(key: string): Promise<T | undefined> {
    try {
      const value = await this.cacheManager.get<T>(key);
      if (value !== undefined && value !== null) {
        this.logger.debug(`Cache HIT: ${key}`);
        return value;
      }
      this.logger.debug(`Cache MISS: ${key}`);
      return undefined;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Cache GET failed for ${key}: ${message}`);
      return undefined;
    }
  }

  /**
   * 写入缓存，异常时静默忽略
   * @param key 缓存键
   * @param value 缓存值
   * @param ttl 过期时间（秒）
   */
  async set<T>(key: string, value: T, ttl: number): Promise<void> {
    try {
      const ttlMs = ttl * 1000;
      await this.cacheManager.set(key, value, ttlMs);
      this.logger.debug(`Cache SET: ${key}, TTL=${ttl}s`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Cache SET failed for ${key}: ${message}`);
    }
  }

  /**
   * 删除缓存，异常时静默忽略
   * @param key 缓存键
   */
  async del(key: string): Promise<void> {
    try {
      await this.cacheManager.del(key);
      this.logger.log(`Cache DEL: ${key}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Cache DEL failed for ${key}: ${message}`);
    }
  }

  /**
   * wrap 模式：缓存命中直接返回，未命中执行 fn 并写入缓存
   * 利用 cache-manager 内置的 wrap 防止缓存击穿
   * @param key 缓存键
   * @param fn 数据获取函数
   * @param ttl 过期时间（秒）
   */
  async wrap<T>(key: string, fn: () => Promise<T>, ttl: number): Promise<T> {
    try {
      const ttlMs = ttl * 1000;
      return await this.cacheManager.wrap<T>(key, fn, ttlMs);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Cache WRAP failed for ${key}: ${message}`);
      return fn();
    }
  }
}
