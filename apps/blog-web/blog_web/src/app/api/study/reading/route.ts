import { NextRequest, NextResponse } from 'next/server'
import { getArticles, getArticleBySlug, getProjects, getProjectById, getTimeline, getSiteConfig, getFriendLinks, toApiLocale } from '@/lib/api'
import { getPublicColumns, getPublicColumnBySlug } from '@/lib/columns'
import type { ReadingData } from '@/components/study/reading-data'

export async function GET(request: NextRequest) {
  const path = request.nextUrl.searchParams.get('path') || ''
  // A fixed resource whitelist: no arbitrary URL proxying or private CMS endpoints.
  if (!/^\/(zh|en)\/(posts|columns|timeline|projects|about|links|rss|classic)(\/[^/?#]+)?(\?[^#]*)?$/.test(path)) {
    return NextResponse.json({ error: 'Invalid reading resource' }, { status: 400 })
  }
  const url = new URL(path, 'https://study.local')
  const [, locale, section, encodedSlug] = url.pathname.split('/')
  const query = url.searchParams
  let data: ReadingData | null = null
  try {
    const slug = encodedSlug ? decodeURIComponent(encodedSlug) : null
    if (slug && !['posts', 'columns', 'projects'].includes(section)) return NextResponse.json({ error: 'Invalid reading resource' }, { status: 400 })
    if (section === 'posts' && slug) {
      const post = await getArticleBySlug(slug, toApiLocale(locale))
      if (post) data = { kind: 'article', post }
    } else if (section === 'posts' || section === 'classic') {
      data = { kind: 'posts', posts: await getArticles({ page: Math.max(1, Math.floor(Number(query.get('page')) || 1)), pageSize: 9,
        category: query.get('category') || undefined, tag: query.get('tag') || undefined, search: query.get('search') || undefined, locale: toApiLocale(locale) }) }
    } else if (section === 'columns' && slug) {
      const column = await getPublicColumnBySlug(slug)
      if (column) data = { kind: 'column', column }
    } else if (section === 'columns') data = { kind: 'columns', columns: await getPublicColumns() }
    else if (section === 'timeline') data = { kind: 'timeline', entries: await getTimeline() }
    else if (section === 'projects' && slug) {
      const project = await getProjectById(slug)
      if (project) data = { kind: 'project', project }
    } else if (section === 'projects') data = { kind: 'projects', projects: (await getProjects()).data }
    else if (section === 'about') {
      const { owner, siteName } = await getSiteConfig()
      data = { kind: 'about', owner: { name: owner.name === 'Site Owner' ? siteName : owner.name, bio: owner.bio || '',
        avatar: owner.avatar, techStack: owner.techStack } }
    } else if (section === 'links') data = { kind: 'links', links: await getFriendLinks() }
    else if (section === 'rss') data = { kind: 'rss' }
    if (!data) return NextResponse.json({ error: 'Page unavailable' }, { status: 404 })
    return NextResponse.json(data, { headers: { 'Cache-Control': 'public, max-age=0, s-maxage=60, stale-while-revalidate=300' } })
  } catch {
    return NextResponse.json({ error: 'Reading service unavailable' }, { status: 503 })
  }
}
