import { getArticles, getProjects, getSiteConfig, getTimeline, toApiLocale } from '@/lib/api'
import StudyRoom from '@/components/study/StudyRoom'
import type { Metadata } from 'next'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.new-universe.cn'
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  return { alternates: { canonical: `${SITE_URL}/${locale}`, languages: { zh: `${SITE_URL}/zh`, en: `${SITE_URL}/en` } } }
}

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const [posts, projects, timeline, config] = await Promise.all([
    getArticles({ pageSize: 24, locale: toApiLocale(locale) }),
    getProjects({ pageSize: 8 }), getTimeline(), getSiteConfig(),
  ])
  return <StudyRoom locale={locale} posts={posts.data} projects={projects.data} timeline={timeline}
    name={config.owner.name === 'Site Owner' ? config.siteName : config.owner.name}
    bio={config.owner.bio || config.siteDescription} />
}
