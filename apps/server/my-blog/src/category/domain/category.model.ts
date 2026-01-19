/**
 * 分类领域模型
 * 支持多级分类结构
 */
export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parentId: string | null;
  level: number;
  path: string; // URL 路径，如 /tech/backend
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 创建分类参数
 */
export interface CreateCategoryParams {
  name: string;
  slug: string;
  description?: string;
  parentId?: string;
  sortOrder?: number;
}

/**
 * 更新分类参数
 */
export interface UpdateCategoryParams {
  name?: string;
  slug?: string;
  description?: string;
  sortOrder?: number;
}
