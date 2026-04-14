import { Test, TestingModule } from '@nestjs/testing';
import * as fc from 'fast-check';
import { SiteConfigService } from '../site-config.service';
import { PrismaService } from '../../prisma/prisma.service';
import { BlogCacheService } from '../../redis';

describe('SiteConfigService', () => {
  let service: SiteConfigService;
  let prisma: Record<string, any>;
  let blogCacheService: Record<string, jest.Mock>;

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
    analyticsGoogle: null,
    analyticsBaidu: null,
    ownerName: null,
    ownerAvatar: null,
    ownerBio: null,
    ownerEmail: null,
    ownerTechStack: [],
    yearsOfExperience: null,
    openSourceCount: null,
    talkCount: null,
    socialGithub: null,
    socialTwitter: null,
    socialLinkedin: null,
    socialWeibo: null,
    aboutImage1: null,
    aboutImage2: null,
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

    blogCacheService = {
      wrap: jest.fn((_key: string, fn: () => Promise<unknown>, _ttl: number) => fn()),
      del: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SiteConfigService,
        { provide: PrismaService, useValue: prisma },
        { provide: BlogCacheService, useValue: blogCacheService },
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

  // ============ mapToDto: aboutImage fields ============

  describe('mapToDto: aboutImage fields', () => {
    it('aboutImage1 和 aboutImage2 有有效 URL 时应正确映射到 DTO', async () => {
      // Arrange
      const configWithImages = {
        ...mockSiteConfig,
        aboutImage1: 'https://example.com/image1.jpg',
        aboutImage2: 'https://example.com/image2.jpg',
      };
      prisma.siteConfig.findFirst.mockResolvedValue(configWithImages);

      // Act
      const result = await service.getConfig();

      // Assert
      expect(result.aboutImage1).toBe('https://example.com/image1.jpg');
      expect(result.aboutImage2).toBe('https://example.com/image2.jpg');
    });

    it('aboutImage1 和 aboutImage2 为 null 时 DTO 应返回 null', async () => {
      // Arrange
      const configWithNullImages = {
        ...mockSiteConfig,
        aboutImage1: null,
        aboutImage2: null,
      };
      prisma.siteConfig.findFirst.mockResolvedValue(configWithNullImages);

      // Act
      const result = await service.getConfig();

      // Assert
      expect(result.aboutImage1).toBeNull();
      expect(result.aboutImage2).toBeNull();
    });
  });

  // ============ Property 1 & 2: mapToDto aboutImage field integrity and value mapping ============
  // Feature: about-page-image-fix, Property 1: mapToDto 字段完整性
  // Feature: about-page-image-fix, Property 2: mapToDto 值映射正确性

  describe('Property 1 & 2: mapToDto aboutImage field integrity and value mapping', () => {
    it('对任意 SiteConfig 记录，DTO 应始终包含 aboutImage1 和 aboutImage2 字段且类型正确，值与输入完全一致', async () => {
      // **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5**
      await fc.assert(
        fc.asyncProperty(
          fc.option(fc.webUrl(), { nil: null }),
          fc.option(fc.webUrl(), { nil: null }),
          async (aboutImage1: string | null, aboutImage2: string | null) => {
            // Arrange
            prisma.siteConfig.findFirst.mockReset();
            const configRecord = {
              ...mockSiteConfig,
              aboutImage1,
              aboutImage2,
            };
            prisma.siteConfig.findFirst.mockResolvedValue(configRecord);

            // Act
            const result = await service.getConfig();

            // Assert — Property 1: fields exist with correct types
            expect(Object.prototype.hasOwnProperty.call(result, 'aboutImage1')).toBe(true);
            expect(Object.prototype.hasOwnProperty.call(result, 'aboutImage2')).toBe(true);
            expect(
              result.aboutImage1 === null || typeof result.aboutImage1 === 'string',
            ).toBe(true);
            expect(
              result.aboutImage2 === null || typeof result.aboutImage2 === 'string',
            ).toBe(true);

            // Assert — Property 2: values exactly match input
            expect(result.aboutImage1).toBe(aboutImage1);
            expect(result.aboutImage2).toBe(aboutImage2);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  // ============ 缓存相关单元测试 ============
  // **Validates: Requirements 2.1, 2.2, 2.5**

  describe('缓存集成', () => {
    it('getConfig 应使用 blogCacheService.wrap 包裹数据库查询', async () => {
      // Arrange
      prisma.siteConfig.findFirst.mockResolvedValue(mockSiteConfig);

      // Act
      await service.getConfig();

      // Assert
      expect(blogCacheService.wrap).toHaveBeenCalledTimes(1);
      expect(blogCacheService.wrap).toHaveBeenCalledWith(
        'blog:site-config',
        expect.any(Function),
        3600,
      );
    });

    it('getConfig 缓存命中时不应查询数据库', async () => {
      // Arrange — wrap 直接返回缓存数据，不调用 fn
      const cachedData = { ...mockSiteConfig, title: 'Cached Title' };
      blogCacheService.wrap.mockResolvedValue(cachedData);

      // Act
      const result = await service.getConfig();

      // Assert
      expect(result).toEqual(cachedData);
      expect(prisma.siteConfig.findFirst).not.toHaveBeenCalled();
      expect(prisma.siteConfig.create).not.toHaveBeenCalled();
    });

    it('updateConfig 应在更新后清除缓存', async () => {
      // Arrange
      const updateDto = { title: 'Updated Title' };
      const updatedConfig = { ...mockSiteConfig, ...updateDto };
      prisma.siteConfig.findFirst.mockResolvedValue(mockSiteConfig);
      prisma.siteConfig.update.mockResolvedValue(updatedConfig);

      // Act
      await service.updateConfig(updateDto);

      // Assert
      expect(blogCacheService.del).toHaveBeenCalledWith('blog:site-config');
      expect(blogCacheService.del).toHaveBeenCalledTimes(1);
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
