import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 项目响应 DTO
 */
export class ProjectResponseDto {
  @ApiProperty({ description: '项目 ID' })
  readonly id: string;

  @ApiProperty({ description: '项目名称' })
  readonly title: string;

  @ApiProperty({ description: '项目描述' })
  readonly description: string;

  @ApiProperty({ description: '技术栈列表', type: [String] })
  readonly techStack: string[];

  @ApiPropertyOptional({ description: '封面图片 URL' })
  readonly coverImage: string | null;

  @ApiPropertyOptional({ description: '项目链接' })
  readonly link: string | null;

  @ApiPropertyOptional({ description: 'GitHub 仓库地址' })
  readonly githubUrl: string | null;

  @ApiProperty({ description: '是否精选' })
  readonly featured: boolean;

  @ApiProperty({ description: '排序权重' })
  readonly order: number;

  @ApiProperty({ description: '创建时间' })
  readonly createdAt: Date;

  @ApiProperty({ description: '更新时间' })
  readonly updatedAt: Date;

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
    createdAt: Date;
    updatedAt: Date;
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
    this.createdAt = params.createdAt;
    this.updatedAt = params.updatedAt;
  }
}

/**
 * 分页项目列表 DTO
 */
export class PaginatedProjectListDto {
  @ApiProperty({ description: '项目列表', type: [ProjectResponseDto] })
  readonly data: ProjectResponseDto[];

  @ApiProperty({ description: '总数' })
  readonly total: number;

  @ApiProperty({ description: '当前页码' })
  readonly page: number;

  @ApiProperty({ description: '每页数量' })
  readonly limit: number;

  constructor(params: {
    data: ProjectResponseDto[];
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
