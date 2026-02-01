import { ApiProperty } from '@nestjs/swagger';

/**
 * 公开标签响应 DTO（含文章数量）
 */
export class PublicTagDto {
  @ApiProperty({ description: '标签 ID' })
  readonly id: string;

  @ApiProperty({ description: '标签名称', example: 'TypeScript' })
  readonly name: string;

  @ApiProperty({ description: '标签 slug', example: 'typescript' })
  readonly slug: string;

  @ApiProperty({ description: '文章数量', example: 5 })
  readonly articleCount: number;

  constructor(params: {
    id: string;
    name: string;
    slug: string;
    articleCount: number;
  }) {
    this.id = params.id;
    this.name = params.name;
    this.slug = params.slug;
    this.articleCount = params.articleCount;
  }
}

/**
 * 公开标签列表响应 DTO
 */
export class PublicTagListDto {
  @ApiProperty({ description: '标签列表', type: [PublicTagDto] })
  readonly data: PublicTagDto[];

  constructor(data: PublicTagDto[]) {
    this.data = data;
  }
}
