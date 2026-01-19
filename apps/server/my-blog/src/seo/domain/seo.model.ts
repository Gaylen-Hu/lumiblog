/**
 * SEO 元数据
 */
export interface SeoMeta {
  title: string;
  description: string;
  keywords: string[];
  canonical: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  ogImage: string | null;
  noIndex: boolean;
  noFollow: boolean;
}

/**
 * Sitemap 条目
 */
export interface SitemapEntry {
  loc: string;
  lastmod: string;
  changefreq: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority: number;
}

/**
 * Robots.txt 配置
 */
export interface RobotsConfig {
  userAgent: string;
  allow: string[];
  disallow: string[];
  sitemap: string;
}

/**
 * 生成 SEO 元数据参数
 */
export interface GenerateSeoParams {
  title: string;
  description?: string;
  keywords?: string[];
  slug: string;
  type: 'article' | 'page' | 'category' | 'tag';
  image?: string;
  noIndex?: boolean;
}
