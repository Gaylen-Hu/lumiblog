/**
 * 标签领域模型
 */
export interface Tag {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  articleCount: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 创建标签参数
 */
export interface CreateTagParams {
  name: string;
  slug: string;
  description?: string;
}

/**
 * 更新标签参数
 */
export interface UpdateTagParams {
  name?: string;
  slug?: string;
  description?: string;
}
