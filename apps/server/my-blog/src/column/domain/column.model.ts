/**
 * 专栏领域模型
 */
export interface Column {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  coverImage: string | null;
  sortOrder: number;
  status: 'draft' | 'published';
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 专栏响应 DTO（管理端）
 */
export interface ColumnResponse {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  coverImage: string | null;
  sortOrder: number;
  status: 'draft' | 'published';
  articleCount: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * 专栏详情响应（含文章列表）
 */
export interface ColumnDetailResponse extends ColumnResponse {
  articles: ColumnArticleItem[];
}

/**
 * 专栏内文章项
 */
export interface ColumnArticleItem {
  id: string;
  title: string;
  slug: string;
  isPublished: boolean;
  publishedAt: string | null;
  sortOrder: number;
}

/**
 * 公开专栏列表项
 */
export interface PublicColumnListItem {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  coverImage: string | null;
  sortOrder: number;
  articleCount: number;
}

/**
 * 公开专栏详情
 */
export interface PublicColumnDetail {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  coverImage: string | null;
  articles: PublicColumnArticle[];
}

/**
 * 公开专栏文章项
 */
export interface PublicColumnArticle {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  coverImage: string | null;
  publishedAt: string;
}

/**
 * 专栏内文章导航
 */
export interface ColumnArticleNav {
  columnTitle: string;
  columnSlug: string;
  prev: { title: string; slug: string } | null;
  next: { title: string; slug: string } | null;
}

/**
 * 分页响应
 */
export interface PaginatedColumnResponse {
  data: ColumnResponse[];
  total: number;
  page: number;
  limit: number;
}
