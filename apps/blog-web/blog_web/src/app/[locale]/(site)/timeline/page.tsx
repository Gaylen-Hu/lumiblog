import { getTranslations } from 'next-intl/server'
import Image from 'next/image'
import TimelineMedia from '@/components/media/TimelineMedia'
import { noteText } from '@/components/study/desk-notes'
import { getSiteConfig, getTimeline } from '@/lib/api'
import type { Metadata } from 'next'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.new-universe.cn'

function formatTimelineDate(
  createdAt: string | undefined,
  fallbackYear: string,
  formatter: Intl.DateTimeFormat,
) {
  if (!createdAt) return fallbackYear

  const date = new Date(createdAt)
  return Number.isNaN(date.getTime()) ? fallbackYear : formatter.format(date)
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  return {
    title: '时间线 - 墨千',
    description: '技术成长历程与里程碑',
    alternates: {
      canonical: `${SITE_URL}/${locale}/timeline`,
      languages: { zh: `${SITE_URL}/zh/timeline`, en: `${SITE_URL}/en/timeline` },
    },
  }
}

export default async function TimelinePage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const [t, entries, config] = await Promise.all([
    getTranslations('timeline'),
    getTimeline(),
    getSiteConfig(),
  ])
  const authorName =
    config.owner.name && config.owner.name !== 'Site Owner' ? config.owner.name : '胡新宇'
  const dateFormatter = new Intl.DateTimeFormat(locale === 'zh' ? 'zh-CN' : 'en-US', {
    year: 'numeric',
    month: locale === 'zh' ? 'long' : 'short',
    day: 'numeric',
  })

  return (
    <div className="magazine-page magazine-journal">
      <div className="mx-auto max-w-2xl">
        <div className="magazine-heading">
          <p className="study-imprint">A JOURNAL OF ORDINARY DAYS</p>
          <h1 className="mb-2 text-3xl font-bold text-[#111111] dark:text-white md:text-4xl">
            {t('title')}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{t('subtitle')}</p>
        </div>

        {entries.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-gray-400 text-lg">{t('empty')}</p>
          </div>
        ) : (
          <div className="magazine-panel">
            <div className="space-y-8">
              {entries.map((entry) => (
                <article id={`day-${entry.id}`} key={entry.id} className="scroll-mt-24 flex gap-3 p-4 sm:gap-4 sm:p-6">
                  <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 shadow-sm">
                    {config.owner.avatar ? (
                      <Image
                        src={config.owner.avatar}
                        alt={authorName}
                        fill
                        sizes="44px"
                        className="object-cover"
                      />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center text-base font-semibold text-white">
                        {authorName.slice(0, 1)}
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                      <div className="mb-2 flex items-baseline justify-between gap-3">
                        <span className="font-semibold text-[#526a8a] dark:text-blue-300">{authorName}</span>
                        <time
                          dateTime={entry.createdAt}
                          className="shrink-0 text-xs text-gray-400"
                        >
                          {formatTimelineDate(entry.createdAt, entry.year, dateFormatter)}
                        </time>
                      </div>

                      {(() => {
                        const {title,body:description} = noteText(entry,locale === 'en')
                        const showDescription = description.trim() && description.trim() !== title.trim()
                        return (
                          <>
                            <p className="whitespace-pre-wrap break-words text-[15px] leading-7 text-gray-900 dark:text-gray-100">
                              {title}
                            </p>
                            {showDescription && (
                              <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-gray-600 dark:text-gray-400">
                                {description}
                              </p>
                            )}
                          </>
                        )
                      })()}

                      {entry.images.length > 0 && (
                        <TimelineMedia urls={entry.images} en={locale === 'en'}
                          title={locale === 'en' ? entry.titleEn || entry.titleZh : entry.titleZh}
                          date={formatTimelineDate(entry.createdAt, entry.year, dateFormatter)} />
                      )}
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
