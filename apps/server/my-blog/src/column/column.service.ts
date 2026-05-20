import {
  Injectable,
  Logger,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BlogCacheService } from '../redis';
import { CacheKeyRegistry } from '../redis/cache-key.registry';
import {
  ColumnResponse,
  ColumnDetailResponse,
  PaginatedColumnResponse,
} from './domain/column.model';
import { CreateColumnDto } from './dto/create-column.dto';
import { UpdateColumnDto } from './dto/update-column.dto';
import { QueryColumnDto } from './dto/query-column.dto';
import { AddColumnArticleDto } from './dto/add-column-article.dto';
import { ReorderColumnArticlesDto } from './dto/reorder-column-articles.dto';

/**
 * 专栏管理服务
 * 负责专栏 CRUD、文章关联管理、缓存失效
 */
@Injectable()
export class ColumnService {
  private readonly logger = new Logger(ColumnService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: BlogCacheService,
  ) {}

  /**
   * 创建专栏
   * slug 冲突返回 409
   */
  async create(dto: CreateColumnDto): Promise<ColumnResponse> {
    const existing = await this.prisma.column.findUnique({
      where: { slug: dto.slug },
    });
    if (existing) {
      throw new ConflictException('Slug already exists');
    }

    const column = await this.prisma.column.create({
      data: {
        title: dto.title,
        slug: dto.slug,
        description: dto.description ?? null,
        coverImage: dto.coverImage ?? null,
        sortOrder: dto.sortOrder ?? 0,
        status: dto.status ?? 'draft',
      },
    });

    this.logger.log(`专栏创建成功: ${column.id}`);
    await this.cacheService.del(CacheKeyRegistry.PUBLIC_COLUMNS);

    return this.toColumnResponse(column, 0);
  }

  /**
   * 分页查询专栏列表
   * 支持 keyword（title 模糊搜索）和 status 筛选
   */
  async findAll(query: QueryColumnDto): Promise<PaginatedColumnResponse> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const where: Prisma.ColumnWhereInput = {};

    if (query.keyword) {
      where.title = { contains: query.keyword, mode: 'insensitive' };
    }
    if (query.status) {
      where.status = query.status;
    }

    const [columns, total] = await Promise.all([
      this.prisma.column.findMany({
        where,
        skip,
        take: limit,
        orderBy: { sortOrder: 'asc' },
        include: { _count: { select: { articles: true } } },
      }),
      this.prisma.column.count({ where }),
    ]);

    const data: ColumnResponse[] = columns.map((col) =>
      this.toColumnResponse(col, col._count.articles),
    );

    return { data, total, page, limit };
  }

  /**
   * 获取专栏详情（含文章列表）
   * 文章按 sortOrder 升序排列
   */
  async findOne(id: string): Promise<ColumnDetailResponse> {
    const column = await this.prisma.column.findUnique({
      where: { id },
      include: {
        articles: {
          orderBy: { sortOrder: 'asc' },
          include: {
            article: {
              select: {
                id: true,
                title: true,
                slug: true,
                isPublished: true,
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

    const articles = column.articles.map((ca) => ({
      id: ca.article.id,
      title: ca.article.title,
      slug: ca.article.slug,
      isPublished: ca.article.isPublished,
      publishedAt: ca.article.publishedAt
        ? ca.article.publishedAt.toISOString()
        : null,
      sortOrder: ca.sortOrder,
    }));

    return {
      id: column.id,
      title: column.title,
      slug: column.slug,
      description: column.description,
      coverImage: column.coverImage,
      sortOrder: column.sortOrder,
      status: column.status,
      articleCount: column.articles.length,
      createdAt: column.createdAt.toISOString(),
      updatedAt: column.updatedAt.toISOString(),
      articles,
    };
  }

  /**
   * 更新专栏
   * 检查存在性（404）和 slug 冲突（409）
   */
  async update(id: string, dto: UpdateColumnDto): Promise<ColumnResponse> {
    const existing = await this.prisma.column.findUnique({
      where: { id },
      include: { _count: { select: { articles: true } } },
    });
    if (!existing) {
      throw new NotFoundException('Column not found');
    }

    if (dto.slug && dto.slug !== existing.slug) {
      const slugConflict = await this.prisma.column.findFirst({
        where: { slug: dto.slug, id: { not: id } },
      });
      if (slugConflict) {
        throw new ConflictException('Slug already exists');
      }
    }

    const column = await this.prisma.column.update({
      where: { id },
      data: {
        title: dto.title,
        slug: dto.slug,
        description: dto.description,
        coverImage: dto.coverImage,
        sortOrder: dto.sortOrder,
        status: dto.status,
      },
    });

    this.logger.log(`专栏更新成功: ${id}`);
    await this.invalidateColumnCaches(existing.slug);
    if (dto.slug && dto.slug !== existing.slug) {
      await this.cacheService.del(
        CacheKeyRegistry.publicColumnDetail(dto.slug),
      );
    }

    return this.toColumnResponse(column, existing._count.articles);
  }

  /**
   * 删除专栏
   * Prisma onDelete: Cascade 自动级联删除 ColumnArticle
   */
  async remove(id: string): Promise<void> {
    const existing = await this.prisma.column.findUnique({
      where: { id },
      select: { slug: true },
    });
    if (!existing) {
      throw new NotFoundException('Column not found');
    }

    await this.prisma.column.delete({ where: { id } });

    this.logger.log(`专栏删除成功: ${id}`);
    await this.invalidateColumnCaches(existing.slug);
  }

  /**
   * 添加文章到专栏
   * 重复添加返回 409，文章或专栏不存在返回 404
   * 不传 sortOrder 时默认 append to end（当前最大 sortOrder + 1）
   */
  async addArticle(columnId: string, dto: AddColumnArticleDto): Promise<void> {
    const column = await this.prisma.column.findUnique({
      where: { id: columnId },
      select: { slug: true },
    });
    if (!column) {
      throw new NotFoundException('Column not found');
    }

    const article = await this.prisma.article.findUnique({
      where: { id: dto.articleId },
      select: { id: true },
    });
    if (!article) {
      throw new NotFoundException('Article not found');
    }

    const existing = await this.prisma.columnArticle.findUnique({
      where: { columnId_articleId: { columnId, articleId: dto.articleId } },
    });
    if (existing) {
      throw new ConflictException('Article already in column');
    }

    let sortOrder = dto.sortOrder;
    if (sortOrder === undefined || sortOrder === null) {
      const maxRecord = await this.prisma.columnArticle.findFirst({
        where: { columnId },
        orderBy: { sortOrder: 'desc' },
        select: { sortOrder: true },
      });
      sortOrder = maxRecord ? maxRecord.sortOrder + 1 : 0;
    }

    await this.prisma.columnArticle.create({
      data: {
        columnId,
        articleId: dto.articleId,
        sortOrder,
      },
    });

    this.logger.log(`文章添加到专栏成功: column=${columnId}, article=${dto.articleId}`);
    await this.invalidateColumnCaches(column.slug);
  }

  /**
   * 从专栏移除文章
   */
  async removeArticle(columnId: string, articleId: string): Promise<void> {
    const column = await this.prisma.column.findUnique({
      where: { id: columnId },
      select: { slug: true },
    });
    if (!column) {
      throw new NotFoundException('Column not found');
    }

    const existing = await this.prisma.columnArticle.findUnique({
      where: { columnId_articleId: { columnId, articleId } },
    });
    if (!existing) {
      throw new NotFoundException('Article not found in column');
    }

    await this.prisma.columnArticle.delete({
      where: { columnId_articleId: { columnId, articleId } },
    });

    this.logger.log(`文章从专栏移除成功: column=${columnId}, article=${articleId}`);
    await this.invalidateColumnCaches(column.slug);
  }

  /**
   * 重排序专栏文章
   * 要求传入完整 articleIds 数组，不完整或含无效 ID 返回 400
   */
  async reorderArticles(
    columnId: string,
    dto: ReorderColumnArticlesDto,
  ): Promise<void> {
    const column = await this.prisma.column.findUnique({
      where: { id: columnId },
      select: { slug: true },
    });
    if (!column) {
      throw new NotFoundException('Column not found');
    }

    const existingArticles = await this.prisma.columnArticle.findMany({
      where: { columnId },
      select: { articleId: true },
    });

    const existingIds = new Set(existingArticles.map((a) => a.articleId));
    const inputIds = new Set(dto.articleIds);

    if (existingIds.size !== inputIds.size) {
      throw new BadRequestException(
        'articleIds must contain all articles in the column',
      );
    }

    for (const id of dto.articleIds) {
      if (!existingIds.has(id)) {
        throw new BadRequestException(
          `Article ${id} does not belong to this column`,
        );
      }
    }

    await Promise.all(
      dto.articleIds.map((articleId, index) =>
        this.prisma.columnArticle.update({
          where: { columnId_articleId: { columnId, articleId } },
          data: { sortOrder: index },
        }),
      ),
    );

    this.logger.log(`专栏文章重排序成功: column=${columnId}`);
    await this.invalidateColumnCaches(column.slug);
  }

  /**
   * 根据文章 ID 失效相关专栏缓存
   * 供 ArticleService 在 publish/unpublish 时跨模块调用
   */
  async invalidateCacheByArticleId(articleId: string): Promise<void> {
    const columnArticles = await this.prisma.columnArticle.findMany({
      where: { articleId },
      select: { column: { select: { slug: true } } },
    });

    if (columnArticles.length === 0) return;

    await this.cacheService.del(CacheKeyRegistry.PUBLIC_COLUMNS);
    await Promise.all(
      columnArticles.map((ca) =>
        this.cacheService.del(
          CacheKeyRegistry.publicColumnDetail(ca.column.slug),
        ),
      ),
    );

    this.logger.log(
      `Invalidated column caches for article: ${articleId}, columns: ${columnArticles.length}`,
    );
  }

  /**
   * 失效专栏相关缓存（列表 + 详情）
   */
  private async invalidateColumnCaches(slug: string): Promise<void> {
    await Promise.all([
      this.cacheService.del(CacheKeyRegistry.PUBLIC_COLUMNS),
      this.cacheService.del(CacheKeyRegistry.publicColumnDetail(slug)),
    ]);
  }

  /**
   * 将 Prisma Column 实体转换为 ColumnResponse
   */
  private toColumnResponse(
    column: {
      id: string;
      title: string;
      slug: string;
      description: string | null;
      coverImage: string | null;
      sortOrder: number;
      status: string;
      createdAt: Date;
      updatedAt: Date;
    },
    articleCount: number,
  ): ColumnResponse {
    return {
      id: column.id,
      title: column.title,
      slug: column.slug,
      description: column.description,
      coverImage: column.coverImage,
      sortOrder: column.sortOrder,
      status: column.status as 'draft' | 'published',
      articleCount,
      createdAt: column.createdAt.toISOString(),
      updatedAt: column.updatedAt.toISOString(),
    };
  }
}
