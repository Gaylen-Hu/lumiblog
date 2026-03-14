'use client'

import { usePathname } from '@/i18n/navigation'
import { Link } from '@/i18n/navigation'
import { useTranslations } from 'next-intl'
import { useEffect, useState } from 'react'
import HeaderControls from './HeaderControls'

interface HeaderProps {
  siteName?: string
}

export default function Header({ siteName = 'NOVA' }: HeaderProps) {
  const pathname = usePathname()
  const t = useTranslations('nav')
  const ts = useTranslations('search')
  const [isScrolled, setIsScrolled] = useState(false)

  const navItems = [
    { name: t('home'), href: '/' },
    { name: t('posts'), href: '/posts' },
    { name: t('projects'), href: '/projects' },
    { name: t('about'), href: '/about' },
  ]

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <header
      className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${
        isScrolled
          ? 'frosted-glass border-b border-gray-200/50 dark:border-slate-700/50 py-3'
          : 'bg-transparent py-6'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 md:px-12 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link
            href="/"
            className="text-xl font-bold tracking-tight text-[#111111] dark:text-white"
          >
            {siteName}<span className="text-blue-500">.</span>
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            {navItems.map((item) => {
              const isActive =
                item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`text-sm font-medium transition-colors relative group px-1 ${
                    isActive
                      ? 'text-[#111111] dark:text-white'
                      : 'text-[#555555] dark:text-gray-400 hover:text-[#111111] dark:hover:text-white'
                  }`}
                >
                  {item.name}
                  <span
                    className={`absolute -bottom-1 left-0 h-0.5 bg-blue-500 transition-all ${
                      isActive ? 'w-full' : 'w-0 group-hover:w-full'
                    }`}
                  />
                </Link>
              )
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative hidden sm:block">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              placeholder={ts('placeholder')}
              className="pl-10 pr-4 py-1.5 text-sm bg-gray-100/50 dark:bg-gray-800/50 border border-transparent rounded-full focus:bg-white dark:focus:bg-gray-900 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900 focus:border-blue-300 dark:focus:border-blue-700 outline-none transition-all w-48 md:w-64"
            />
          </div>
          <HeaderControls />
        </div>
      </div>
    </header>
  )
}
