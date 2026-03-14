/**
 * Blog API 客户端 - 封装所有 HTTP 请求
 */

export interface LoginResponse {
  access_token: string
  user: { id: string; email: string; name: string }
}

export interface Article {
  id: string
  title: string
  slug: string
  content?: string
  isPublished: boolean
  createdAt: string
  updatedAt: string
}

export interface PaginatedArticles {
  items: Article[]
  total: number
  page: number
  limit: number
}

export interface Category {
  id: string
  name: string
  slug: string
  parentId?: string
}

export interface Tag {
  id: string
  name: string
  slug: string
}

export class BlogApiClient {
  private token: string | null = null

  constructor(private readonly baseUrl: string) {}

  setToken(token: string): void {
    this.token = token
  }

  private async request<T>(
    path: string,
    options: RequestInit = {},
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    }

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`
    }

    const res = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers,
    })

    if (!res.ok) {
      const err = await res.text()
      throw new Error(`API ${res.status}: ${err}`)
    }

    if (res.status === 204) return undefined as T
    return res.json() as Promise<T>
  }

  // 认证
  async login(email: string, password: string): Promise<LoginResponse> {
    return this.request<LoginResponse>('/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
  }

  // 文章
  async listArticles(params: {
    page?: number
    limit?: number
    keyword?: string
    isPublished?: boolean
  }): Promise<PaginatedArticles> {
    const q = new URLSearchParams()
    if (params.page) q.set('page', String(params.page))
    if (params.limit) q.set('limit', String(params.limit))
    if (params.keyword) q.set('keyword', params.keyword)
    if (params.isPublished !== undefined) q.set('isPublished', String(params.isPublished))
    return this.request<PaginatedArticles>(`/v1/admin/articles?${q}`)
  }

  async getArticle(id: string): Promise<Article> {
    return this.request<Article>(`/v1/admin/articles/${id}`)
  }

  async createArticle(data: {
    title: string
    slug?: string
    content?: string
    categoryId?: string
    tagIds?: string[]
  }): Promise<Article> {
    return this.request<Article>('/v1/admin/articles', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateArticle(id: string, data: Partial<{
    title: string
    slug: string
    content: string
    categoryId: string
    tagIds: string[]
  }>): Promise<Article> {
    return this.request<Article>(`/v1/admin/articles/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  async deleteArticle(id: string): Promise<void> {
    return this.request<void>(`/v1/admin/articles/${id}`, { method: 'DELETE' })
  }

  async publishArticle(id: string): Promise<Article> {
    return this.request<Article>(`/v1/admin/articles/${id}/publish`, { method: 'POST' })
  }

  async unpublishArticle(id: string): Promise<Article> {
    return this.request<Article>(`/v1/admin/articles/${id}/unpublish`, { method: 'POST' })
  }

  async translateArticle(id: string, targetLang: string): Promise<unknown> {
    return this.request(`/v1/admin/articles/${id}/translate`, {
      method: 'POST',
      body: JSON.stringify({ targetLanguage: targetLang }),
    })
  }

  async seoOptimizeArticle(id: string): Promise<unknown> {
    return this.request(`/v1/admin/articles/${id}/seo-optimize`, { method: 'POST' })
  }

  // 分类
  async listCategories(): Promise<Category[]> {
    return this.request<Category[]>('/v1/admin/categories')
  }

  async getCategoryTree(): Promise<unknown> {
    return this.request('/v1/admin/categories/tree')
  }

  async createCategory(data: { name: string; slug?: string; parentId?: string }): Promise<Category> {
    return this.request<Category>('/v1/admin/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateCategory(id: string, data: { name?: string; slug?: string }): Promise<Category> {
    return this.request<Category>(`/v1/admin/categories/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  async deleteCategory(id: string): Promise<void> {
    return this.request<void>(`/v1/admin/categories/${id}`, { method: 'DELETE' })
  }

  // 标签
  async listTags(): Promise<Tag[]> {
    return this.request<Tag[]>('/v1/admin/tags')
  }

  async createTag(data: { name: string; slug?: string }): Promise<Tag> {
    return this.request<Tag>('/v1/admin/tags', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateTag(id: string, data: { name?: string; slug?: string }): Promise<Tag> {
    return this.request<Tag>(`/v1/admin/tags/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  async deleteTag(id: string): Promise<void> {
    return this.request<void>(`/v1/admin/tags/${id}`, { method: 'DELETE' })
  }
}
