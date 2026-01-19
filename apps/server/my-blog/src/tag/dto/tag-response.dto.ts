/**
 * 标签响应 DTO
 */
export class TagResponseDto {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly description: string | null;
  readonly articleCount: number;
  readonly createdAt: Date;
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
