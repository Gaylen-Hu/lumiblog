import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsInt, Min, Max, IsBoolean } from 'class-validator';
import { Type, Transform } from 'class-transformer';

/** 默认分页大小 */
const DEFAULT_PAGE_SIZE = 10;
/** 最大分页大小 */
const MAX_PAGE_SIZE = 100;

/**
 * 公开项目查询 DTO
 */
export class PublicProjectQueryDto {
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

  @ApiPropertyOptional({ description: '是否只返回精选项目', example: true })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return undefined;
  })
  @IsBoolean()
  featured?: boolean;
}

/**
 * 公开项目响应 DTO
 */
export class PublicProjectDto {
  @ApiProperty({ description: '项目 ID' })
  readonly id: string;

  @ApiProperty({ description: '项目标题', example: 'My Blog' })
  readonly title: string;

  @ApiProperty({ description: '项目描述', example: '一个现代化的博客系统' })
  readonly description: string;

  @ApiProperty({ description: '技术栈', type: [String], example: ['React', 'TypeScript', 'Tailwind'] })
  readonly techStack: string[];

  @ApiPropertyOptional({ description: '封面图片' })
  readonly coverImage: string | null;

  @ApiPropertyOptional({ description: '项目链接' })
  readonly link: string | null;

  @ApiPropertyOptional({ description: 'GitHub 链接' })
  readonly githubUrl: string | null;

  @ApiProperty({ description: '是否精选', example: true })
  readonly featured: boolean;

  @ApiProperty({ description: '排序顺序', example: 1 })
  readonly order: number;

  constructor(params: {
    id: string;
    title: string;
    description: string;
    techStack: string[];
    coverImage: string | null;
    link: string | null;
    githubUrl: string | null;
    featured: boolean;
    order: number;
  }) {
    this.id = params.id;
    this.title = params.title;
    this.description = params.description;
    this.techStack = params.techStack;
    this.coverImage = params.coverImage;
    this.link = params.link;
    this.githubUrl = params.githubUrl;
    this.featured = params.featured;
    this.order = params.order;
  }
}

/**
 * 分页项目列表响应 DTO
 */
export class PaginatedPublicProjectListDto {
  @ApiProperty({ description: '项目列表', type: [PublicProjectDto] })
  readonly data: PublicProjectDto[];

  @ApiProperty({ description: '总数', example: 10 })
  readonly total: number;

  @ApiProperty({ description: '当前页码', example: 1 })
  readonly page: number;

  @ApiProperty({ description: '每页数量', example: 10 })
  readonly pageSize: number;

  @ApiProperty({ description: '总页数', example: 1 })
  readonly totalPages: number;

  constructor(params: {
    data: PublicProjectDto[];
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
