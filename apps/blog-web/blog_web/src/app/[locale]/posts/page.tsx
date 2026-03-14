import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import PostCard from '@/components/PostCard'
import { getArticles } from '@/lib/api'

const PAGE_SIZE = 9

interface PostsPageProps {
  searchParams: Promise<{
    category?: string
    tag?: string
    search?: string
    page?: string
  }>
}

export default async function PostsPage({ searchParams }: PostsPageProps) {
  const [params, t] = await Promise.all([searchParams, getTranslations('posts')])
  const page = Math.max(1, Number(params.page) || 1)

  const articlesRes = await getArticles({
    page,
    pageSize: PAGE_SIZE,
    category: params.category,
    tag: params.tag,
    search: params.search,
  })

  const posts = articlesRes.data
  const totalPages = Math.ceil(articlesRes.total / PAGE_SIZE)

  function buildPageUrl(targetPage: number): string {
    const sp = new URLSearchParams()
    if (params.category) sp.set('category', params.category)
    if (params.tag) sp.set('tag', params.tag)
    if (params.search) sp.set('search', params.search)
    if (targetPage > 1) sp.set('page', String(targetPage))
    const qs = sp.toString()
    return qs ? `/posts?${qs}` : '/posts'
  }

  const activeFilter = params.category
    ? `${t('filterCategory')}: ${params.category}`
    : params.tag
      ? `${t('filterTag')}: ${params.tag}`
      : params.search
        ? `${t('filterSearch')}: ${params.search}`
        : null

  return (
    <div className="py-12 px-6 md:px-12 lg:px-24 animate-page-fade bg-white dark:bg-slate-950 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-16">
          <h1 className="text-4xl md:text-5xl font-bold mb-6 text-[#111111] dark:text-white">
            {t('title')}
          </h1>

          {activeFilter && (
            <div className="flex items-center gap-3 mb-6">
              <span className="px-3 py-1.5 bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 text-sm rounded-full">
                {activeFilter}
              </span>
              <Link href="/posts" className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
                {t('clearFilter')}
              </Link>
            </div>
          )}
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>

        {posts.length === 0 && (
          <div className="py-20 text-center">
            <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <h3 className="text-xl font-bold text-gray-400">{t('noPostsFound')}</h3>
          </div>
        )}

        {totalPages > 1 && (
          <nav className="flex items-center justify-center gap-4 mt-16">
            {page > 1 ? (
              <Link href={buildPageUrl(page - 1)} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-[#111111] dark:hover:text-white transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                {t('prevPage')}
              </Link>
            ) : (
              <span className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-300 cursor-not-allowed">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                {t('prevPage')}
              </span>
            )}
            <span className="text-sm text-gray-500">{page} / {totalPages}</span>
            {page < totalPages ? (
              <Link href={buildPageUrl(page + 1)} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-[#111111] dark:hover:text-white transition-colors">
                {t('nextPage')}
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            ) : (
              <span className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-300 cursor-not-allowed">
                {t('nextPage')}
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </span>
            )}
          </nav>
        )}
      </div>
    </div>
  )
}
