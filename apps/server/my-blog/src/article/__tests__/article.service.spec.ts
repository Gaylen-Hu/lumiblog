import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { ArticleService } from '../article.service';
import { CreateArticleParams } from '../domain/article.model';

describe('ArticleService', () => {
  let service: ArticleService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ArticleService],
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

      // Act
      const actual = await service.create(inputParams);

      // Assert
      expect(actual.id).toBeDefined();
      expect(actual.title).toBe(inputParams.title);
      expect(actual.slug).toBe(inputParams.slug);
      expect(actual.summary).toBe(inputParams.summary);
      expect(actual.content).toBe(inputParams.content);
      expect(actual.isPublished).toBe(false);
      expect(actual.publishedAt).toBeNull();
    });

    it('应该在 slug 重复时抛出 ConflictException', async () => {
      // Arrange
      const inputParams: CreateArticleParams = {
        title: '文章一',
        slug: 'duplicate-slug',
      };
      await service.create(inputParams);

      const inputDuplicate: CreateArticleParams = {
        title: '文章二',
        slug: 'duplicate-slug',
      };

      // Act & Assert
      await expect(service.create(inputDuplicate)).rejects.toThrow(
        ConflictException,
      );
    });

    it('应该正确设置 SEO 字段', async () => {
      // Arrange
      const inputParams: CreateArticleParams = {
        title: 'SEO 测试',
        slug: 'seo-test',
        seoTitle: '自定义 SEO 标题',
        seoDescription: '自定义 SEO 描述',
      };

      // Act
      const actual = await service.create(inputParams);

      // Assert
      expect(actual.seoTitle).toBe(inputParams.seoTitle);
      expect(actual.seoDescription).toBe(inputParams.seoDescription);
    });

    it('应该将可选字段设为 null', async () => {
      // Arrange
      const inputParams: CreateArticleParams = {
        title: '最小文章',
        slug: 'minimal-article',
      };

      // Act
      const actual = await service.create(inputParams);

      // Assert
      expect(actual.summary).toBeNull();
      expect(actual.content).toBeNull();
      expect(actual.coverImage).toBeNull();
      expect(actual.seoTitle).toBeNull();
      expect(actual.seoDescription).toBeNull();
    });
  });

  describe('findPublishedList', () => {
    beforeEach(async () => {
      // 创建测试数据：3 篇已发布，1 篇草稿
      const articles = [
        { title: '文章一', slug: 'article-1' },
        { title: '文章二', slug: 'article-2' },
        { title: '文章三', slug: 'article-3' },
        { title: '草稿', slug: 'draft' },
      ];

      for (const article of articles) {
        await service.create(article);
      }

      // 手动发布前 3 篇（模拟发布操作）
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const articlesArray = (service as any).articles;
      for (let i = 0; i < 3; i++) {
        articlesArray[i].isPublished = true;
        articlesArray[i].publishedAt = new Date(2024, 0, i + 1);
      }
    });

    it('应该只返回已发布文章', async () => {
      // Arrange
      const inputQuery = { page: 1, limit: 10 };

      // Act
      const actual = await service.findPublishedList(inputQuery);

      // Assert
      expect(actual.data.length).toBe(3);
      expect(actual.total).toBe(3);
      actual.data.forEach((item) => {
        expect(item.title).not.toBe('草稿');
      });
    });

    it('应该按发布时间倒序排列', async () => {
      // Arrange
      const inputQuery = { page: 1, limit: 10 };

      // Act
      const actual = await service.findPublishedList(inputQuery);

      // Assert
      expect(actual.data[0].title).toBe('文章三');
      expect(actual.data[1].title).toBe('文章二');
      expect(actual.data[2].title).toBe('文章一');
    });

    it('应该支持分页', async () => {
      // Arrange
      const inputQuery = { page: 1, limit: 2 };

      // Act
      const actual = await service.findPublishedList(inputQuery);

      // Assert
      expect(actual.data.length).toBe(2);
      expect(actual.total).toBe(3);
      expect(actual.page).toBe(1);
      expect(actual.limit).toBe(2);
    });

    it('应该返回第二页数据', async () => {
      // Arrange
      const inputQuery = { page: 2, limit: 2 };

      // Act
      const actual = await service.findPublishedList(inputQuery);

      // Assert
      expect(actual.data.length).toBe(1);
      expect(actual.page).toBe(2);
    });

    it('列表项不应包含 content 字段', async () => {
      // Arrange
      const inputQuery = { page: 1, limit: 10 };

      // Act
      const actual = await service.findPublishedList(inputQuery);

      // Assert
      actual.data.forEach((item) => {
        expect(item).not.toHaveProperty('content');
        expect(item).not.toHaveProperty('isPublished');
        expect(item).toHaveProperty('summary');
      });
    });
  });
});
