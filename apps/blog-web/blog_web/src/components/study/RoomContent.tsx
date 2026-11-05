import { getArticles, getProjects, getSiteConfig, getTimeline, toApiLocale } from '@/lib/api'
import { getPublicColumns } from '@/lib/columns'
import StudyRoomEntry from './StudyRoomEntry'

export default async function RoomContent({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const [posts, projects, timeline, config, columns] = await Promise.all([
    getArticles({ pageSize: 24, locale: toApiLocale(locale) }),
    getProjects({ pageSize: 8 }), getTimeline(), getSiteConfig(), getPublicColumns(),
  ])
  return <StudyRoomEntry data={{ locale, posts: posts.data, projects: projects.data, timeline, columns,
    name: config.owner.name === 'Site Owner' ? config.siteName : config.owner.name,
    bio: config.owner.bio || config.siteDescription }} />
}
