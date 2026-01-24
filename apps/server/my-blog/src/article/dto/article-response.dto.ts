/**
 * 文章响应 DTO（完整信息）
 * 用于管理端和文章详情
 */
export class ArticleResponseDto {
  readonly id: string;
  readonly title: string;
  readonly slug: string;
  readonly summary: string | null;
  readonly content: string | null;
  readonly coverImage: string | null;
  readonly isPublished: boolean;
  readonly publishedAt: Date | null;
  readonly seoTitle: string | null;
  readonly seoDescription: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(params: {
    id: string;
    title: string;
    slug: string;
    summary: string | null;
    content: string | null;
    coverImage: string | null;
    isPublished: boolean;
    publishedAt: Date | null;
    seoTitle: string | null;
    seoDescription: string | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    this.id = params.id;
    this.title = params.title;
    this.slug = params.slug;
    this.summary = params.summary;
    this.content = params.content;
    this.coverImage = params.coverImage;
    this.isPublished = params.isPublished;
    this.publishedAt = params.publishedAt;
    this.seoTitle = params.seoTitle;
    this.seoDescription = params.seoDescription;
    this.createdAt = params.createdAt;
    this.updatedAt = params.updatedAt;
  }
}

/**
 * 文章列表项 DTO（C端）
 * 不包含 content，仅返回摘要
 */
export class ArticleListItemDto {
  readonly id: string;
  readonly title: string;
  readonly slug: string;
  readonly summary: string | null;
  readonly coverImage: string | null;
  readonly publishedAt: Date | null;
  readonly seoTitle: string | null;
  readonly seoDescription: string | null;

  constructor(params: {
    id: string;
    title: string;
    slug: string;
    summary: string | null;
    coverImage: string | null;
    publishedAt: Date | null;
    seoTitle: string | null;
    seoDescription: string | null;
  }) {
    this.id = params.id;
    this.title = params.title;
    this.slug = params.slug;
    this.summary = params.summary;
    this.coverImage = params.coverImage;
    this.publishedAt = params.publishedAt;
    this.seoTitle = params.seoTitle;
    this.seoDescription = params.seoDescription;
  }
}

/**
 * 分页响应 DTO（C端）
 */
export class PaginatedArticleListDto {
  readonly data: ArticleListItemDto[];
  readonly total: number;
  readonly page: number;
  readonly limit: number;

  constructor(params: {
    data: ArticleListItemDto[];
    total: number;
    page: number;
    limit: number;
  }) {
    this.data = params.data;
    this.total = params.total;
    this.page = params.page;
    this.limit = params.limit;
  }
}

/**
 * 分页响应 DTO（管理端）
 * 包含完整文章信息
 */
export class PaginatedAdminArticleListDto {
  readonly data: ArticleResponseDto[];
  readonly total: number;
  readonly page: number;
  readonly limit: number;

  constructor(params: {
    data: ArticleResponseDto[];
    total: number;
    page: number;
    limit: number;
  }) {
    this.data = params.data;
    this.total = params.total;
    this.page = params.page;
    this.limit = params.limit;
  }
}
