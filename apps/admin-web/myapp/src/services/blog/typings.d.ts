// 博客系统类型定义

declare namespace BlogAPI {
  // 分页响应
  interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
  }

  // 标签
  interface Tag {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    articleCount: number;
    createdAt: string;
    updatedAt: string;
  }

  interface CreateTagParams {
    name: string;
    slug: string;
    description?: string;
  }

  interface UpdateTagParams {
    name?: string;
    slug?: string;
    description?: string;
  }

  // 分类
  interface Category {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    parentId: string | null;
    level: number;
    path: string;
    sortOrder: number;
    createdAt: string;
    updatedAt: string;
  }

  interface CategoryTreeNode extends Category {
    children: CategoryTreeNode[];
  }

  // 文章
  interface Article {
    id: string;
    title: string;
    slug: string;
    summary: string | null;
    content: string | null;
    coverImage: string | null;
    isPublished: boolean;
    publishedAt: string | null;
    seoTitle: string | null;
    seoDescription: string | null;
    createdAt: string;
    updatedAt: string;
  }
}
