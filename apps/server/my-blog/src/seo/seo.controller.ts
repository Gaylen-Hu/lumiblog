import { Controller, Get, Header } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiProduces } from '@nestjs/swagger';
import { SeoService } from './seo.service';

/**
 * SEO 公开控制器
 */
@ApiTags('SEO')
@Controller()
export class SeoController {
  constructor(private readonly seoService: SeoService) {}

  @ApiOperation({ summary: '获取 robots.txt', description: '获取搜索引擎爬虫配置文件' })
  @ApiProduces('text/plain')
  @ApiResponse({ status: 200, description: '返回 robots.txt 内容' })
  @Get('robots.txt')
  @Header('Content-Type', 'text/plain')
  getRobots(): string {
    return this.seoService.generateRobots();
  }

  @ApiOperation({ summary: '获取 sitemap.xml', description: '获取网站地图 XML 文件' })
  @ApiProduces('application/xml')
  @ApiResponse({ status: 200, description: '返回 sitemap.xml 内容' })
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
