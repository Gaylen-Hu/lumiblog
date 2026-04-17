import Image from 'next/image'
import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { getArticleBySlug, getArticleSlugs, toApiLocale } from '@/lib/api'
import { parseTocItems, slugify } from '@/lib/toc'
import type { Metadata } from 'next'
import ReadingProgress from '@/components/ReadingProgress'
import ArticleToc from '@/components/ArticleToc'
import Comments from '@/components/Comments'
import PrevNextNav from '@/components/PrevNextNav'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'

// 未预生成的 slug 在运行时按需渲染
export const dynamicParams = true
export const dynamic = 'force-dynamic'

interface PostPageProps {
  params: Promise<{ slug: string; locale: string }>
}

export async function generateStaticParams() {
  try {
    const slugs = await getArticleSlugs()
    return slugs.flatMap((slug) => [
      { locale: 'zh', slug },
      { locale: 'en', slug },
    ])
  } catch {
    // API 不可用时返回 mock slugs，运行时按需生成
    return [
      { locale: 'zh', slug: 'future-of-neural-interfaces' },
      { locale: 'en', slug: 'future-of-neural-interfaces' },
    ]
  }
}

export async function generateMetadata({ params }: PostPageProps): Promise<Metadata> {
  const { slug, locale } = await params
  const post = await getArticleBySlug(slug, toApiLocale(locale))
  if (!post) return { title: 'Post not found' }
  return {
    title: post.seo.metaTitle || `${post.title} - NOVA`,
    description: post.seo.metaDescription || post.excerpt || '',
    openGraph: post.seo.ogImage ? { images: [post.seo.ogImage] } : undefined,
  }
}

export default async function PostPage({ params }: PostPageProps) {
  const { slug, locale } = await params
  const [post, t] = await Promise.all([getArticleBySlug(slug, toApiLocale(locale)), getTranslations('posts')])

  if (!post) notFound()

  const tocItems = parseTocItems(post.content)

  return (
    <article className="min-h-screen bg-white dark:bg-slate-950 pb-32 animate-page-fade">
      <ReadingProgress />
      <ArticleToc items={tocItems} />

      <div className="max-w-3xl mx-auto px-6 pt-12">
        <Link
          href="/posts"
          className="group flex items-center gap-2 text-sm font-medium text-gray-400 hover:text-[#111111] dark:hover:text-white transition-colors mb-12"
        >
          <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          {t('backToList')}
        </Link>

        <div className="flex items-center gap-4 mb-6">
          {post.category && (
            <span className="px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[10px] font-bold tracking-widest uppercase rounded-full">
              {post.category.name}
            </span>
          )}
          <div className="flex items-center gap-1.5 text-xs text-gray-400 font-medium">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {post.readTime}
          </div>
        </div>

        <h1 className="text-4xl md:text-6xl font-bold text-[#111111] dark:text-white leading-[1.1] mb-8 tracking-tight">
          {post.title}
        </h1>

        <div className="flex items-center justify-between border-y border-gray-100 dark:border-slate-800 py-6 mb-16">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 overflow-hidden">
              {post.author.avatar && (
                <Image src={post.author.avatar} alt={post.author.name} width={40} height={40} className="w-full h-full object-cover" />
              )}
            </div>
            <div>
              <p className="text-sm font-bold text-[#111111] dark:text-white">{post.author.name}</p>
              <p className="text-xs text-gray-400">
                {t('publishedAt')} {post.publishedAt.split('T')[0]}
              </p>
            </div>
          </div>
        </div>

        <div className="prose prose-lg max-w-none text-[#333333] dark:text-gray-300 leading-relaxed">
          {post.excerpt && (
            <p className="text-xl font-light text-[#555555] dark:text-gray-400 mb-8 leading-relaxed italic border-l-4 border-blue-100 dark:border-blue-900 pl-6">
              {post.excerpt}
            </p>
          )}

          {post.coverImage && (
            <div className="my-12 rounded-[32px] overflow-hidden shadow-xl border border-gray-100 dark:border-slate-800">
              <Image src={post.coverImage} alt={post.title} width={1200} height={800} className="w-full" priority />
            </div>
          )}

          <div className="markdown-content">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeHighlight]}
              components={{
                h1: ({ children, ...props }: React.ComponentPropsWithoutRef<'h1'>) => (
                  <h1 id={slugify(String(children))} {...props}>{children}</h1>
                ),
                h2: ({ children, ...props }: React.ComponentPropsWithoutRef<'h2'>) => (
                  <h2 id={slugify(String(children))} {...props}>{children}</h2>
                ),
                h3: ({ children, ...props }: React.ComponentPropsWithoutRef<'h3'>) => (
                  <h3 id={slugify(String(children))} {...props}>{children}</h3>
                ),
              }}
            >
              {post.content}
            </ReactMarkdown>
          </div>
        </div>

        {post.tags.length > 0 && (
          <div className="mt-16 pt-8 border-t border-gray-100 dark:border-slate-800">
            <div className="flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <span key={tag.id} className="px-4 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-full text-sm font-medium text-gray-600 dark:text-gray-300">
                  #{tag.name}
                </span>
              ))}
            </div>
          </div>
        )}

        <PrevNextNav prevArticle={post.prevArticle} nextArticle={post.nextArticle} />

        <Comments slug={slug} />
      </div>
    </article>
  )
}
