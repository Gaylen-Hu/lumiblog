import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getArticleBySlug, getArticleSlugs } from '@/lib/api';
import type { Metadata } from 'next';
import ReadingProgress from '@/components/ReadingProgress';
import Comments from '@/components/Comments';

interface PostPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const slugs = await getArticleSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: PostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getArticleBySlug(slug);

  if (!post) {
    return { title: '文章未找到' };
  }

  return {
    title: post.seo.metaTitle || `${post.title} - NOVA`,
    description: post.seo.metaDescription || post.excerpt || '',
    openGraph: post.seo.ogImage ? { images: [post.seo.ogImage] } : undefined,
  };
}

export default async function PostPage({ params }: PostPageProps) {
  const { slug } = await params;
  const post = await getArticleBySlug(slug);

  if (!post) {
    notFound();
  }

  return (
    <article className="min-h-screen bg-white pb-32 animate-page-fade">
      <ReadingProgress />

      <div className="max-w-3xl mx-auto px-6 pt-12">
        <Link
          href="/posts"
          className="group flex items-center gap-2 text-sm font-medium text-gray-400 hover:text-[#111111] transition-colors mb-12"
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
          返回文章列表
        </Link>

        <div className="flex items-center gap-4 mb-6">
          {post.category && (
            <span className="px-3 py-1 bg-blue-50 text-blue-600 text-[10px] font-bold tracking-widest uppercase rounded-full">
              {post.category.name}
            </span>
          )}
          <div className="flex items-center gap-1.5 text-xs text-gray-400 font-medium">
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            {post.readTime}
          </div>
        </div>

        <h1 className="text-4xl md:text-6xl font-bold text-[#111111] leading-[1.1] mb-8 tracking-tight">
          {post.title}
        </h1>

        <div className="flex items-center justify-between border-y border-gray-100 py-6 mb-16">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 overflow-hidden">
              {post.author.avatar && (
                <Image
                  src={post.author.avatar}
                  alt={post.author.name}
                  width={40}
                  height={40}
                  className="w-full h-full object-cover"
                />
              )}
            </div>
            <div>
              <p className="text-sm font-bold text-[#111111]">{post.author.name}</p>
              <p className="text-xs text-gray-400">
                {new Date(post.publishedAt).toLocaleDateString('zh-CN', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button className="p-2 hover:bg-gray-50 rounded-full transition-colors text-gray-400 hover:text-[#111111]">
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                />
              </svg>
            </button>
            <button className="p-2 hover:bg-gray-50 rounded-full transition-colors text-gray-400 hover:text-[#111111]">
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Article Body Content */}
        <div className="prose prose-lg max-w-none text-[#333333] leading-relaxed">
          {post.excerpt && (
            <p className="text-xl font-light text-[#555555] mb-8 leading-relaxed italic border-l-4 border-blue-100 pl-6">
              {post.excerpt}
            </p>
          )}

          {post.coverImage && (
            <div className="my-12 rounded-[32px] overflow-hidden shadow-xl border border-gray-100">
              <Image
                src={post.coverImage}
                alt={post.title}
                width={1200}
                height={800}
                className="w-full"
                priority
              />
            </div>
          )}

          {post.content.split('\n\n').map((para, i) => {
            if (para.startsWith('### ')) {
              return (
                <h2
                  key={i}
                  className="text-2xl font-bold mt-12 mb-6 text-[#111111]"
                >
                  {para.replace('### ', '')}
                </h2>
              );
            }
            return (
              <p key={i} className="mb-8">
                {para}
              </p>
            );
          })}
        </div>

        {/* Tags */}
        {post.tags.length > 0 && (
          <div className="mt-16 pt-8 border-t border-gray-100">
            <div className="flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <span
                  key={tag.id}
                  className="px-4 py-2 bg-gray-50 border border-gray-100 rounded-full text-sm font-medium text-gray-600"
                >
                  #{tag.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Comments */}
        <Comments slug={slug} />
      </div>
    </article>
  );
}
