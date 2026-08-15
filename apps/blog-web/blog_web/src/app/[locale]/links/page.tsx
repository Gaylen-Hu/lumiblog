import type { Metadata } from 'next'
import { getLocale, getTranslations } from 'next-intl/server'
import { FRIEND_LINKS } from '@/config/friends'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.new-universe.cn'

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale()
  const title = locale === 'zh' ? '友情链接 - 墨千' : 'Friends - Byte & Beyond'
  const description = locale === 'zh'
    ? '记录值得长期访问的独立博客、创作者与产品。'
    : 'Independent blogs, creators, and products worth returning to.'

  return {
    title,
    description,
    alternates: {
      canonical: `${SITE_URL}/${locale}/links`,
      languages: { zh: `${SITE_URL}/zh/links`, en: `${SITE_URL}/en/links` },
    },
    robots: { index: FRIEND_LINKS.length > 0, follow: true },
  }
}

export default async function FriendsPage() {
  const [t, locale] = await Promise.all([getTranslations('friends'), getLocale()])
  const isChinese = locale === 'zh'

  return (
    <div className="min-h-screen bg-white px-6 py-16 dark:bg-slate-950 md:px-12 lg:px-24">
      <div className="mx-auto max-w-6xl">
        <header className="max-w-2xl">
          <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.22em] text-blue-600 dark:text-blue-400">{t('eyebrow')}</p>
          <h1 className="text-4xl font-bold tracking-tight text-[#111111] dark:text-white md:text-6xl">{t('title')}</h1>
          <p className="mt-6 text-lg font-light leading-relaxed text-[#555555] dark:text-gray-400">{t('description')}</p>
        </header>

        {FRIEND_LINKS.length > 0 ? (
          <div className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FRIEND_LINKS.map((friend) => (
              <a key={friend.url} href={friend.url} target="_blank" rel="noopener noreferrer" className="group rounded-3xl border border-gray-100 bg-white p-7 transition-all duration-300 hover:-translate-y-1 hover:border-blue-100 hover:shadow-[0_18px_50px_rgba(15,23,42,0.08)] dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-900/60 dark:hover:shadow-[0_18px_50px_rgba(0,0,0,0.2)]">
                <div className="flex items-start justify-between gap-4">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-sm font-bold tracking-tight text-blue-600 dark:bg-blue-900/30 dark:text-blue-300">{friend.initials}</span>
                  <svg className="mt-1 h-4 w-4 text-gray-300 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-blue-500 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M7 17L17 7M8 7h9v9" /></svg>
                </div>
                <h2 className="mt-7 text-xl font-bold text-[#111111] transition-colors group-hover:text-blue-600 dark:text-white dark:group-hover:text-blue-400">{friend.name}</h2>
                <p className="mt-3 text-sm leading-relaxed text-gray-500 dark:text-gray-400">{friend.description}</p>
                <div className="mt-6 flex flex-wrap gap-2">{friend.tags.map((tag) => <span key={tag} className="rounded-full bg-gray-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:bg-slate-800 dark:text-gray-500">{tag}</span>)}</div>
              </a>
            ))}
          </div>
        ) : (
          <section className="mt-16 rounded-3xl border border-dashed border-gray-200 bg-gray-50/60 px-8 py-16 text-center dark:border-slate-800 dark:bg-slate-900/40 md:px-16">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-blue-500 shadow-sm dark:bg-slate-800"><svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-4-4h-1m-10 6H2v-2a4 4 0 014-4h1m10-4a4 4 0 11-8 0 4 4 0 018 0zM7 10a4 4 0 100-8 4 4 0 000 8z" /></svg></div>
            <h2 className="mt-5 text-xl font-bold text-[#111111] dark:text-white">{t('emptyTitle')}</h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-gray-500 dark:text-gray-400">{t('emptyDescription')}</p>
            <p className="mt-8 text-sm font-medium text-gray-600 dark:text-gray-300">{t('exchangePrompt')}</p>
            <p className="mt-2 text-xs leading-relaxed text-gray-400 dark:text-gray-500">{t('exchangeHint')}</p>
          </section>
        )}
        <p className="mt-12 text-xs text-gray-400 dark:text-gray-500">{isChinese ? '每一条链接都来自真实、长期的内容交流。' : 'Every link is a genuine, long-term editorial connection.'}</p>
      </div>
    </div>
  )
}