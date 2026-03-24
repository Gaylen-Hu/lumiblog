import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PublicService } from '../public.service';
import { PrismaService } from '../../prisma/prisma.service';
import { SiteConfigService } from '../../site-config/site-config.service';
import * as fc from 'fast-check';

// ─── Mock article builder ───────────────────────────────────────────

function buildMockArticle(overrides: Partial<{
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  content: string | null;
  coverImage: string | null;
  isPublished: boolean;
  publishedAt: Date | null;
  seoTitle: string | null;
  seoDescription: string | null;
  categoryId: string | null;
  viewCount: number;
  createdAt: Date;
  updatedAt: Date;
  locale: string | null;
  translationGroupId: string | null;
  category: { id: string; name: string; slug: string } | null;
  tags: Array<{
    id: string;
    articleId: string;
    tagId: string;
    tag: { id: string; name: string; slug: string };
  }>;
}> = {}) {
  const now = new Date();
  return {
    id: overrides.id ?? 'article-1',
    title: overrides.title ?? '测试文章',
    slug: overrides.slug ?? 'test-article',
    summary: overrides.summary ?? '摘要',
    content: overrides.content ?? '这是文章内容',
    coverImage: overrides.coverImage ?? null,
    isPublished: overrides.isPublished ?? true,
    publishedAt: overrides.publishedAt ?? now,
    seoTitle: overrides.seoTitle ?? null,
    seoDescription: overrides.seoDescription ?? null,
    categoryId: overrides.categoryId ?? null,
    viewCount: overrides.viewCount ?? 0,
    createdAt: overrides.createdAt ?? now,
    updatedAt: overrides.updatedAt ?? now,
    locale: overrides.locale ?? null,
    translationGroupId: overrides.translationGroupId ?? null,
    category: overrides.category ?? null,
    tags: overrides.tags ?? [],
  };
}


// ─── Test suite ─────────────────────────────────────────────────────

describe('PublicService', () => {
  let service: PublicService;
  let prisma: {
    article: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      count: jest.Mock;
      update: jest.Mock;
    };
    category: { findMany: jest.Mock };
    tag: { findMany: jest.Mock };
    project: { findMany: jest.Mock; count: jest.Mock };
  };
  let siteConfigService: { getConfig: jest.Mock };

  beforeEach(async () => {
    prisma = {
      article: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
        update: jest.fn().mockResolvedValue({}),
      },
      category: { findMany: jest.fn().mockResolvedValue([]) },
      tag: { findMany: jest.fn().mockResolvedValue([]) },
      project: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
    };
    siteConfigService = { getConfig: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PublicService,
        { provide: PrismaService, useValue: prisma },
        { provide: SiteConfigService, useValue: siteConfigService },
      ],
    }).compile();

    service = module.get<PublicService>(PublicService);
  });

  // ─── getArticles ────────────────────────────────────────────────

  describe('getArticles', () => {
    it('应返回已发布文章的分页列表', async () => {
      // Arrange
      const mockArticles = [buildMockArticle()];
      prisma.article.findMany.mockResolvedValue(mockArticles);
      prisma.article.count.mockResolvedValue(1);

      // Act
      const result = await service.getArticles({ page: 1, pageSize: 10 });

      // Assert
      expect(result.total).toBe(1);
      expect(result.data).toHaveLength(1);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(10);
      expect(prisma.article.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isPublished: true }),
        }),
      );
    });

    it('应支持按分类 slug 筛选', async () => {
      // Arrange
      prisma.article.findMany.mockResolvedValue([]);
      prisma.article.count.mockResolvedValue(0);

      // Act
      await service.getArticles({ page: 1, pageSize: 10, category: 'tech' });

      // Assert
      expect(prisma.article.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isPublished: true,
            category: { slug: 'tech' },
          }),
        }),
      );
    });

    it('应支持按标签 slug 筛选', async () => {
      // Arrange
      prisma.article.findMany.mockResolvedValue([]);
      prisma.article.count.mockResolvedValue(0);

      // Act
      await service.getArticles({ page: 1, pageSize: 10, tag: 'typescript' });

      // Assert
      expect(prisma.article.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isPublished: true,
            tags: { some: { tag: { slug: 'typescript' } } },
          }),
        }),
      );
    });

    it('应支持关键词搜索', async () => {
      // Arrange
      prisma.article.findMany.mockResolvedValue([]);
      prisma.article.count.mockResolvedValue(0);

      // Act
      await service.getArticles({ page: 1, pageSize: 10, search: 'NestJS' });

      // Assert
      expect(prisma.article.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isPublished: true,
            OR: [
              { title: { contains: 'NestJS', mode: 'insensitive' } },
              { summary: { contains: 'NestJS', mode: 'insensitive' } },
            ],
          }),
        }),
      );
    });

    it('应正确计算分页偏移量', async () => {
      // Arrange
      prisma.article.findMany.mockResolvedValue([]);
      prisma.article.count.mockResolvedValue(0);

      // Act
      await service.getArticles({ page: 3, pageSize: 5 });

      // Assert
      expect(prisma.article.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 5 }),
      );
    });
  });

  // ─── getArticleBySlug ──────────────────────────────────────────

  describe('getArticleBySlug', () => {
    it('应返回文章详情', async () => {
      // Arrange
      const mockArticle = buildMockArticle({ slug: 'my-post' });
      prisma.article.findFirst
        .mockResolvedValueOnce(mockArticle) // 主文章
        .mockResolvedValueOnce(null)        // prev = null
        .mockResolvedValueOnce(null);       // next = null

      // Act
      const result = await service.getArticleBySlug('my-post');

      // Assert
      expect(result.slug).toBe('my-post');
      expect(result.title).toBe('测试文章');
      expect(prisma.article.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { slug: 'my-post', isPublished: true },
        }),
      );
    });

    it('文章不存在时应抛出 NotFoundException', async () => {
      // Arrange
      prisma.article.findFirst.mockResolvedValueOnce(null);

      // Act & Assert
      await expect(service.getArticleBySlug('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('应异步递增阅读量', async () => {
      // Arrange
      const mockArticle = buildMockArticle({ id: 'art-1' });
      prisma.article.findFirst
        .mockResolvedValueOnce(mockArticle) // 主文章
        .mockResolvedValueOnce(null)        // prev = null
        .mockResolvedValueOnce(null);       // next = null
      prisma.article.update.mockResolvedValue(mockArticle);

      // Act
      await service.getArticleBySlug('test-article');

      // Assert
      expect(prisma.article.update).toHaveBeenCalledWith({
        where: { id: 'art-1' },
        data: { viewCount: { increment: 1 } },
      });
    });

    it('中间文章应返回正确的 prevArticle 和 nextArticle', async () => {
      // Arrange
      const now = new Date('2024-06-01T00:00:00Z');
      const prevDate = new Date('2024-05-01T00:00:00Z');
      const nextDate = new Date('2024-07-01T00:00:00Z');
      const mockArticle = buildMockArticle({ slug: 'middle-post', publishedAt: now });
      const prevMock = { slug: 'older-post', title: '更早的文章', publishedAt: prevDate };
      const nextMock = { slug: 'newer-post', title: '更新的文章', publishedAt: nextDate };

      prisma.article.findFirst
        .mockResolvedValueOnce(mockArticle) // 主文章
        .mockResolvedValueOnce(prevMock)    // prev
        .mockResolvedValueOnce(nextMock);   // next

      // Act
      const result = await service.getArticleBySlug('middle-post');

      // Assert
      expect(result.prevArticle?.slug).toBe('older-post');
      expect(result.nextArticle?.slug).toBe('newer-post');
    });

    it('最早文章的 prevArticle 应为 null', async () => {
      // Arrange
      const mockArticle = buildMockArticle({ slug: 'oldest-post', publishedAt: new Date('2024-01-01') });

      prisma.article.findFirst
        .mockResolvedValueOnce(mockArticle) // 主文章
        .mockResolvedValueOnce(null)        // prev = null
        .mockResolvedValueOnce({ slug: 'newer-post', title: '更新的文章', publishedAt: new Date('2024-06-01') }); // next

      // Act
      const result = await service.getArticleBySlug('oldest-post');

      // Assert
      expect(result.prevArticle).toBeNull();
      expect(result.nextArticle?.slug).toBe('newer-post');
    });

    it('最晚文章的 nextArticle 应为 null', async () => {
      // Arrange
      const mockArticle = buildMockArticle({ slug: 'newest-post', publishedAt: new Date('2024-12-01') });

      prisma.article.findFirst
        .mockResolvedValueOnce(mockArticle) // 主文章
        .mockResolvedValueOnce({ slug: 'older-post', title: '更早的文章', publishedAt: new Date('2024-06-01') }) // prev
        .mockResolvedValueOnce(null);       // next = null

      // Act
      const result = await service.getArticleBySlug('newest-post');

      // Assert
      expect(result.prevArticle?.slug).toBe('older-post');
      expect(result.nextArticle).toBeNull();
    });

    it('唯一文章时 prevArticle 和 nextArticle 均应为 null', async () => {
      // Arrange
      const mockArticle = buildMockArticle({ slug: 'only-post' });

      prisma.article.findFirst
        .mockResolvedValueOnce(mockArticle) // 主文章
        .mockResolvedValueOnce(null)        // prev = null
        .mockResolvedValueOnce(null);       // next = null

      // Act
      const result = await service.getArticleBySlug('only-post');

      // Assert
      expect(result.prevArticle).toBeNull();
      expect(result.nextArticle).toBeNull();
    });
  });

  // ─── getCategories ─────────────────────────────────────────────

  describe('getCategories', () => {
    it('应返回带文章计数的分类列表', async () => {
      // Arrange
      prisma.category.findMany.mockResolvedValue([
        { id: 'cat-1', name: '技术', slug: 'tech', description: '技术文章', _count: { articles: 5 } },
        { id: 'cat-2', name: '生活', slug: 'life', description: null, _count: { articles: 3 } },
      ]);

      // Act
      const result = await service.getCategories();

      // Assert
      expect(result.data).toHaveLength(2);
      expect(result.data[0].name).toBe('技术');
      expect(result.data[0].articleCount).toBe(5);
      expect(result.data[1].articleCount).toBe(3);
    });
  });

  // ─── getTags ───────────────────────────────────────────────────

  describe('getTags', () => {
    it('应返回带文章计数的标签列表', async () => {
      // Arrange
      prisma.tag.findMany.mockResolvedValue([
        { id: 'tag-1', name: 'TypeScript', slug: 'typescript', _count: { articles: 10 } },
        { id: 'tag-2', name: 'NestJS', slug: 'nestjs', _count: { articles: 7 } },
      ]);

      // Act
      const result = await service.getTags();

      // Assert
      expect(result.data).toHaveLength(2);
      expect(result.data[0].name).toBe('TypeScript');
      expect(result.data[0].articleCount).toBe(10);
      expect(result.data[1].articleCount).toBe(7);
    });
  });


  // ─── getProjects ────────────────────────────────────────────────

  describe('getProjects', () => {
    const mockProject = {
      id: 'proj-1',
      title: 'My Blog',
      description: '一个现代化的博客系统',
      techStack: ['React', 'TypeScript', 'Tailwind'],
      coverImage: null,
      link: 'https://example.com',
      githubUrl: 'https://github.com/example',
      featured: true,
      order: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('应返回项目的分页列表', async () => {
      // Arrange
      prisma.project.findMany.mockResolvedValue([mockProject]);
      prisma.project.count.mockResolvedValue(1);

      // Act
      const result = await service.getProjects({ page: 1, pageSize: 10 });

      // Assert
      expect(result.total).toBe(1);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].title).toBe('My Blog');
      expect(result.data[0].techStack).toEqual(['React', 'TypeScript', 'Tailwind']);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(10);
    });

    it('应支持 featured 筛选', async () => {
      // Arrange
      prisma.project.findMany.mockResolvedValue([mockProject]);
      prisma.project.count.mockResolvedValue(1);

      // Act
      await service.getProjects({ page: 1, pageSize: 10, featured: true });

      // Assert
      expect(prisma.project.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { featured: true },
        }),
      );
    });

    it('featured 为 undefined 时不应添加筛选条件', async () => {
      // Arrange
      prisma.project.findMany.mockResolvedValue([]);
      prisma.project.count.mockResolvedValue(0);

      // Act
      await service.getProjects({ page: 1, pageSize: 10 });

      // Assert
      expect(prisma.project.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {},
        }),
      );
    });

    it('应按 order 升序排列', async () => {
      // Arrange
      prisma.project.findMany.mockResolvedValue([]);
      prisma.project.count.mockResolvedValue(0);

      // Act
      await service.getProjects({ page: 1, pageSize: 10 });

      // Assert
      expect(prisma.project.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { order: 'asc' },
        }),
      );
    });

    it('应正确计算分页偏移量', async () => {
      // Arrange
      prisma.project.findMany.mockResolvedValue([]);
      prisma.project.count.mockResolvedValue(0);

      // Act
      await service.getProjects({ page: 3, pageSize: 5 });

      // Assert
      expect(prisma.project.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 5 }),
      );
    });

    it('应使用 Promise.all 并行查询', async () => {
      // Arrange
      prisma.project.findMany.mockResolvedValue([]);
      prisma.project.count.mockResolvedValue(0);

      // Act
      await service.getProjects({ page: 1, pageSize: 10 });

      // Assert — both findMany and count should be called
      expect(prisma.project.findMany).toHaveBeenCalledTimes(1);
      expect(prisma.project.count).toHaveBeenCalledTimes(1);
    });
  });


  // ─── getSiteConfig ──────────────────────────────────────────────

  describe('getSiteConfig', () => {
    it('应返回包含站长信息和社交链接的完整站点配置', async () => {
      // Arrange
      siteConfigService.getConfig.mockResolvedValue({
        id: 'config-1',
        title: 'My Blog',
        description: '一个技术博客',
        logo: '/logo.png',
        favicon: '/favicon.ico',
        keywords: 'tech,blog',
        icp: '京ICP备12345678号',
        gongan: '京公网安备12345678号',
        copyright: '© 2024',
        analytics: '<script>ga</script>',
        ownerName: 'John',
        ownerAvatar: '/avatar.jpg',
        ownerBio: '全栈开发者',
        ownerEmail: 'john@example.com',
        socialGithub: 'https://github.com/john',
        socialTwitter: 'https://twitter.com/john',
        socialLinkedin: 'https://linkedin.com/in/john',
        socialWeibo: 'https://weibo.com/john',
      });

      // Act
      const result = await service.getSiteConfig();

      // Assert
      expect(result.siteName).toBe('My Blog');
      expect(result.owner.name).toBe('John');
      expect(result.owner.avatar).toBe('/avatar.jpg');
      expect(result.owner.bio).toBe('全栈开发者');
      expect(result.owner.email).toBe('john@example.com');
      expect(result.socialLinks.github).toBe('https://github.com/john');
      expect(result.socialLinks.twitter).toBe('https://twitter.com/john');
      expect(result.socialLinks.linkedin).toBe('https://linkedin.com/in/john');
      expect(result.socialLinks.weibo).toBe('https://weibo.com/john');
    });

    it('站长信息为空时应使用默认值', async () => {
      // Arrange
      siteConfigService.getConfig.mockResolvedValue({
        id: 'config-1',
        title: 'My Blog',
        description: null,
        logo: null,
        favicon: null,
        keywords: null,
        icp: null,
        gongan: null,
        copyright: null,
        analytics: null,
        ownerName: null,
        ownerAvatar: null,
        ownerBio: null,
        ownerEmail: null,
        socialGithub: null,
        socialTwitter: null,
        socialLinkedin: null,
        socialWeibo: null,
      });

      // Act
      const result = await service.getSiteConfig();

      // Assert
      expect(result.owner.name).toBe('Site Owner');
      expect(result.owner.avatar).toBeNull();
      expect(result.owner.bio).toBeNull();
      expect(result.owner.email).toBeNull();
      expect(result.socialLinks.github).toBeUndefined();
      expect(result.socialLinks.twitter).toBeUndefined();
      expect(result.socialLinks.linkedin).toBeUndefined();
      expect(result.socialLinks.weibo).toBeUndefined();
    });
  });

  // ─── Property 3: 发布状态过滤 ──────────────────────────────────
  // getArticles 查询条件始终包含 isPublished: true
  // Validates: Requirements 2.4

  describe('Property 3: 发布状态过滤', () => {
    it('对于任意查询参数，findMany 的 where 始终包含 isPublished: true', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            page: fc.integer({ min: 1, max: 50 }),
            pageSize: fc.integer({ min: 1, max: 100 }),
            category: fc.option(fc.stringMatching(/^[a-z][a-z0-9-]{0,19}$/), { nil: undefined }),
            tag: fc.option(fc.stringMatching(/^[a-z][a-z0-9-]{0,19}$/), { nil: undefined }),
            search: fc.option(fc.string({ minLength: 1, maxLength: 30 }), { nil: undefined }),
          }),
          async (query) => {
            // Arrange
            prisma.article.findMany.mockResolvedValue([]);
            prisma.article.count.mockResolvedValue(0);

            // Act
            await service.getArticles(query);

            // Assert — where always contains isPublished: true
            const call = prisma.article.findMany.mock.calls[0][0];
            expect(call.where).toHaveProperty('isPublished', true);

            // Also verify count uses the same where
            const countCall = prisma.article.count.mock.calls[0][0];
            expect(countCall.where).toHaveProperty('isPublished', true);
          },
        ),
        { numRuns: 50 },
      );
    });
  });

  // ─── Property 4: 分页正确性 ───────────────────────────────────
  // 返回数据长度 ≤ pageSize，page ≥ 1
  // Validates: Requirements 2.4

  describe('Property 4: 分页正确性', () => {
    it('返回的 data 长度始终 ≤ pageSize，且 page ≥ 1', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 50 }),
          fc.integer({ min: 1, max: 100 }),
          fc.integer({ min: 0, max: 200 }),
          async (page, pageSize, totalInDb) => {
            // Arrange — simulate DB returning at most pageSize items
            const returnCount = Math.min(pageSize, Math.max(0, totalInDb - (page - 1) * pageSize));
            const mockArticles = Array.from({ length: Math.max(0, returnCount) }, (_, i) =>
              buildMockArticle({ id: `art-${i}`, slug: `slug-${i}` }),
            );
            prisma.article.findMany.mockResolvedValue(mockArticles);
            prisma.article.count.mockResolvedValue(totalInDb);

            // Act
            const result = await service.getArticles({ page, pageSize });

            // Assert
            expect(result.data.length).toBeLessThanOrEqual(pageSize);
            expect(result.page).toBeGreaterThanOrEqual(1);
            expect(result.pageSize).toBe(pageSize);
          },
        ),
        { numRuns: 50 },
      );
    });
  });
});
