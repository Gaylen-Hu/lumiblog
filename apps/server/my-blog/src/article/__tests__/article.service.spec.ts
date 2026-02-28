import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { ArticleService } from '../article.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AiService } from '../../ai/ai.service';
import { WechatService } from '../../wechat/wechat.service';
import { CreateArticleParams } from '../domain/article.model';
import * as fc from 'fast-check';

// Helper: build a mock ArticleWithRelations object
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
  category: { id: string; name: string; slug: string } | null;
  tags: Array<{ id: string; articleId: string; tagId: string; tag: { id: string; name: string; slug: string } }>;
}> = {}) {
  const now = new Date();
  return {
    id: overrides.id ?? 'article-1',
    title: overrides.title ?? '测试文章',
    slug: overrides.slug ?? 'test-article',
    summary: overrides.summary ?? null,
    content: overrides.content ?? null,
    coverImage: overrides.coverImage ?? null,
    isPublished: overrides.isPublished ?? false,
    publishedAt: overrides.publishedAt ?? null,
    seoTitle: overrides.seoTitle ?? null,
    seoDescription: overrides.seoDescription ?? null,
    categoryId: overrides.categoryId ?? null,
    viewCount: overrides.viewCount ?? 0,
    createdAt: overrides.createdAt ?? now,
    updatedAt: overrides.updatedAt ?? now,
    locale: null,
    translationGroupId: null,
    category: overrides.category ?? null,
    tags: overrides.tags ?? [],
  };
}

describe('ArticleService', () => {
  let service: ArticleService;
  let prisma: {
    article: {
      create: jest.Mock;
      findFirst: jest.Mock;
      findUnique: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
      count: jest.Mock;
    };
    articleTag: {
      deleteMany: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      article: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
      articleTag: {
        deleteMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ArticleService,
        { provide: PrismaService, useValue: prisma },
        { provide: AiService, useValue: { translate: jest.fn(), optimizeSeo: jest.fn() } },
        { provide: WechatService, useValue: { createDraft: jest.fn(), publishDraft: jest.fn() } },
      ],
    }).compile();

    service = module.get<ArticleService>(ArticleService);
  });

  describe('create', () => {
    it('应该成功创建文章草稿', async () => {
      // Arrange
      const inputParams: CreateArticleParams = {
        title: '测试文章',
        slug: 'test-article',
        summary: '这是摘要',
        content: '这是内容',
      };
      const mockArticle = buildMockArticle({
        title: inputParams.title,
        slug: inputParams.slug,
        summary: inputParams.summary!,
        content: inputParams.content!,
      });
      prisma.article.findFirst.mockResolvedValue(null);
      prisma.article.create.mockResolvedValue(mockArticle);

      // Act
      const actual = await service.create(inputParams);

      // Assert
      expect(actual.id).toBeDefined();
      expect(actual.title).toBe(inputParams.title);
      expect(actual.slug).toBe(inputParams.slug);
      expect(actual.isPublished).toBe(false);
    });

    it('应该在 slug 重复时抛出 ConflictException', async () => {
      // Arrange
      prisma.article.findFirst.mockResolvedValue({ id: 'existing', slug: 'dup' });

      // Act & Assert
      await expect(
        service.create({ title: '文章', slug: 'dup' }),
      ).rejects.toThrow(ConflictException);
    });

    it('应该创建带分类关联的文章', async () => {
      // Arrange
      const categoryId = 'cat-1';
      const inputParams: CreateArticleParams = {
        title: '分类文章',
        slug: 'cat-article',
        categoryId,
      };
      const mockArticle = buildMockArticle({
        title: inputParams.title,
        slug: inputParams.slug,
        categoryId,
        category: { id: categoryId, name: '技术', slug: 'tech' },
      });
      prisma.article.findFirst.mockResolvedValue(null);
      prisma.article.create.mockResolvedValue(mockArticle);

      // Act
      const actual = await service.create(inputParams);

      // Assert
      expect(actual.category).not.toBeNull();
      expect(actual.category!.id).toBe(categoryId);
      expect(prisma.article.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ categoryId }),
        }),
      );
    });

    it('应该创建带标签关联的文章', async () => {
      // Arrange
      const tagIds = ['tag-1', 'tag-2'];
      const inputParams: CreateArticleParams = {
        title: '标签文章',
        slug: 'tag-article',
        tagIds,
      };
      const mockArticle = buildMockArticle({
        title: inputParams.title,
        slug: inputParams.slug,
        tags: tagIds.map((tagId) => ({
          id: `at-${tagId}`,
          articleId: 'article-1',
          tagId,
          tag: { id: tagId, name: `标签${tagId}`, slug: `tag-${tagId}` },
        })),
      });
      prisma.article.findFirst.mockResolvedValue(null);
      prisma.article.create.mockResolvedValue(mockArticle);

      // Act
      const actual = await service.create(inputParams);

      // Assert
      expect(actual.tags).toHaveLength(2);
      expect(actual.tags.map((t) => t.id)).toEqual(expect.arrayContaining(tagIds));
      expect(prisma.article.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tags: { create: tagIds.map((tagId) => ({ tagId })) },
          }),
        }),
      );
    });

    it('应该创建带分类和标签的文章', async () => {
      // Arrange
      const categoryId = 'cat-1';
      const tagIds = ['tag-1', 'tag-2', 'tag-3'];
      const inputParams: CreateArticleParams = {
        title: '完整文章',
        slug: 'full-article',
        categoryId,
        tagIds,
      };
      const mockArticle = buildMockArticle({
        title: inputParams.title,
        slug: inputParams.slug,
        categoryId,
        category: { id: categoryId, name: '技术', slug: 'tech' },
        tags: tagIds.map((tagId) => ({
          id: `at-${tagId}`,
          articleId: 'article-1',
          tagId,
          tag: { id: tagId, name: `标签${tagId}`, slug: `tag-${tagId}` },
        })),
      });
      prisma.article.findFirst.mockResolvedValue(null);
      prisma.article.create.mockResolvedValue(mockArticle);

      // Act
      const actual = await service.create(inputParams);

      // Assert
      expect(actual.category).not.toBeNull();
      expect(actual.category!.id).toBe(categoryId);
      expect(actual.tags).toHaveLength(3);
    });
  });

  describe('update', () => {
    it('应该使用 deleteMany + create 策略更新标签', async () => {
      // Arrange
      const articleId = 'article-1';
      const newTagIds = ['tag-3', 'tag-4'];
      prisma.article.findUnique.mockResolvedValue({ id: articleId, slug: 'old-slug' });
      prisma.articleTag.deleteMany.mockResolvedValue({ count: 2 });
      prisma.article.update.mockResolvedValue(
        buildMockArticle({
          id: articleId,
          tags: newTagIds.map((tagId) => ({
            id: `at-${tagId}`,
            articleId,
            tagId,
            tag: { id: tagId, name: `标签${tagId}`, slug: `tag-${tagId}` },
          })),
        }),
      );

      // Act
      const actual = await service.update(articleId, { tagIds: newTagIds });

      // Assert
      expect(prisma.articleTag.deleteMany).toHaveBeenCalledWith({
        where: { articleId },
      });
      expect(prisma.article.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tags: { create: newTagIds.map((tagId) => ({ tagId })) },
          }),
        }),
      );
      expect(actual.tags).toHaveLength(2);
    });

    it('应该更新分类关联', async () => {
      // Arrange
      const articleId = 'article-1';
      const newCategoryId = 'cat-2';
      prisma.article.findUnique.mockResolvedValue({ id: articleId, slug: 'slug' });
      prisma.article.update.mockResolvedValue(
        buildMockArticle({
          id: articleId,
          categoryId: newCategoryId,
          category: { id: newCategoryId, name: '生活', slug: 'life' },
        }),
      );

      // Act
      const actual = await service.update(articleId, { categoryId: newCategoryId });

      // Assert
      expect(actual.category).not.toBeNull();
      expect(actual.category!.id).toBe(newCategoryId);
    });

    it('应该在文章不存在时抛出 NotFoundException', async () => {
      // Arrange
      prisma.article.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.update('nonexistent', { title: '新标题' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findById', () => {
    it('应该返回包含 category 和 tags 的完整数据', async () => {
      // Arrange
      const categoryId = 'cat-1';
      const tagIds = ['tag-1', 'tag-2'];
      const mockArticle = buildMockArticle({
        id: 'article-1',
        categoryId,
        category: { id: categoryId, name: '技术', slug: 'tech' },
        tags: tagIds.map((tagId) => ({
          id: `at-${tagId}`,
          articleId: 'article-1',
          tagId,
          tag: { id: tagId, name: `标签${tagId}`, slug: `tag-${tagId}` },
        })),
      });
      prisma.article.findUnique.mockResolvedValue(mockArticle);

      // Act
      const actual = await service.findById('article-1');

      // Assert
      expect(actual.category).not.toBeNull();
      expect(actual.category!.id).toBe(categoryId);
      expect(actual.category!.name).toBe('技术');
      expect(actual.category!.slug).toBe('tech');
      expect(actual.tags).toHaveLength(2);
      expect(actual.tags[0].id).toBe('tag-1');
      expect(actual.tags[1].id).toBe('tag-2');
    });

    it('应该在无分类和标签时返回 null 和空数组', async () => {
      // Arrange
      prisma.article.findUnique.mockResolvedValue(buildMockArticle());

      // Act
      const actual = await service.findById('article-1');

      // Assert
      expect(actual.category).toBeNull();
      expect(actual.tags).toEqual([]);
    });

    it('应该在文章不存在时抛出 NotFoundException', async () => {
      // Arrange
      prisma.article.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findById('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  /**
   * 属性 1: 文章-分类一致性
   * 创建文章时指定 categoryId，返回的 category 对象 id 匹配
   * Validates: Requirements 1.2
   */
  describe('Property 1: 文章-分类一致性', () => {
    it('创建文章时指定 categoryId，返回的 category.id 应匹配', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          async (categoryId) => {
            // Arrange
            const slug = `article-${categoryId}`;
            const mockArticle = buildMockArticle({
              slug,
              categoryId,
              category: { id: categoryId, name: 'Cat', slug: 'cat' },
              tags: [],
            });
            prisma.article.findFirst.mockResolvedValue(null);
            prisma.article.create.mockResolvedValue(mockArticle);

            // Act
            const result = await service.create({
              title: '属性测试文章',
              slug,
              categoryId,
            });

            // Assert
            expect(result.category).not.toBeNull();
            expect(result.category!.id).toBe(categoryId);
          },
        ),
        { numRuns: 20 },
      );
    });
  });

  /**
   * 属性 2: 文章-标签一致性
   * 创建文章时指定 tagIds，返回的 tags 数组长度和 id 匹配
   * Validates: Requirements 1.2
   */
  describe('Property 2: 文章-标签一致性', () => {
    it('创建文章时指定 tagIds，返回的 tags 长度和 id 应匹配', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uniqueArray(fc.uuid(), { minLength: 1, maxLength: 10 }),
          async (tagIds) => {
            // Arrange
            const slug = `article-tags-${tagIds.length}`;
            const mockArticle = buildMockArticle({
              slug,
              tags: tagIds.map((tagId) => ({
                id: `at-${tagId}`,
                articleId: 'article-1',
                tagId,
                tag: { id: tagId, name: `Tag-${tagId}`, slug: `tag-${tagId}` },
              })),
            });
            prisma.article.findFirst.mockResolvedValue(null);
            prisma.article.create.mockResolvedValue(mockArticle);

            // Act
            const result = await service.create({
              title: '标签属性测试',
              slug,
              tagIds,
            });

            // Assert — length matches
            expect(result.tags).toHaveLength(tagIds.length);

            // Assert — all ids present
            const returnedIds = new Set(result.tags.map((t) => t.id));
            for (const tagId of tagIds) {
              expect(returnedIds.has(tagId)).toBe(true);
            }
          },
        ),
        { numRuns: 20 },
      );
    });
  });
});
