import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BlogCacheService } from '../redis';
import { CacheKeyRegistry } from '../redis/cache-key.registry';
import {
  PublicColumnListItem,
  PublicColumnDetail,
  ColumnArticleNav,
} from './domain/column.model';

/**
 * 专栏公开查询服务
 * 负责公开 API 的数据查询与缓存
 */
@Injectable()
export class ColumnPublicService {
  private readonly logger = new Logger(ColumnPublicService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: BlogCacheService,
  ) {}

  /**
   * 获取所有已发布专栏（带缓存）
   */
  async getPublishedColumns(): Promise<PublicColumnListItem[]> {
    return this.cacheService.wrap<PublicColumnListItem[]>(
      CacheKeyRegistry.PUBLIC_COLUMNS,
      async () => {
        const columns = await this.prisma.column.findMany({
          where: { status: 'published' },
          orderBy: { sortOrder: 'asc' },
          include: {
            _count: {
              select: {
                articles: {
                  where: { article: { isPublished: true } },
                },
              },
            },
          },
        });

        return columns.map((col) => ({
          id: col.id,
          title: col.title,
          slug: col.slug,
          description: col.description,
          coverImage: col.coverImage,
          sortOrder: col.sortOrder,
          articleCount: col._count.articles,
        }));
      },
      CacheKeyRegistry.PUBLIC_COLUMNS_TTL,
    );
  }

  /**
   * 根据 slug 获取专栏详情 + 已发布文章列表（带缓存）
   */
  async getColumnBySlug(slug: string): Promise<PublicColumnDetail> {
    const cached = await this.cacheService.get<PublicColumnDetail>(
      CacheKeyRegistry.publicColumnDetail(slug),
    );
    if (cached) return cached;

    const column = await this.prisma.column.findUnique({
      where: { slug, status: 'published' },
      include: {
        articles: {
          where: { article: { isPublished: true } },
          orderBy: { sortOrder: 'asc' },
          include: {
            article: {
              select: {
                id: true,
                title: true,
                slug: true,
                summary: true,
                coverImage: true,
                publishedAt: true,
              },
            },
          },
        },
      },
    });

    if (!column) {
      throw new NotFoundException('Column not found');
    }

    const result: PublicColumnDetail = {
      id: column.id,
      title: column.title,
      slug: column.slug,
      description: column.description,
      coverImage: column.coverImage,
      articles: column.articles.map((ca) => ({
        id: ca.article.id,
        title: ca.article.title,
        slug: ca.article.slug,
        summary: ca.article.summary,
        coverImage: ca.article.coverImage,
        publishedAt: this.safeToISOString(ca.article.publishedAt),
      })),
    };

    await this.cacheService.set(
      CacheKeyRegistry.publicColumnDetail(slug),
      result,
      CacheKeyRegistry.PUBLIC_COLUMN_DETAIL_TTL,
    );

    return result;
  }

  /**
   * 安全地将 Date 转换为 ISO 字符串，处理 null 和无效日期
   */
  private safeToISOString(date: Date | null | undefined): string {
    if (!date) return '';
    const time = date.getTime();
    if (Number.isNaN(time)) return '';
    return date.toISOString();
  }

  /**
   * 获取文章在专栏中的前后导航
   */
  async getArticleNav(
    slug: string,
    articleId: string,
  ): Promise<ColumnArticleNav> {
    const column = await this.prisma.column.findUnique({
      where: { slug, status: 'published' },
      select: {
        title: true,
        slug: true,
        articles: {
          where: { article: { isPublished: true } },
          orderBy: { sortOrder: 'asc' },
          select: {
            article: {
              select: {
                id: true,
                title: true,
                slug: true,
              },
            },
          },
        },
      },
    });

    if (!column) {
      throw new NotFoundException('Column not found');
    }

    const articles = column.articles.map((ca) => ca.article);
    const currentIndex = articles.findIndex((a) => a.id === articleId);

    if (currentIndex === -1) {
      throw new NotFoundException('Article not found in column');
    }

    const prev =
      currentIndex > 0
        ? { title: articles[currentIndex - 1].title, slug: articles[currentIndex - 1].slug }
        : null;

    const next =
      currentIndex < articles.length - 1
        ? { title: articles[currentIndex + 1].title, slug: articles[currentIndex + 1].slug }
        : null;

    return {
      columnTitle: column.title,
      columnSlug: column.slug,
      prev,
      next,
    };
  }
}
