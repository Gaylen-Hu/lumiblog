import Link from 'next/link';
import PostCard from '@/components/PostCard';
import { getArticles } from '@/lib/api';

const PAGE_SIZE = 9;

export const metadata = {
  title: '文章 - NOVA',
  description: '关于软件架构、设计哲学和技术探索的思考集合。',
};

interface PostsPageProps {
  searchParams: Promise<{
    category?: string;
    tag?: string;
    search?: string;
    page?: string;
  }>;
}

export default async function PostsPage({ searchParams }: PostsPageProps) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);

  const articlesRes = await getArticles({
    page,
    pageSize: PAGE_SIZE,
    category: params.category,
    tag: params.tag,
    search: params.search,
  });

  const posts = articlesRes.data;
  const totalPages = Math.ceil(articlesRes.total / PAGE_SIZE);

  // Build base URL for pagination links preserving current filters
  function buildPageUrl(targetPage: number): string {
    const sp = new URLSearchParams();
    if (params.category) sp.set('category', params.category);
    if (params.tag) sp.set('tag', params.tag);
    if (params.search) sp.set('search', params.search);
    if (targetPage > 1) sp.set('page', String(targetPage));
    const qs = sp.toString();
    return qs ? `/posts?${qs}` : '/posts';
  }

  // Active filter label
  const activeFilter = params.category
    ? `分类: ${params.category}`
    : params.tag
      ? `标签: ${params.tag}`
      : params.search
        ? `搜索: ${params.search}`
        : null;

  return (
    <div className="py-12 px-6 md:px-12 lg:px-24 animate-page-fade">
      <div className="max-w-7xl mx-auto">
        <div className="mb-16">
          <h1 className="text-4xl md:text-5xl font-bold mb-6 text-[#111111]">
            文章 & 研究
          </h1>
          <p className="text-xl text-[#555555] max-w-2xl font-light mb-10">
            关于软件架构、设计哲学和技术探索的思考集合。
          </p>

          {activeFilter && (
            <div className="flex items-center gap-3 mb-6">
              <span className="px-3 py-1.5 bg-gray-100 text-gray-600 text-sm rounded-full">
                {activeFilter}
              </span>
              <Link
                href="/posts"
                className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
              >
                清除筛选
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
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <h3 className="text-xl font-bold text-gray-400">暂无文章</h3>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <nav className="flex items-center justify-center gap-4 mt-16">
            {page > 1 ? (
              <Link
                href={buildPageUrl(page - 1)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 hover:text-[#111111] transition-colors"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
                上一页
              </Link>
            ) : (
              <span className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-300 cursor-not-allowed">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
                上一页
              </span>
            )}

            <span className="text-sm text-gray-500">
              {page} / {totalPages}
            </span>

            {page < totalPages ? (
              <Link
                href={buildPageUrl(page + 1)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 hover:text-[#111111] transition-colors"
              >
                下一页
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </Link>
            ) : (
              <span className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-300 cursor-not-allowed">
                下一页
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </span>
            )}
          </nav>
        )}
      </div>
    </div>
  );
}
