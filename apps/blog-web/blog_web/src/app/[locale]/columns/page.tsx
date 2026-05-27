import Image from 'next/image'
import { Link } from '@/i18n/navigation'
import { getPublicColumns } from '@/lib/columns'
import type { Metadata } from 'next'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.new-universe.cn'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  return {
    title: '专栏 - 墨千',
    description: '按主题系列浏览文章专栏',
    alternates: {
      canonical: `${SITE_URL}/${locale}/columns`,
      languages: { zh: `${SITE_URL}/zh/columns`, en: `${SITE_URL}/en/columns` },
    },
  }
}

function truncateDescription(text: string | null, maxLength = 100): string {
  if (!text) return ''
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}

export default async function ColumnsPage() {
  const columns = await getPublicColumns()

  if (columns.length === 0) {
    return (
      <div className="py-12 px-6 md:px-12 lg:px-24 animate-page-fade bg-white dark:bg-slate-950 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <div className="mb-16">
            <h1 className="text-4xl md:text-5xl font-bold mb-6 text-[#111111] dark:text-white">
              专栏
            </h1>
          </div>
          <div className="py-20 text-center">
            <svg
              className="w-12 h-12 text-gray-300 mx-auto mb-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
            <h3 className="text-xl font-bold text-gray-400">暂无专栏</h3>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="py-12 px-6 md:px-12 lg:px-24 animate-page-fade bg-white dark:bg-slate-950 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-16">
          <h1 className="text-4xl md:text-5xl font-bold mb-6 text-[#111111] dark:text-white">
            专栏
          </h1>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-10">
          {columns.map((column) => (
            <Link
              key={column.id}
              href={`/columns/${column.slug}`}
              className="group block rounded-2xl overflow-hidden border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 transition-shadow hover:shadow-lg"
            >
              <div className="aspect-[16/9] relative overflow-hidden bg-gray-100 dark:bg-slate-800">
                {column.coverImage ? (
                  <Image
                    src={column.coverImage}
                    alt={column.title}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <svg
                      className="w-12 h-12 text-gray-300 dark:text-slate-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                      />
                    </svg>
                  </div>
                )}
              </div>

              <div className="p-5">
                <h2 className="text-lg font-bold text-[#111111] dark:text-white mb-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  {column.title}
                </h2>
                {column.description && (
                  <p className="text-sm text-[#555555] dark:text-gray-400 mb-3 line-clamp-3">
                    {truncateDescription(column.description)}
                  </p>
                )}
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  {column.articleCount} 篇文章
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
