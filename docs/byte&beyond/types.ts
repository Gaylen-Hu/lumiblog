
export interface Article {
  id: string;
  title: string;
  excerpt: string;
  date: string;
  category: string;
  tags: string[];
}

export interface Project {
  id: string;
  title: string;
  description: string;
  techStack: string[];
  imageUrl: string;
  link: string;
}

export interface MicroPost {
  id: string;
  content: string;
  date: string;
  image?: string;
}

export interface TechStack {
  name: string;
  level: number; // 0 to 100
  icon?: string;
}
