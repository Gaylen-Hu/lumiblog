import { getTranslations } from 'next-intl/server'
import ScrollReveal from '@/components/ui/ScrollReveal'
import { getTimeline } from '@/lib/api'

export default async function TimelinePage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const [t, entries] = await Promise.all([getTranslations('timeline'), getTimeline()])

  return (
    <div className="py-12 px-6 md:px-12 lg:px-24 animate-page-fade bg-white dark:bg-slate-950 min-h-screen">
      <div className="max-w-3xl mx-auto">
        <div className="mb-16">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-[#111111] dark:text-white">
            {t('title')}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-lg">{t('subtitle')}</p>
        </div>

        {entries.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-gray-400 text-lg">{t('empty')}</p>
          </div>
        ) : (
          <div className="relative">
            {/* 竖线 */}
            <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-200 dark:bg-slate-700" />

            <div className="space-y-12">
              {entries.map((entry, i) => (
                <ScrollReveal key={entry.id} delay={i * 0.08} direction="up">
                  <div className="relative pl-14">
                    {/* 圆点 */}
                    <div className="absolute left-0 top-1.5 w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold shadow-md">
                      {entry.year.slice(-2)}
                    </div>

                    <div className="bg-gray-50 dark:bg-slate-900 rounded-2xl p-6 border border-gray-100 dark:border-slate-800 hover:border-blue-200 dark:hover:border-blue-800 transition-colors">
                      <span className="text-xs font-semibold text-blue-500 uppercase tracking-widest mb-2 block">
                        {entry.year}
                      </span>
                      <h3 className="text-xl font-bold text-[#111111] dark:text-white mb-2">
                        {locale === 'zh' ? entry.titleZh : entry.titleEn}
                      </h3>
                      <p className="text-gray-500 dark:text-gray-400 leading-relaxed">
                        {locale === 'zh' ? entry.descZh : entry.descEn}
                      </p>
                    </div>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
