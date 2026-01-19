import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Category, CreateCategoryParams, UpdateCategoryParams } from './domain/category.model';
import { CategoryResponseDto, CategoryTreeNodeDto } from './dto';

/** 最大分类层级 */
const MAX_CATEGORY_LEVEL = 3;

@Injectable()
export class CategoryService {
  private readonly logger = new Logger(CategoryService.name);
  private categories: Category[] = [];
  private idCounter = 1;

  /**
   * 创建分类
   */
  async create(params: CreateCategoryParams): Promise<CategoryResponseDto> {
    await this.validateSlugUnique(params.slug);

    let level = 1;
    let path = `/${params.slug}`;

    if (params.parentId) {
      const parent = await this.findById(params.parentId);
      level = parent.level + 1;
      path = `${parent.path}/${params.slug}`;

      if (level > MAX_CATEGORY_LEVEL) {
        throw new BadRequestException(`分类层级不能超过 ${MAX_CATEGORY_LEVEL} 级`);
      }
    }

    const now = new Date();
    const category: Category = {
      id: String(this.idCounter++),
      name: params.name,
      slug: params.slug,
      description: params.description ?? null,
      parentId: params.parentId ?? null,
      level,
      path,
      sortOrder: params.sortOrder ?? 0,
      createdAt: now,
      updatedAt: now,
    };

    this.categories.push(category);
    this.logger.log(`分类创建成功: ${category.id}`);

    return this.toResponseDto(category);
  }

  /**
   * 获取分类树
   */
  async findTree(): Promise<CategoryTreeNodeDto[]> {
    const rootCategories = this.categories
      .filter((c) => c.parentId === null)
      .sort((a, b) => a.sortOrder - b.sortOrder);

    return rootCategories.map((root) => this.buildTreeNode(root));
  }

  /**
   * 获取所有分类（扁平列表）
   */
  async findAll(): Promise<CategoryResponseDto[]> {
    return this.categories
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((c) => this.toResponseDto(c));
  }

  /**
   * 根据 ID 获取分类
   */
  async findOne(id: string): Promise<CategoryResponseDto> {
    const category = await this.findById(id);
    return this.toResponseDto(category);
  }

  /**
   * 根据路径获取分类
   */
  async findByPath(path: string): Promise<CategoryResponseDto | null> {
    const category = this.categories.find((c) => c.path === path);
    return category ? this.toResponseDto(category) : null;
  }

  /**
   * 更新分类
   */
  async update(id: string, params: UpdateCategoryParams): Promise<CategoryResponseDto> {
    const category = await this.findById(id);

    if (params.slug && params.slug !== category.slug) {
      await this.validateSlugUnique(params.slug, id);
    }

    const updated: Category = {
      ...category,
      name: params.name ?? category.name,
      slug: params.slug ?? category.slug,
      description: params.description ?? category.description,
      sortOrder: params.sortOrder ?? category.sortOrder,
      updatedAt: new Date(),
    };

    if (params.slug && params.slug !== category.slug) {
      updated.path = this.rebuildPath(updated);
      this.updateChildrenPaths(id, updated.path);
    }

    const index = this.categories.findIndex((c) => c.id === id);
    this.categories[index] = updated;
    this.logger.log(`分类更新成功: ${id}`);

    return this.toResponseDto(updated);
  }

  /**
   * 删除分类
   */
  async remove(id: string): Promise<void> {
    await this.findById(id);

    const hasChildren = this.categories.some((c) => c.parentId === id);
    if (hasChildren) {
      throw new BadRequestException('该分类下存在子分类，无法删除');
    }

    this.categories = this.categories.filter((c) => c.id !== id);
    this.logger.log(`分类删除成功: ${id}`);
  }

  private async findById(id: string): Promise<Category> {
    const category = this.categories.find((c) => c.id === id);
    if (!category) {
      throw new NotFoundException('分类不存在');
    }
    return category;
  }

  private async validateSlugUnique(slug: string, excludeId?: string): Promise<void> {
    const existing = this.categories.find(
      (c) => c.slug === slug && c.id !== excludeId,
    );
    if (existing) {
      throw new ConflictException('该 slug 已被使用');
    }
  }

  private buildTreeNode(category: Category): CategoryTreeNodeDto {
    const children = this.categories
      .filter((c) => c.parentId === category.id)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((child) => this.buildTreeNode(child));

    return new CategoryTreeNodeDto({ ...category, children });
  }

  private rebuildPath(category: Category): string {
    if (!category.parentId) {
      return `/${category.slug}`;
    }
    const parent = this.categories.find((c) => c.id === category.parentId);
    return parent ? `${parent.path}/${category.slug}` : `/${category.slug}`;
  }

  private updateChildrenPaths(parentId: string, parentPath: string): void {
    const children = this.categories.filter((c) => c.parentId === parentId);
    for (const child of children) {
      child.path = `${parentPath}/${child.slug}`;
      this.updateChildrenPaths(child.id, child.path);
    }
  }

  private toResponseDto(category: Category): CategoryResponseDto {
    return new CategoryResponseDto(category);
  }
}
