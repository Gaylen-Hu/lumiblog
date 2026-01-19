import {
  Injectable,
  ConflictException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { Tag, CreateTagParams, UpdateTagParams } from './domain/tag.model';
import { TagResponseDto } from './dto';

@Injectable()
export class TagService {
  private readonly logger = new Logger(TagService.name);
  private tags: Tag[] = [];
  private idCounter = 1;

  /**
   * 创建标签
   */
  async create(params: CreateTagParams): Promise<TagResponseDto> {
    await this.validateSlugUnique(params.slug);

    const now = new Date();
    const tag: Tag = {
      id: String(this.idCounter++),
      name: params.name,
      slug: params.slug,
      description: params.description ?? null,
      articleCount: 0,
      createdAt: now,
      updatedAt: now,
    };

    this.tags.push(tag);
    this.logger.log(`标签创建成功: ${tag.id}`);

    return this.toResponseDto(tag);
  }

  /**
   * 获取所有标签
   */
  async findAll(): Promise<TagResponseDto[]> {
    return this.tags.map((t) => this.toResponseDto(t));
  }

  /**
   * 获取热门标签
   */
  async findPopular(limit: number = 10): Promise<TagResponseDto[]> {
    return this.tags
      .sort((a, b) => b.articleCount - a.articleCount)
      .slice(0, limit)
      .map((t) => this.toResponseDto(t));
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
    const tag = this.tags.find((t) => t.slug === slug);
    return tag ? this.toResponseDto(tag) : null;
  }

  /**
   * 根据 ID 列表获取标签
   */
  async findByIds(ids: string[]): Promise<TagResponseDto[]> {
    return this.tags
      .filter((t) => ids.includes(t.id))
      .map((t) => this.toResponseDto(t));
  }

  /**
   * 更新标签
   */
  async update(id: string, params: UpdateTagParams): Promise<TagResponseDto> {
    const tag = await this.findById(id);

    if (params.slug && params.slug !== tag.slug) {
      await this.validateSlugUnique(params.slug, id);
    }

    const updated: Tag = {
      ...tag,
      name: params.name ?? tag.name,
      slug: params.slug ?? tag.slug,
      description: params.description ?? tag.description,
      updatedAt: new Date(),
    };

    const index = this.tags.findIndex((t) => t.id === id);
    this.tags[index] = updated;
    this.logger.log(`标签更新成功: ${id}`);

    return this.toResponseDto(updated);
  }

  /**
   * 删除标签
   */
  async remove(id: string): Promise<void> {
    await this.findById(id);
    this.tags = this.tags.filter((t) => t.id !== id);
    this.logger.log(`标签删除成功: ${id}`);
  }

  /**
   * 增加文章计数
   */
  async incrementArticleCount(id: string): Promise<void> {
    const tag = await this.findById(id);
    tag.articleCount++;
  }

  /**
   * 减少文章计数
   */
  async decrementArticleCount(id: string): Promise<void> {
    const tag = await this.findById(id);
    if (tag.articleCount > 0) {
      tag.articleCount--;
    }
  }

  private async findById(id: string): Promise<Tag> {
    const tag = this.tags.find((t) => t.id === id);
    if (!tag) {
      throw new NotFoundException('标签不存在');
    }
    return tag;
  }

  private async validateSlugUnique(slug: string, excludeId?: string): Promise<void> {
    const existing = this.tags.find(
      (t) => t.slug === slug && t.id !== excludeId,
    );
    if (existing) {
      throw new ConflictException('该 slug 已被使用');
    }
  }

  private toResponseDto(tag: Tag): TagResponseDto {
    return new TagResponseDto(tag);
  }
}
