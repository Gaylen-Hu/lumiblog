'use client'

import { Link } from '@/i18n/navigation'
import { useEffect, useState } from 'react'
import type { ColumnArticleNavDto } from '@/types/column'

interface ColumnNavigationProps {
  articleId: string
  columns: { id: string; title: string; slug: string }[]
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/v1/public'

export default function ColumnNavigation({ articleId, columns }: ColumnNavigationProps) {
  const [navData, setNavData] = useState<ColumnArticleNavDto | null>(null)

  const columnSlug = columns.length > 0 ? columns[0].slug : null

  useEffect(() => {
    if (!columnSlug) return

    let cancelled = false

    async function fetchNav() {
      try {
        const res = await fetch(
          `${API_BASE_URL}/columns/${columnSlug}/nav/${articleId}`,
        )
        if (!res.ok) return
        const data: ColumnArticleNavDto = await res.json()
        if (!cancelled) setNavData(data)
      } catch {
        // API 失败时静默隐藏
      }
    }

    fetchNav()
    return () => { cancelled = true }
  }, [columnSlug, articleId])

  if (!columnSlug || !navData) return null

  return (
    <nav className="mt-12 p-5 rounded-xl border border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/50">
      <div className="flex items-center gap-2 mb-4">
        <svg
          className="w-4 h-4 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
          />
        </svg>
        <Link
          href={`/columns/${navData.columnSlug}`}
          className="text-sm font-semibold text-[#111111] dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
        >
          {navData.columnTitle}
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* 上一篇 */}
        <div>
          {navData.prev ? (
            <Link
              href={`/posts/${navData.prev.slug}`}
              className="group flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-[#111111] dark:hover:text-white transition-colors"
            >
              <svg
                className="w-3.5 h-3.5 flex-shrink-0 group-hover:-translate-x-0.5 transition-transform"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
              <span className="line-clamp-1">{navData.prev.title}</span>
            </Link>
          ) : (
            <span className="flex items-center gap-2 text-sm text-gray-300 dark:text-gray-600 cursor-not-allowed">
              <svg
                className="w-3.5 h-3.5 flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
              <span>无上一篇</span>
            </span>
          )}
        </div>

        {/* 下一篇 */}
        <div className="text-right">
          {navData.next ? (
            <Link
              href={`/posts/${navData.next.slug}`}
              className="group inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-[#111111] dark:hover:text-white transition-colors"
            >
              <span className="line-clamp-1">{navData.next.title}</span>
              <svg
                className="w-3.5 h-3.5 flex-shrink-0 group-hover:translate-x-0.5 transition-transform"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M14 5l7 7m0 0l-7 7m7-7H3"
                />
              </svg>
            </Link>
          ) : (
            <span className="inline-flex items-center gap-2 text-sm text-gray-300 dark:text-gray-600 cursor-not-allowed">
              <span>无下一篇</span>
              <svg
                className="w-3.5 h-3.5 flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M14 5l7 7m0 0l-7 7m7-7H3"
                />
              </svg>
            </span>
          )}
        </div>
      </div>
    </nav>
  )
}
