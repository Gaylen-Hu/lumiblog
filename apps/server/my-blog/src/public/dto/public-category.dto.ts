import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 公开分类响应 DTO（含文章数量）
 */
export class PublicCategoryDto {
  @ApiProperty({ description: '分类 ID' })
  readonly id: string;

  @ApiProperty({ description: '分类名称', example: '技术' })
  readonly name: string;

  @ApiProperty({ description: '分类 slug', example: 'tech' })
  readonly slug: string;

  @ApiPropertyOptional({ description: '分类描述' })
  readonly description: string | null;

  @ApiProperty({ description: '文章数量', example: 10 })
  readonly articleCount: number;

  constructor(params: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    articleCount: number;
  }) {
    this.id = params.id;
    this.name = params.name;
    this.slug = params.slug;
    this.description = params.description;
    this.articleCount = params.articleCount;
  }
}

/**
 * 公开分类列表响应 DTO
 */
export class PublicCategoryListDto {
  @ApiProperty({ description: '分类列表', type: [PublicCategoryDto] })
  readonly data: PublicCategoryDto[];

  constructor(data: PublicCategoryDto[]) {
    this.data = data;
  }
}
