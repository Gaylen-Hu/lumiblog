import {
  Injectable,
  ConflictException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BlogCacheService, CacheKeyRegistry } from '../redis';
import { CreateTagParams, UpdateTagParams } from './domain/tag.model';
import { TagResponseDto } from './dto';
import { Tag } from '@prisma/client';

@Injectable()
export class TagService {
  private readonly logger = new Logger(TagService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly blogCacheService: BlogCacheService,
  ) {}

  /**
   * 创建标签
   */
  async create(params: CreateTagParams): Promise<TagResponseDto> {
    await this.validateSlugUnique(params.slug);

    const tag = await this.prisma.tag.create({
      data: {
        name: params.name,
        slug: params.slug,
        description: params.description ?? null,
        articleCount: 0,
      },
    });

    this.logger.log(`标签创建成功: ${tag.id}`);
    await this.blogCacheService.del(CacheKeyRegistry.PUBLIC_TAGS);
    return this.toResponseDto(tag);
  }

  /**
   * 获取所有标签
   */
  async findAll(): Promise<TagResponseDto[]> {
    const tags = await this.prisma.tag.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return tags.map((t) => this.toResponseDto(t));
  }

  /**
   * 获取热门标签
   */
  async findPopular(limit: number = 10): Promise<TagResponseDto[]> {
    const tags = await this.prisma.tag.findMany({
      orderBy: { articleCount: 'desc' },
      take: limit,
    });
    return tags.map((t) => this.toResponseDto(t));
  }

  /**
   * 根据 ID 获取标签
   */
  async findOne(id: string): Promise<TagResponseDto> {
    const tag = await this.findById(id);
    return this.toResponseDto(tag);
  }

  /**
   * 根据 slug 获取标签
   */
  async findBySlug(slug: string): Promise<TagResponseDto | null> {
    const tag = await this.prisma.tag.findFirst({ where: { slug } });
    return tag ? this.toResponseDto(tag) : null;
  }

  /**
   * 根据 ID 列表获取标签
   */
  async findByIds(ids: string[]): Promise<TagResponseDto[]> {
    const tags = await this.prisma.tag.findMany({
      where: { id: { in: ids } },
    });
    return tags.map((t) => this.toResponseDto(t));
  }

  /**
   * 更新标签
   */
  async update(id: string, params: UpdateTagParams): Promise<TagResponseDto> {
    const existing = await this.findById(id);

    if (params.slug && params.slug !== existing.slug) {
      await this.validateSlugUnique(params.slug, id);
    }

    const tag = await this.prisma.tag.update({
      where: { id },
      data: {
        name: params.name,
        slug: params.slug,
        description: params.description,
      },
    });

    this.logger.log(`标签更新成功: ${id}`);
    await this.blogCacheService.del(CacheKeyRegistry.PUBLIC_TAGS);
    return this.toResponseDto(tag);
  }

  /**
   * 删除标签
   */
  async remove(id: string): Promise<void> {
    await this.findById(id);
    await this.prisma.tag.delete({ where: { id } });
    this.logger.log(`标签删除成功: ${id}`);
    await this.blogCacheService.del(CacheKeyRegistry.PUBLIC_TAGS);
  }

  /**
   * 增加文章计数
   */
  async incrementArticleCount(id: string): Promise<void> {
    await this.prisma.tag.update({
      where: { id },
      data: { articleCount: { increment: 1 } },
    });
  }

  /**
   * 减少文章计数
   */
  async decrementArticleCount(id: string): Promise<void> {
    const tag = await this.findById(id);
    if (tag.articleCount > 0) {
      await this.prisma.tag.update({
        where: { id },
        data: { articleCount: { decrement: 1 } },
      });
    }
  }

  private async findById(id: string): Promise<Tag> {
    const tag = await this.prisma.tag.findUnique({ where: { id } });
    if (!tag) {
      throw new NotFoundException('标签不存在');
    }
    return tag;
  }

  private async validateSlugUnique(slug: string, excludeId?: string): Promise<void> {
    const existing = await this.prisma.tag.findFirst({
      where: {
        slug,
        id: excludeId ? { not: excludeId } : undefined,
      },
    });
    if (existing) {
      throw new ConflictException('该 slug 已被使用');
    }
  }

  private toResponseDto(tag: Tag): TagResponseDto {
    return new TagResponseDto({
      id: tag.id,
      name: tag.name,
      slug: tag.slug,
      description: tag.description,
      articleCount: tag.articleCount,
      createdAt: tag.createdAt,
      updatedAt: tag.updatedAt,
    });
  }
}
