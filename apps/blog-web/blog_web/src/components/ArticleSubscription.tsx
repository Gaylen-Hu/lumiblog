import Image from 'next/image'
import { getTranslations } from 'next-intl/server'

export default async function ArticleSubscription() {
  const t = await getTranslations('subscription')

  return (
    <aside
      aria-labelledby="article-subscription-title"
      className="magazine-panel relative my-14 overflow-hidden"
    >
      <div className="relative grid items-center gap-8 border-t border-[#e4dac7] p-8 md:grid-cols-[minmax(0,1fr)_auto] md:p-10">
        <div>
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.2em] text-[#806849]">
            {t('eyebrow')}
          </p>
          <h2 id="article-subscription-title" className="text-2xl font-bold tracking-tight text-[#39352f]">
            {t('title')}
          </h2>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-[#665c4f]">
            {t('description')}
          </p>
          <p className="mt-5 flex items-center gap-2 text-xs font-medium text-[#706351]">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#efe7d8] text-[#735c3d]">↗</span>
            {t('hint')}
          </p>
        </div>

        <div className="mx-auto p-3">
          <Image
            src="/byte-beyond-qrcode.jpg"
            alt={t('qrAlt')}
            width={136}
            height={136}
            className="h-[136px] w-[136px] rounded-lg"
          />
          <p className="mt-2 text-center text-[11px] font-medium tracking-wide text-[#706351]">
            {t('qrLabel')}
          </p>
        </div>
      </div>
    </aside>
  )
}