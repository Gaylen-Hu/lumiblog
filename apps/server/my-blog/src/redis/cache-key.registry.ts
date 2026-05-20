/** 缓存键注册表 - 集中管理所有缓存键和 TTL */
export class CacheKeyRegistry {
  /** 命名空间前缀 */
  static readonly PREFIX = 'blog:';

  /** 站点配置 */
  static readonly SITE_CONFIG = 'blog:site-config';
  static readonly SITE_CONFIG_TTL = 3600; // 1 小时

  /** 公开分类列表 */
  static readonly PUBLIC_CATEGORIES = 'blog:public:categories';
  static readonly PUBLIC_CATEGORIES_TTL = 1800; // 30 分钟

  /** 公开标签列表 */
  static readonly PUBLIC_TAGS = 'blog:public:tags';
  static readonly PUBLIC_TAGS_TTL = 1800; // 30 分钟

  /** 公开专栏列表 */
  static readonly PUBLIC_COLUMNS = 'blog:public:columns';
  static readonly PUBLIC_COLUMNS_TTL = 1800; // 30 分钟

  /** 公开专栏详情（按 slug） */
  static publicColumnDetail(slug: string): string {
    return `blog:public:columns:${slug}`;
  }
  static readonly PUBLIC_COLUMN_DETAIL_TTL = 1800; // 30 分钟

  /** 限流键前缀 */
  static readonly THROTTLER_PREFIX = 'blog:throttler:';
}
