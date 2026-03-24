import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SiteConfigService } from '../site-config/site-config.service';
import {
  PublicArticleQueryDto,
  PublicArticleListItemDto,
  PublicArticleDetailDto,
  PaginatedPublicArticleListDto,
  ArticleSlugsResponseDto,
  ArticleNavItemDto,
  AuthorDto,
  CategoryBriefDto,
  TagBriefDto,
  SeoInfoDto,
  PublicProjectQueryDto,
  PublicProjectDto,
  PaginatedPublicProjectListDto,
  PublicCategoryDto,
  PublicCategoryListDto,
  PublicTagDto,
  PublicTagListDto,
  SiteConfigDto,
  SocialLinksDto,
  SiteOwnerDto,
  SiteSeoDto,
  FilingInfoDto,
  SearchQueryDto,
  SearchResultDto,
  SearchResultItemDto,
  SiteStatsDto,
} from './dto';

/** 每分钟阅读字数（用于计算阅读时间） */
const WORDS_PER_MINUTE = 200;

/** 默认作者信息（站点配置未设置时使用） */
const DEFAULT_AUTHOR_NAME = 'Site Owner';

/** 文章查询的 category/tags include 配置 */
const ARTICLE_INCLUDE = {
  category: { select: { id: true, name: true, slug: true } },
  tags: { include: { tag: { select: { id: true, name: true, slug: true } } } },
} as const;

/** Prisma 文章查询结果类型（含关联） */
type ArticleWithRelations = Prisma.ArticleGetPayload<{
  include: typeof ARTICLE_INCLUDE;
}>;

@Injectable()
export class PublicService {
  private readonly logger = new Logger(PublicService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly siteConfigService: SiteConfigService,
  ) {}

  /**
   * 获取公开文章列表
   */
  async getArticles(query: PublicArticleQueryDto): Promise<PaginatedPublicArticleListDto> {
    const { page = 1, pageSize = 10, category, tag, search } = query;

    const where: Prisma.ArticleWhereInput = { isPublished: true };

    if (category) {
      where.category = { slug: category };
    }
    if (tag) {
      where.tags = { some: { tag: { slug: tag } } };
    }
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { summary: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.article.findMany({
        where,
        orderBy: { publishedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: ARTICLE_INCLUDE,
      }),
      this.prisma.article.count({ where }),
    ]);

    const data = items.map((article) => this.toArticleListItem(article));
    return new PaginatedPublicArticleListDto({ data, total, page, pageSize });
  }

  /**
   * 根据 slug 获取文章详情
   */
  async getArticleBySlug(slug: string): Promise<PublicArticleDetailDto> {
    const article = await this.prisma.article.findFirst({
      where: { slug, isPublished: true },
      include: ARTICLE_INCLUDE,
    });
    if (!article) {
      throw new NotFoundException('文章不存在');
    }

    // 异步递增阅读量，不阻塞响应
    this.prisma.article
      .update({
        where: { id: article.id },
        data: { viewCount: { increment: 1 } },
      })
      .catch((err) => this.logger.error(`阅读量更新失败: ${err.message}`));

    const [prev, next] = await Promise.all([
      this.prisma.article.findFirst({
        where: { isPublished: true, publishedAt: { lt: article.publishedAt } },
        orderBy: { publishedAt: 'desc' },
        select: { slug: true, title: true, publishedAt: true },
      }),
      this.prisma.article.findFirst({
        where: { isPublished: true, publishedAt: { gt: article.publishedAt } },
        orderBy: { publishedAt: 'asc' },
        select: { slug: true, title: true, publishedAt: true },
      }),
    ]);

    const prevArticle = prev ? new ArticleNavItemDto(prev) : null;
    const nextArticle = next ? new ArticleNavItemDto(next) : null;

    return this.toArticleDetail(article, prevArticle, nextArticle);
  }

  /**
   * 获取所有已发布文章的 slug 列表（用于 SSG）
   */
  async getArticleSlugs(): Promise<ArticleSlugsResponseDto> {
    const articles = await this.prisma.article.findMany({
      where: { isPublished: true },
      select: { slug: true },
    });
    return new ArticleSlugsResponseDto(articles.map((a) => a.slug));
  }

  /**
   * 获取项目列表（支持分页和精选筛选）
   */
  async getProjects(query: PublicProjectQueryDto): Promise<PaginatedPublicProjectListDto> {
    const { page = 1, pageSize = 10, featured } = query;
    const where: Prisma.ProjectWhereInput = {};
    if (featured !== undefined) where.featured = featured;

    const [items, total] = await Promise.all([
      this.prisma.project.findMany({
        where,
        orderBy: { order: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.project.count({ where }),
    ]);

    const data = items.map((p) => new PublicProjectDto(p));
    return new PaginatedPublicProjectListDto({ data, total, page, pageSize });
  }


  /**
   * 获取分类列表（含已发布文章数量）
   */
  async getCategories(): Promise<PublicCategoryListDto> {
    const categories = await this.prisma.category.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        _count: { select: { articles: { where: { isPublished: true } } } },
      },
    });

    const data = categories.map(
      (c) =>
        new PublicCategoryDto({
          id: c.id,
          name: c.name,
          slug: c.slug,
          description: c.description,
          articleCount: c._count.articles,
        }),
    );
    return new PublicCategoryListDto(data);
  }

  /**
   * 获取标签列表（含文章数量）
   */
  async getTags(): Promise<PublicTagListDto> {
    const tags = await this.prisma.tag.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        _count: { select: { articles: true } },
      },
    });

    const data = tags.map(
      (t) =>
        new PublicTagDto({
          id: t.id,
          name: t.name,
          slug: t.slug,
          articleCount: t._count.articles,
        }),
    );
    return new PublicTagListDto(data);
  }

  /**
   * 获取站点配置
   */
  async getSiteConfig(): Promise<SiteConfigDto> {
    const config = await this.siteConfigService.getConfig();

    return new SiteConfigDto({
      siteName: config.title,
      siteDescription: config.description ?? '',
      logo: config.logo,
      favicon: config.favicon,
      socialLinks: new SocialLinksDto({
        github: config.socialGithub ?? undefined,
        twitter: config.socialTwitter ?? undefined,
        linkedin: config.socialLinkedin ?? undefined,
        weibo: config.socialWeibo ?? undefined,
      }),
      owner: new SiteOwnerDto({
        name: config.ownerName ?? DEFAULT_AUTHOR_NAME,
        avatar: config.ownerAvatar ?? null,
        bio: config.ownerBio ?? null,
        email: config.ownerEmail ?? null,
        techStack: config.ownerTechStack,
      }),
      seo: new SiteSeoDto({
        defaultTitle: config.title,
        defaultDescription: config.description,
        keywords: config.keywords,
        defaultOgImage: null,
      }),
      filing: new FilingInfoDto({
        icp: config.icp,
        gongan: config.gongan,
        copyright: config.copyright,
      }),
      analyticsGoogle: config.analyticsGoogle ?? null,
      analyticsBaidu: config.analyticsBaidu ?? null,
      aboutImage1: config.aboutImage1 ?? null,
      aboutImage2: config.aboutImage2 ?? null,
    });
  }

  /**
   * 获取站点统计数据
   */
  async getStats(): Promise<SiteStatsDto> {
    const [articleCount, config] = await Promise.all([
      this.prisma.article.count({ where: { isPublished: true } }),
      this.siteConfigService.getConfig(),
    ]);

    return new SiteStatsDto({
      articleCount,
      yearsOfExperience: config.yearsOfExperience ?? 0,
      openSourceCount: config.openSourceCount ?? 0,
      talkCount: config.talkCount ?? 0,
    });
  }

  /**
   * 搜索文章
   */
  async search(query: SearchQueryDto): Promise<SearchResultDto> {
    const { q, page = 1, pageSize = 10 } = query;

    const where: Prisma.ArticleWhereInput = {
      isPublished: true,
      OR: [
        { title: { contains: q, mode: 'insensitive' } },
        { summary: { contains: q, mode: 'insensitive' } },
        { content: { contains: q, mode: 'insensitive' } },
      ],
    };

    const [items, total] = await Promise.all([
      this.prisma.article.findMany({
        where,
        orderBy: { publishedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          category: { select: { name: true } },
        },
      }),
      this.prisma.article.count({ where }),
    ]);

    const data = items.map((article) => this.toSearchResultItem(article, q));
    return new SearchResultDto({ data, total, page, pageSize });
  }

  /**
   * 计算阅读时间
   */
  private calculateReadTime(content: string | null): string {
    if (!content) return '1 分钟';
    const wordCount = content.length;
    const minutes = Math.ceil(wordCount / WORDS_PER_MINUTE);
    return `${minutes} 分钟`;
  }

  /**
   * 生成高亮文本
   */
  private generateHighlight(content: string | null, keyword: string): string | null {
      if (!content) return null;
      const lowerContent = content.toLowerCase();
      const lowerKeyword = keyword.toLowerCase();
      const index = lowerContent.indexOf(lowerKeyword);
      if (index === -1) return null;

      const start = Math.max(0, index - 50);
      const end = Math.min(content.length, index + keyword.length + 50);
      let highlight = content.slice(start, end);

      if (start > 0) highlight = '...' + highlight;
      if (end < content.length) highlight = highlight + '...';

      // 转义正则特殊字符后添加高亮标记
      const specialChars = /[.*+?^${}()|[\]\\]/g;
      const escaped = keyword.replace(specialChars, String.raw`\$&`);
      const regex = new RegExp('(' + escaped + ')', 'gi');
      return highlight.replace(regex, '<mark>$1</mark>');
    }


  /**
   * 转换为文章列表项 DTO
   */
  private toArticleListItem(article: ArticleWithRelations): PublicArticleListItemDto {
    return new PublicArticleListItemDto({
      id: article.id,
      slug: article.slug,
      title: article.title,
      excerpt: article.summary,
      author: new AuthorDto({ name: DEFAULT_AUTHOR_NAME, avatar: null }),
      publishedAt: article.publishedAt!,
      readTime: this.calculateReadTime(article.content),
      category: article.category
        ? new CategoryBriefDto(article.category)
        : null,
      coverImage: article.coverImage,
      tags: article.tags.map((at) => new TagBriefDto(at.tag)),
    });
  }

  /**
   * 转换为文章详情 DTO
   */
  private toArticleDetail(
    article: ArticleWithRelations,
    prevArticle: ArticleNavItemDto | null,
    nextArticle: ArticleNavItemDto | null,
  ): PublicArticleDetailDto {
    return new PublicArticleDetailDto({
      id: article.id,
      slug: article.slug,
      title: article.title,
      excerpt: article.summary,
      content: article.content ?? '',
      author: new AuthorDto({ name: DEFAULT_AUTHOR_NAME, avatar: null }),
      publishedAt: article.publishedAt!,
      updatedAt: article.updatedAt,
      readTime: this.calculateReadTime(article.content),
      category: article.category
        ? new CategoryBriefDto(article.category)
        : null,
      coverImage: article.coverImage,
      tags: article.tags.map((at) => new TagBriefDto(at.tag)),
      seo: new SeoInfoDto({
        metaTitle: article.seoTitle,
        metaDescription: article.seoDescription,
        ogImage: article.coverImage,
      }),
      prevArticle,
      nextArticle,
    });
  }

  /**
   * 转换为搜索结果项 DTO
   */
  private toSearchResultItem(
    article: Prisma.ArticleGetPayload<{
      include: { category: { select: { name: true } } };
    }>,
    keyword: string,
  ): SearchResultItemDto {
    return new SearchResultItemDto({
      id: article.id,
      slug: article.slug,
      title: article.title,
      excerpt: article.summary,
      highlight: this.generateHighlight(article.content, keyword),
      category: article.category?.name ?? null,
      publishedAt: article.publishedAt!,
    });
  }
}
