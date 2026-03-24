import { Link } from '@/i18n/navigation'
import type { ArticleNavItem } from '@/types'

interface PrevNextNavProps {
  prevArticle?: ArticleNavItem | null
  nextArticle?: ArticleNavItem | null
}

export default function PrevNextNav({ prevArticle, nextArticle }: PrevNextNavProps) {
  if (!prevArticle && !nextArticle) return null

  return (
    <div className="mt-12 pt-8 border-t border-gray-100 dark:border-slate-800">
      <div className="grid grid-cols-2 gap-4">
        {/* 左侧：上一篇 */}
        <div>
          {prevArticle ? (
            <Link
              href={`/posts/${prevArticle.slug}`}
              className="group flex flex-col gap-1 p-4 rounded-xl border border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/50 hover:border-gray-300 dark:hover:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
            >
              <span className="text-xs font-medium text-gray-400 dark:text-gray-500 flex items-center gap-1">
                <svg className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                上一篇
              </span>
              <span className="text-sm font-semibold text-[#111111] dark:text-white line-clamp-2 leading-snug">
                {prevArticle.title}
              </span>
            </Link>
          ) : null}
        </div>

        {/* 右侧：下一篇 */}
        <div>
          {nextArticle ? (
            <Link
              href={`/posts/${nextArticle.slug}`}
              className="group flex flex-col gap-1 p-4 rounded-xl border border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/50 hover:border-gray-300 dark:hover:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors text-right"
            >
              <span className="text-xs font-medium text-gray-400 dark:text-gray-500 flex items-center justify-end gap-1">
                下一篇
                <svg className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </span>
              <span className="text-sm font-semibold text-[#111111] dark:text-white line-clamp-2 leading-snug">
                {nextArticle.title}
              </span>
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  )
}
