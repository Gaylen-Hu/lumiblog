import { getTranslations } from 'next-intl/server'
import Image from 'next/image'
import { getSiteConfig, getTimeline } from '@/lib/api'
import type { Metadata } from 'next'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.new-universe.cn'

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
    <div className="min-h-screen bg-[#f5f5f3] px-4 py-10 animate-page-fade dark:bg-slate-950 sm:px-6 md:py-14">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 px-1 md:mb-10">
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
          <div className="overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-sm dark:border-white/10 dark:bg-slate-900">
            <div className="divide-y divide-black/[0.06] dark:divide-white/10">
              {entries.map((entry) => (
                <article key={entry.id} className="flex gap-3 p-4 sm:gap-4 sm:p-6">
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
                        <time dateTime={entry.createdAt} className="shrink-0 text-xs text-gray-400">
                          {dateFormatter.format(new Date(entry.createdAt))}
                        </time>
                      </div>

                      {(() => {
                        const title = locale === 'zh' ? entry.titleZh : entry.titleEn
                        const description = locale === 'zh' ? entry.descZh : entry.descEn
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
                        <div
                          className={`mt-3 grid gap-1.5 ${entry.images.length === 1 ? 'max-w-sm grid-cols-1' : 'grid-cols-2 sm:max-w-lg sm:grid-cols-3'}`}
                        >
                          {entry.images.slice(0, 9).map((src, imageIndex) => (
                            <a
                              key={src}
                              href={src}
                              target="_blank"
                              rel="noreferrer"
                              className={`relative block overflow-hidden rounded-md bg-gray-100 dark:bg-slate-800 ${entry.images.length === 1 ? 'aspect-[4/3]' : 'aspect-square'}`}
                            >
                              <Image
                                src={src}
                                alt={`${locale === 'zh' ? entry.titleZh : entry.titleEn} - ${imageIndex + 1}`}
                                fill
                                sizes={
                                  entry.images.length === 1
                                    ? '(max-width: 640px) 75vw, 384px'
                                    : '(max-width: 640px) 36vw, 170px'
                                }
                                className="object-cover transition-transform duration-300 hover:scale-[1.02]"
                              />
                            </a>
                          ))}
                        </div>
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
