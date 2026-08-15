import Image from 'next/image'
import { getTranslations } from 'next-intl/server'

export default async function ArticleSubscription() {
  const t = await getTranslations('subscription')

  return (
    <aside
      aria-labelledby="article-subscription-title"
      className="relative my-14 overflow-hidden rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:border-blue-900/50 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950/40"
    >
      <div className="absolute -left-10 -top-10 h-32 w-32 rounded-full bg-blue-200/30 blur-3xl dark:bg-blue-500/10" />
      <div className="relative grid items-center gap-8 p-8 md:grid-cols-[minmax(0,1fr)_auto] md:p-10">
        <div>
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400">
            {t('eyebrow')}
          </p>
          <h2 id="article-subscription-title" className="text-2xl font-bold tracking-tight text-[#111111] dark:text-white">
            {t('title')}
          </h2>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-gray-600 dark:text-gray-400">
            {t('description')}
          </p>
          <p className="mt-5 flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-300">↗</span>
            {t('hint')}
          </p>
        </div>

        <div className="mx-auto rounded-2xl bg-white p-3 shadow-[0_18px_50px_rgba(37,99,235,0.12)] dark:bg-white">
          <Image
            src="/byte-beyond-qrcode.jpg"
            alt={t('qrAlt')}
            width={136}
            height={136}
            className="h-[136px] w-[136px] rounded-lg"
          />
          <p className="mt-2 text-center text-[10px] font-medium tracking-wide text-gray-400">
            {t('qrLabel')}
          </p>
        </div>
      </div>
    </aside>
  )
}