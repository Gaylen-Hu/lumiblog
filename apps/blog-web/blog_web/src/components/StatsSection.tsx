'use client'

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
  const stats = [
    { label: '文章数量', value: articleCount, suffix: '+' },
    { label: '项目经验', value: yearsOfExperience, suffix: ' 年' },
    { label: '开源贡献', value: openSourceCount, suffix: '+' },
    { label: '技术分享', value: talkCount, suffix: '+' },
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
