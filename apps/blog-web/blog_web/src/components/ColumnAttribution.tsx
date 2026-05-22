import { Fragment } from 'react'
import { Link } from '@/i18n/navigation'

interface ColumnAttributionProps {
  columns: { id: string; title: string; slug: string }[]
}

export function ColumnAttribution({ columns }: ColumnAttributionProps) {
  if (columns.length === 0) return null

  return (
    <div className="flex items-center gap-2 mb-6">
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
      {columns.map((col, i) => (
        <Fragment key={col.id}>
          {i > 0 && <span className="text-gray-300 dark:text-gray-600">·</span>}
          <Link
            href={`/columns/${col.slug}`}
            className="text-sm font-semibold text-[#111111] dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            {col.title}
          </Link>
        </Fragment>
      ))}
    </div>
  )
}
