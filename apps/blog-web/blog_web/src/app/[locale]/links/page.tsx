import type { Metadata } from 'next'
import { getLocale, getTranslations } from 'next-intl/server'
import { FriendLinkApplicationForm } from '@/components/FriendLinkApplicationForm'
import { getFriendLinks } from '@/lib/api'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.new-universe.cn'
export async function generateMetadata(): Promise<Metadata> { const locale = await getLocale(); const zh = locale === 'zh'; return { title: zh ? '友情链接 - 墨千' : 'Friends - Byte & Beyond', description: zh ? '值得长期访问的独立博客、创作者与产品。' : 'Independent blogs, creators, and products worth returning to.', alternates: { canonical: `${SITE_URL}/${locale}/links`, languages: { zh: `${SITE_URL}/zh/links`, en: `${SITE_URL}/en/links` } } } }

export default async function FriendsPage() {
  const [t, locale, links] = await Promise.all([getTranslations('friends'), getLocale(), getFriendLinks()]); const zh = locale === 'zh'
  return <div className="min-h-screen bg-white px-6 py-16 dark:bg-slate-950 md:px-12 lg:px-24"><div className="mx-auto max-w-6xl">
    <header className="max-w-2xl"><p className="mb-4 text-[11px] font-bold uppercase tracking-[0.22em] text-blue-600 dark:text-blue-400">{t('eyebrow')}</p><h1 className="text-4xl font-bold tracking-tight text-[#111111] dark:text-white md:text-6xl">{t('title')}</h1><p className="mt-6 text-lg font-light leading-relaxed text-[#555555] dark:text-gray-400">{t('description')}</p></header>
    {links.length ? <div className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{links.map((friend) => <a key={friend.id} href={friend.siteUrl} target="_blank" rel="noopener noreferrer" className="group rounded-3xl border border-gray-100 bg-white p-7 transition-all hover:-translate-y-1 hover:border-blue-100 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900"><div className="flex items-start justify-between"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-sm font-bold text-blue-600 dark:bg-blue-900/30">{friend.siteName.slice(0, 2).toUpperCase()}</span><span className="text-gray-300 group-hover:text-blue-500">↗</span></div><h2 className="mt-7 text-xl font-bold text-slate-900 group-hover:text-blue-600 dark:text-white">{friend.siteName}</h2><p className="mt-3 text-sm leading-relaxed text-gray-500 dark:text-gray-400">{friend.description}</p></a>)}</div> : <section className="mt-16 rounded-3xl border border-dashed border-gray-200 bg-gray-50/60 px-8 py-12 text-center dark:border-slate-800 dark:bg-slate-900/40"><h2 className="text-xl font-bold text-slate-900 dark:text-white">{t('emptyTitle')}</h2><p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-gray-500">{t('emptyDescription')}</p></section>}
    <FriendLinkApplicationForm locale={locale} /><p className="mt-12 text-xs text-gray-400">{zh ? '每一条链接都来自真实、长期的内容交流。' : 'Every link is a genuine, long-term editorial connection.'}</p>
  </div></div>
}
