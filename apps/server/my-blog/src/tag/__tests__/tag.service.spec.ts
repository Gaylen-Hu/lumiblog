import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { TagService } from '../tag.service';
import { PrismaService } from '../../prisma/prisma.service';

function buildMockTag(overrides: Partial<{
  id: string;
  name: string;
  slug: string;
  description: string | null;
  articleCount: number;
  createdAt: Date;
  updatedAt: Date;
}> = {}) {
  const now = new Date();
  return {
    id: overrides.id ?? 'tag-1',
    name: overrides.name ?? 'TypeScript',
    slug: overrides.slug ?? 'typescript',
    description: overrides.description ?? null,
    articleCount: overrides.articleCount ?? 0,
    createdAt: overrides.createdAt ?? now,
    updatedAt: overrides.updatedAt ?? now,
  };
}

describe('TagService', () => {
  let service: TagService;
  let prisma: {
    tag: {
      create: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      tag: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TagService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<TagService>(TagService);
  });

  describe('create', () => {
    it('应该成功创建标签', async () => {
      // Arrange
      prisma.tag.findFirst.mockResolvedValue(null);
      prisma.tag.create.mockResolvedValue(buildMockTag());

      // Act
      const actual = await service.create({ name: 'TypeScript', slug: 'typescript', description: 'TS 相关' });

      // Assert
      expect(actual.id).toBeDefined();
      expect(actual.name).toBe('TypeScript');
      expect(actual.slug).toBe('typescript');
      expect(actual.articleCount).toBe(0);
    });

    it('应该在 slug 重复时抛出 ConflictException', async () => {
      // Arrange
      prisma.tag.findFirst.mockResolvedValue(buildMockTag());

      // Act & Assert
      await expect(
        service.create({ name: 'TS', slug: 'typescript' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    it('应该返回所有标签', async () => {
      // Arrange
      prisma.tag.findMany.mockResolvedValue([
        buildMockTag({ id: 'tag-1', name: 'TypeScript', slug: 'typescript' }),
        buildMockTag({ id: 'tag-2', name: 'JavaScript', slug: 'javascript' }),
      ]);

      // Act
      const actual = await service.findAll();

      // Assert
      expect(actual.length).toBe(2);
    });
  });

  describe('findPopular', () => {
    it('应该按文章数量降序返回', async () => {
      // Arrange
      prisma.tag.findMany.mockResolvedValue([
        buildMockTag({ id: 'tag-3', name: 'Tag3', slug: 'tag3', articleCount: 3 }),
        buildMockTag({ id: 'tag-2', name: 'Tag2', slug: 'tag2', articleCount: 2 }),
        buildMockTag({ id: 'tag-1', name: 'Tag1', slug: 'tag1', articleCount: 1 }),
      ]);

      // Act
      const actual = await service.findPopular(10);

      // Assert
      expect(actual[0].name).toBe('Tag3');
      expect(actual[0].articleCount).toBe(3);
      expect(actual[1].name).toBe('Tag2');
      expect(actual[2].name).toBe('Tag1');
    });

    it('应该限制返回数量', async () => {
      // Arrange
      prisma.tag.findMany.mockResolvedValue([
        buildMockTag({ id: 'tag-3', name: 'Tag3', slug: 'tag3', articleCount: 3 }),
        buildMockTag({ id: 'tag-2', name: 'Tag2', slug: 'tag2', articleCount: 2 }),
      ]);

      // Act
      const actual = await service.findPopular(2);

      // Assert
      expect(actual.length).toBe(2);
      expect(prisma.tag.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 2 }),
      );
    });
  });

  describe('findOne', () => {
    it('应该返回指定标签', async () => {
      // Arrange
      prisma.tag.findUnique.mockResolvedValue(buildMockTag({ id: 'tag-1' }));

      // Act
      const actual = await service.findOne('tag-1');

      // Assert
      expect(actual.id).toBe('tag-1');
    });

    it('应该在标签不存在时抛出 NotFoundException', async () => {
      // Arrange
      prisma.tag.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findBySlug', () => {
    it('应该根据 slug 返回标签', async () => {
      // Arrange
      prisma.tag.findFirst.mockResolvedValue(buildMockTag({ name: 'TypeScript', slug: 'typescript' }));

      // Act
      const actual = await service.findBySlug('typescript');

      // Assert
      expect(actual?.name).toBe('TypeScript');
    });

    it('应该在标签不存在时返回 null', async () => {
      // Arrange
      prisma.tag.findFirst.mockResolvedValue(null);

      // Act
      const actual = await service.findBySlug('nonexistent');

      // Assert
      expect(actual).toBeNull();
    });
  });

  describe('findByIds', () => {
    it('应该根据 ID 列表返回标签', async () => {
      // Arrange
      prisma.tag.findMany.mockResolvedValue([
        buildMockTag({ id: 'tag-1' }),
        buildMockTag({ id: 'tag-2' }),
      ]);

      // Act
      const actual = await service.findByIds(['tag-1', 'tag-2']);

      // Assert
      expect(actual.length).toBe(2);
    });
  });

  describe('update', () => {
    it('应该成功更新标签', async () => {
      // Arrange
      prisma.tag.findUnique.mockResolvedValue(buildMockTag({ slug: 'typescript' }));
      prisma.tag.update.mockResolvedValue(buildMockTag({ name: 'TS', slug: 'typescript' }));

      // Act
      const actual = await service.update('tag-1', { name: 'TS' });

      // Assert
      expect(actual.name).toBe('TS');
      expect(actual.slug).toBe('typescript');
    });

    it('应该在 slug 重复时抛出 ConflictException', async () => {
      // Arrange
      prisma.tag.findUnique.mockResolvedValue(buildMockTag({ id: 'tag-2', slug: 'javascript' }));
      prisma.tag.findFirst.mockResolvedValue(buildMockTag({ id: 'tag-1', slug: 'typescript' }));

      // Act & Assert
      await expect(
        service.update('tag-2', { slug: 'typescript' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('remove', () => {
    it('应该成功删除标签', async () => {
      // Arrange
      prisma.tag.findUnique.mockResolvedValue(buildMockTag({ id: 'tag-1' }));
      prisma.tag.delete.mockResolvedValue(buildMockTag({ id: 'tag-1' }));

      // Act & Assert
      await expect(service.remove('tag-1')).resolves.toBeUndefined();
      expect(prisma.tag.delete).toHaveBeenCalledWith({ where: { id: 'tag-1' } });
    });
  });

  describe('incrementArticleCount / decrementArticleCount', () => {
    it('应该正确增加文章计数', async () => {
      // Arrange
      prisma.tag.update.mockResolvedValue(buildMockTag({ articleCount: 1 }));

      // Act
      await service.incrementArticleCount('tag-1');

      // Assert
      expect(prisma.tag.update).toHaveBeenCalledWith({
        where: { id: 'tag-1' },
        data: { articleCount: { increment: 1 } },
      });
    });

    it('文章计数不应小于 0', async () => {
      // Arrange
      prisma.tag.findUnique.mockResolvedValue(buildMockTag({ articleCount: 0 }));

      // Act
      await service.decrementArticleCount('tag-1');

      // Assert - should not call update since count is already 0
      expect(prisma.tag.update).not.toHaveBeenCalled();
    });
  });
});
