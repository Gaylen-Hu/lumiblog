/**
 * 文章领域模型
 * 对应 Prisma Article 模型，用于 Service 层内部处理
 */
export interface Article {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  content: string | null;
  coverImage: string | null;
  isPublished: boolean;
  publishedAt: Date | null;
  seoTitle: string | null;
  seoDescription: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 创建文章参数
 */
export interface CreateArticleParams {
  title: string;
  slug: string;
  summary?: string;
  content?: string;
  coverImage?: string;
  seoTitle?: string;
  seoDescription?: string;
}

/**
 * 更新文章参数
 */
export interface UpdateArticleParams {
  title?: string;
  slug?: string;
  summary?: string;
  content?: string;
  coverImage?: string;
  seoTitle?: string;
  seoDescription?: string;
}

/**
 * 查询文章参数
 */
export interface QueryArticleParams {
  page: number;
  limit: number;
}

/**
 * 管理端查询文章参数
 */
export interface AdminQueryArticleParams {
  page: number;
  limit: number;
  keyword?: string;
  isPublished?: boolean;
}
