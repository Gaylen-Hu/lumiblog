import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { TagService } from '../tag.service';
import { CreateTagParams } from '../domain/tag.model';

describe('TagService', () => {
  let service: TagService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TagService],
    }).compile();

    service = module.get<TagService>(TagService);
  });

  describe('create', () => {
    it('应该成功创建标签', async () => {
      // Arrange
      const inputParams: CreateTagParams = {
        name: 'TypeScript',
        slug: 'typescript',
        description: 'TypeScript 相关',
      };

      // Act
      const actual = await service.create(inputParams);

      // Assert
      expect(actual.id).toBeDefined();
      expect(actual.name).toBe(inputParams.name);
      expect(actual.slug).toBe(inputParams.slug);
      expect(actual.articleCount).toBe(0);
    });

    it('应该在 slug 重复时抛出 ConflictException', async () => {
      // Arrange
      await service.create({ name: 'TypeScript', slug: 'typescript' });

      // Act & Assert
      await expect(
        service.create({ name: 'TS', slug: 'typescript' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    it('应该返回所有标签', async () => {
      // Arrange
      await service.create({ name: 'TypeScript', slug: 'typescript' });
      await service.create({ name: 'JavaScript', slug: 'javascript' });

      // Act
      const actual = await service.findAll();

      // Assert
      expect(actual.length).toBe(2);
    });
  });

  describe('findPopular', () => {
    beforeEach(async () => {
      const tag1 = await service.create({ name: 'Tag1', slug: 'tag1' });
      const tag2 = await service.create({ name: 'Tag2', slug: 'tag2' });
      const tag3 = await service.create({ name: 'Tag3', slug: 'tag3' });

      // 模拟文章计数
      await service.incrementArticleCount(tag1.id);
      await service.incrementArticleCount(tag2.id);
      await service.incrementArticleCount(tag2.id);
      await service.incrementArticleCount(tag3.id);
      await service.incrementArticleCount(tag3.id);
      await service.incrementArticleCount(tag3.id);
    });

    it('应该按文章数量降序返回', async () => {
      // Act
      const actual = await service.findPopular(10);

      // Assert
      expect(actual[0].name).toBe('Tag3');
      expect(actual[0].articleCount).toBe(3);
      expect(actual[1].name).toBe('Tag2');
      expect(actual[2].name).toBe('Tag1');
    });

    it('应该限制返回数量', async () => {
      // Act
      const actual = await service.findPopular(2);

      // Assert
      expect(actual.length).toBe(2);
    });
  });

  describe('findOne', () => {
    it('应该返回指定标签', async () => {
      // Arrange
      const created = await service.create({ name: 'TypeScript', slug: 'typescript' });

      // Act
      const actual = await service.findOne(created.id);

      // Assert
      expect(actual.id).toBe(created.id);
    });

    it('应该在标签不存在时抛出 NotFoundException', async () => {
      // Act & Assert
      await expect(service.findOne('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findBySlug', () => {
    it('应该根据 slug 返回标签', async () => {
      // Arrange
      await service.create({ name: 'TypeScript', slug: 'typescript' });

      // Act
      const actual = await service.findBySlug('typescript');

      // Assert
      expect(actual?.name).toBe('TypeScript');
    });

    it('应该在标签不存在时返回 null', async () => {
      // Act
      const actual = await service.findBySlug('nonexistent');

      // Assert
      expect(actual).toBeNull();
    });
  });

  describe('findByIds', () => {
    it('应该根据 ID 列表返回标签', async () => {
      // Arrange
      const tag1 = await service.create({ name: 'Tag1', slug: 'tag1' });
      const tag2 = await service.create({ name: 'Tag2', slug: 'tag2' });
      await service.create({ name: 'Tag3', slug: 'tag3' });

      // Act
      const actual = await service.findByIds([tag1.id, tag2.id]);

      // Assert
      expect(actual.length).toBe(2);
    });
  });

  describe('update', () => {
    it('应该成功更新标签', async () => {
      // Arrange
      const created = await service.create({ name: 'TypeScript', slug: 'typescript' });

      // Act
      const actual = await service.update(created.id, { name: 'TS' });

      // Assert
      expect(actual.name).toBe('TS');
      expect(actual.slug).toBe('typescript');
    });

    it('应该在 slug 重复时抛出 ConflictException', async () => {
      // Arrange
      await service.create({ name: 'TypeScript', slug: 'typescript' });
      const tag2 = await service.create({ name: 'JavaScript', slug: 'javascript' });

      // Act & Assert
      await expect(
        service.update(tag2.id, { slug: 'typescript' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('remove', () => {
    it('应该成功删除标签', async () => {
      // Arrange
      const created = await service.create({ name: 'TypeScript', slug: 'typescript' });

      // Act
      await service.remove(created.id);

      // Assert
      await expect(service.findOne(created.id)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('incrementArticleCount / decrementArticleCount', () => {
    it('应该正确增减文章计数', async () => {
      // Arrange
      const tag = await service.create({ name: 'Test', slug: 'test' });

      // Act
      await service.incrementArticleCount(tag.id);
      await service.incrementArticleCount(tag.id);
      let actual = await service.findOne(tag.id);
      expect(actual.articleCount).toBe(2);

      await service.decrementArticleCount(tag.id);
      actual = await service.findOne(tag.id);

      // Assert
      expect(actual.articleCount).toBe(1);
    });

    it('文章计数不应小于 0', async () => {
      // Arrange
      const tag = await service.create({ name: 'Test', slug: 'test' });

      // Act
      await service.decrementArticleCount(tag.id);
      const actual = await service.findOne(tag.id);

      // Assert
      expect(actual.articleCount).toBe(0);
    });
  });
});
