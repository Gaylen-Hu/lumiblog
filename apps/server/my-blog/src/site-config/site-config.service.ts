import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma';
import { BlogCacheService, CacheKeyRegistry } from '../redis';
import { UpdateSiteConfigDto, SiteConfigResponseDto } from './dto';

@Injectable()
export class SiteConfigService {
  private readonly logger = new Logger(SiteConfigService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly blogCacheService: BlogCacheService,
  ) {}

  /**
   * 获取网站配置（单例模式，自动创建默认配置）
   * 使用手动 get/set 缓存，避免 wrap 内部多层缓存导致 del 后仍返回旧值
   */
  async getConfig(): Promise<SiteConfigResponseDto> {
    const cached =
      await this.blogCacheService.get<SiteConfigResponseDto>(
        CacheKeyRegistry.SITE_CONFIG,
      );
    if (cached) return cached;

    let config = await this.prisma.siteConfig.findFirst();

    if (!config) {
      this.logger.log('Creating default site config');
      config = await this.prisma.siteConfig.create({
        data: {
          title: 'My Blog',
          description: '欢迎来到我的博客',
        },
      });
    }

    const dto = this.mapToDto(config);
    await this.blogCacheService.set(
      CacheKeyRegistry.SITE_CONFIG,
      dto,
      CacheKeyRegistry.SITE_CONFIG_TTL,
    );
    return dto;
  }

  /**
   * 更新网站配置
   * 更新 DB 后清除旧缓存并写入新值
   */
  async updateConfig(dto: UpdateSiteConfigDto): Promise<SiteConfigResponseDto> {
    const existing = await this.getConfig();

    const updated = await this.prisma.siteConfig.update({
      where: { id: existing.id },
      data: dto,
    });

    const result = this.mapToDto(updated);

    // 先删再写，确保缓存与 DB 一致
    await this.blogCacheService.del(CacheKeyRegistry.SITE_CONFIG);
    await this.blogCacheService.set(
      CacheKeyRegistry.SITE_CONFIG,
      result,
      CacheKeyRegistry.SITE_CONFIG_TTL,
    );

    this.logger.log(`Site config updated: ${updated.id}`);
    return result;
  }

  private mapToDto(config: any): SiteConfigResponseDto {
    return {
      id: config.id,
      title: config.title,
      description: config.description,
      keywords: config.keywords,
      logo: config.logo,
      favicon: config.favicon,
      icp: config.icp,
      gongan: config.gongan,
      copyright: config.copyright,
      analytics: config.analytics,
      analyticsGoogle: config.analyticsGoogle,
      analyticsBaidu: config.analyticsBaidu,
      ownerName: config.ownerName,
      ownerAvatar: config.ownerAvatar,
      ownerBio: config.ownerBio,
      ownerEmail: config.ownerEmail,
      ownerTechStack: config.ownerTechStack || [],
      yearsOfExperience: config.yearsOfExperience,
      openSourceCount: config.openSourceCount,
      talkCount: config.talkCount,
      socialGithub: config.socialGithub,
      socialTwitter: config.socialTwitter,
      socialLinkedin: config.socialLinkedin,
      socialWeibo: config.socialWeibo,
      aboutImage1: config.aboutImage1,
      aboutImage2: config.aboutImage2,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt,
    };
  }
}
