import Image from 'next/image'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getPublicColumnBySlug } from '@/lib/columns'
import type { Metadata } from 'next'

interface ColumnDetailPageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({
  params,
}: ColumnDetailPageProps): Promise<Metadata> {
  const { slug } = await params
  // 标记为 noindex，引导 Google 使用带 locale 的规范 URL
  return {
    robots: { index: false, follow: true },
    alternates: {
      canonical: `https://www.new-universe.cn/zh/columns/${slug}`,
    },
  }
}

export default async function ColumnDetailPage({
  params,
}: ColumnDetailPageProps) {
  const { slug } = await params
  const column = await getPublicColumnBySlug(slug)

  if (!column) notFound()

  return (
    <div className="py-12 px-6 md:px-12 lg:px-24 animate-page-fade bg-white dark:bg-slate-950 min-h-screen">
      <div className="max-w-4xl mx-auto">
        {/* Back link */}
        <Link
          href="/columns"
          className="group flex items-center gap-2 text-sm font-medium text-gray-400 hover:text-[#111111] dark:hover:text-white transition-colors mb-12"
        >
          <svg
            className="w-4 h-4 group-hover:-translate-x-1 transition-transform"
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
          返回专栏列表
        </Link>

        {/* Column header */}
        <header className="mb-12">
          {column.coverImage && (
            <div className="mb-8 rounded-2xl overflow-hidden border border-gray-100 dark:border-slate-800">
              <Image
                src={column.coverImage}
                alt={column.title}
                width={1200}
                height={400}
                className="w-full h-48 md:h-64 object-cover"
                priority
              />
            </div>
          )}

          <h1 className="text-3xl md:text-4xl font-bold text-[#111111] dark:text-white mb-4">
            {column.title}
          </h1>

          {column.description && (
            <p className="text-lg text-gray-600 dark:text-gray-400 leading-relaxed">
              {column.description}
            </p>
          )}

          <div className="mt-4 text-sm text-gray-400">
            共 {column.articles.length} 篇文章
          </div>
        </header>

        {/* Article list */}
        {column.articles.length > 0 ? (
          <ol className="space-y-6">
            {column.articles.map((article, index) => (
              <li key={article.id}>
                <Link
                  href={`/posts/${article.slug}?column=${slug}`}
                  className="group block p-6 rounded-xl border border-gray-100 dark:border-slate-800 hover:border-gray-200 dark:hover:border-slate-700 hover:shadow-sm transition-all"
                >
                  <div className="flex items-start gap-4">
                    <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 dark:bg-slate-800 text-sm font-medium text-gray-500 dark:text-gray-400">
                      {index + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <h2 className="text-lg font-semibold text-[#111111] dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {article.title}
                      </h2>
                      {article.summary && (
                        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                          {article.summary}
                        </p>
                      )}
                      <time className="mt-2 block text-xs text-gray-400">
                        {new Date(article.publishedAt).toLocaleDateString(
                          'zh-CN',
                          {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          },
                        )}
                      </time>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ol>
        ) : (
          <div className="py-20 text-center">
            <svg
              className="w-12 h-12 text-gray-300 dark:text-slate-600 mx-auto mb-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <p className="text-gray-400 dark:text-gray-500">暂无已发布文章</p>
          </div>
        )}
      </div>
    </div>
  )
}
