import {
  Injectable,
  ConflictException,
  Logger,
} from '@nestjs/common';
import {
  Article,
  CreateArticleParams,
  QueryArticleParams,
} from './domain/article.model';
import {
  ArticleResponseDto,
  ArticleListItemDto,
  PaginatedArticleListDto,
} from './dto';

@Injectable()
export class ArticleService {
  private readonly logger = new Logger(ArticleService.name);

  // TODO: 集成 Prisma 后替换为真实数据库操作
  private articles: Article[] = [];
  private idCounter = 1;

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
