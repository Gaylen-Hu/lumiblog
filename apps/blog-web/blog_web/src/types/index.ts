// 文章类型定义
export interface Post {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  author: string;
  date: string;
  readTime: string;
  category: string;
  imageUrl: string;
  tags: string[];
  slug: string;
}

// 项目类型
export interface Project {
  id: string;
  title: string;
  description: string;
  techStack: string[];
  imageUrl: string;
  link: string;
}

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

// 分类类型
export interface Category {
  id: string;
  name: string;
  slug: string;
  count: number;
}

// 标签类型
export interface Tag {
  id: string;
  name: string;
  slug: string;
}

// 分页响应
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
