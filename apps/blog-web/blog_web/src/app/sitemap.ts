import type { MetadataRoute } from 'next'
import { getArticleSlugs } from '@/lib/api'

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.example.com'
const LOCALES = ['zh', 'en'] as const

/** 静态页面路径 */
const STATIC_ROUTES = ['', '/posts', '/projects', '/about', '/timeline']

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const slugs = await getArticleSlugs()

  // 静态页面：每个 locale 一条
  const staticEntries = LOCALES.flatMap((locale) =>
    STATIC_ROUTES.map((route) => ({
      url: `${BASE_URL}/${locale}${route}`,
      lastModified: new Date(),
      changeFrequency: route === '' ? ('daily' as const) : ('weekly' as const),
      priority: route === '' ? 1.0 : 0.8,
    })),
  )

  // 文章页面：每个 slug × 每个 locale
  const articleEntries = LOCALES.flatMap((locale) =>
    slugs.map((slug) => ({
      url: `${BASE_URL}/${locale}/posts/${slug}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    })),
  )

  return [...staticEntries, ...articleEntries]
}
