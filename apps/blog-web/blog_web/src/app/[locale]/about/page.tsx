import { getTranslations } from 'next-intl/server'
import { getSiteConfig } from '@/lib/api'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const [config, t] = await Promise.all([getSiteConfig(), getTranslations('about')])
  return {
    title: `${t('title')} - ${config.siteName}`,
    description: config.owner.bio || `了解更多关于 ${config.owner.name} 的信息。`,
    alternates: { languages: { zh: '/zh/about', en: '/en/about' } },
  }
}

const FALLBACK_TECH_STACK = ['React', 'TypeScript', 'Next.js', 'Node.js', 'Tailwind CSS', 'NestJS']

export default async function AboutPage() {
  const [config, t] = await Promise.all([getSiteConfig(), getTranslations('about')])
  const { owner } = config
  const techStack = owner.techStack.length > 0 ? owner.techStack : FALLBACK_TECH_STACK

  return (
    <div className="py-12 px-6 md:px-12 lg:px-24 bg-[#F9F9F9] dark:bg-slate-900 min-h-screen animate-page-fade">
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-20 items-center">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold text-[#111111] dark:text-white mb-8 leading-tight">
              {t('tagline1')}
              <br />
              {t('tagline2')}<span className="text-blue-600">{t('tagline3')}</span>{t('tagline4')}
            </h2>
            <div className="space-y-6 text-[#555555] dark:text-gray-400 leading-relaxed text-lg font-light">
              {owner.bio ? (
                owner.bio.split('\n').map((paragraph, i) => (
                  <p key={i}>{paragraph}</p>
                ))
              ) : (
                <>
                  <p>我是一名数字工匠，拥有超过 6 年的产品构建经验，专注于弥合人类情感与机器逻辑之间的鸿沟。</p>
                  <p>目前，我正在探索 AI 驱动界面与程序化几何的交叉领域。</p>
                  <p>当我不在代码编辑器前时，你会发现我在探索山间小径、拍摄粗野主义建筑，或者冲泡一杯完美的手冲咖啡。</p>
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
      </div>
    </div>
  )
}
