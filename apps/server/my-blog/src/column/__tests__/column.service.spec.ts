import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ColumnService } from '../column.service';
import { PrismaService } from '../../prisma/prisma.service';
import { BlogCacheService } from '../../redis';
import { CacheKeyRegistry } from '../../redis/cache-key.registry';

describe('ColumnService', () => {
  let service: ColumnService;
  let prisma: {
    column: {
      create: jest.Mock;
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
      count: jest.Mock;
    };
    columnArticle: {
      findFirst: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      delete: jest.Mock;
      deleteMany: jest.Mock;
      update: jest.Mock;
      count: jest.Mock;
      aggregate: jest.Mock;
    };
    article: {
      findUnique: jest.Mock;
    };
    $transaction: jest.Mock;
  };
  let cacheService: {
    del: jest.Mock;
    get: jest.Mock;
    set: jest.Mock;
    wrap: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      column: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
      columnArticle: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
        aggregate: jest.fn(),
      },
      article: {
        findUnique: jest.fn(),
      },
      $transaction: jest.fn(async (fn: (prisma: unknown) => Promise<unknown>) => fn(prisma)),
    };

    cacheService = {
      del: jest.fn().mockResolvedValue(undefined),
      get: jest.fn().mockResolvedValue(undefined),
      set: jest.fn().mockResolvedValue(undefined),
      wrap: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ColumnService,
        { provide: PrismaService, useValue: prisma },
        { provide: BlogCacheService, useValue: cacheService },
      ],
    }).compile();

    service = module.get<ColumnService>(ColumnService);
  });

  // ===== Helper functions =====
  const now = new Date();

  function buildMockColumn(overrides: Partial<{
    id: string;
    title: string;
    slug: string;
    description: string | null;
    coverImage: string | null;
    sortOrder: number;
    status: string;
    createdAt: Date;
    updatedAt: Date;
  }> = {}) {
    return {
      id: overrides.id ?? 'col-1',
      title: overrides.title ?? 'Flutter 系列',
      slug: overrides.slug ?? 'flutter-series',
      description: overrides.description ?? '学习 Flutter',
      coverImage: overrides.coverImage ?? null,
      sortOrder: overrides.sortOrder ?? 0,
      status: overrides.status ?? 'draft',
      createdAt: overrides.createdAt ?? now,
      updatedAt: overrides.updatedAt ?? now,
    };
  }

  // ===== create =====
  describe('create', () => {
    it('应该成功创建专栏并返回正确响应', async () => {
      // Arrange
      const dto = {
        title: 'Flutter 系列',
        slug: 'flutter-series',
        description: '学习 Flutter',
        sortOrder: 1,
        status: 'draft' as const,
      };
      prisma.column.findUnique.mockResolvedValue(null);
      prisma.column.create.mockResolvedValue(buildMockColumn({
        ...dto,
        id: 'col-new',
      }));

      // Act
      const result = await service.create(dto);

      // Assert
      expect(result.id).toBe('col-new');
      expect(result.title).toBe(dto.title);
      expect(result.slug).toBe(dto.slug);
      expect(result.description).toBe(dto.description);
      expect(result.sortOrder).toBe(1);
      expect(result.status).toBe('draft');
      expect(result.articleCount).toBe(0);
      expect(cacheService.del).toHaveBeenCalledWith(CacheKeyRegistry.PUBLIC_COLUMNS);
    });

    it('应该在 slug 冲突时抛出 ConflictException (409)', async () => {
      // Arrange
      prisma.column.findUnique.mockResolvedValue(buildMockColumn());

      // Act & Assert
      await expect(
        service.create({ title: '新专栏', slug: 'flutter-series' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ===== findAll =====
  describe('findAll', () => {
    it('应该返回分页结果', async () => {
      // Arrange
      const columns = [
        { ...buildMockColumn({ id: 'col-1' }), _count: { articles: 3 } },
        { ...buildMockColumn({ id: 'col-2', slug: 'js-series' }), _count: { articles: 5 } },
      ];
      prisma.column.findMany.mockResolvedValue(columns);
      prisma.column.count.mockResolvedValue(2);

      // Act
      const result = await service.findAll({ page: 1, limit: 10 });

      // Assert
      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.data[0].articleCount).toBe(3);
      expect(result.data[1].articleCount).toBe(5);
    });

    it('应该支持 keyword 筛选', async () => {
      // Arrange
      prisma.column.findMany.mockResolvedValue([]);
      prisma.column.count.mockResolvedValue(0);

      // Act
      await service.findAll({ keyword: 'Flutter' });

      // Assert
      expect(prisma.column.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            title: { contains: 'Flutter', mode: 'insensitive' },
          }),
        }),
      );
    });

    it('应该支持 status 筛选', async () => {
      // Arrange
      prisma.column.findMany.mockResolvedValue([]);
      prisma.column.count.mockResolvedValue(0);

      // Act
      await service.findAll({ status: 'published' });

      // Assert
      expect(prisma.column.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'published',
          }),
        }),
      );
    });

    it('应该在无结果时返回空数组', async () => {
      // Arrange
      prisma.column.findMany.mockResolvedValue([]);
      prisma.column.count.mockResolvedValue(0);

      // Act
      const result = await service.findAll({});

      // Assert
      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('应该使用默认分页参数', async () => {
      // Arrange
      prisma.column.findMany.mockResolvedValue([]);
      prisma.column.count.mockResolvedValue(0);

      // Act
      const result = await service.findAll({});

      // Assert
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(prisma.column.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 10,
        }),
      );
    });
  });

  // ===== findOne =====
  describe('findOne', () => {
    it('应该返回专栏详情含文章列表', async () => {
      // Arrange
      const mockColumn = {
        ...buildMockColumn({ id: 'col-1' }),
        articles: [
          {
            sortOrder: 0,
            article: {
              id: 'art-1',
              title: '文章一',
              slug: 'article-1',
              isPublished: true,
              publishedAt: new Date('2024-01-01'),
            },
          },
          {
            sortOrder: 1,
            article: {
              id: 'art-2',
              title: '文章二',
              slug: 'article-2',
              isPublished: false,
              publishedAt: null,
            },
          },
        ],
      };
      prisma.column.findUnique.mockResolvedValue(mockColumn);

      // Act
      const result = await service.findOne('col-1');

      // Assert
      expect(result.id).toBe('col-1');
      expect(result.articles).toHaveLength(2);
      expect(result.articles[0].id).toBe('art-1');
      expect(result.articles[0].sortOrder).toBe(0);
      expect(result.articles[1].id).toBe('art-2');
      expect(result.articles[1].publishedAt).toBeNull();
      expect(result.articleCount).toBe(2);
    });

    it('应该在专栏不存在时抛出 NotFoundException (404)', async () => {
      // Arrange
      prisma.column.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findOne('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ===== update =====
  describe('update', () => {
    it('应该成功更新专栏字段', async () => {
      // Arrange
      const existing = { ...buildMockColumn({ id: 'col-1' }), _count: { articles: 2 } };
      prisma.column.findUnique.mockResolvedValue(existing);
      prisma.column.update.mockResolvedValue(buildMockColumn({
        id: 'col-1',
        title: '新标题',
      }));

      // Act
      const result = await service.update('col-1', { title: '新标题' });

      // Assert
      expect(result.title).toBe('新标题');
      expect(cacheService.del).toHaveBeenCalledWith(CacheKeyRegistry.PUBLIC_COLUMNS);
      expect(cacheService.del).toHaveBeenCalledWith(
        CacheKeyRegistry.publicColumnDetail('flutter-series'),
      );
    });

    it('应该在专栏不存在时抛出 NotFoundException (404)', async () => {
      // Arrange
      prisma.column.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.update('nonexistent', { title: '新标题' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('应该在 slug 冲突时抛出 ConflictException (409)', async () => {
      // Arrange
      const existing = { ...buildMockColumn({ id: 'col-1', slug: 'old-slug' }), _count: { articles: 0 } };
      prisma.column.findUnique.mockResolvedValue(existing);
      prisma.column.findFirst.mockResolvedValue(buildMockColumn({ id: 'col-2', slug: 'taken-slug' }));

      // Act & Assert
      await expect(
        service.update('col-1', { slug: 'taken-slug' }),
      ).rejects.toThrow(ConflictException);
    });

    it('应该在 slug 未变更时不检查冲突', async () => {
      // Arrange
      const existing = { ...buildMockColumn({ id: 'col-1', slug: 'same-slug' }), _count: { articles: 0 } };
      prisma.column.findUnique.mockResolvedValue(existing);
      prisma.column.update.mockResolvedValue(buildMockColumn({ id: 'col-1', slug: 'same-slug' }));

      // Act
      await service.update('col-1', { slug: 'same-slug' });

      // Assert
      expect(prisma.column.findFirst).not.toHaveBeenCalled();
    });
  });

  // ===== remove =====
  describe('remove', () => {
    it('应该成功删除专栏并失效缓存', async () => {
      // Arrange
      prisma.column.findUnique.mockResolvedValue({ slug: 'flutter-series' });
      prisma.column.delete.mockResolvedValue(undefined);

      // Act
      await service.remove('col-1');

      // Assert
      expect(prisma.column.delete).toHaveBeenCalledWith({ where: { id: 'col-1' } });
      expect(cacheService.del).toHaveBeenCalledWith(CacheKeyRegistry.PUBLIC_COLUMNS);
      expect(cacheService.del).toHaveBeenCalledWith(
        CacheKeyRegistry.publicColumnDetail('flutter-series'),
      );
    });

    it('应该在专栏不存在时抛出 NotFoundException (404)', async () => {
      // Arrange
      prisma.column.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.remove('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ===== addArticle =====
  describe('addArticle', () => {
    it('应该成功添加文章到专栏', async () => {
      // Arrange
      prisma.column.findUnique.mockResolvedValue({ slug: 'flutter-series' });
      prisma.article.findUnique.mockResolvedValue({ id: 'art-1' });
      prisma.columnArticle.findUnique.mockResolvedValue(null);
      prisma.columnArticle.findFirst.mockResolvedValue({ sortOrder: 2 });
      prisma.columnArticle.create.mockResolvedValue({
        id: 'ca-1',
        columnId: 'col-1',
        articleId: 'art-1',
        sortOrder: 3,
      });

      // Act
      await service.addArticle('col-1', { articleId: 'art-1' });

      // Assert
      expect(prisma.columnArticle.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            columnId: 'col-1',
            articleId: 'art-1',
            sortOrder: 3,
          }),
        }),
      );
      expect(cacheService.del).toHaveBeenCalledWith(CacheKeyRegistry.PUBLIC_COLUMNS);
    });

    it('应该在专栏不存在时抛出 NotFoundException (404)', async () => {
      // Arrange
      prisma.column.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.addArticle('nonexistent', { articleId: 'art-1' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('应该在文章不存在时抛出 NotFoundException (404)', async () => {
      // Arrange
      prisma.column.findUnique.mockResolvedValue({ slug: 'flutter-series' });
      prisma.article.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.addArticle('col-1', { articleId: 'nonexistent' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('应该在文章已存在于专栏时抛出 ConflictException (409)', async () => {
      // Arrange
      prisma.column.findUnique.mockResolvedValue({ slug: 'flutter-series' });
      prisma.article.findUnique.mockResolvedValue({ id: 'art-1' });
      prisma.columnArticle.findUnique.mockResolvedValue({
        id: 'ca-1',
        columnId: 'col-1',
        articleId: 'art-1',
        sortOrder: 0,
      });

      // Act & Assert
      await expect(
        service.addArticle('col-1', { articleId: 'art-1' }),
      ).rejects.toThrow(ConflictException);
    });

    it('应该在不传 sortOrder 时自动追加到末尾', async () => {
      // Arrange
      prisma.column.findUnique.mockResolvedValue({ slug: 'flutter-series' });
      prisma.article.findUnique.mockResolvedValue({ id: 'art-1' });
      prisma.columnArticle.findUnique.mockResolvedValue(null);
      prisma.columnArticle.findFirst.mockResolvedValue({ sortOrder: 5 });
      prisma.columnArticle.create.mockResolvedValue({
        id: 'ca-1',
        columnId: 'col-1',
        articleId: 'art-1',
        sortOrder: 6,
      });

      // Act
      await service.addArticle('col-1', { articleId: 'art-1' });

      // Assert
      expect(prisma.columnArticle.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ sortOrder: 6 }),
        }),
      );
    });

    it('应该在专栏为空时 sortOrder 从 0 开始', async () => {
      // Arrange
      prisma.column.findUnique.mockResolvedValue({ slug: 'flutter-series' });
      prisma.article.findUnique.mockResolvedValue({ id: 'art-1' });
      prisma.columnArticle.findUnique.mockResolvedValue(null);
      prisma.columnArticle.findFirst.mockResolvedValue(null);
      prisma.columnArticle.create.mockResolvedValue({
        id: 'ca-1',
        columnId: 'col-1',
        articleId: 'art-1',
        sortOrder: 0,
      });

      // Act
      await service.addArticle('col-1', { articleId: 'art-1' });

      // Assert
      expect(prisma.columnArticle.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ sortOrder: 0 }),
        }),
      );
    });
  });

  // ===== removeArticle =====
  describe('removeArticle', () => {
    it('应该成功从专栏移除文章', async () => {
      // Arrange
      prisma.column.findUnique.mockResolvedValue({ slug: 'flutter-series' });
      prisma.columnArticle.findUnique.mockResolvedValue({
        id: 'ca-1',
        columnId: 'col-1',
        articleId: 'art-1',
        sortOrder: 0,
      });
      prisma.columnArticle.delete.mockResolvedValue(undefined);

      // Act
      await service.removeArticle('col-1', 'art-1');

      // Assert
      expect(prisma.columnArticle.delete).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { columnId_articleId: { columnId: 'col-1', articleId: 'art-1' } },
        }),
      );
      expect(cacheService.del).toHaveBeenCalledWith(CacheKeyRegistry.PUBLIC_COLUMNS);
    });

    it('应该在专栏不存在时抛出 NotFoundException (404)', async () => {
      // Arrange
      prisma.column.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.removeArticle('nonexistent', 'art-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('应该在关联不存在时抛出 NotFoundException (404)', async () => {
      // Arrange
      prisma.column.findUnique.mockResolvedValue({ slug: 'flutter-series' });
      prisma.columnArticle.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.removeArticle('col-1', 'nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ===== reorderArticles =====
  describe('reorderArticles', () => {
    it('应该成功重排序文章', async () => {
      // Arrange
      prisma.column.findUnique.mockResolvedValue({ slug: 'flutter-series' });
      prisma.columnArticle.findMany.mockResolvedValue([
        { articleId: 'art-1' },
        { articleId: 'art-2' },
        { articleId: 'art-3' },
      ]);
      prisma.columnArticle.update.mockResolvedValue(undefined);

      // Act
      await service.reorderArticles('col-1', {
        articleIds: ['art-3', 'art-1', 'art-2'],
      });

      // Assert - 验证每个文章的 sortOrder 被正确更新
      expect(prisma.columnArticle.update).toHaveBeenCalledTimes(3);
      expect(prisma.columnArticle.update).toHaveBeenCalledWith({
        where: { columnId_articleId: { columnId: 'col-1', articleId: 'art-3' } },
        data: { sortOrder: 0 },
      });
      expect(prisma.columnArticle.update).toHaveBeenCalledWith({
        where: { columnId_articleId: { columnId: 'col-1', articleId: 'art-1' } },
        data: { sortOrder: 1 },
      });
      expect(prisma.columnArticle.update).toHaveBeenCalledWith({
        where: { columnId_articleId: { columnId: 'col-1', articleId: 'art-2' } },
        data: { sortOrder: 2 },
      });
      expect(cacheService.del).toHaveBeenCalledWith(CacheKeyRegistry.PUBLIC_COLUMNS);
    });

    it('应该在专栏不存在时抛出 NotFoundException (404)', async () => {
      // Arrange
      prisma.column.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.reorderArticles('nonexistent', { articleIds: ['art-1'] }),
      ).rejects.toThrow(NotFoundException);
    });

    it('应该在 articleIds 不完整时抛出 BadRequestException (400)', async () => {
      // Arrange
      prisma.column.findUnique.mockResolvedValue({ slug: 'flutter-series' });
      prisma.columnArticle.findMany.mockResolvedValue([
        { articleId: 'art-1' },
        { articleId: 'art-2' },
      ]);

      // Act & Assert - 只传了一个，缺少 art-2
      await expect(
        service.reorderArticles('col-1', { articleIds: ['art-1'] }),
      ).rejects.toThrow(BadRequestException);
    });

    it('应该在 articleIds 包含无效 ID 时抛出 BadRequestException (400)', async () => {
      // Arrange
      prisma.column.findUnique.mockResolvedValue({ slug: 'flutter-series' });
      prisma.columnArticle.findMany.mockResolvedValue([
        { articleId: 'art-1' },
        { articleId: 'art-2' },
      ]);

      // Act & Assert - 包含不属于该专栏的 ID
      await expect(
        service.reorderArticles('col-1', { articleIds: ['art-1', 'art-invalid'] }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ===== invalidateCacheByArticleId =====
  describe('invalidateCacheByArticleId', () => {
    it('应该失效文章关联的所有专栏缓存', async () => {
      // Arrange
      prisma.columnArticle.findMany.mockResolvedValue([
        { column: { slug: 'flutter-series' } },
        { column: { slug: 'js-series' } },
      ]);

      // Act
      await service.invalidateCacheByArticleId('art-1');

      // Assert
      expect(cacheService.del).toHaveBeenCalledWith(CacheKeyRegistry.PUBLIC_COLUMNS);
      expect(cacheService.del).toHaveBeenCalledWith(
        CacheKeyRegistry.publicColumnDetail('flutter-series'),
      );
      expect(cacheService.del).toHaveBeenCalledWith(
        CacheKeyRegistry.publicColumnDetail('js-series'),
      );
    });

    it('应该在文章无关联专栏时不调用缓存删除', async () => {
      // Arrange
      prisma.columnArticle.findMany.mockResolvedValue([]);

      // Act
      await service.invalidateCacheByArticleId('art-orphan');

      // Assert
      expect(cacheService.del).not.toHaveBeenCalled();
    });
  });
});
