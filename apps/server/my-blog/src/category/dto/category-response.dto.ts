/**
 * 分类响应 DTO
 */
export class CategoryResponseDto {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly description: string | null;
  readonly parentId: string | null;
  readonly level: number;
  readonly path: string;
  readonly sortOrder: number;
  readonly createdAt: Date;
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
