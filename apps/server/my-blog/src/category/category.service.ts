import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BlogCacheService, CacheKeyRegistry } from '../redis';
import { CreateCategoryParams, UpdateCategoryParams } from './domain/category.model';
import { CategoryResponseDto, CategoryTreeNodeDto } from './dto';
import { Category } from '@prisma/client';

/** 最大分类层级 */
const MAX_CATEGORY_LEVEL = 3;

@Injectable()
export class CategoryService {
  private readonly logger = new Logger(CategoryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly blogCacheService: BlogCacheService,
  ) {}

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

    const category = await this.prisma.category.create({
      data: {
        name: params.name,
        slug: params.slug,
        description: params.description ?? null,
        parentId: params.parentId ?? null,
        level,
        path,
        sortOrder: params.sortOrder ?? 0,
      },
    });

    this.logger.log(`分类创建成功: ${category.id}`);
    await this.blogCacheService.del(CacheKeyRegistry.PUBLIC_CATEGORIES);
    return this.toResponseDto(category);
  }

  /**
   * 获取分类树
   */
  async findTree(): Promise<CategoryTreeNodeDto[]> {
    const allCategories = await this.prisma.category.findMany({
      orderBy: { sortOrder: 'asc' },
    });

    const rootCategories = allCategories.filter((c) => c.parentId === null);
    return rootCategories.map((root) => this.buildTreeNode(root, allCategories));
  }

  /**
   * 获取所有分类（扁平列表）
   */
  async findAll(): Promise<CategoryResponseDto[]> {
    const categories = await this.prisma.category.findMany({
      orderBy: { sortOrder: 'asc' },
    });
    return categories.map((c) => this.toResponseDto(c));
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
    const category = await this.prisma.category.findFirst({ where: { path } });
    return category ? this.toResponseDto(category) : null;
  }

  /**
   * 更新分类
   */
  async update(id: string, params: UpdateCategoryParams): Promise<CategoryResponseDto> {
    const existing = await this.findById(id);

    if (params.slug && params.slug !== existing.slug) {
      await this.validateSlugUnique(params.slug, id);
    }

    let newPath = existing.path;
    if (params.slug && params.slug !== existing.slug) {
      newPath = this.rebuildPath(existing, params.slug);
    }

    const category = await this.prisma.category.update({
      where: { id },
      data: {
        name: params.name,
        slug: params.slug,
        description: params.description,
        sortOrder: params.sortOrder,
        path: newPath,
      },
    });

    // 更新子分类路径（用旧 path 作为前缀匹配，批量替换）
    if (params.slug && params.slug !== existing.slug) {
      await this.updateChildrenPaths(existing.path, newPath);
    }

    this.logger.log(`分类更新成功: ${id}`);
    await this.blogCacheService.del(CacheKeyRegistry.PUBLIC_CATEGORIES);
    return this.toResponseDto(category);
  }

  /**
   * 删除分类
   */
  async remove(id: string): Promise<void> {
    await this.findById(id);

    const hasChildren = await this.prisma.category.count({
      where: { parentId: id },
    });
    if (hasChildren > 0) {
      throw new BadRequestException('该分类下存在子分类，无法删除');
    }

    await this.prisma.category.delete({ where: { id } });
    this.logger.log(`分类删除成功: ${id}`);
    await this.blogCacheService.del(CacheKeyRegistry.PUBLIC_CATEGORIES);
  }

  private async findById(id: string): Promise<Category> {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) {
      throw new NotFoundException('分类不存在');
    }
    return category;
  }

  private async validateSlugUnique(slug: string, excludeId?: string): Promise<void> {
    const existing = await this.prisma.category.findFirst({
      where: {
        slug,
        id: excludeId ? { not: excludeId } : undefined,
      },
    });
    if (existing) {
      throw new ConflictException('该 slug 已被使用');
    }
  }

  private buildTreeNode(category: Category, allCategories: Category[]): CategoryTreeNodeDto {
    const children = allCategories
      .filter((c) => c.parentId === category.id)
      .map((child) => this.buildTreeNode(child, allCategories));

    return new CategoryTreeNodeDto({
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description,
      parentId: category.parentId,
      level: category.level,
      path: category.path,
      sortOrder: category.sortOrder,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
      children,
    });
  }

  private rebuildPath(category: Category, newSlug: string): string {
    if (!category.parentId) {
      return `/${newSlug}`;
    }
    const parentPath = category.path.substring(0, category.path.lastIndexOf('/'));
    return `${parentPath}/${newSlug}`;
  }

  private async updateChildrenPaths(oldPath: string, newPath: string): Promise<void> {
    const children = await this.prisma.category.findMany({
      where: { path: { startsWith: `${oldPath}/` } },
      select: { id: true, path: true },
    });

    if (children.length === 0) return;

    await Promise.all(
      children.map((child) =>
        this.prisma.category.update({
          where: { id: child.id },
          data: { path: child.path.replace(oldPath, newPath) },
        }),
      ),
    );
  }

  private toResponseDto(category: Category): CategoryResponseDto {
    return new CategoryResponseDto({
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description,
      parentId: category.parentId,
      level: category.level,
      path: category.path,
      sortOrder: category.sortOrder,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    });
  }
}
