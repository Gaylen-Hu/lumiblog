import { ApiProperty } from '@nestjs/swagger';

/**
 * Timeline 条目响应 DTO（管理端，含内部字段）
 */
export class TimelineResponseDto {
  @ApiProperty({ description: '条目 ID' })
  readonly id: string;

  @ApiProperty({ description: '年份', example: '2017' })
  readonly year: string;

  @ApiProperty({ description: '中文标题' })
  readonly titleZh: string;

  @ApiProperty({ description: '英文标题' })
  readonly titleEn: string;

  @ApiProperty({ description: '中文描述' })
  readonly descZh: string;

  @ApiProperty({ description: '英文描述' })
  readonly descEn: string;

  @ApiProperty({ description: '排序权重' })
  readonly order: number;

  @ApiProperty({ description: '是否在前端展示' })
  readonly isVisible: boolean;

  @ApiProperty({ description: '创建时间' })
  readonly createdAt: Date;

  @ApiProperty({ description: '更新时间' })
  readonly updatedAt: Date;

  constructor(params: {
    id: string;
    year: string;
    titleZh: string;
    titleEn: string;
    descZh: string;
    descEn: string;
    order: number;
    isVisible: boolean;
    createdAt: Date;
    updatedAt: Date;
  }) {
    this.id = params.id;
    this.year = params.year;
    this.titleZh = params.titleZh;
    this.titleEn = params.titleEn;
    this.descZh = params.descZh;
    this.descEn = params.descEn;
    this.order = params.order;
    this.isVisible = params.isVisible;
    this.createdAt = params.createdAt;
    this.updatedAt = params.updatedAt;
  }
}

/**
 * Timeline 条目公开响应 DTO（公开端，不含内部管理字段）
 */
export class PublicTimelineResponseDto {
  @ApiProperty({ description: '条目 ID' })
  readonly id: string;

  @ApiProperty({ description: '年份', example: '2017' })
  readonly year: string;

  @ApiProperty({ description: '中文标题' })
  readonly titleZh: string;

  @ApiProperty({ description: '英文标题' })
  readonly titleEn: string;

  @ApiProperty({ description: '中文描述' })
  readonly descZh: string;

  @ApiProperty({ description: '英文描述' })
  readonly descEn: string;

  @ApiProperty({ description: '排序权重' })
  readonly order: number;

  constructor(params: {
    id: string;
    year: string;
    titleZh: string;
    titleEn: string;
    descZh: string;
    descEn: string;
    order: number;
  }) {
    this.id = params.id;
    this.year = params.year;
    this.titleZh = params.titleZh;
    this.titleEn = params.titleEn;
    this.descZh = params.descZh;
    this.descEn = params.descEn;
    this.order = params.order;
  }
}

/**
 * 分页 Timeline 列表 DTO
 */
export class PaginatedTimelineListDto {
  @ApiProperty({ description: 'Timeline 条目列表', type: [TimelineResponseDto] })
  readonly data: TimelineResponseDto[];

  @ApiProperty({ description: '总数' })
  readonly total: number;

  @ApiProperty({ description: '当前页码' })
  readonly page: number;

  @ApiProperty({ description: '每页数量' })
  readonly limit: number;

  constructor(params: {
    data: TimelineResponseDto[];
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
