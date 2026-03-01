import type { Post } from '@/types'

export interface RSSConfig {
  title: string
  description: string
  siteUrl: string
  language: string
  author: string
  email?: string
}

const DEFAULT_CONFIG: RSSConfig = {
  title: 'NOVA - 探索技术与设计的前沿',
  description: '以极简主义的视角，探索技术、设计与人类潜能的前沿。',
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'https://nova.blog',
  language: 'zh-CN',
  author: 'NOVA',
}

function escapeXml(text: string | null): string {
  if (!text) return ''
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function formatRFC822Date(dateStr: string): string {
  const date = new Date(dateStr)
  return isNaN(date.getTime()) ? new Date().toUTCString() : date.toUTCString()
}

export function generateRSSFeed(posts: Post[], config: RSSConfig = DEFAULT_CONFIG): string {
  const { title, description, siteUrl, language, email } = config

  const items = posts
    .map((post) => {
      const postUrl = `${siteUrl}/posts/${post.slug}`
      const authorName = post.author?.name || 'Anonymous'
      const categoryName = post.category?.name || 'Uncategorized'
      return `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${postUrl}</link>
      <guid isPermaLink="true">${postUrl}</guid>
      <description>${escapeXml(post.excerpt)}</description>
      <pubDate>${formatRFC822Date(post.publishedAt)}</pubDate>
      <author>${email ? `${email} (${authorName})` : authorName}</author>
      <category>${escapeXml(categoryName)}</category>
    </item>`
    })
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(title)}</title>
    <link>${siteUrl}</link>
    <description>${escapeXml(description)}</description>
    <language>${language}</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${siteUrl}/feed.xml" rel="self" type="application/rss+xml"/>
    <generator>Next.js</generator>
${items}
  </channel>
</rss>`
}

export { DEFAULT_CONFIG }
