import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  SeoMeta,
  SitemapEntry,
  RobotsConfig,
  GenerateSeoParams,
} from './domain/seo.model';
import { SeoMetaResponseDto } from './dto';

@Injectable()
export class SeoService {
  private readonly logger = new Logger(SeoService.name);
  private readonly siteUrl: string;
  private readonly siteName: string;

  constructor(private readonly configService: ConfigService) {
    this.siteUrl = this.configService.get<string>('SITE_URL', 'http://localhost:3000');
    this.siteName = this.configService.get<string>('SITE_NAME', 'My Blog');
  }

  /**
   * 生成 SEO 元数据
   */
  generateMeta(params: GenerateSeoParams): SeoMetaResponseDto {
    const canonical = this.buildCanonical(params.type, params.slug);
    const fullTitle = `${params.title} | ${this.siteName}`;

    const meta: SeoMeta = {
      title: fullTitle,
      description: params.description || '',
      keywords: params.keywords || [],
      canonical,
      ogTitle: params.title,
      ogDescription: params.description || null,
      ogImage: params.image || null,
      noIndex: params.noIndex || false,
      noFollow: false,
    };

    return new SeoMetaResponseDto(meta);
  }

  /**
   * 生成 sitemap.xml 内容
   */
  generateSitemap(entries: SitemapEntry[]): string {
    const urlset = entries
      .map(
        (entry) => `
  <url>
    <loc>${entry.loc}</loc>
    <lastmod>${entry.lastmod}</lastmod>
    <changefreq>${entry.changefreq}</changefreq>
    <priority>${entry.priority}</priority>
  </url>`,
      )
      .join('');

    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urlset}
</urlset>`;
  }

  /**
   * 生成 robots.txt 内容
   */
  generateRobots(config?: Partial<RobotsConfig>): string {
    const defaultConfig: RobotsConfig = {
      userAgent: '*',
      allow: ['/'],
      disallow: ['/admin', '/api'],
      sitemap: `${this.siteUrl}/sitemap.xml`,
    };

    const finalConfig = { ...defaultConfig, ...config };

    const lines: string[] = [
      `User-agent: ${finalConfig.userAgent}`,
      ...finalConfig.allow.map((path) => `Allow: ${path}`),
      ...finalConfig.disallow.map((path) => `Disallow: ${path}`),
      '',
      `Sitemap: ${finalConfig.sitemap}`,
    ];

    return lines.join('\n');
  }

  /**
   * 创建 Sitemap 条目
   */
  createSitemapEntry(params: {
    path: string;
    lastmod: Date;
    changefreq?: SitemapEntry['changefreq'];
    priority?: number;
  }): SitemapEntry {
    return {
      loc: `${this.siteUrl}${params.path}`,
      lastmod: params.lastmod.toISOString().split('T')[0],
      changefreq: params.changefreq || 'weekly',
      priority: params.priority || 0.5,
    };
  }

  /**
   * 构建 canonical URL
   */
  private buildCanonical(type: string, slug: string): string {
    const pathMap: Record<string, string> = {
      article: '/posts',
      page: '/pages',
      category: '/categories',
      tag: '/tags',
    };

    const basePath = pathMap[type] || '';
    return `${this.siteUrl}${basePath}/${slug}`;
  }
}
