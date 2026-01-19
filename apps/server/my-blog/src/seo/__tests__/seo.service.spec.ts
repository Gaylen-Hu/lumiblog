import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SeoService } from '../seo.service';

describe('SeoService', () => {
  let service: SeoService;

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue: string) => {
      const config: Record<string, string> = {
        SITE_URL: 'https://example.com',
        SITE_NAME: 'My Blog',
      };
      return config[key] || defaultValue;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SeoService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<SeoService>(SeoService);
  });

  describe('generateMeta', () => {
    it('应该生成文章的 SEO 元数据', () => {
      // Arrange
      const inputParams = {
        title: '测试文章',
        description: '这是一篇测试文章',
        keywords: ['测试', 'NestJS'],
        slug: 'test-article',
        type: 'article' as const,
      };

      // Act
      const actual = service.generateMeta(inputParams);

      // Assert
      expect(actual.title).toBe('测试文章 | My Blog');
      expect(actual.description).toBe(inputParams.description);
      expect(actual.keywords).toEqual(inputParams.keywords);
      expect(actual.canonical).toBe('https://example.com/posts/test-article');
      expect(actual.ogTitle).toBe('测试文章');
    });

    it('应该生成分类的 canonical URL', () => {
      // Arrange
      const inputParams = {
        title: '技术',
        slug: 'tech',
        type: 'category' as const,
      };

      // Act
      const actual = service.generateMeta(inputParams);

      // Assert
      expect(actual.canonical).toBe('https://example.com/categories/tech');
    });

    it('应该生成标签的 canonical URL', () => {
      // Arrange
      const inputParams = {
        title: 'TypeScript',
        slug: 'typescript',
        type: 'tag' as const,
      };

      // Act
      const actual = service.generateMeta(inputParams);

      // Assert
      expect(actual.canonical).toBe('https://example.com/tags/typescript');
    });

    it('应该支持 noIndex 设置', () => {
      // Arrange
      const inputParams = {
        title: '草稿',
        slug: 'draft',
        type: 'article' as const,
        noIndex: true,
      };

      // Act
      const actual = service.generateMeta(inputParams);

      // Assert
      expect(actual.noIndex).toBe(true);
    });
  });

  describe('generateSitemap', () => {
    it('应该生成有效的 sitemap XML', () => {
      // Arrange
      const entries = [
        {
          loc: 'https://example.com/',
          lastmod: '2024-01-01',
          changefreq: 'daily' as const,
          priority: 1.0,
        },
        {
          loc: 'https://example.com/about',
          lastmod: '2024-01-01',
          changefreq: 'monthly' as const,
          priority: 0.8,
        },
      ];

      // Act
      const actual = service.generateSitemap(entries);

      // Assert
      expect(actual).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(actual).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
      expect(actual).toContain('<loc>https://example.com/</loc>');
      expect(actual).toContain('<priority>1</priority>');
      expect(actual).toContain('<changefreq>daily</changefreq>');
    });
  });

  describe('generateRobots', () => {
    it('应该生成默认的 robots.txt', () => {
      // Act
      const actual = service.generateRobots();

      // Assert
      expect(actual).toContain('User-agent: *');
      expect(actual).toContain('Allow: /');
      expect(actual).toContain('Disallow: /admin');
      expect(actual).toContain('Disallow: /api');
      expect(actual).toContain('Sitemap: https://example.com/sitemap.xml');
    });

    it('应该支持自定义配置', () => {
      // Arrange
      const config = {
        disallow: ['/private', '/secret'],
      };

      // Act
      const actual = service.generateRobots(config);

      // Assert
      expect(actual).toContain('Disallow: /private');
      expect(actual).toContain('Disallow: /secret');
    });
  });

  describe('createSitemapEntry', () => {
    it('应该创建 sitemap 条目', () => {
      // Arrange
      const inputParams = {
        path: '/posts/test',
        lastmod: new Date('2024-01-15'),
        changefreq: 'weekly' as const,
        priority: 0.7,
      };

      // Act
      const actual = service.createSitemapEntry(inputParams);

      // Assert
      expect(actual.loc).toBe('https://example.com/posts/test');
      expect(actual.lastmod).toBe('2024-01-15');
      expect(actual.changefreq).toBe('weekly');
      expect(actual.priority).toBe(0.7);
    });

    it('应该使用默认值', () => {
      // Arrange
      const inputParams = {
        path: '/posts/test',
        lastmod: new Date('2024-01-15'),
      };

      // Act
      const actual = service.createSitemapEntry(inputParams);

      // Assert
      expect(actual.changefreq).toBe('weekly');
      expect(actual.priority).toBe(0.5);
    });
  });
});
