import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Logger } from '@nestjs/common';
import * as fc from 'fast-check';
import { BlogCacheService } from '../blog-cache.service';

describe('BlogCacheService', () => {
  let service: BlogCacheService;
  let mockCacheManager: Record<string, jest.Mock>;

  let debugSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;
  let logSpy: jest.SpyInstance;

  beforeEach(async () => {
    mockCacheManager = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      wrap: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BlogCacheService,
        { provide: CACHE_MANAGER, useValue: mockCacheManager },
      ],
    }).compile();

    service = module.get<BlogCacheService>(BlogCacheService);

    debugSpy = jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ─── get() ───────────────────────────────────────────────

  describe('get()', () => {
    /**
     * Validates: Requirements 7.1
     * 缓存命中时返回缓存值，记录 Debug 日志 "Cache HIT: {key}"
     */
    it('cache hit: returns cached value and logs debug "Cache HIT"', async () => {
      const cached = { title: 'hello' };
      mockCacheManager.get.mockResolvedValue(cached);

      const result = await service.get('blog:site-config');

      expect(result).toEqual(cached);
      expect(mockCacheManager.get).toHaveBeenCalledWith('blog:site-config');
      expect(debugSpy).toHaveBeenCalledWith(
        expect.stringContaining('Cache HIT: blog:site-config'),
      );
    });

    /**
     * Validates: Requirements 7.2
     * 缓存未命中时返回 undefined，记录 Debug 日志 "Cache MISS: {key}"
     */
    it('cache miss (null): returns undefined and logs debug "Cache MISS"', async () => {
      mockCacheManager.get.mockResolvedValue(null);

      const result = await service.get('blog:site-config');

      expect(result).toBeUndefined();
      expect(debugSpy).toHaveBeenCalledWith(
        expect.stringContaining('Cache MISS: blog:site-config'),
      );
    });

    it('cache miss (undefined): returns undefined and logs debug "Cache MISS"', async () => {
      mockCacheManager.get.mockResolvedValue(undefined);

      const result = await service.get('blog:missing-key');

      expect(result).toBeUndefined();
      expect(debugSpy).toHaveBeenCalledWith(
        expect.stringContaining('Cache MISS: blog:missing-key'),
      );
    });

    /**
     * Validates: Requirements 1.4
     * Redis 异常时降级返回 undefined，记录 Warn 日志
     */
    it('Redis error: returns undefined and logs warn', async () => {
      mockCacheManager.get.mockRejectedValue(new Error('Connection refused'));

      const result = await service.get('blog:site-config');

      expect(result).toBeUndefined();
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Cache GET failed'),
      );
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('blog:site-config'),
      );
    });
  });

  // ─── set() ───────────────────────────────────────────────

  describe('set()', () => {
    /**
     * Validates: Requirements 7.3
     * 成功写入缓存，调用 cacheManager.set(key, value, ttl*1000)，记录 Debug 日志含 key 和 TTL
     */
    it('success: calls cacheManager.set with ttl*1000 and logs debug', async () => {
      mockCacheManager.set.mockResolvedValue(undefined);

      await service.set('blog:site-config', { title: 'test' }, 3600);

      expect(mockCacheManager.set).toHaveBeenCalledWith(
        'blog:site-config',
        { title: 'test' },
        3600 * 1000,
      );
      expect(debugSpy).toHaveBeenCalledWith(
        expect.stringContaining('blog:site-config'),
      );
      expect(debugSpy).toHaveBeenCalledWith(
        expect.stringContaining('TTL=3600s'),
      );
    });

    /**
     * Validates: Requirements 1.4
     * Redis 异常时静默忽略，记录 Warn 日志
     */
    it('Redis error: silently ignores and logs warn', async () => {
      mockCacheManager.set.mockRejectedValue(new Error('READONLY'));

      await expect(
        service.set('blog:site-config', { title: 'test' }, 3600),
      ).resolves.toBeUndefined();

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Cache SET failed'),
      );
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('blog:site-config'),
      );
    });
  });

  // ─── del() ───────────────────────────────────────────────

  describe('del()', () => {
    /**
     * Validates: Requirements 7.4
     * 成功删除缓存，调用 cacheManager.del，记录 Log 级别日志 "Cache DEL: {key}"
     */
    it('success: calls cacheManager.del and logs "Cache DEL"', async () => {
      mockCacheManager.del.mockResolvedValue(undefined);

      await service.del('blog:site-config');

      expect(mockCacheManager.del).toHaveBeenCalledWith('blog:site-config');
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Cache DEL: blog:site-config'),
      );
    });

    /**
     * Validates: Requirements 1.4
     * Redis 异常时静默忽略，记录 Warn 日志
     */
    it('Redis error: silently ignores and logs warn', async () => {
      mockCacheManager.del.mockRejectedValue(new Error('Connection lost'));

      await expect(service.del('blog:site-config')).resolves.toBeUndefined();

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Cache DEL failed'),
      );
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('blog:site-config'),
      );
    });
  });

  // ─── wrap() ──────────────────────────────────────────────

  describe('wrap()', () => {
    /**
     * Validates: Requirements 1.4
     * 成功时委托给 cacheManager.wrap，传入 ttl*1000
     */
    it('success: delegates to cacheManager.wrap with ttl*1000', async () => {
      const data = { id: 1, name: 'test' };
      mockCacheManager.wrap.mockResolvedValue(data);
      const fn = jest.fn().mockResolvedValue(data);

      const result = await service.wrap('blog:site-config', fn, 3600);

      expect(result).toEqual(data);
      expect(mockCacheManager.wrap).toHaveBeenCalledWith(
        'blog:site-config',
        fn,
        3600 * 1000,
      );
    });

    /**
     * Validates: Requirements 1.4
     * Redis 异常时降级直接调用 fn()，记录 Warn 日志
     */
    it('Redis error: falls back to calling fn() directly and logs warn', async () => {
      const data = { id: 1, name: 'fallback' };
      mockCacheManager.wrap.mockRejectedValue(new Error('Redis down'));
      const fn = jest.fn().mockResolvedValue(data);

      const result = await service.wrap('blog:site-config', fn, 3600);

      expect(result).toEqual(data);
      expect(fn).toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Cache WRAP failed'),
      );
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('blog:site-config'),
      );
    });
  });

  // ─── Property-Based Tests ────────────────────────────────

  /**
   * Feature: redis-integration, Property 3: Cache operation logging
   * Validates: Requirements 7.1, 7.2, 7.3, 7.4
   *
   * 使用 fast-check 生成任意非空缓存键字符串，验证 get/set/del 操作后
   * Logger 输出的日志消息中包含该缓存键。对于 set 操作，日志还必须包含 TTL 值。
   */
  describe('Property 3: Cache operation logging contains key name', () => {
    const nonEmptyString = fc.string({ minLength: 1 });

    it('get() logs debug message containing the key on cache hit', async () => {
      await fc.assert(
        fc.asyncProperty(nonEmptyString, async (key) => {
          debugSpy.mockClear();
          mockCacheManager.get.mockResolvedValue({ data: 'cached' });

          await service.get(key);

          const calls = debugSpy.mock.calls.map(
            (args: unknown[]) => args[0] as string,
          );
          expect(calls.some((msg) => msg.includes(key))).toBe(true);
        }),
        { numRuns: 100 },
      );
    });

    it('get() logs debug message containing the key on cache miss', async () => {
      await fc.assert(
        fc.asyncProperty(nonEmptyString, async (key) => {
          debugSpy.mockClear();
          mockCacheManager.get.mockResolvedValue(null);

          await service.get(key);

          const calls = debugSpy.mock.calls.map(
            (args: unknown[]) => args[0] as string,
          );
          expect(calls.some((msg) => msg.includes(key))).toBe(true);
        }),
        { numRuns: 100 },
      );
    });

    it('set() logs debug message containing both the key and TTL value', async () => {
      await fc.assert(
        fc.asyncProperty(
          nonEmptyString,
          fc.integer({ min: 1, max: 86400 }),
          async (key, ttl) => {
            debugSpy.mockClear();
            mockCacheManager.set.mockResolvedValue(undefined);

            await service.set(key, { value: 'test' }, ttl);

            const calls = debugSpy.mock.calls.map(
              (args: unknown[]) => args[0] as string,
            );
            expect(calls.some((msg) => msg.includes(key))).toBe(true);
            expect(
              calls.some((msg) => msg.includes(String(ttl))),
            ).toBe(true);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('del() logs log-level message containing the key', async () => {
      await fc.assert(
        fc.asyncProperty(nonEmptyString, async (key) => {
          logSpy.mockClear();
          mockCacheManager.del.mockResolvedValue(undefined);

          await service.del(key);

          const calls = logSpy.mock.calls.map(
            (args: unknown[]) => args[0] as string,
          );
          expect(calls.some((msg) => msg.includes(key))).toBe(true);
        }),
        { numRuns: 100 },
      );
    });
  });

  /**
   * Feature: redis-integration, Property 1: JSON serialization round-trip
   * Validates: Requirements 1.6
   *
   * 使用 fast-check 生成任意 JSON 兼容对象，模拟 Redis 的 JSON.stringify/JSON.parse
   * round-trip，验证 set 后 get 返回结构等价数据。
   *
   * 注意：BlogCacheService.get() 将 null 视为 cache miss 返回 undefined，
   * 因此排除顶层 null 值（嵌套 null 仍然被测试）。
   */
  describe('Property 1: JSON round-trip', () => {
    it('set(key, value, ttl) followed by get(key) returns structurally equivalent data', async () => {
      const store = new Map<string, string>();

      mockCacheManager.set.mockImplementation(
        async (key: string, value: unknown) => {
          store.set(key, JSON.stringify(value));
        },
      );

      mockCacheManager.get.mockImplementation(async (key: string) => {
        const raw = store.get(key);
        if (raw === undefined) return undefined;
        return JSON.parse(raw);
      });

      // fc.jsonValue() 排除顶层 null（服务将 null 视为 miss），嵌套 null 仍被覆盖
      // 同时排除 -0，因为 JSON.parse(JSON.stringify(-0)) === 0（JSON 规范行为）
      const nonNullJsonValue = fc
        .jsonValue()
        .filter((v) => v !== null)
        .map((v) => JSON.parse(JSON.stringify(v)));

      await fc.assert(
        fc.asyncProperty(nonNullJsonValue, async (original) => {
          const key = 'blog:pbt:round-trip';
          const ttl = 60;

          store.clear();

          await service.set(key, original, ttl);
          const retrieved = await service.get(key);

          expect(retrieved).toEqual(original);
        }),
        { numRuns: 100 },
      );
    });
  });
});
