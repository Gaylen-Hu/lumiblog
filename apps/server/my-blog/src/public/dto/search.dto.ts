import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsInt, Min, Max, IsString, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

/** 默认分页大小 */
const DEFAULT_PAGE_SIZE = 10;
/** 最大分页大小 */
const MAX_PAGE_SIZE = 100;

/**
 * 搜索查询 DTO
 */
export class SearchQueryDto {
  @ApiProperty({ description: '搜索关键词', example: 'NestJS' })
  @IsString()
  @IsNotEmpty({ message: '搜索关键词不能为空' })
  q: string;

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

  @ApiPropertyOptional({ description: '语言标识', example: 'zh-CN' })
  @IsOptional()
  @IsString()
  locale?: string;
}

/**
 * 搜索结果项 DTO
 */
export class SearchResultItemDto {
  @ApiProperty({ description: '文章 ID' })
  readonly id: string;

  @ApiProperty({ description: '文章 slug' })
  readonly slug: string;

  @ApiProperty({ description: '文章标题' })
  readonly title: string;

  @ApiPropertyOptional({ description: '文章摘要' })
  readonly excerpt: string | null;

  @ApiPropertyOptional({ description: '高亮匹配内容' })
  readonly highlight: string | null;

  @ApiPropertyOptional({ description: '分类名称' })
  readonly category: string | null;

  @ApiProperty({ description: '发布时间' })
  readonly publishedAt: Date;

  constructor(params: {
    id: string;
    slug: string;
    title: string;
    excerpt: string | null;
    highlight: string | null;
    category: string | null;
    publishedAt: Date;
  }) {
    this.id = params.id;
    this.slug = params.slug;
    this.title = params.title;
    this.excerpt = params.excerpt;
    this.highlight = params.highlight;
    this.category = params.category;
    this.publishedAt = params.publishedAt;
  }
}

/**
 * 搜索结果响应 DTO
 */
export class SearchResultDto {
  @ApiProperty({ description: '搜索结果列表', type: [SearchResultItemDto] })
  readonly data: SearchResultItemDto[];

  @ApiProperty({ description: '总数', example: 5 })
  readonly total: number;

  @ApiProperty({ description: '当前页码', example: 1 })
  readonly page: number;

  @ApiProperty({ description: '每页数量', example: 10 })
  readonly pageSize: number;

  constructor(params: {
    data: SearchResultItemDto[];
    total: number;
    page: number;
    pageSize: number;
  }) {
    this.data = params.data;
    this.total = params.total;
    this.page = params.page;
    this.pageSize = params.pageSize;
  }
}
