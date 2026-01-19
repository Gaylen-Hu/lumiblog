import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { CategoryService } from '../category.service';
import { CreateCategoryParams } from '../domain/category.model';

describe('CategoryService', () => {
  let service: CategoryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CategoryService],
    }).compile();

    service = module.get<CategoryService>(CategoryService);
  });

  describe('create', () => {
    it('应该成功创建根分类', async () => {
      // Arrange
      const inputParams: CreateCategoryParams = {
        name: '技术',
        slug: 'tech',
        description: '技术文章',
      };

      // Act
      const actual = await service.create(inputParams);

      // Assert
      expect(actual.id).toBeDefined();
      expect(actual.name).toBe(inputParams.name);
      expect(actual.slug).toBe(inputParams.slug);
      expect(actual.level).toBe(1);
      expect(actual.path).toBe('/tech');
      expect(actual.parentId).toBeNull();
    });

    it('应该成功创建子分类', async () => {
      // Arrange
      const parent = await service.create({ name: '技术', slug: 'tech' });
      const inputParams: CreateCategoryParams = {
        name: '后端',
        slug: 'backend',
        parentId: parent.id,
      };

      // Act
      const actual = await service.create(inputParams);

      // Assert
      expect(actual.level).toBe(2);
      expect(actual.path).toBe('/tech/backend');
      expect(actual.parentId).toBe(parent.id);
    });

    it('应该在 slug 重复时抛出 ConflictException', async () => {
      // Arrange
      await service.create({ name: '技术', slug: 'tech' });

      // Act & Assert
      await expect(
        service.create({ name: '科技', slug: 'tech' }),
      ).rejects.toThrow(ConflictException);
    });

    it('应该在超过最大层级时抛出 BadRequestException', async () => {
      // Arrange
      const level1 = await service.create({ name: 'L1', slug: 'l1' });
      const level2 = await service.create({
        name: 'L2',
        slug: 'l2',
        parentId: level1.id,
      });
      const level3 = await service.create({
        name: 'L3',
        slug: 'l3',
        parentId: level2.id,
      });

      // Act & Assert
      await expect(
        service.create({ name: 'L4', slug: 'l4', parentId: level3.id }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findTree', () => {
    beforeEach(async () => {
      const tech = await service.create({ name: '技术', slug: 'tech', sortOrder: 1 });
      await service.create({ name: '后端', slug: 'backend', parentId: tech.id });
      await service.create({ name: '前端', slug: 'frontend', parentId: tech.id });
      await service.create({ name: '生活', slug: 'life', sortOrder: 2 });
    });

    it('应该返回树形结构', async () => {
      // Act
      const actual = await service.findTree();

      // Assert
      expect(actual.length).toBe(2);
      expect(actual[0].name).toBe('技术');
      expect(actual[0].children.length).toBe(2);
      expect(actual[1].name).toBe('生活');
      expect(actual[1].children.length).toBe(0);
    });

    it('应该按 sortOrder 排序', async () => {
      // Act
      const actual = await service.findTree();

      // Assert
      expect(actual[0].sortOrder).toBe(1);
      expect(actual[1].sortOrder).toBe(2);
    });
  });

  describe('findAll', () => {
    it('应该返回所有分类的扁平列表', async () => {
      // Arrange
      const tech = await service.create({ name: '技术', slug: 'tech' });
      await service.create({ name: '后端', slug: 'backend', parentId: tech.id });

      // Act
      const actual = await service.findAll();

      // Assert
      expect(actual.length).toBe(2);
    });
  });

  describe('findOne', () => {
    it('应该返回指定分类', async () => {
      // Arrange
      const created = await service.create({ name: '技术', slug: 'tech' });

      // Act
      const actual = await service.findOne(created.id);

      // Assert
      expect(actual.id).toBe(created.id);
    });

    it('应该在分类不存在时抛出 NotFoundException', async () => {
      // Act & Assert
      await expect(service.findOne('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('应该成功更新分类', async () => {
      // Arrange
      const created = await service.create({ name: '技术', slug: 'tech' });

      // Act
      const actual = await service.update(created.id, { name: '科技' });

      // Assert
      expect(actual.name).toBe('科技');
      expect(actual.slug).toBe('tech');
    });

    it('应该在更新 slug 时更新路径', async () => {
      // Arrange
      const created = await service.create({ name: '技术', slug: 'tech' });

      // Act
      const actual = await service.update(created.id, { slug: 'technology' });

      // Assert
      expect(actual.path).toBe('/technology');
    });
  });

  describe('remove', () => {
    it('应该成功删除分类', async () => {
      // Arrange
      const created = await service.create({ name: '技术', slug: 'tech' });

      // Act
      await service.remove(created.id);

      // Assert
      await expect(service.findOne(created.id)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('应该在存在子分类时抛出 BadRequestException', async () => {
      // Arrange
      const parent = await service.create({ name: '技术', slug: 'tech' });
      await service.create({ name: '后端', slug: 'backend', parentId: parent.id });

      // Act & Assert
      await expect(service.remove(parent.id)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
