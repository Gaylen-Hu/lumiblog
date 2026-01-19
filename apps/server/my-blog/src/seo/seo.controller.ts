import { Controller, Get, Header } from '@nestjs/common';
import { SeoService } from './seo.service';

/**
 * SEO 公开控制器
 */
@Controller()
export class SeoController {
  constructor(private readonly seoService: SeoService) {}

  /**
   * 获取 robots.txt
   */
  @Get('robots.txt')
  @Header('Content-Type', 'text/plain')
  getRobots(): string {
    return this.seoService.generateRobots();
  }

  /**
   * 获取 sitemap.xml
   * TODO: 集成文章、分类、标签数据
   */
  @Get('sitemap.xml')
  @Header('Content-Type', 'application/xml')
  getSitemap(): string {
    // 示例：静态页面
    const entries = [
      this.seoService.createSitemapEntry({
        path: '/',
        lastmod: new Date(),
        changefreq: 'daily',
        priority: 1.0,
      }),
      this.seoService.createSitemapEntry({
        path: '/about',
        lastmod: new Date(),
        changefreq: 'monthly',
        priority: 0.8,
      }),
    ];

    return this.seoService.generateSitemap(entries);
  }
}
