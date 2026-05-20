// 公开专栏列表项 — 对齐后端 PublicColumnListItemDto
export interface PublicColumnListItemDto {
  id: string
  title: string
  slug: string
  description: string | null
  coverImage: string | null
  sortOrder: number
  articleCount: number
}

// 公开专栏详情 — 对齐后端 PublicColumnDetailDto
export interface PublicColumnDetailDto {
  id: string
  title: string
  slug: string
  description: string | null
  coverImage: string | null
  articles: PublicColumnArticleDto[]
}

// 公开专栏文章项 — 对齐后端 PublicColumnArticleDto
export interface PublicColumnArticleDto {
  id: string
  title: string
  slug: string
  summary: string | null
  coverImage: string | null
  publishedAt: string
}

// 专栏内文章导航 — 对齐后端 ColumnArticleNavDto
export interface ColumnArticleNavDto {
  columnTitle: string
  columnSlug: string
  prev: { title: string; slug: string } | null
  next: { title: string; slug: string } | null
}
