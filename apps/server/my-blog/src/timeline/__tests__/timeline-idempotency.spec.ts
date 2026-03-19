/**
 * P4：管理端 CRUD 幂等性
 * 对同一条目执行 PATCH 更新后，再次 GET /v1/admin/timeline/:id
 * 返回的数据与更新请求字段一致
 * Validates: Requirements 2.4
 */
import { Test, TestingModule } from '@nestjs/testing';
import * as fc from 'fast-check';
import { TimelineService } from '../timeline.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('P4：管理端 PATCH 幂等性', () => {
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

  it('PATCH 后 GET 返回的字段与更新请求一致', async () => {
    await fc.assert(
      fc.asyncProperty(
        // 原始条目
        fc.record({
          id: fc.uuid(),
          year: fc.stringMatching(/^\d{4}$/),
          titleZh: fc.string({ minLength: 1, maxLength: 100 }),
          titleEn: fc.string({ minLength: 1, maxLength: 100 }),
          descZh: fc.string({ minLength: 1, maxLength: 500 }),
          descEn: fc.string({ minLength: 1, maxLength: 500 }),
          order: fc.integer({ min: 0, max: 9999 }),
          isVisible: fc.boolean(),
          createdAt: fc.date(),
          updatedAt: fc.date(),
        }),
        // 更新 payload（部分字段）
        fc.record({
          titleZh: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined }),
          titleEn: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined }),
          descZh: fc.option(fc.string({ minLength: 1, maxLength: 500 }), { nil: undefined }),
          descEn: fc.option(fc.string({ minLength: 1, maxLength: 500 }), { nil: undefined }),
          order: fc.option(fc.integer({ min: 0, max: 9999 }), { nil: undefined }),
          isVisible: fc.option(fc.boolean(), { nil: undefined }),
        }),
        async (original, patch) => {
          // 构造 PATCH 后的预期状态（合并原始 + patch）
          const afterPatch = {
            ...original,
            ...Object.fromEntries(
              Object.entries(patch).filter(([, v]) => v !== undefined),
            ),
            updatedAt: new Date(),
          };

          // update() 先查存在性，再执行更新
          prisma.timelineEntry.findUnique.mockResolvedValue(original);
          prisma.timelineEntry.update.mockResolvedValue(afterPatch);

          const updateResult = await service.update(original.id, patch);

          // findOne() 返回更新后的数据
          prisma.timelineEntry.findUnique.mockResolvedValue(afterPatch);
          const getResult = await service.findOne(original.id);

          // 验证：update 返回值与 findOne 返回值一致
          expect(updateResult.id).toBe(getResult.id);
          expect(updateResult.year).toBe(getResult.year);
          expect(updateResult.titleZh).toBe(getResult.titleZh);
          expect(updateResult.titleEn).toBe(getResult.titleEn);
          expect(updateResult.descZh).toBe(getResult.descZh);
          expect(updateResult.descEn).toBe(getResult.descEn);
          expect(updateResult.order).toBe(getResult.order);
          expect(updateResult.isVisible).toBe(getResult.isVisible);

          // 验证：patch 中提供的字段在 GET 结果中正确反映
          if (patch.titleZh !== undefined) expect(getResult.titleZh).toBe(patch.titleZh);
          if (patch.titleEn !== undefined) expect(getResult.titleEn).toBe(patch.titleEn);
          if (patch.descZh !== undefined) expect(getResult.descZh).toBe(patch.descZh);
          if (patch.descEn !== undefined) expect(getResult.descEn).toBe(patch.descEn);
          if (patch.order !== undefined) expect(getResult.order).toBe(patch.order);
          if (patch.isVisible !== undefined) expect(getResult.isVisible).toBe(patch.isVisible);
        },
      ),
      { numRuns: 50 },
    );
  });

  it('连续两次相同 PATCH 结果一致（幂等性）', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          id: fc.uuid(),
          year: fc.stringMatching(/^\d{4}$/),
          titleZh: fc.string({ minLength: 1, maxLength: 100 }),
          titleEn: fc.string({ minLength: 1, maxLength: 100 }),
          descZh: fc.string({ minLength: 1, maxLength: 500 }),
          descEn: fc.string({ minLength: 1, maxLength: 500 }),
          order: fc.integer({ min: 0, max: 9999 }),
          isVisible: fc.boolean(),
          createdAt: fc.date(),
          updatedAt: fc.date(),
        }),
        fc.record({
          titleZh: fc.string({ minLength: 1, maxLength: 100 }),
          order: fc.integer({ min: 0, max: 9999 }),
          isVisible: fc.boolean(),
        }),
        async (original, patch) => {
          const afterPatch = { ...original, ...patch, updatedAt: new Date() };

          // 第一次 PATCH
          prisma.timelineEntry.findUnique.mockResolvedValue(original);
          prisma.timelineEntry.update.mockResolvedValue(afterPatch);
          const result1 = await service.update(original.id, patch);

          // 第二次相同 PATCH
          prisma.timelineEntry.findUnique.mockResolvedValue(afterPatch);
          prisma.timelineEntry.update.mockResolvedValue(afterPatch);
          const result2 = await service.update(original.id, patch);

          // 两次结果的业务字段应完全一致
          expect(result1.titleZh).toBe(result2.titleZh);
          expect(result1.order).toBe(result2.order);
          expect(result1.isVisible).toBe(result2.isVisible);
        },
      ),
      { numRuns: 50 },
    );
  });
});
