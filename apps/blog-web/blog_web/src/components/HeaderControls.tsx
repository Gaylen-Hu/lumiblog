'use client'

import { useTheme } from 'next-themes'
import { useLocale, useTranslations } from 'next-intl'
import { usePathname, useRouter } from '@/i18n/navigation'
import { useEffect, useState } from 'react'

export default function HeaderControls() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const locale = useLocale()
  const t = useTranslations()
  const pathname = usePathname()
  const router = useRouter()

  // 防止 hydration 闪烁
  useEffect(() => setMounted(true), [])

  function toggleLocale() {
    router.replace(pathname, { locale: locale === 'zh' ? 'en' : 'zh' })
  }

  return (
    <div className="flex items-center gap-2">
      {/* 语言切换 */}
      <button
        onClick={toggleLocale}
        className="px-3 py-1.5 text-xs font-bold tracking-wider text-gray-500 dark:text-gray-400 hover:text-[#111111] dark:hover:text-white border border-gray-200 dark:border-slate-700 rounded-full transition-colors"
        aria-label={t('lang.toggle')}
      >
        {t('lang.toggle')}
      </button>

      {/* 主题切换 */}
      {mounted ? (
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="w-8 h-8 flex items-center justify-center rounded-full text-gray-500 dark:text-gray-400 hover:text-[#111111] dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
          aria-label={t('theme.toggle')}
        >
          {theme === 'dark' ? (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
              />
            </svg>
          )}
        </button>
      ) : (
        <div className="w-8 h-8" />
      )}
    </div>
  )
}
