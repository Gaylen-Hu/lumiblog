import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsInt, Min, Max, IsString } from 'class-validator';
import { Type } from 'class-transformer';

/** 默认分页大小 */
const DEFAULT_PAGE_SIZE = 10;
/** 最大分页大小 */
const MAX_PAGE_SIZE = 100;

/**
 * 公开文章查询 DTO
 */
export class PublicArticleQueryDto {
  @ApiPropertyOptional({ description: '页码', example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: '每页数量', example: 10, default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE_SIZE)
  pageSize?: number = DEFAULT_PAGE_SIZE;

  @ApiPropertyOptional({ description: '分类 slug 筛选', example: 'tech' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: '标签 slug 筛选', example: 'typescript' })
  @IsOptional()
  @IsString()
  tag?: string;

  @ApiPropertyOptional({ description: '搜索关键词', example: 'NestJS' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: '语言标识', example: 'zh-CN' })
  @IsOptional()
  @IsString()
  locale?: string;
}

/**
 * 作者信息 DTO
 */
export class AuthorDto {
  @ApiProperty({ description: '作者名称', example: 'John Doe' })
  readonly name: string;

  @ApiPropertyOptional({ description: '作者头像', example: 'https://example.com/avatar.jpg' })
  readonly avatar: string | null;

  @ApiPropertyOptional({ description: '作者简介', example: '全栈开发者' })
  readonly bio?: string | null;

  constructor(params: { name: string; avatar: string | null; bio?: string | null }) {
    this.name = params.name;
    this.avatar = params.avatar;
    this.bio = params.bio;
  }
}

/**
 * 分类简要信息 DTO
 */
export class CategoryBriefDto {
  @ApiProperty({ description: '分类 ID' })
  readonly id: string;

  @ApiProperty({ description: '分类名称', example: '技术' })
  readonly name: string;

  @ApiProperty({ description: '分类 slug', example: 'tech' })
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

  @ApiProperty({ description: '标签名称', example: 'TypeScript' })
  readonly name: string;

  @ApiProperty({ description: '标签 slug', example: 'typescript' })
  readonly slug: string;

  constructor(params: { id: string; name: string; slug: string }) {
    this.id = params.id;
    this.name = params.name;
    this.slug = params.slug;
  }
}


/**
 * 公开文章列表项 DTO
 */
export class PublicArticleListItemDto {
  @ApiProperty({ description: '文章 ID' })
  readonly id: string;

  @ApiProperty({ description: '文章 slug', example: 'future-of-neural-interfaces' })
  readonly slug: string;

  @ApiProperty({ description: '文章标题', example: '神经接口的未来' })
  readonly title: string;

  @ApiPropertyOptional({ description: '文章摘要' })
  readonly excerpt: string | null;

  @ApiProperty({ description: '作者信息', type: AuthorDto })
  readonly author: AuthorDto;

  @ApiProperty({ description: '发布时间', example: '2024-10-12T00:00:00Z' })
  readonly publishedAt: Date;

  @ApiProperty({ description: '阅读时间', example: '6 分钟' })
  readonly readTime: string;

  @ApiPropertyOptional({ description: '分类信息', type: CategoryBriefDto })
  readonly category: CategoryBriefDto | null;

  @ApiPropertyOptional({ description: '封面图片' })
  readonly coverImage: string | null;

  @ApiProperty({ description: '标签列表', type: [TagBriefDto] })
  readonly tags: TagBriefDto[];

  constructor(params: {
    id: string;
    slug: string;
    title: string;
    excerpt: string | null;
    author: AuthorDto;
    publishedAt: Date;
    readTime: string;
    category: CategoryBriefDto | null;
    coverImage: string | null;
    tags: TagBriefDto[];
  }) {
    this.id = params.id;
    this.slug = params.slug;
    this.title = params.title;
    this.excerpt = params.excerpt;
    this.author = params.author;
    this.publishedAt = params.publishedAt;
    this.readTime = params.readTime;
    this.category = params.category;
    this.coverImage = params.coverImage;
    this.tags = params.tags;
  }
}

/**
 * 文章导航项 DTO（用于上一篇/下一篇导航）
 */
export class ArticleNavItemDto {
  @ApiProperty({ description: '文章 slug' })
  readonly slug: string;

  @ApiProperty({ description: '文章标题' })
  readonly title: string;

  @ApiProperty({ description: '发布时间' })
  readonly publishedAt: Date;

  constructor(params: { slug: string; title: string; publishedAt: Date }) {
    this.slug = params.slug;
    this.title = params.title;
    this.publishedAt = params.publishedAt;
  }
}

/**
 * SEO 信息 DTO
 */
export class SeoInfoDto {
  @ApiPropertyOptional({ description: 'SEO 标题' })
  readonly metaTitle: string | null;

  @ApiPropertyOptional({ description: 'SEO 描述' })
  readonly metaDescription: string | null;

  @ApiPropertyOptional({ description: 'OG 图片' })
  readonly ogImage: string | null;

  constructor(params: {
    metaTitle: string | null;
    metaDescription: string | null;
    ogImage: string | null;
  }) {
    this.metaTitle = params.metaTitle;
    this.metaDescription = params.metaDescription;
    this.ogImage = params.ogImage;
  }
}

/**
 * 公开文章详情 DTO
 */
export class PublicArticleDetailDto extends PublicArticleListItemDto {
  @ApiProperty({ description: '文章内容（Markdown/HTML）' })
  readonly content: string;

  @ApiProperty({ description: '更新时间', example: '2024-10-12T00:00:00Z' })
  readonly updatedAt: Date;

  @ApiProperty({ description: 'SEO 信息', type: SeoInfoDto })
  readonly seo: SeoInfoDto;

  @ApiPropertyOptional({ description: '上一篇文章（更早发布）', type: ArticleNavItemDto })
  readonly prevArticle: ArticleNavItemDto | null;

  @ApiPropertyOptional({ description: '下一篇文章（更晚发布）', type: ArticleNavItemDto })
  readonly nextArticle: ArticleNavItemDto | null;

  constructor(
    params: ConstructorParameters<typeof PublicArticleListItemDto>[0] & {
      content: string;
      updatedAt: Date;
      seo: SeoInfoDto;
      prevArticle: ArticleNavItemDto | null;
      nextArticle: ArticleNavItemDto | null;
    },
  ) {
    super(params);
    this.content = params.content;
    this.updatedAt = params.updatedAt;
    this.seo = params.seo;
    this.prevArticle = params.prevArticle;
    this.nextArticle = params.nextArticle;
  }
}

/**
 * 分页文章列表响应 DTO
 */
export class PaginatedPublicArticleListDto {
  @ApiProperty({ description: '文章列表', type: [PublicArticleListItemDto] })
  readonly data: PublicArticleListItemDto[];

  @ApiProperty({ description: '总数', example: 100 })
  readonly total: number;

  @ApiProperty({ description: '当前页码', example: 1 })
  readonly page: number;

  @ApiProperty({ description: '每页数量', example: 10 })
  readonly pageSize: number;

  @ApiProperty({ description: '总页数', example: 10 })
  readonly totalPages: number;

  constructor(params: {
    data: PublicArticleListItemDto[];
    total: number;
    page: number;
    pageSize: number;
  }) {
    this.data = params.data;
    this.total = params.total;
    this.page = params.page;
    this.pageSize = params.pageSize;
    this.totalPages = Math.ceil(params.total / params.pageSize);
  }
}

/**
 * 文章 Slugs 响应 DTO
 */
export class ArticleSlugsResponseDto {
  @ApiProperty({ description: '所有已发布文章的 slug 列表', type: [String] })
  readonly slugs: string[];

  constructor(slugs: string[]) {
    this.slugs = slugs;
  }
}
