import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 标签响应 DTO
 */
export class TagResponseDto {
  @ApiProperty({ description: '标签 ID', example: 'clxxx...' })
  readonly id: string;

  @ApiProperty({ description: '标签名称', example: 'TypeScript' })
  readonly name: string;

  @ApiProperty({ description: '标签 URL 别名', example: 'typescript' })
  readonly slug: string;

  @ApiPropertyOptional({ description: '标签描述', example: 'TypeScript 相关的文章' })
  readonly description: string | null;

  @ApiProperty({ description: '关联文章数量', example: 10 })
  readonly articleCount: number;

  @ApiProperty({ description: '创建时间', example: '2024-01-01T00:00:00.000Z' })
  readonly createdAt: Date;

  @ApiProperty({ description: '更新时间', example: '2024-01-01T00:00:00.000Z' })
  readonly updatedAt: Date;

  constructor(params: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    articleCount: number;
    createdAt: Date;
    updatedAt: Date;
  }) {
    this.id = params.id;
    this.name = params.name;
    this.slug = params.slug;
    this.description = params.description;
    this.articleCount = params.articleCount;
    this.createdAt = params.createdAt;
    this.updatedAt = params.updatedAt;
  }
}
