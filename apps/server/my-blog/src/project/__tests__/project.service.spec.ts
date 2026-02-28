import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ProjectService } from '../project.service';
import { PrismaService } from '../../prisma/prisma.service';

function buildMockProject(
  overrides: Partial<{
    id: string;
    title: string;
    description: string;
    techStack: string[];
    coverImage: string | null;
    link: string | null;
    githubUrl: string | null;
    featured: boolean;
    order: number;
    createdAt: Date;
    updatedAt: Date;
  }> = {},
) {
  const now = new Date();
  return {
    id: overrides.id ?? 'project-1',
    title: overrides.title ?? 'My Blog',
    description: overrides.description ?? '一个博客平台',
    techStack: overrides.techStack ?? ['NestJS', 'Next.js'],
    coverImage: overrides.coverImage ?? null,
    link: overrides.link ?? null,
    githubUrl: overrides.githubUrl ?? null,
    featured: overrides.featured ?? false,
    order: overrides.order ?? 0,
    createdAt: overrides.createdAt ?? now,
    updatedAt: overrides.updatedAt ?? now,
  };
}

describe('ProjectService', () => {
  let service: ProjectService;
  let prisma: {
    project: {
      create: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
      count: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      project: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<ProjectService>(ProjectService);
  });

  describe('create', () => {
    it('应该创建项目并返回响应 DTO', async () => {
      // Arrange
      const mockProject = buildMockProject({
        title: 'New Project',
        description: '项目描述',
        techStack: ['React', 'Node.js'],
        featured: true,
        order: 1,
      });
      prisma.project.create.mockResolvedValue(mockProject);

      // Act
      const result = await service.create({
        title: 'New Project',
        description: '项目描述',
        techStack: ['React', 'Node.js'],
        featured: true,
        order: 1,
      });

      // Assert
      expect(result.title).toBe('New Project');
      expect(result.description).toBe('项目描述');
      expect(result.techStack).toEqual(['React', 'Node.js']);
      expect(result.featured).toBe(true);
      expect(result.order).toBe(1);
      expect(prisma.project.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('findAll', () => {
    it('应该返回分页列表', async () => {
      // Arrange
      const mockProjects = [
        buildMockProject({ id: 'p-1', title: 'Project A', order: 0 }),
        buildMockProject({ id: 'p-2', title: 'Project B', order: 1 }),
      ];
      prisma.project.findMany.mockResolvedValue(mockProjects);
      prisma.project.count.mockResolvedValue(5);

      // Act
      const result = await service.findAll({ page: 1, limit: 2 });

      // Assert
      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(5);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(2);
      expect(prisma.project.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 2,
          orderBy: { order: 'asc' },
        }),
      );
    });

    it('应该在提供 featured 时按精选筛选', async () => {
      // Arrange
      const mockProjects = [
        buildMockProject({ id: 'p-1', featured: true }),
      ];
      prisma.project.findMany.mockResolvedValue(mockProjects);
      prisma.project.count.mockResolvedValue(1);

      // Act
      const result = await service.findAll({ page: 1, limit: 10, featured: true });

      // Assert
      expect(result.data).toHaveLength(1);
      expect(result.data[0].featured).toBe(true);
      expect(prisma.project.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { featured: true },
        }),
      );
      expect(prisma.project.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { featured: true },
        }),
      );
    });
  });

  describe('findOne', () => {
    it('应该返回指定项目', async () => {
      // Arrange
      prisma.project.findUnique.mockResolvedValue(
        buildMockProject({ id: 'project-1', title: 'My Blog' }),
      );

      // Act
      const result = await service.findOne('project-1');

      // Assert
      expect(result.id).toBe('project-1');
      expect(result.title).toBe('My Blog');
    });

    it('应该在项目不存在时抛出 NotFoundException', async () => {
      // Arrange
      prisma.project.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findOne('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('应该更新项目并返回响应 DTO', async () => {
      // Arrange
      prisma.project.findUnique.mockResolvedValue(
        buildMockProject({ id: 'project-1' }),
      );
      prisma.project.update.mockResolvedValue(
        buildMockProject({ id: 'project-1', title: '更新后的项目', featured: true }),
      );

      // Act
      const result = await service.update('project-1', {
        title: '更新后的项目',
        featured: true,
      });

      // Assert
      expect(result.title).toBe('更新后的项目');
      expect(result.featured).toBe(true);
      expect(prisma.project.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'project-1' },
        }),
      );
    });

    it('应该在项目不存在时抛出 NotFoundException', async () => {
      // Arrange
      prisma.project.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.update('nonexistent', { title: '新标题' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('应该删除项目', async () => {
      // Arrange
      prisma.project.findUnique.mockResolvedValue(
        buildMockProject({ id: 'project-1' }),
      );
      prisma.project.delete.mockResolvedValue(
        buildMockProject({ id: 'project-1' }),
      );

      // Act & Assert
      await expect(service.remove('project-1')).resolves.toBeUndefined();
      expect(prisma.project.delete).toHaveBeenCalledWith({
        where: { id: 'project-1' },
      });
    });

    it('应该在项目不存在时抛出 NotFoundException', async () => {
      // Arrange
      prisma.project.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.remove('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
