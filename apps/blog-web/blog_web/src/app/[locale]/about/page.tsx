import { getTranslations } from 'next-intl/server'
import { getSiteConfig, getTimeline } from '@/lib/api'
import type { TimelineEntry } from '@/lib/api'
import dynamic from 'next/dynamic'
import BlurText from '@/components/ui/BlurText'
import ScrollReveal from '@/components/ui/ScrollReveal'

const IconCloud = dynamic(() => import('@/components/IconCloud'), { ssr: false })

export async function generateMetadata() {
  const [config, t] = await Promise.all([getSiteConfig(), getTranslations('about')])
  return {
    title: `${t('title')} - ${config.siteName}`,
    description: config.owner.bio || t('bio1'),
    alternates: { languages: { zh: '/zh/about', en: '/en/about' } },
  }
}

const FALLBACK_TECH_STACK = ['React', 'TypeScript', 'Next.js', 'Node.js', 'Tailwind CSS', 'NestJS']

const FALLBACK_TIMELINE = [
  { year: '2017', titleKey: 'timeline.y2017.title', descKey: 'timeline.y2017.desc' },
  { year: '2019', titleKey: 'timeline.y2019.title', descKey: 'timeline.y2019.desc' },
  { year: '2022', titleKey: 'timeline.y2022.title', descKey: 'timeline.y2022.desc' },
  { year: '2024', titleKey: 'timeline.y2024.title', descKey: 'timeline.y2024.desc' },
  { year: '2025', titleKey: 'timeline.y2025.title', descKey: 'timeline.y2025.desc' },
] as const

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const [config, t, apiTimeline] = await Promise.all([getSiteConfig(), getTranslations('about'), getTimeline()])
  const { owner } = config
  const techStack = owner.techStack.length > 0 ? owner.techStack : FALLBACK_TECH_STACK

  // API 数据优先，降级使用 i18n fallback
  const useApiData = apiTimeline.length > 0
  const timelineItems: { year: string; title: string; desc: string }[] = useApiData
    ? apiTimeline.map((entry: TimelineEntry) => ({
        year: entry.year,
        title: locale === 'zh' ? entry.titleZh : entry.titleEn,
        desc: locale === 'zh' ? entry.descZh : entry.descEn,
      }))
    : FALLBACK_TIMELINE.map(({ year, titleKey, descKey }) => ({
        year,
        title: t(titleKey),
        desc: t(descKey),
      }))

  return (
    <div className="py-12 px-6 md:px-12 lg:px-24 bg-[#F9F9F9] dark:bg-slate-900 min-h-screen animate-page-fade">
      <div className="max-w-7xl mx-auto space-y-32">

        {/* Section 1: Persona */}
        <div className="grid lg:grid-cols-2 gap-20 items-center pt-4">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold text-[#111111] dark:text-white mb-8 leading-tight">
              <BlurText text={t('tagline1')} delay={60} className="block" />
              <BlurText text={`${t('tagline2')}${t('tagline3')}${t('tagline4')}`} delay={60} className="block" />
            </h2>
            <div className="space-y-6 text-[#555555] dark:text-gray-400 leading-relaxed text-lg font-light">
              {owner.bio ? (
                owner.bio.split('\n').map((paragraph, i) => (
                  <p key={i}>{paragraph}</p>
                ))
              ) : (
                <>
                  <p>{t('bio1')}</p>
                  <p>{t('bio2')}</p>
                  <p>{t('bio3')}</p>
                </>
              )}
            </div>

            <div className="mt-12">
              <h4 className="text-[10px] font-bold text-[#111111] dark:text-white uppercase tracking-[0.2em] mb-6">
                {t('techStack')}
              </h4>
              <div className="flex flex-wrap gap-3">
                {techStack.map((tech) => (
                  <span
                    key={tech}
                    className="px-4 py-2 bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-full text-sm font-medium text-gray-600 dark:text-gray-300"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-4">
              <div className="aspect-square rounded-3xl overflow-hidden shadow-sm group">
                <img
                  src="https://picsum.photos/400/400?random=20"
                  alt="Hobby 1"
                  className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700"
                />
              </div>
              <div className="aspect-[3/4] rounded-3xl overflow-hidden shadow-sm bg-blue-600 flex items-end p-8 text-white relative group">
                <div className="z-10 relative">
                  <span className="text-xs font-bold uppercase tracking-widest opacity-60">{t('interest')}</span>
                  <h4 className="text-2xl font-bold mt-2">{t('architecture')}</h4>
                </div>
              </div>
            </div>
            <div className="space-y-4 pt-12">
              <div className="aspect-[3/4] rounded-3xl overflow-hidden shadow-sm bg-[#111111] p-8 text-white group">
                <div className="h-full flex flex-col justify-between">
                  <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center group-hover:rotate-12 transition-transform text-2xl">
                    ☕️
                  </div>
                  <div>
                    <span className="text-xs font-bold uppercase tracking-widest opacity-40">{t('daily')}</span>
                    <h4 className="text-2xl font-bold mt-2">{t('morningCoffee')}</h4>
                  </div>
                </div>
              </div>
              <div className="aspect-square rounded-3xl overflow-hidden shadow-sm group">
                <img
                  src="https://picsum.photos/400/400?random=22"
                  alt="Hobby 2"
                  className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Tech Stack with IconCloud */}
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div className="order-2 lg:order-1">
            <IconCloud />
          </div>
          <div className="space-y-8 order-1 lg:order-2">
            <h2 className="text-3xl md:text-4xl font-bold text-[#111111] dark:text-white tracking-tight">
              {t('techUniverse')}
            </h2>
            <div className="grid gap-4">
              <div className="p-6 rounded-2xl bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700">
                <h4 className="text-xs font-mono text-blue-500 uppercase tracking-widest mb-3">Frontend Core</h4>
                <div className="flex flex-wrap gap-2">
                  {['Vue 3', 'Pinia', 'Next.js', 'React'].map((tag) => (
                    <span key={tag} className="px-3 py-1 rounded-full bg-gray-50 dark:bg-slate-700 border border-gray-100 dark:border-slate-600 text-sm text-gray-600 dark:text-gray-300">{tag}</span>
                  ))}
                </div>
              </div>
              <div className="p-6 rounded-2xl bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700">
                <h4 className="text-xs font-mono text-emerald-500 uppercase tracking-widest mb-3">Cross-Platform</h4>
                <div className="flex flex-wrap gap-2">
                  {['UniApp', 'Electron', 'HarmonyOS'].map((tag) => (
                    <span key={tag} className="px-3 py-1 rounded-full bg-gray-50 dark:bg-slate-700 border border-gray-100 dark:border-slate-600 text-sm text-gray-600 dark:text-gray-300">{tag}</span>
                  ))}
                </div>
              </div>
              <div className="p-6 rounded-2xl bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700">
                <h4 className="text-xs font-mono text-purple-500 uppercase tracking-widest mb-3">Full-Stack</h4>
                <div className="flex flex-wrap gap-2">
                  {['NestJS', 'Redis', 'PostgreSQL', 'JWT'].map((tag) => (
                    <span key={tag} className="px-3 py-1 rounded-full bg-gray-50 dark:bg-slate-700 border border-gray-100 dark:border-slate-600 text-sm text-gray-600 dark:text-gray-300">{tag}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Timeline */}
        <div className="space-y-12">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold text-[#111111] dark:text-white tracking-tight mb-3">
              {t('timeline.title')}
            </h2>
            <p className="text-[#555555] dark:text-gray-400">{t('timeline.subtitle')}</p>
          </div>

          <div className="relative">
            <div className="absolute left-0 top-0 bottom-0 w-px bg-gradient-to-b from-blue-500 via-blue-300 to-transparent opacity-30 hidden md:block" />
            <div className="space-y-10">
              {timelineItems.map(({ year, title, desc }, i) => (
                <ScrollReveal key={year} delay={i * 0.1} direction="left">
                  <div className="relative md:pl-12 group">
                    <div className="absolute left-[-4px] top-2 w-2 h-2 rounded-full bg-blue-500 hidden md:block group-hover:scale-150 transition-transform" />
                    <div className="flex flex-col md:flex-row gap-4 md:gap-12">
                      <span className="text-2xl font-mono font-bold text-gray-300 dark:text-gray-600 group-hover:text-blue-500 transition-colors shrink-0">
                        {year}
                      </span>
                      <div className="space-y-1">
                        <h3 className="text-lg font-bold text-[#111111] dark:text-white">{title}</h3>
                        <p className="text-[#555555] dark:text-gray-400 leading-relaxed font-light">{desc}</p>
                      </div>
                    </div>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
