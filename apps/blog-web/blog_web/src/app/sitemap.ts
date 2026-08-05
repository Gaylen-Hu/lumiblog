import type { MetadataRoute } from 'next'

// The CMS API is available only after the web service is deployed. Rendering
// this route at request time keeps CI builds independent from that API while
// preserving complete, up-to-date sitemap entries in production.
export const dynamic = 'force-dynamic'
export const revalidate = 3600

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.new-universe.cn'
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/v1/public'
const LOCALES = [
  { route: 'zh', api: 'zh-CN' },
  { route: 'en', api: 'en-US' },
] as const

const STATIC_ROUTES = ['', '/posts', '/projects', '/about', '/timeline', '/columns']
const PAGE_SIZE = 100

interface SitemapArticle {
  slug: string
  publishedAt: string
}

interface SitemapProject {
  id: string
}

interface SitemapColumn {
  slug: string
}

interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
}

async function getAllPages<T>(path: string): Promise<T[]> {
  const firstResponse = await fetch(`${API_BASE_URL}${path}${path.includes('?') ? '&' : '?'}page=1&pageSize=${PAGE_SIZE}`, {
    next: { revalidate },
  })

  if (!firstResponse.ok) {
    throw new Error(`Sitemap source failed: ${path} (${firstResponse.status})`)
  }

  const firstPage = (await firstResponse.json()) as PaginatedResponse<T>
  const totalPages = Math.max(1, Math.ceil(firstPage.total / PAGE_SIZE))
  if (totalPages === 1) return firstPage.data

  const pages = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, index) => index + 2).map(async (page) => {
      const response = await fetch(`${API_BASE_URL}${path}${path.includes('?') ? '&' : '?'}page=${page}&pageSize=${PAGE_SIZE}`, {
        next: { revalidate },
      })
      if (!response.ok) {
        throw new Error(`Sitemap source failed: ${path} page ${page} (${response.status})`)
      }
      return (await response.json()) as PaginatedResponse<T>
    }),
  )

  return [firstPage, ...pages].flatMap((result) => result.data)
}

async function getCollection<T>(path: string): Promise<T[]> {
  const response = await fetch(`${API_BASE_URL}${path}`, { next: { revalidate } })
  if (!response.ok) {
    throw new Error(`Sitemap source failed: ${path} (${response.status})`)
  }
  return response.json() as Promise<T[]>
}

/**
 * Only publishes URLs backed by content in that locale.  Returning an error is
 * intentional: Next keeps the last successfully generated ISR response rather
 * than replacing it with a partial sitemap when the CMS is temporarily down.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [articlesByLocale, projects, columns] = await Promise.all([
    Promise.all(
      LOCALES.map(async (locale) => ({
        locale,
        articles: await getAllPages<SitemapArticle>(`/articles?locale=${locale.api}`),
      })),
    ),
    getAllPages<SitemapProject>('/projects'),
    getCollection<SitemapColumn>('/columns'),
  ])

  const staticEntries = LOCALES.flatMap(({ route }) =>
    STATIC_ROUTES.map((path) => ({
      url: `${BASE_URL}/${route}${path}`,
      changeFrequency: path === '' ? ('daily' as const) : ('weekly' as const),
      priority: path === '' ? 1.0 : 0.8,
    })),
  )

  const articleEntries = articlesByLocale.flatMap(({ locale, articles }) =>
    articles.map((article) => ({
      url: `${BASE_URL}/${locale.route}/posts/${article.slug}`,
      lastModified: new Date(article.publishedAt),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
  )

  const projectEntries = LOCALES.flatMap(({ route }) =>
    projects.map((project) => ({
      url: `${BASE_URL}/${route}/projects/${project.id}`,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    })),
  )

  const columnEntries = LOCALES.flatMap(({ route }) =>
    columns.map((column) => ({
      url: `${BASE_URL}/${route}/columns/${column.slug}`,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })),
  )

  return [...staticEntries, ...articleEntries, ...projectEntries, ...columnEntries]
}
