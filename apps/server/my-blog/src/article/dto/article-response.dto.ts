import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 分类简要信息 DTO
 */
export class CategoryBriefDto {
  @ApiProperty({ description: '分类 ID' })
  readonly id: string;

  @ApiProperty({ description: '分类名称' })
  readonly name: string;

  @ApiProperty({ description: '分类 slug' })
  readonly slug: string;

  constructor(params: { id: string; name: string; slug: string }) {
    this.id = params.id;
    this.name = params.name;
    this.slug = params.slug;
  }
}

/**
 * 标签简要信息 DTO
 */
export class TagBriefDto {
  @ApiProperty({ description: '标签 ID' })
  readonly id: string;

  @ApiProperty({ description: '标签名称' })
  readonly name: string;

  @ApiProperty({ description: '标签 slug' })
  readonly slug: string;

  constructor(params: { id: string; name: string; slug: string }) {
    this.id = params.id;
    this.name = params.name;
    this.slug = params.slug;
  }
}

/**
 * 文章响应 DTO（完整信息）
 * 用于管理端和文章详情
 */
export class ArticleResponseDto {
  @ApiProperty({ description: '文章 ID', example: 'clxxx...' })
  readonly id: string;

  @ApiProperty({ description: '文章标题', example: '如何使用 NestJS 构建 RESTful API' })
  readonly title: string;

  @ApiProperty({ description: '文章 URL 别名', example: 'how-to-build-restful-api-with-nestjs' })
  readonly slug: string;

  @ApiPropertyOptional({ description: '文章摘要', example: '本文介绍如何使用 NestJS...' })
  readonly summary: string | null;

  @ApiPropertyOptional({ description: '文章正文内容', example: '# 引言\n\nNestJS 是一个...' })
  readonly content: string | null;

  @ApiPropertyOptional({ description: '封面图片 URL', example: 'https://example.com/cover.jpg' })
  readonly coverImage: string | null;

  @ApiProperty({ description: '是否已发布', example: false })
  readonly isPublished: boolean;

  @ApiPropertyOptional({ description: '发布时间', example: '2024-01-01T00:00:00.000Z' })
  readonly publishedAt: Date | null;

  @ApiPropertyOptional({ description: 'SEO 标题', example: 'NestJS RESTful API 开发指南' })
  readonly seoTitle: string | null;

  @ApiPropertyOptional({ description: 'SEO 描述', example: '详细介绍如何使用 NestJS...' })
  readonly seoDescription: string | null;

  @ApiPropertyOptional({ description: '所属分类', type: CategoryBriefDto })
  readonly category: CategoryBriefDto | null;

  @ApiProperty({ description: '标签列表', type: [TagBriefDto] })
  readonly tags: TagBriefDto[];

  @ApiProperty({ description: '阅读量', example: 0 })
  readonly viewCount: number;

  @ApiProperty({ description: '创建时间', example: '2024-01-01T00:00:00.000Z' })
  readonly createdAt: Date;

  @ApiProperty({ description: '更新时间', example: '2024-01-01T00:00:00.000Z' })
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
    category: CategoryBriefDto | null;
    tags: TagBriefDto[];
    viewCount: number;
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
    this.category = params.category;
    this.tags = params.tags;
    this.viewCount = params.viewCount;
    this.createdAt = params.createdAt;
    this.updatedAt = params.updatedAt;
  }
}

/**
 * 文章列表项 DTO（C端）
 * 不包含 content，仅返回摘要
 */
export class ArticleListItemDto {
  @ApiProperty({ description: '文章 ID', example: 'clxxx...' })
  readonly id: string;

  @ApiProperty({ description: '文章标题', example: '如何使用 NestJS 构建 RESTful API' })
  readonly title: string;

  @ApiProperty({ description: '文章 URL 别名', example: 'how-to-build-restful-api-with-nestjs' })
  readonly slug: string;

  @ApiPropertyOptional({ description: '文章摘要', example: '本文介绍如何使用 NestJS...' })
  readonly summary: string | null;

  @ApiPropertyOptional({ description: '封面图片 URL', example: 'https://example.com/cover.jpg' })
  readonly coverImage: string | null;

  @ApiPropertyOptional({ description: '发布时间', example: '2024-01-01T00:00:00.000Z' })
  readonly publishedAt: Date | null;

  @ApiPropertyOptional({ description: 'SEO 标题', example: 'NestJS RESTful API 开发指南' })
  readonly seoTitle: string | null;

  @ApiPropertyOptional({ description: 'SEO 描述', example: '详细介绍如何使用 NestJS...' })
  readonly seoDescription: string | null;

  @ApiPropertyOptional({ description: '所属分类', type: CategoryBriefDto })
  readonly category: CategoryBriefDto | null;

  @ApiProperty({ description: '标签列表', type: [TagBriefDto] })
  readonly tags: TagBriefDto[];

  constructor(params: {
    id: string;
    title: string;
    slug: string;
    summary: string | null;
    coverImage: string | null;
    publishedAt: Date | null;
    seoTitle: string | null;
    seoDescription: string | null;
    category: CategoryBriefDto | null;
    tags: TagBriefDto[];
  }) {
    this.id = params.id;
    this.title = params.title;
    this.slug = params.slug;
    this.summary = params.summary;
    this.coverImage = params.coverImage;
    this.publishedAt = params.publishedAt;
    this.seoTitle = params.seoTitle;
    this.seoDescription = params.seoDescription;
    this.category = params.category;
    this.tags = params.tags;
  }
}

/**
 * 分页响应 DTO（C端）
 */
export class PaginatedArticleListDto {
  @ApiProperty({ description: '文章列表', type: [ArticleListItemDto] })
  readonly data: ArticleListItemDto[];

  @ApiProperty({ description: '总数', example: 100 })
  readonly total: number;

  @ApiProperty({ description: '当前页码', example: 1 })
  readonly page: number;

  @ApiProperty({ description: '每页数量', example: 10 })
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
  @ApiProperty({ description: '文章列表', type: [ArticleResponseDto] })
  readonly data: ArticleResponseDto[];

  @ApiProperty({ description: '总数', example: 100 })
  readonly total: number;

  @ApiProperty({ description: '当前页码', example: 1 })
  readonly page: number;

  @ApiProperty({ description: '每页数量', example: 10 })
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
