import type {
  Post,
  PostDetail,
  Project,
  PaginatedResponse,
  SearchResult,
  Category,
  Tag,
} from '@/types'

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/v1/public'

// 文章列表
export async function getArticles(params?: {
  page?: number
  pageSize?: number
  category?: string
  tag?: string
  search?: string
}): Promise<PaginatedResponse<Post>> {
  try {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.set('page', String(params.page))
    if (params?.pageSize) searchParams.set('pageSize', String(params.pageSize))
    if (params?.category) searchParams.set('category', params.category)
    if (params?.tag) searchParams.set('tag', params.tag)
    if (params?.search) searchParams.set('search', params.search)

    const res = await fetch(`${API_BASE_URL}/articles?${searchParams}`, {
      next: { revalidate: 60 },
    })
    if (!res.ok) throw new Error('Failed to fetch articles')
    return res.json()
  } catch {
    return { data: [], total: 0, page: 1, pageSize: 10 }
  }
}

// 文章详情
export async function getArticleBySlug(
  slug: string,
): Promise<PostDetail | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/articles/${slug}`, {
      next: { revalidate: 60 },
    })
    if (!res.ok) {
      if (res.status === 404) return null
      console.error(`Failed to fetch article "${slug}": ${res.status} ${res.statusText}`)
      return null
    }
    return res.json()
  } catch (err) {
    console.error(`Error fetching article "${slug}":`, err)
    return null
  }
}

// 文章 slugs（用于 SSG generateStaticParams）
export async function getArticleSlugs(): Promise<string[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/articles/slugs`, {
      next: { revalidate: 300 },
    })
    if (!res.ok) return []
    const data = await res.json()
    return data.slugs
  } catch {
    return []
  }
}

// 项目列表
export async function getProjects(params?: {
  page?: number
  pageSize?: number
  featured?: boolean
}): Promise<PaginatedResponse<Project>> {
  try {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.set('page', String(params.page))
    if (params?.pageSize) searchParams.set('pageSize', String(params.pageSize))
    if (params?.featured !== undefined)
      searchParams.set('featured', String(params.featured))

    const res = await fetch(`${API_BASE_URL}/projects?${searchParams}`, {
      next: { revalidate: 60 },
    })
    if (!res.ok) throw new Error('Failed to fetch projects')
    return res.json()
  } catch {
    return { data: [], total: 0, page: 1, pageSize: 10 }
  }
}

// 分类列表
export async function getCategories(): Promise<Category[]> {
  const res = await fetch(`${API_BASE_URL}/categories`, {
    next: { revalidate: 3600 },
  })
  if (!res.ok) return []
  const data = await res.json()
  return data.data
}

// 标签列表
export async function getTags(): Promise<Tag[]> {
  const res = await fetch(`${API_BASE_URL}/tags`, {
    next: { revalidate: 3600 },
  })
  if (!res.ok) return []
  const data = await res.json()
  return data.data
}

// 搜索
export async function searchArticles(
  q: string,
  page = 1,
): Promise<PaginatedResponse<SearchResult>> {
  const res = await fetch(
    `${API_BASE_URL}/search?q=${encodeURIComponent(q)}&page=${page}`,
    {
      next: { revalidate: 0 },
    },
  )
  if (!res.ok) throw new Error('Search failed')
  return res.json()
}

interface SiteConfig {
  siteName: string
  siteDescription: string
  logo: string | null
  favicon: string | null
  socialLinks: {
    github?: string
    twitter?: string
    linkedin?: string
    weibo?: string
  }
  owner: {
    name: string
    avatar: string | null
    bio: string | null
    email: string | null
    techStack: string[]
  }
  seo: {
    defaultTitle: string | null
    defaultDescription: string | null
    keywords: string | null
    defaultOgImage: string | null
  }
  filing: {
    icp: string | null
    gongan: string | null
    copyright: string | null
  }
  analyticsGoogle: string | null
  analyticsBaidu: string | null
  aboutImage1: string | null
  aboutImage2: string | null
}

interface SiteStats {
  articleCount: number
  yearsOfExperience: number
  openSourceCount: number
  talkCount: number
}

// 默认配置（API 不可用时使用）
const DEFAULT_SITE_CONFIG: SiteConfig = {
  siteName: '墨千',
  siteDescription: '探索技术与设计的前沿',
  logo: null,
  favicon: null,
  socialLinks: {
    github: 'https://github.com',
    twitter: 'https://twitter.com',
  },
  owner: {
    name: 'Site Owner',
    avatar: null,
    bio: null,
    email: null,
    techStack: [],
  },
  seo: {
    defaultTitle: '墨千 - 探索技术与设计的前沿',
    defaultDescription: '以极简主义的视角，探索技术、设计与人类潜能的前沿。',
    keywords: null,
    defaultOgImage: null,
  },
  filing: {
    icp: null,
    gongan: null,
    copyright: '© 2024 NOVA. All rights reserved.',
  },
  analyticsGoogle: null,
  analyticsBaidu: null,
  aboutImage1: null,
  aboutImage2: null,
}

const DEFAULT_STATS: SiteStats = {
  articleCount: 0,
  yearsOfExperience: 0,
  openSourceCount: 0,
  talkCount: 0,
}

export async function getSiteConfig(): Promise<SiteConfig> {
  try {
    const res = await fetch(`${API_BASE_URL}/site-config`, {
      next: { revalidate: 3600 },
    })
    if (!res.ok) {
      console.warn('Failed to fetch site config, using defaults')
      return DEFAULT_SITE_CONFIG
    }
    return res.json()
  } catch {
    console.warn('API unavailable, using default site config')
    return DEFAULT_SITE_CONFIG
  }
}

export async function getSiteStats(): Promise<SiteStats> {
  try {
    const res = await fetch(`${API_BASE_URL}/stats`, {
      next: { revalidate: 3600 },
    })
    if (!res.ok) return DEFAULT_STATS
    return res.json()
  } catch {
    return DEFAULT_STATS
  }
}

export type { SiteConfig, SiteStats }

// 时间轴条目类型
export interface TimelineEntry {
  id: string
  year: string
  titleZh: string
  titleEn: string
  descZh: string
  descEn: string
  order: number
}

// 时间轴列表（ISR 缓存 1 小时）
export async function getTimeline(): Promise<TimelineEntry[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/timeline`, {
      next: { revalidate: 3600 },
    })
    if (!res.ok) throw new Error('Failed to fetch timeline')
    return res.json()
  } catch {
    return []
  }
}
