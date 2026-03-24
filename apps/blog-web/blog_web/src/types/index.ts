// 文章导航项类型 — 对齐后端 ArticleNavItemDto
export interface ArticleNavItem {
  slug: string;
  title: string;
  publishedAt: string;
}

// 文章列表项类型 — 对齐后端 PublicArticleListItemDto
export interface Post {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  coverImage: string | null;
  author: { name: string; avatar: string | null };
  publishedAt: string;
  readTime: string;
  category: { id: string; name: string; slug: string } | null;
  tags: { id: string; name: string; slug: string }[];
}

// 文章详情类型 — 对齐后端 PublicArticleDetailDto
export interface PostDetail extends Post {
  content: string;
  updatedAt: string;
  seo: {
    metaTitle: string | null;
    metaDescription: string | null;
    ogImage: string | null;
  };
  prevArticle?: ArticleNavItem | null;
  nextArticle?: ArticleNavItem | null;
}

// 项目类型 — 对齐后端 PublicProjectDto
export interface Project {
  id: string;
  title: string;
  description: string;
  techStack: string[];
  coverImage: string | null;
  link: string | null;
  githubUrl: string | null;
  featured: boolean;
}

// 分页响应 — 对齐后端 PaginatedPublicArticleListDto 等
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

// 搜索结果项 — 对齐后端 SearchResultItemDto
export interface SearchResult {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  highlight: string | null;
  category: string | null;
  publishedAt: string;
}

// 分类类型 — 对齐后端 PublicCategoryDto
export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  articleCount: number;
}

// 标签类型 — 对齐后端 PublicTagDto
export interface Tag {
  id: string;
  name: string;
  slug: string;
  articleCount: number;
}

// === 以下为前端独有类型，暂保留供现有组件使用 ===

// 微博/动态类型
export interface MicroPost {
  id: string;
  content: string;
  date: string;
  image?: string;
}

// 技术栈类型
export interface TechStack {
  name: string;
  level: number; // 0 to 100
  icon?: string;
}

// 主题类型
export type Theme = 'light' | 'dark';
