'use client'

import { usePathname, useRouter } from '@/i18n/navigation'
import { Link } from '@/i18n/navigation'
import { useTranslations } from 'next-intl'
import { useEffect, useState } from 'react'
import HeaderControls from './HeaderControls'
import Logo from './Logo'

interface HeaderProps {
  siteName?: string
}

export default function Header({ siteName = '墨千' }: HeaderProps) {
  const pathname = usePathname()
  const router = useRouter()
  const t = useTranslations('nav')
  const ts = useTranslations('search')
  const tRoot = useTranslations()
  const [isScrolled, setIsScrolled] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // 根据当前语言显示对应博客名
  const displayName = tRoot('siteName')

  const navItems = [
    { name: t('home'), href: '/' },
    { name: t('posts'), href: '/posts' },
    { name: t('projects'), href: '/projects' },
    { name: t('timeline'), href: '/timeline' },
    { name: t('about'), href: '/about' },
  ]

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // 路由变化时关闭移动菜单
  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [pathname])

  function handleSearch() {
    const q = searchQuery.trim()
    if (!q) return
    router.push(`/posts?search=${encodeURIComponent(q)}`)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') handleSearch()
    if (e.key === 'Escape') {
      setSearchQuery('')
      e.currentTarget.blur()
    }
  }

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
            className="flex items-center gap-2 text-[#111111] dark:text-white hover:opacity-80 transition-opacity"
            aria-label={displayName}
          >
            <Logo height={28} />
            <span className="text-xl font-bold tracking-tight">
              {displayName}<span className="text-blue-500">.</span>
            </span>
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
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 cursor-pointer"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              onClick={handleSearch}
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              placeholder={ts('placeholder')}
              className="pl-10 pr-4 py-1.5 text-sm bg-gray-100/50 dark:bg-gray-800/50 border border-transparent rounded-full focus:bg-white dark:focus:bg-gray-900 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900 focus:border-blue-300 dark:focus:border-blue-700 outline-none transition-all w-48 md:w-64"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>
          <HeaderControls />
          {/* 移动端汉堡按钮 */}
          <button
            className="md:hidden w-8 h-8 flex items-center justify-center rounded-full text-gray-500 dark:text-gray-400 hover:text-[#111111] dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
            onClick={() => setIsMobileMenuOpen(prev => !prev)}
            aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={isMobileMenuOpen}
          >
            {isMobileMenuOpen ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* 移动端菜单面板 */}
      {isMobileMenuOpen && (
        <nav className="md:hidden frosted-glass border-t border-gray-200/50 dark:border-slate-700/50">
          <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col gap-1">
            {navItems.map((item) => {
              const isActive =
                item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'text-[#111111] dark:text-white bg-gray-100/80 dark:bg-slate-800/80'
                      : 'text-[#555555] dark:text-gray-400 hover:text-[#111111] dark:hover:text-white hover:bg-gray-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  {item.name}
                </Link>
              )
            })}
            {/* 移动端搜索框 */}
            <div className="relative mt-2 sm:hidden">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 cursor-pointer"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                onClick={handleSearch}
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="text"
                placeholder={ts('placeholder')}
                className="w-full pl-10 pr-4 py-2 text-sm bg-gray-100/50 dark:bg-gray-800/50 border border-transparent rounded-full focus:bg-white dark:focus:bg-gray-900 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900 focus:border-blue-300 dark:focus:border-blue-700 outline-none transition-all"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
              />
            </div>
          </div>
        </nav>
      )}
    </header>
  )
}
