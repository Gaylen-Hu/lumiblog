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
   * 使用 wrap 模式缓存，防止缓存击穿
   */
  async getConfig(): Promise<SiteConfigResponseDto> {
    return this.blogCacheService.wrap<SiteConfigResponseDto>(
      CacheKeyRegistry.SITE_CONFIG,
      async () => {
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

        return this.mapToDto(config);
      },
      CacheKeyRegistry.SITE_CONFIG_TTL,
    );
  }

  /**
   * 更新网站配置
   * 更新 DB 后立即清除缓存
   */
  async updateConfig(dto: UpdateSiteConfigDto): Promise<SiteConfigResponseDto> {
    const existing = await this.getConfig();

    const updated = await this.prisma.siteConfig.update({
      where: { id: existing.id },
      data: dto,
    });

    await this.blogCacheService.del(CacheKeyRegistry.SITE_CONFIG);

    this.logger.log(`Site config updated: ${updated.id}`);
    return this.mapToDto(updated);
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
