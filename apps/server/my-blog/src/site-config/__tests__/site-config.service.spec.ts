import { Test, TestingModule } from '@nestjs/testing';
import * as fc from 'fast-check';
import { SiteConfigService } from '../site-config.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('SiteConfigService', () => {
  let service: SiteConfigService;
  let prisma: Record<string, any>;

  const mockConfigId = 'config-001';
  const now = new Date('2024-01-01');

  const mockSiteConfig = {
    id: mockConfigId,
    title: 'My Blog',
    description: '欢迎来到我的博客',
    keywords: null,
    logo: null,
    favicon: null,
    icp: null,
    gongan: null,
    copyright: null,
    analytics: null,
    ownerName: null,
    ownerAvatar: null,
    ownerBio: null,
    ownerEmail: null,
    socialGithub: null,
    socialTwitter: null,
    socialLinkedin: null,
    socialWeibo: null,
    createdAt: now,
    updatedAt: now,
  };

  beforeEach(async () => {
    prisma = {
      siteConfig: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SiteConfigService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<SiteConfigService>(SiteConfigService);
  });

  // ============ getConfig ============

  describe('getConfig', () => {
    it('应返回已存在的配置', async () => {
      // Arrange
      prisma.siteConfig.findFirst.mockResolvedValue(mockSiteConfig);

      // Act
      const result = await service.getConfig();

      // Assert
      expect(result).toEqual(mockSiteConfig);
      expect(prisma.siteConfig.findFirst).toHaveBeenCalledTimes(1);
      expect(prisma.siteConfig.create).not.toHaveBeenCalled();
    });

    it('配置不存在时应创建默认配置', async () => {
      // Arrange
      prisma.siteConfig.findFirst.mockResolvedValue(null);
      prisma.siteConfig.create.mockResolvedValue(mockSiteConfig);

      // Act
      const result = await service.getConfig();

      // Assert
      expect(result).toEqual(mockSiteConfig);
      expect(prisma.siteConfig.create).toHaveBeenCalledWith({
        data: {
          title: 'My Blog',
          description: '欢迎来到我的博客',
        },
      });
    });

    it('默认配置应包含正确的 title 和 description', async () => {
      // Arrange
      prisma.siteConfig.findFirst.mockResolvedValue(null);
      prisma.siteConfig.create.mockResolvedValue(mockSiteConfig);

      // Act
      await service.getConfig();

      // Assert
      const createCall = prisma.siteConfig.create.mock.calls[0][0];
      expect(createCall.data.title).toBe('My Blog');
      expect(createCall.data.description).toBe('欢迎来到我的博客');
    });
  });

  // ============ updateConfig ============

  describe('updateConfig', () => {
    it('应更新配置并返回更新后的结果', async () => {
      // Arrange
      const updateDto = { title: 'New Title', description: 'New Desc' };
      const updatedConfig = { ...mockSiteConfig, ...updateDto };
      prisma.siteConfig.findFirst.mockResolvedValue(mockSiteConfig);
      prisma.siteConfig.update.mockResolvedValue(updatedConfig);

      // Act
      const result = await service.updateConfig(updateDto);

      // Assert
      expect(result.title).toBe('New Title');
      expect(result.description).toBe('New Desc');
      expect(prisma.siteConfig.update).toHaveBeenCalledWith({
        where: { id: mockConfigId },
        data: updateDto,
      });
    });

    it('应支持部分字段更新', async () => {
      // Arrange
      const updateDto = { ownerName: 'John' };
      const updatedConfig = { ...mockSiteConfig, ownerName: 'John' };
      prisma.siteConfig.findFirst.mockResolvedValue(mockSiteConfig);
      prisma.siteConfig.update.mockResolvedValue(updatedConfig);

      // Act
      const result = await service.updateConfig(updateDto);

      // Assert
      expect(result.ownerName).toBe('John');
      expect(prisma.siteConfig.update).toHaveBeenCalledWith({
        where: { id: mockConfigId },
        data: { ownerName: 'John' },
      });
    });

    it('应支持更新社交链接字段', async () => {
      // Arrange
      const updateDto = {
        socialGithub: 'https://github.com/test',
        socialTwitter: 'https://twitter.com/test',
      };
      const updatedConfig = { ...mockSiteConfig, ...updateDto };
      prisma.siteConfig.findFirst.mockResolvedValue(mockSiteConfig);
      prisma.siteConfig.update.mockResolvedValue(updatedConfig);

      // Act
      const result = await service.updateConfig(updateDto);

      // Assert
      expect(result.socialGithub).toBe('https://github.com/test');
      expect(result.socialTwitter).toBe('https://twitter.com/test');
    });

    it('配置不存在时应先创建默认配置再更新', async () => {
      // Arrange
      const updateDto = { title: 'Updated' };
      prisma.siteConfig.findFirst.mockResolvedValue(null);
      prisma.siteConfig.create.mockResolvedValue(mockSiteConfig);
      prisma.siteConfig.update.mockResolvedValue({
        ...mockSiteConfig,
        title: 'Updated',
      });

      // Act
      const result = await service.updateConfig(updateDto);

      // Assert
      expect(prisma.siteConfig.create).toHaveBeenCalled();
      expect(prisma.siteConfig.update).toHaveBeenCalledWith({
        where: { id: mockConfigId },
        data: updateDto,
      });
      expect(result.title).toBe('Updated');
    });
  });

  // ============ Property 8: 站点配置单例 ============
  // **Validates: Requirements P2 补充单元测试**

  describe('Property 8: 站点配置单例', () => {
    it('对任意操作序列，getConfig 和 updateConfig 始终操作同一条记录', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.oneof(
              fc.constant({ type: 'get' as const }),
              fc.record({
                type: fc.constant('update' as const),
                title: fc.option(fc.string({ minLength: 1, maxLength: 60 }), {
                  nil: undefined,
                }),
                ownerName: fc.option(
                  fc.string({ minLength: 1, maxLength: 50 }),
                  { nil: undefined },
                ),
              }),
            ),
            { minLength: 1, maxLength: 10 },
          ),
          async (operations) => {
            // Arrange — reset mocks for each property run
            prisma.siteConfig.findFirst.mockReset();
            prisma.siteConfig.create.mockReset();
            prisma.siteConfig.update.mockReset();

            // Track: create should be called at most once (singleton)
            let createCallCount = 0;
            const singletonId = mockConfigId;

            // First call: no config exists → create
            // Subsequent calls: config exists → return it
            let configCreated = false;

            prisma.siteConfig.findFirst.mockImplementation(() => {
              if (configCreated) {
                return Promise.resolve({ ...mockSiteConfig, id: singletonId });
              }
              return Promise.resolve(null);
            });

            prisma.siteConfig.create.mockImplementation(() => {
              createCallCount++;
              configCreated = true;
              return Promise.resolve({ ...mockSiteConfig, id: singletonId });
            });

            prisma.siteConfig.update.mockImplementation(
              (args: { where: { id: string }; data: Record<string, unknown> }) => {
                return Promise.resolve({
                  ...mockSiteConfig,
                  id: singletonId,
                  ...args.data,
                });
              },
            );

            // Act — execute all operations
            for (const op of operations) {
              if (op.type === 'get') {
                await service.getConfig();
              } else {
                const dto: Record<string, string> = {};
                if (op.title !== undefined) dto.title = op.title;
                if (op.ownerName !== undefined) dto.ownerName = op.ownerName;
                if (Object.keys(dto).length > 0) {
                  await service.updateConfig(dto);
                }
              }
            }

            // Assert — singleton property: create called at most once
            expect(createCallCount).toBeLessThanOrEqual(1);

            // All update calls target the same singleton ID
            for (const call of prisma.siteConfig.update.mock.calls) {
              expect(call[0].where.id).toBe(singletonId);
            }
          },
        ),
        { numRuns: 50 },
      );
    });
  });
});
