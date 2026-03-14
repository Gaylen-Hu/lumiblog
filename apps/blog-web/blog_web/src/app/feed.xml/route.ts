import { getArticles, getSiteConfig } from '@/lib/api'
import { generateRSSFeed } from '@/lib/rss'

export async function GET() {
  const { data: posts } = await getArticles({ pageSize: 50 })

  const siteConfig = await getSiteConfig()

  const feed = generateRSSFeed(posts, {
    title: siteConfig.siteName || 'Byte&Beyond',
    description: siteConfig.siteDescription || '探索技术与设计的前沿',
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'https://www.example.com',
    language: 'zh-CN',
    author: siteConfig.owner?.name || 'NOVA',
    email: siteConfig.owner?.email || undefined,
  })

  return new Response(feed, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  })
}
