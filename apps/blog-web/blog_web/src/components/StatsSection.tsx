'use client'

import { useTranslations } from 'next-intl'
import AnimatedCounter from './ui/AnimatedCounter'

interface StatsSectionProps {
  articleCount: number
  yearsOfExperience: number
  openSourceCount: number
  talkCount: number
}

export default function StatsSection({
  articleCount,
  yearsOfExperience,
  openSourceCount,
  talkCount,
}: StatsSectionProps) {
  const t = useTranslations('stats')

  const allZero =
    articleCount === 0 &&
    yearsOfExperience === 0 &&
    openSourceCount === 0 &&
    talkCount === 0

  if (allZero) return null

  const stats = [
    { label: t('articles'), value: articleCount, suffix: '+' },
    { label: t('experience'), value: yearsOfExperience, suffix: '+' },
    { label: t('openSource'), value: openSourceCount, suffix: '+' },
    { label: t('talks'), value: talkCount, suffix: '+' },
  ]

  return (
    <section className="py-20 px-6 md:px-12 lg:px-24 bg-[#111111] dark:bg-slate-900">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-4xl md:text-5xl font-bold text-white mb-2">
                <AnimatedCounter value={stat.value} duration={2000} />
                <span>{stat.suffix}</span>
              </div>
              <div className="text-gray-400 text-sm font-medium uppercase tracking-wider">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
