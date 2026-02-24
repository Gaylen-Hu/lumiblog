import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma';
import { UpdateSiteConfigDto, SiteConfigResponseDto } from './dto';

@Injectable()
export class SiteConfigService {
  private readonly logger = new Logger(SiteConfigService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 获取网站配置（单例模式，自动创建默认配置）
   */
  async getConfig(): Promise<SiteConfigResponseDto> {
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

    return config;
  }

  /**
   * 更新网站配置
   */
  async updateConfig(dto: UpdateSiteConfigDto): Promise<SiteConfigResponseDto> {
    const existing = await this.getConfig();

    const updated = await this.prisma.siteConfig.update({
      where: { id: existing.id },
      data: dto,
    });

    this.logger.log(`Site config updated: ${updated.id}`);
    return updated;
  }
}
