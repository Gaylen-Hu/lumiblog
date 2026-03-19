/**
 * TimelineService 单元测试
 * 包含基础 CRUD 测试及属性测试 P1、P2、P3
 */
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import * as fc from 'fast-check';
import { TimelineService } from '../timeline.service';
import { PrismaService } from '../../prisma/prisma.service';

/** 构造完整的 mock TimelineEntry（含内部字段） */
function buildMockEntry(
  overrides: Partial<{
    id: string;
    year: string;
    titleZh: string;
    titleEn: string;
    descZh: string;
    descEn: string;
    order: number;
    isVisible: boolean;
    createdAt: Date;
    updatedAt: Date;
  }> = {},
) {
  const now = new Date();
  return {
    id: overrides.id ?? 'entry-1',
    year: overrides.year ?? '2020',
    titleZh: overrides.titleZh ?? '中文标题',
    titleEn: overrides.titleEn ?? 'English Title',
    descZh: overrides.descZh ?? '中文描述',
    descEn: overrides.descEn ?? 'English Description',
    order: overrides.order ?? 0,
    isVisible: overrides.isVisible ?? true,
    createdAt: overrides.createdAt ?? now,
    updatedAt: overrides.updatedAt ?? now,
  };
}

describe('TimelineService', () => {
  let service: TimelineService;
  let prisma: {
    timelineEntry: {
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
      timelineEntry: {
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
        TimelineService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<TimelineService>(TimelineService);
  });

  // ─── 基础 CRUD 测试 ───────────────────────────────────────────────────────

  describe('create', () => {
    it('应该创建条目并返回响应 DTO', async () => {
      const mockEntry = buildMockEntry({ year: '2023', titleZh: '新条目', order: 5 });
      prisma.timelineEntry.create.mockResolvedValue(mockEntry);

      const result = await service.create({
        year: '2023',
        titleZh: '新条目',
        titleEn: 'New Entry',
        descZh: '中文描述',
        descEn: 'English Description',
        order: 5,
        isVisible: true,
      });

      expect(result.year).toBe('2023');
      expect(result.titleZh).toBe('新条目');
      expect(result.order).toBe(5);
      expect(prisma.timelineEntry.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('findAll', () => {
    it('应该返回分页列表', async () => {
      const mockEntries = [
        buildMockEntry({ id: 'e-1', order: 0 }),
        buildMockEntry({ id: 'e-2', order: 1 }),
      ];
      prisma.timelineEntry.findMany.mockResolvedValue(mockEntries);
      prisma.timelineEntry.count.mockResolvedValue(10);

      const result = await service.findAll({ page: 1, limit: 2 });

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(10);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(2);
      expect(prisma.timelineEntry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 2, orderBy: { order: 'asc' } }),
      );
    });
  });

  describe('findOne', () => {
    it('应该返回指定条目', async () => {
      prisma.timelineEntry.findUnique.mockResolvedValue(
        buildMockEntry({ id: 'entry-1', year: '2020' }),
      );
      const result = await service.findOne('entry-1');
      expect(result.id).toBe('entry-1');
      expect(result.year).toBe('2020');
    });

    it('应该在条目不存在时抛出 NotFoundException', async () => {
      prisma.timelineEntry.findUnique.mockResolvedValue(null);
      await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('应该更新条目并返回响应 DTO', async () => {
      prisma.timelineEntry.findUnique.mockResolvedValue(buildMockEntry({ id: 'entry-1' }));
      prisma.timelineEntry.update.mockResolvedValue(
        buildMockEntry({ id: 'entry-1', titleZh: '更新后的标题', order: 10 }),
      );

      const result = await service.update('entry-1', { titleZh: '更新后的标题', order: 10 });

      expect(result.titleZh).toBe('更新后的标题');
      expect(result.order).toBe(10);
    });

    it('应该在条目不存在时抛出 NotFoundException', async () => {
      prisma.timelineEntry.findUnique.mockResolvedValue(null);
      await expect(service.update('nonexistent', { titleZh: '新标题' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('应该删除条目', async () => {
      prisma.timelineEntry.findUnique.mockResolvedValue(buildMockEntry({ id: 'entry-1' }));
      prisma.timelineEntry.delete.mockResolvedValue(buildMockEntry({ id: 'entry-1' }));

      await expect(service.remove('entry-1')).resolves.toBeUndefined();
      expect(prisma.timelineEntry.delete).toHaveBeenCalledWith({ where: { id: 'entry-1' } });
    });

    it('应该在条目不存在时抛出 NotFoundException', async () => {
      prisma.timelineEntry.findUnique.mockResolvedValue(null);
      await expect(service.remove('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  // ─── 属性测试 ─────────────────────────────────────────────────────────────

  /**
   * P1：公开接口仅返回可见条目
   * Validates: Requirements 3.1
   */
  describe('P1：公开接口仅返回可见条目', () => {
    it('findPublished() 返回的条目均不含 isVisible 字段', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              id: fc.uuid(),
              year: fc.stringMatching(/^\d{4}$/),
              titleZh: fc.string({ minLength: 1, maxLength: 20 }),
              titleEn: fc.string({ minLength: 1, maxLength: 20 }),
              descZh: fc.string({ minLength: 1, maxLength: 50 }),
              descEn: fc.string({ minLength: 1, maxLength: 50 }),
              order: fc.integer({ min: 0, max: 100 }),
              isVisible: fc.boolean(),
              createdAt: fc.date(),
              updatedAt: fc.date(),
            }),
            { minLength: 0, maxLength: 10 },
          ),
          async (entries) => {
            const visibleEntries = entries.filter((e) => e.isVisible);
            prisma.timelineEntry.findMany.mockResolvedValue(visibleEntries);

            const result = await service.findPublished();

            expect(result).toHaveLength(visibleEntries.length);
            for (const item of result) {
              expect(item).not.toHaveProperty('isVisible');
            }
          },
        ),
        { numRuns: 50 },
      );
    });
  });

  /**
   * P2：公开接口按 order 升序排列
   * Validates: Requirements 3.2
   */
  describe('P2：公开接口按 order 升序排列', () => {
    it('findPublished() 返回结果按 order 升序排列', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              id: fc.uuid(),
              year: fc.stringMatching(/^\d{4}$/),
              titleZh: fc.string({ minLength: 1, maxLength: 20 }),
              titleEn: fc.string({ minLength: 1, maxLength: 20 }),
              descZh: fc.string({ minLength: 1, maxLength: 50 }),
              descEn: fc.string({ minLength: 1, maxLength: 50 }),
              order: fc.integer({ min: 0, max: 9999 }),
              isVisible: fc.constant(true),
              createdAt: fc.date(),
              updatedAt: fc.date(),
            }),
            { minLength: 0, maxLength: 10 },
          ),
          async (entries) => {
            const sortedEntries = [...entries].sort((a, b) => a.order - b.order);
            prisma.timelineEntry.findMany.mockResolvedValue(sortedEntries);

            const result = await service.findPublished();

            for (let i = 0; i < result.length - 1; i++) {
              expect(result[i].order).toBeLessThanOrEqual(result[i + 1].order);
            }
            expect(prisma.timelineEntry.findMany).toHaveBeenCalledWith(
              expect.objectContaining({ orderBy: { order: 'asc' } }),
            );
          },
        ),
        { numRuns: 50 },
      );
    });
  });

  /**
   * P3：公开接口不暴露内部字段
   * Validates: Requirements 3.3
   */
  describe('P3：公开接口不暴露内部字段', () => {
    it('findPublished() 返回条目不含 createdAt/updatedAt/isVisible', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              id: fc.uuid(),
              year: fc.stringMatching(/^\d{4}$/),
              titleZh: fc.string({ minLength: 1, maxLength: 20 }),
              titleEn: fc.string({ minLength: 1, maxLength: 20 }),
              descZh: fc.string({ minLength: 1, maxLength: 50 }),
              descEn: fc.string({ minLength: 1, maxLength: 50 }),
              order: fc.integer({ min: 0, max: 9999 }),
              isVisible: fc.constant(true),
              createdAt: fc.date(),
              updatedAt: fc.date(),
            }),
            { minLength: 1, maxLength: 10 },
          ),
          async (entries) => {
            prisma.timelineEntry.findMany.mockResolvedValue(entries);

            const result = await service.findPublished();

            for (const item of result) {
              expect(item).not.toHaveProperty('createdAt');
              expect(item).not.toHaveProperty('updatedAt');
              expect(item).not.toHaveProperty('isVisible');
              expect(item).toHaveProperty('id');
              expect(item).toHaveProperty('year');
              expect(item).toHaveProperty('titleZh');
              expect(item).toHaveProperty('titleEn');
              expect(item).toHaveProperty('descZh');
              expect(item).toHaveProperty('descEn');
              expect(item).toHaveProperty('order');
            }
          },
        ),
        { numRuns: 50 },
      );
    });
  });
});
