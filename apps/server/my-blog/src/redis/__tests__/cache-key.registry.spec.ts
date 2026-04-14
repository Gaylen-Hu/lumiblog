import * as fc from 'fast-check';
import { CacheKeyRegistry } from '../cache-key.registry';

/**
 * Property 2: CacheKeyRegistry 键注册表不变量
 * Validates: Requirements 6.1, 6.2, 6.3
 */
describe('CacheKeyRegistry - Property 2: 键注册表不变量', () => {
  /** 获取所有静态属性名 */
  const allKeys = Object.getOwnPropertyNames(CacheKeyRegistry).filter(
    (key) => !['length', 'name', 'prototype'].includes(key),
  );

  /** 缓存键属性（排除 TTL、PREFIX、THROTTLER_PREFIX） */
  const cacheKeys = allKeys.filter(
    (key) =>
      !key.endsWith('_TTL') && key !== 'PREFIX' && key !== 'THROTTLER_PREFIX',
  );

  /** 所有键值（string 类型的静态属性） */
  const allStringValues = allKeys
    .map((key) => ({
      name: key,
      value: (CacheKeyRegistry as Record<string, unknown>)[key],
    }))
    .filter((entry): entry is { name: string; value: string } =>
      typeof entry.value === 'string',
    );

  /**
   * **Validates: Requirements 6.2**
   * 所有缓存键值必须以 'blog:' 前缀开头
   */
  it('所有缓存键值以 blog: 前缀开头', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...allStringValues),
        (entry) => {
          expect(entry.value).toMatch(/^blog:/);
        },
      ),
      { numRuns: allStringValues.length * 10 },
    );
  });

  /**
   * **Validates: Requirements 6.3**
   * 所有键值互不相同（唯一性）
   */
  it('所有键值唯一，无重复', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...allStringValues),
        fc.constantFrom(...allStringValues),
        (a, b) => {
          if (a.name !== b.name) {
            expect(a.value).not.toBe(b.value);
          }
        },
      ),
      { numRuns: allStringValues.length ** 2 },
    );
  });

  /**
   * **Validates: Requirements 6.1**
   * 每个缓存键有对应的 _TTL 常量
   */
  it('每个缓存键有对应的 _TTL 常量', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...cacheKeys),
        (keyName) => {
          const ttlName = `${keyName}_TTL`;
          const ttlValue = (CacheKeyRegistry as Record<string, unknown>)[
            ttlName
          ];
          expect(ttlValue).toBeDefined();
          expect(typeof ttlValue).toBe('number');
          expect(ttlValue).toBeGreaterThan(0);
        },
      ),
      { numRuns: cacheKeys.length * 10 },
    );
  });
});
