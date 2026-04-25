import {
  Injectable,
  ConflictException,
  NotFoundException,
  Logger,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateArticleParams,
  UpdateArticleParams,
  QueryArticleParams,
  AdminQueryArticleParams,
} from './domain/article.model';
import {
  ArticleResponseDto,
  ArticleListItemDto,
  PaginatedArticleListDto,
  PaginatedAdminArticleListDto,
  CategoryBriefDto,
  TagBriefDto,
  TranslateArticleDto,
  TranslateArticleResponseDto,
  SeoOptimizeArticleResponseDto,
  PublishToWechatDto,
  PublishToWechatResponseDto,
} from './dto';
import { AiService } from '../ai/ai.service';
import { WechatService } from '../wechat/wechat.service';
import { Article, Category, Tag, ArticleTag, Prisma } from '@prisma/client';

/** Article with category and tags relations included */
type ArticleWithRelations = Article & {
  category: Category | null;
  tags: (ArticleTag & { tag: Tag })[];
};

/** Prisma include clause for article relations */
const ARTICLE_INCLUDE = {
  category: true,
  tags: { include: { tag: true } },
} as const;

@Injectable()
export class ArticleService {
  private readonly logger = new Logger(ArticleService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
    private readonly wechatService: WechatService,
  ) {}

  /**
   * 创建文章草稿
   */
  async create(params: CreateArticleParams): Promise<ArticleResponseDto> {
    await this.validateSlugUnique(params.slug);

    if (params.categoryId) {
      await this.validateCategoryExists(params.categoryId);
    }

    if (params.tagIds?.length) {
      await this.validateTagsExist(params.tagIds);
    }

    try {
      const article = await this.prisma.article.create({
        data: {
          title: params.title,
          slug: params.slug,
          summary: params.summary ?? null,
          content: params.content ?? null,
          coverImage: params.coverImage ?? null,
          seoTitle: params.seoTitle ?? null,
          seoDescription: params.seoDescription ?? null,
          locale: params.locale ?? 'zh-CN',
          translationGroupId: params.translationGroupId ?? null,
          categoryId: params.categoryId ?? null,
          isPublished: false,
          tags: params.tagIds?.length
            ? { create: params.tagIds.map((tagId) => ({ tagId })) }
            : undefined,
        },
        include: ARTICLE_INCLUDE,
      });

      this.logger.log(`文章创建成功: ${article.id}`);
      return this.toResponseDto(article);
    } catch (err) {
      throw this.handlePrismaError(err, params.slug);
    }
  }

  /**
   * 查询文章列表（管理端）
   */
  async findAdminList(
    params: AdminQueryArticleParams,
  ): Promise<PaginatedAdminArticleListDto> {
    const where: { title?: { contains: string; mode: 'insensitive' }; isPublished?: boolean } = {};

    if (params.keyword) {
      where.title = { contains: params.keyword, mode: 'insensitive' };
    }
    if (params.isPublished !== undefined) {
      where.isPublished = params.isPublished;
    }

    const [items, total] = await Promise.all([
      this.prisma.article.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        include: ARTICLE_INCLUDE,
      }),
      this.prisma.article.count({ where }),
    ]);

    return new PaginatedAdminArticleListDto({
      data: items.map((article) => this.toResponseDto(article)),
      total,
      page: params.page,
      limit: params.limit,
    });
  }

  /**
   * 根据 ID 获取文章（管理端）
   */
  async findById(id: string): Promise<ArticleResponseDto> {
    const article = await this.prisma.article.findUnique({
      where: { id },
      include: ARTICLE_INCLUDE,
    });
    if (!article) {
      throw new NotFoundException('文章不存在');
    }
    return this.toResponseDto(article);
  }

  /**
   * 更新文章
   */
  async update(
    id: string,
    params: UpdateArticleParams,
  ): Promise<ArticleResponseDto> {
    const existing = await this.prisma.article.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('文章不存在');
    }

    if (params.slug && params.slug !== existing.slug) {
      await this.validateSlugUnique(params.slug, id);
    }

    const article = await this.prisma.$transaction(async (tx) => {
      // 如果传入了 tagIds，先删除旧关联再创建新关联
      if (params.tagIds !== undefined) {
        await tx.articleTag.deleteMany({ where: { articleId: id } });
      }

      return tx.article.update({
        where: { id },
        data: {
          title: params.title,
          slug: params.slug,
          summary: params.summary,
          content: params.content,
          coverImage: params.coverImage,
          seoTitle: params.seoTitle,
          seoDescription: params.seoDescription,
          categoryId: params.categoryId,
          tags: params.tagIds?.length
            ? { create: params.tagIds.map((tagId) => ({ tagId })) }
            : undefined,
        },
        include: ARTICLE_INCLUDE,
      });
    });

    this.logger.log(`文章更新成功: ${id}`);
    return this.toResponseDto(article);
  }

  /**
   * 删除文章
   */
  async delete(id: string): Promise<void> {
    const existing = await this.prisma.article.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('文章不存在');
    }

    await this.prisma.article.delete({ where: { id } });
    this.logger.log(`文章删除成功: ${id}`);
  }

  /**
   * 发布文章
   */
  async publish(id: string): Promise<ArticleResponseDto> {
    const existing = await this.prisma.article.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('文章不存在');
    }

    const article = await this.prisma.article.update({
      where: { id },
      data: {
        isPublished: true,
        publishedAt: existing.publishedAt ?? new Date(),
      },
      include: ARTICLE_INCLUDE,
    });

    this.logger.log(`文章发布成功: ${id}`);
    return this.toResponseDto(article);
  }

  /**
   * 取消发布文章
   */
  async unpublish(id: string): Promise<ArticleResponseDto> {
    const existing = await this.prisma.article.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('文章不存在');
    }

    const article = await this.prisma.article.update({
      where: { id },
      data: { isPublished: false },
      include: ARTICLE_INCLUDE,
    });

    this.logger.log(`文章取消发布成功: ${id}`);
    return this.toResponseDto(article);
  }

  /**
   * AI 翻译文章
   */
  async translateArticle(
    id: string,
    params: TranslateArticleDto,
  ): Promise<TranslateArticleResponseDto> {
    const article = await this.prisma.article.findUnique({ where: { id } });
    if (!article) {
      throw new NotFoundException('文章不存在');
    }

    if (!article.content) {
      throw new BadRequestException('文章内容为空，无法翻译');
    }

    const translated = await this.aiService.translate({
      title: article.title,
      content: article.content,
      summary: article.summary ?? undefined,
    });

    let newArticleId: string | undefined;

    if (params.createNewArticle) {
      const newSlug = `${article.slug}-en`;
      const newArticle = await this.create({
        title: translated.title,
        slug: newSlug,
        content: translated.content,
        summary: translated.summary ?? undefined,
        coverImage: article.coverImage ?? undefined,
      });
      newArticleId = newArticle.id;
      this.logger.log(`创建翻译文章成功: ${newArticleId}`);
    }

    return new TranslateArticleResponseDto({
      title: translated.title,
      content: translated.content,
      summary: translated.summary,
      targetLanguage: translated.targetLanguage,
      newArticleId,
    });
  }

  /**
   * AI 生成 SEO 优化信息
   */
  async optimizeSeo(id: string): Promise<SeoOptimizeArticleResponseDto> {
    const article = await this.prisma.article.findUnique({ where: { id } });
    if (!article) {
      throw new NotFoundException('文章不存在');
    }

    if (!article.content) {
      throw new BadRequestException('文章内容为空，无法生成 SEO 信息');
    }

    const seoResult = await this.aiService.optimizeSeo({
      title: article.title,
      content: article.content,
      summary: article.summary ?? undefined,
    });

    await this.prisma.article.update({
      where: { id },
      data: {
        seoTitle: seoResult.seoTitle,
        seoDescription: seoResult.seoDescription,
      },
    });

    this.logger.log(`文章 SEO 优化成功: ${id}`);

    return new SeoOptimizeArticleResponseDto({
      seoTitle: seoResult.seoTitle,
      seoDescription: seoResult.seoDescription,
      keywords: seoResult.keywords,
      autoUpdated: true,
    });
  }

  /**
   * 发布文章到微信公众号
   */
  async publishToWechat(
    id: string,
    params: PublishToWechatDto,
  ): Promise<PublishToWechatResponseDto> {
    const article = await this.prisma.article.findUnique({ where: { id } });
    if (!article) {
      throw new NotFoundException('文章不存在');
    }

    if (!article.content) {
      throw new BadRequestException('文章内容为空，无法发布');
    }

    const draftResult = await this.wechatService.createDraft([
      {
        title: article.title,
        content: article.content,
        digest: article.summary ?? article.title,
        author: params.author,
        thumbMediaId: params.thumbMediaId ?? '',
        needOpenComment: params.needOpenComment ? 1 : 0,
        onlyFansCanComment: params.onlyFansCanComment ? 1 : 0,
      },
    ]);

    this.logger.log(`文章发布到微信草稿成功: ${draftResult.media_id}`);

    if (params.publishImmediately) {
      const publishResult = await this.wechatService.publishDraft(
        draftResult.media_id,
      );

      return new PublishToWechatResponseDto({
        mediaId: draftResult.media_id,
        publishId: publishResult.publish_id,
        status: 'publishing',
      });
    }

    return new PublishToWechatResponseDto({
      mediaId: draftResult.media_id,
      status: 'draft',
    });
  }

  /**
   * 查询已发布文章列表（C端）
   */
  async findPublishedList(
    params: QueryArticleParams,
  ): Promise<PaginatedArticleListDto> {
    const [items, total] = await Promise.all([
      this.prisma.article.findMany({
        where: { isPublished: true },
        orderBy: { publishedAt: 'desc' },
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        include: ARTICLE_INCLUDE,
      }),
      this.prisma.article.count({ where: { isPublished: true } }),
    ]);

    return new PaginatedArticleListDto({
      data: items.map((article) => this.toListItemDto(article)),
      total,
      page: params.page,
      limit: params.limit,
    });
  }

  /**
   * 验证分类是否存在
   */
  private async validateCategoryExists(categoryId: string): Promise<void> {
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
      select: { id: true },
    });
    if (!category) {
      throw new BadRequestException(`分类不存在: ${categoryId}`);
    }
  }

  /**
   * 验证标签是否全部存在
   */
  private async validateTagsExist(tagIds: string[]): Promise<void> {
    const existingTags = await this.prisma.tag.findMany({
      where: { id: { in: tagIds } },
      select: { id: true },
    });
    if (existingTags.length !== tagIds.length) {
      const existingIds = new Set(existingTags.map((t) => t.id));
      const missingIds = tagIds.filter((id) => !existingIds.has(id));
      throw new BadRequestException(`以下标签不存在: ${missingIds.join(', ')}`);
    }
  }

  /**
   * 处理 Prisma 错误，转换为业务友好的 HTTP 异常
   */
  private handlePrismaError(err: unknown, slug?: string): Error {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      switch (err.code) {
        case 'P2002':
          return new ConflictException(`slug "${slug}" 已被使用`);
        case 'P2003':
          return new BadRequestException('关联的分类或标签不存在');
        case 'P2025':
          return new NotFoundException('关联记录不存在');
        default:
          this.logger.error(`Prisma 错误 [${err.code}]: ${err.message}`);
          return new InternalServerErrorException('数据库操作失败，请稍后重试');
      }
    }

    if (err instanceof Prisma.PrismaClientValidationError) {
      this.logger.error(`Prisma 验证错误: ${err.message}`);
      return new BadRequestException('请求数据格式不正确');
    }

    this.logger.error('文章创建失败', err instanceof Error ? err.stack : String(err));
    return new InternalServerErrorException('服务器内部错误，请稍后重试');
  }

  /**
   * 验证 slug 唯一性
   */
  private async validateSlugUnique(
    slug: string,
    excludeId?: string,
  ): Promise<void> {
    const existing = await this.prisma.article.findFirst({
      where: {
        slug,
        id: excludeId ? { not: excludeId } : undefined,
      },
    });
    if (existing) {
      throw new ConflictException('该 slug 已被使用');
    }
  }

  private toResponseDto(article: ArticleWithRelations): ArticleResponseDto {
    return new ArticleResponseDto({
      id: article.id,
      title: article.title,
      slug: article.slug,
      summary: article.summary,
      content: article.content,
      coverImage: article.coverImage,
      isPublished: article.isPublished,
      publishedAt: article.publishedAt,
      seoTitle: article.seoTitle,
      seoDescription: article.seoDescription,
      category: article.category
        ? new CategoryBriefDto({
            id: article.category.id,
            name: article.category.name,
            slug: article.category.slug,
          })
        : null,
      tags: article.tags.map(
        (at) =>
          new TagBriefDto({
            id: at.tag.id,
            name: at.tag.name,
            slug: at.tag.slug,
          }),
      ),
      viewCount: article.viewCount,
      createdAt: article.createdAt,
      updatedAt: article.updatedAt,
    });
  }

  private toListItemDto(article: ArticleWithRelations): ArticleListItemDto {
    return new ArticleListItemDto({
      id: article.id,
      title: article.title,
      slug: article.slug,
      summary: article.summary,
      coverImage: article.coverImage,
      publishedAt: article.publishedAt,
      seoTitle: article.seoTitle,
      seoDescription: article.seoDescription,
      category: article.category
        ? new CategoryBriefDto({
            id: article.category.id,
            name: article.category.name,
            slug: article.category.slug,
          })
        : null,
      tags: article.tags.map(
        (at) =>
          new TagBriefDto({
            id: at.tag.id,
            name: at.tag.name,
            slug: at.tag.slug,
          }),
      ),
    });
  }
}
