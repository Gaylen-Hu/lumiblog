import {
  Injectable,
  ConflictException,
  NotFoundException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import {
  Article,
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
  TranslateArticleDto,
  TranslateArticleResponseDto,
  SeoOptimizeArticleResponseDto,
  PublishToWechatDto,
  PublishToWechatResponseDto,
} from './dto';
import { AiService } from '../ai/ai.service';
import { WechatService } from '../wechat/wechat.service';

@Injectable()
export class ArticleService {
  private readonly logger = new Logger(ArticleService.name);

  // TODO: 集成 Prisma 后替换为真实数据库操作
  private articles: Article[] = [];
  private idCounter = 1;

  constructor(
    private readonly aiService: AiService,
    private readonly wechatService: WechatService,
  ) {}

  /**
   * 创建文章草稿
   * @param params 创建参数
   * @returns 文章响应 DTO
   */
  async create(params: CreateArticleParams): Promise<ArticleResponseDto> {
    await this.validateSlugUnique(params.slug);

    const now = new Date();
    const article: Article = {
      id: String(this.idCounter++),
      title: params.title,
      slug: params.slug,
      summary: params.summary ?? null,
      content: params.content ?? null,
      coverImage: params.coverImage ?? null,
      isPublished: false,
      publishedAt: null,
      seoTitle: params.seoTitle ?? null,
      seoDescription: params.seoDescription ?? null,
      createdAt: now,
      updatedAt: now,
    };

    this.articles.push(article);
    this.logger.log(`文章创建成功: ${article.id}`);

    return this.toResponseDto(article);
  }

  /**
   * 查询文章列表（管理端）
   * @param params 查询参数
   * @returns 分页文章列表
   */
  async findAdminList(
    params: AdminQueryArticleParams,
  ): Promise<PaginatedAdminArticleListDto> {
    let filtered = [...this.articles];

    // 关键词搜索（标题）
    if (params.keyword) {
      const keyword = params.keyword.toLowerCase();
      filtered = filtered.filter((a) =>
        a.title.toLowerCase().includes(keyword),
      );
    }

    // 发布状态筛选
    if (params.isPublished !== undefined) {
      filtered = filtered.filter((a) => a.isPublished === params.isPublished);
    }

    const total = filtered.length;
    const start = (params.page - 1) * params.limit;
    const items = filtered
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(start, start + params.limit);

    const data = items.map((article) => this.toResponseDto(article));

    return new PaginatedAdminArticleListDto({
      data,
      total,
      page: params.page,
      limit: params.limit,
    });
  }

  /**
   * 根据 ID 获取文章（管理端）
   * @param id 文章 ID
   * @returns 文章响应 DTO
   */
  async findById(id: string): Promise<ArticleResponseDto> {
    const article = this.articles.find((a) => a.id === id);
    if (!article) {
      throw new NotFoundException('文章不存在');
    }
    return this.toResponseDto(article);
  }

  /**
   * 更新文章
   * @param id 文章 ID
   * @param params 更新参数
   * @returns 更新后的文章响应 DTO
   */
  async update(
    id: string,
    params: UpdateArticleParams,
  ): Promise<ArticleResponseDto> {
    const index = this.articles.findIndex((a) => a.id === id);
    if (index === -1) {
      throw new NotFoundException('文章不存在');
    }

    if (params.slug) {
      await this.validateSlugUnique(params.slug, id);
    }

    const article = this.articles[index];
    const updated: Article = {
      ...article,
      title: params.title ?? article.title,
      slug: params.slug ?? article.slug,
      summary: params.summary !== undefined ? params.summary : article.summary,
      content: params.content !== undefined ? params.content : article.content,
      coverImage:
        params.coverImage !== undefined ? params.coverImage : article.coverImage,
      seoTitle:
        params.seoTitle !== undefined ? params.seoTitle : article.seoTitle,
      seoDescription:
        params.seoDescription !== undefined
          ? params.seoDescription
          : article.seoDescription,
      updatedAt: new Date(),
    };

    this.articles[index] = updated;
    this.logger.log(`文章更新成功: ${id}`);

    return this.toResponseDto(updated);
  }

  /**
   * 删除文章
   * @param id 文章 ID
   */
  async delete(id: string): Promise<void> {
    const index = this.articles.findIndex((a) => a.id === id);
    if (index === -1) {
      throw new NotFoundException('文章不存在');
    }

    this.articles.splice(index, 1);
    this.logger.log(`文章删除成功: ${id}`);
  }

  /**
   * 发布文章
   * @param id 文章 ID
   * @returns 发布后的文章响应 DTO
   */
  async publish(id: string): Promise<ArticleResponseDto> {
    const index = this.articles.findIndex((a) => a.id === id);
    if (index === -1) {
      throw new NotFoundException('文章不存在');
    }

    const article = this.articles[index];
    const now = new Date();
    const updated: Article = {
      ...article,
      isPublished: true,
      publishedAt: article.publishedAt ?? now,
      updatedAt: now,
    };

    this.articles[index] = updated;
    this.logger.log(`文章发布成功: ${id}`);

    return this.toResponseDto(updated);
  }

  /**
   * 取消发布文章
   * @param id 文章 ID
   * @returns 取消发布后的文章响应 DTO
   */
  async unpublish(id: string): Promise<ArticleResponseDto> {
    const index = this.articles.findIndex((a) => a.id === id);
    if (index === -1) {
      throw new NotFoundException('文章不存在');
    }

    const article = this.articles[index];
    const updated: Article = {
      ...article,
      isPublished: false,
      updatedAt: new Date(),
    };

    this.articles[index] = updated;
    this.logger.log(`文章取消发布成功: ${id}`);

    return this.toResponseDto(updated);
  }

  /**
   * AI 翻译文章
   * @param id 文章 ID
   * @param params 翻译参数
   * @returns 翻译结果
   */
  async translateArticle(
    id: string,
    params: TranslateArticleDto,
  ): Promise<TranslateArticleResponseDto> {
    const article = this.articles.find((a) => a.id === id);
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

    // 如果需要创建新文章
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
   * @param id 文章 ID
   * @returns SEO 优化结果
   */
  async optimizeSeo(id: string): Promise<SeoOptimizeArticleResponseDto> {
    const index = this.articles.findIndex((a) => a.id === id);
    if (index === -1) {
      throw new NotFoundException('文章不存在');
    }

    const article = this.articles[index];
    if (!article.content) {
      throw new BadRequestException('文章内容为空，无法生成 SEO 信息');
    }

    const seoResult = await this.aiService.optimizeSeo({
      title: article.title,
      content: article.content,
      summary: article.summary ?? undefined,
    });

    // 自动更新文章的 SEO 字段
    const updated: Article = {
      ...article,
      seoTitle: seoResult.seoTitle,
      seoDescription: seoResult.seoDescription,
      updatedAt: new Date(),
    };
    this.articles[index] = updated;

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
   * @param id 文章 ID
   * @param params 发布参数
   * @returns 发布结果
   */
  async publishToWechat(
    id: string,
    params: PublishToWechatDto,
  ): Promise<PublishToWechatResponseDto> {
    const article = this.articles.find((a) => a.id === id);
    if (!article) {
      throw new NotFoundException('文章不存在');
    }

    if (!article.content) {
      throw new BadRequestException('文章内容为空，无法发布');
    }

    // 创建微信草稿
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

    // 如果需要立即发布
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
   * @param params 查询参数
   * @returns 分页文章列表
   */
  async findPublishedList(
    params: QueryArticleParams,
  ): Promise<PaginatedArticleListDto> {
    const published = this.articles.filter((a) => a.isPublished);
    const total = published.length;

    const start = (params.page - 1) * params.limit;
    const items = published
      .sort((a, b) => {
        const dateA = a.publishedAt?.getTime() ?? 0;
        const dateB = b.publishedAt?.getTime() ?? 0;
        return dateB - dateA;
      })
      .slice(start, start + params.limit);

    const data = items.map((article) => this.toListItemDto(article));

    return new PaginatedArticleListDto({
      data,
      total,
      page: params.page,
      limit: params.limit,
    });
  }

  /**
   * 验证 slug 唯一性
   */
  private async validateSlugUnique(
    slug: string,
    excludeId?: string,
  ): Promise<void> {
    const existing = this.articles.find(
      (a) => a.slug === slug && a.id !== excludeId,
    );
    if (existing) {
      throw new ConflictException('该 slug 已被使用');
    }
  }

  /**
   * 转换为响应 DTO
   */
  private toResponseDto(article: Article): ArticleResponseDto {
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
      createdAt: article.createdAt,
      updatedAt: article.updatedAt,
    });
  }

  /**
   * 转换为列表项 DTO（不含 content）
   */
  private toListItemDto(article: Article): ArticleListItemDto {
    return new ArticleListItemDto({
      id: article.id,
      title: article.title,
      slug: article.slug,
      summary: article.summary,
      coverImage: article.coverImage,
      publishedAt: article.publishedAt,
      seoTitle: article.seoTitle,
      seoDescription: article.seoDescription,
    });
  }
}
