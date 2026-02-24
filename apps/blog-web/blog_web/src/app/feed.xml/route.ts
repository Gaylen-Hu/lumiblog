import { getAllPosts } from '@/lib/mock-data'
import { generateRSSFeed } from '@/lib/rss'

export async function GET() {
  const posts = getAllPosts()
  const feed = generateRSSFeed(posts)

  return new Response(feed, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  })
}
