import { getArticles } from '@/lib/api'
import { generateRSSFeed } from '@/lib/rss'

export async function GET() {
  const { data: posts } = await getArticles({ pageSize: 50 })
  const feed = generateRSSFeed(posts)

  return new Response(feed, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  })
}
