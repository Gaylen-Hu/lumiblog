'use client'

import { useEffect } from 'react'
import { Link } from '@/i18n/navigation'

export default function PostError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Post page error:', error)
  }, [error])

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 flex items-center justify-center">
      <div className="text-center px-6">
        <p className="text-sm font-medium text-gray-400 mb-4">出了点问题</p>
        <h1 className="text-4xl font-bold text-[#111111] dark:text-white mb-6">无法加载文章</h1>
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={reset}
            className="px-6 py-2.5 bg-[#111111] dark:bg-white text-white dark:text-[#111111] rounded-full text-sm font-medium hover:opacity-80 transition-opacity"
          >
            重试
          </button>
          <Link
            href="/posts"
            className="px-6 py-2.5 border border-gray-200 dark:border-slate-700 rounded-full text-sm font-medium text-gray-600 dark:text-gray-300 hover:opacity-80 transition-opacity"
          >
            返回列表
          </Link>
        </div>
      </div>
    </div>
  )
}
