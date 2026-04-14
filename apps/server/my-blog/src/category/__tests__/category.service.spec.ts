import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { CategoryService } from '../category.service';
import { PrismaService } from '../../prisma/prisma.service';
import { BlogCacheService } from '../../redis';

function buildMockCategory(overrides: Partial<{
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parentId: string | null;
  level: number;
  path: string;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}> = {}) {
  const now = new Date();
  return {
    id: overrides.id ?? 'cat-1',
    name: overrides.name ?? '技术',
    slug: overrides.slug ?? 'tech',
    description: overrides.description ?? null,
    parentId: overrides.parentId ?? null,
    level: overrides.level ?? 1,
    path: overrides.path ?? '/tech',
    sortOrder: overrides.sortOrder ?? 0,
    createdAt: overrides.createdAt ?? now,
    updatedAt: overrides.updatedAt ?? now,
  };
}

describe('CategoryService', () => {
  let service: CategoryService;
  let prisma: {
    category: {
      create: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
      count: jest.Mock;
    };
  };
  let blogCacheService: { del: jest.Mock };

  beforeEach(async () => {
    prisma = {
      category: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
    };

    blogCacheService = {
      del: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoryService,
        { provide: PrismaService, useValue: prisma },
        { provide: BlogCacheService, useValue: blogCacheService },
      ],
    }).compile();

    service = module.get<CategoryService>(CategoryService);
  });

  describe('create', () => {
    it('应该成功创建根分类', async () => {
      // Arrange
      const mockCat = buildMockCategory({ level: 1, path: '/tech' });
      prisma.category.findFirst.mockResolvedValue(null);
      prisma.category.create.mockResolvedValue(mockCat);

      // Act
      const actual = await service.create({ name: '技术', slug: 'tech', description: '技术文章' });

      // Assert
      expect(actual.id).toBeDefined();
      expect(actual.name).toBe('技术');
      expect(actual.level).toBe(1);
      expect(actual.path).toBe('/tech');
      expect(actual.parentId).toBeNull();
      expect(blogCacheService.del).toHaveBeenCalledWith('blog:public:categories');
    });

    it('应该成功创建子分类', async () => {
      // Arrange
      const parent = buildMockCategory({ id: 'cat-1', slug: 'tech', level: 1, path: '/tech' });
      const child = buildMockCategory({
        id: 'cat-2', name: '后端', slug: 'backend',
        parentId: 'cat-1', level: 2, path: '/tech/backend',
      });
      prisma.category.findFirst.mockResolvedValue(null);
      prisma.category.findUnique.mockResolvedValue(parent);
      prisma.category.create.mockResolvedValue(child);

      // Act
      const actual = await service.create({ name: '后端', slug: 'backend', parentId: 'cat-1' });

      // Assert
      expect(actual.level).toBe(2);
      expect(actual.path).toBe('/tech/backend');
      expect(actual.parentId).toBe('cat-1');
    });

    it('应该在 slug 重复时抛出 ConflictException', async () => {
      // Arrange
      prisma.category.findFirst.mockResolvedValue(buildMockCategory());

      // Act & Assert
      await expect(
        service.create({ name: '科技', slug: 'tech' }),
      ).rejects.toThrow(ConflictException);
    });

    it('应该在超过最大层级时抛出 BadRequestException', async () => {
      // Arrange - parent is level 3
      const level3Parent = buildMockCategory({ id: 'cat-3', level: 3, path: '/l1/l2/l3' });
      prisma.category.findFirst.mockResolvedValue(null);
      prisma.category.findUnique.mockResolvedValue(level3Parent);

      // Act & Assert
      await expect(
        service.create({ name: 'L4', slug: 'l4', parentId: 'cat-3' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findTree', () => {
    it('应该返回树形结构', async () => {
      // Arrange
      prisma.category.findMany.mockResolvedValue([
        buildMockCategory({ id: 'cat-1', name: '技术', slug: 'tech', sortOrder: 1 }),
        buildMockCategory({ id: 'cat-2', name: '后端', slug: 'backend', parentId: 'cat-1', level: 2, sortOrder: 1 }),
        buildMockCategory({ id: 'cat-3', name: '前端', slug: 'frontend', parentId: 'cat-1', level: 2, sortOrder: 2 }),
        buildMockCategory({ id: 'cat-4', name: '生活', slug: 'life', sortOrder: 2 }),
      ]);

      // Act
      const actual = await service.findTree();

      // Assert
      expect(actual.length).toBe(2);
      expect(actual[0].name).toBe('技术');
      expect(actual[0].children.length).toBe(2);
      expect(actual[1].name).toBe('生活');
      expect(actual[1].children.length).toBe(0);
    });
  });

  describe('findAll', () => {
    it('应该返回所有分类的扁平列表', async () => {
      // Arrange
      prisma.category.findMany.mockResolvedValue([
        buildMockCategory({ id: 'cat-1' }),
        buildMockCategory({ id: 'cat-2', parentId: 'cat-1' }),
      ]);

      // Act
      const actual = await service.findAll();

      // Assert
      expect(actual.length).toBe(2);
    });
  });

  describe('findOne', () => {
    it('应该返回指定分类', async () => {
      // Arrange
      prisma.category.findUnique.mockResolvedValue(buildMockCategory({ id: 'cat-1' }));

      // Act
      const actual = await service.findOne('cat-1');

      // Assert
      expect(actual.id).toBe('cat-1');
    });

    it('应该在分类不存在时抛出 NotFoundException', async () => {
      // Arrange
      prisma.category.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('应该成功更新分类', async () => {
      // Arrange
      prisma.category.findUnique.mockResolvedValue(buildMockCategory({ slug: 'tech' }));
      prisma.category.update.mockResolvedValue(buildMockCategory({ name: '科技', slug: 'tech' }));

      // Act
      const actual = await service.update('cat-1', { name: '科技' });

      // Assert
      expect(actual.name).toBe('科技');
      expect(actual.slug).toBe('tech');
      expect(blogCacheService.del).toHaveBeenCalledWith('blog:public:categories');
    });

    it('应该在更新 slug 时更新路径', async () => {
      // Arrange
      prisma.category.findUnique.mockResolvedValue(buildMockCategory({ slug: 'tech', path: '/tech' }));
      prisma.category.findFirst.mockResolvedValue(null); // slug unique check
      prisma.category.update.mockResolvedValue(buildMockCategory({ slug: 'technology', path: '/technology' }));
      prisma.category.findMany.mockResolvedValue([]); // no children to update

      // Act
      const actual = await service.update('cat-1', { slug: 'technology' });

      // Assert
      expect(actual.path).toBe('/technology');
    });
  });

  describe('remove', () => {
    it('应该成功删除分类', async () => {
      // Arrange
      prisma.category.findUnique.mockResolvedValue(buildMockCategory({ id: 'cat-1' }));
      prisma.category.count.mockResolvedValue(0);
      prisma.category.delete.mockResolvedValue(buildMockCategory({ id: 'cat-1' }));

      // Act & Assert
      await expect(service.remove('cat-1')).resolves.toBeUndefined();
      expect(blogCacheService.del).toHaveBeenCalledWith('blog:public:categories');
    });

    it('应该在存在子分类时抛出 BadRequestException', async () => {
      // Arrange
      prisma.category.findUnique.mockResolvedValue(buildMockCategory({ id: 'cat-1' }));
      prisma.category.count.mockResolvedValue(2);

      // Act & Assert
      await expect(service.remove('cat-1')).rejects.toThrow(BadRequestException);
    });
  });
});
