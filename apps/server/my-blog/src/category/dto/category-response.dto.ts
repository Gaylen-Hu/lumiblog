import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 分类响应 DTO
 */
export class CategoryResponseDto {
  @ApiProperty({ description: '分类 ID', example: 'clxxx...' })
  readonly id: string;

  @ApiProperty({ description: '分类名称', example: '技术文章' })
  readonly name: string;

  @ApiProperty({ description: '分类 URL 别名', example: 'tech-articles' })
  readonly slug: string;

  @ApiPropertyOptional({ description: '分类描述', example: '关于编程和技术的文章' })
  readonly description: string | null;

  @ApiPropertyOptional({ description: '父分类 ID', example: 'clxxx...' })
  readonly parentId: string | null;

  @ApiProperty({ description: '层级深度（0 为顶级）', example: 0 })
  readonly level: number;

  @ApiProperty({ description: '分类路径', example: '/tech-articles' })
  readonly path: string;

  @ApiProperty({ description: '排序顺序', example: 0 })
  readonly sortOrder: number;

  @ApiProperty({ description: '创建时间', example: '2024-01-01T00:00:00.000Z' })
  readonly createdAt: Date;

  @ApiProperty({ description: '更新时间', example: '2024-01-01T00:00:00.000Z' })
  readonly updatedAt: Date;

  constructor(params: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    parentId: string | null;
    level: number;
    path: string;
    sortOrder: number;
    createdAt: Date;
    updatedAt: Date;
  }) {
    this.id = params.id;
    this.name = params.name;
    this.slug = params.slug;
    this.description = params.description;
    this.parentId = params.parentId;
    this.level = params.level;
    this.path = params.path;
    this.sortOrder = params.sortOrder;
    this.createdAt = params.createdAt;
    this.updatedAt = params.updatedAt;
  }
}

/**
 * 分类树节点 DTO
 */
export class CategoryTreeNodeDto extends CategoryResponseDto {
  @ApiProperty({ description: '子分类列表', type: [CategoryTreeNodeDto] })
  readonly children: CategoryTreeNodeDto[];

  constructor(
    params: ConstructorParameters<typeof CategoryResponseDto>[0] & {
      children: CategoryTreeNodeDto[];
    },
  ) {
    super(params);
    this.children = params.children;
  }
}
