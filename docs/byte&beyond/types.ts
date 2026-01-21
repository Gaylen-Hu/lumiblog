
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
}

export type Theme = 'light' | 'dark';

export interface BlogState {
  posts: Post[];
  selectedPost: Post | null;
  theme: Theme;
  isSearchOpen: boolean;
  searchQuery: string;
}
