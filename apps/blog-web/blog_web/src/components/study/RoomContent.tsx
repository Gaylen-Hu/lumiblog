import { getArticles, getProjects, getSiteConfig, getTimeline, toApiLocale } from '@/lib/api'
import { getPublicColumns } from '@/lib/columns'
import { getTranslations } from 'next-intl/server'
import StudyRoomEntry from './StudyRoomEntry'

export default async function RoomContent({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const [posts, projects, timeline, config, columns, t] = await Promise.all([
    getArticles({ pageSize: 24, locale: toApiLocale(locale) }),
    getProjects({ pageSize: 8 }), getTimeline(), getSiteConfig(), getPublicColumns(), getTranslations({ locale }),
  ])
  return <StudyRoomEntry data={{ locale, siteName: t('siteName'), posts: posts.data, projects: projects.data, timeline, columns,
    name: config.owner.name === 'Site Owner' ? config.siteName : config.owner.name,
    bio: t('about.profile.postcard'), birthdayLine: t('about.profile.birthdayLine') }} />
}
