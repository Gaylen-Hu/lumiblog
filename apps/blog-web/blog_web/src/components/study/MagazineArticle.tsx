'use client'
import Image from 'next/image'
import { Suspense, type ReactNode } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import type { PostDetail } from '@/types'
import { slugify } from '@/lib/toc'
import ReadingProgress from '@/components/ReadingProgress'
import { ArticleReadingCard } from './ReadingBox'
import Comments from '@/components/Comments'
import PrevNextNav from '@/components/PrevNextNav'
import ColumnNavigation from '@/components/ColumnNavigation'
import { ColumnAttribution } from '@/components/ColumnAttribution'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
export default function MagazineArticle({ post, locale, subscription, catalogHeading }: { post: PostDetail; locale: string; subscription?: ReactNode; catalogHeading?: boolean }) {
  const t = useTranslations('posts')
  const firstContentLine = catalogHeading ? post.content.match(/^\s*/)?.[0].split('\n').length : undefined
  return (
    <article className="magazine-article">
      <ReadingProgress locale={locale} slug={post.slug} title={post.title} hidden />
      <div className="magazine-reading-column">
        {!catalogHeading && <><p className="study-imprint">FROM THE BOOKSHELF / A PAGE TO KEEP</p>
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
          <ArticleReadingCard locale={locale} title={post.title} slug={post.slug} />
        </div>

        <h1 className="text-4xl md:text-6xl font-bold text-[#111111] dark:text-white leading-[1.1] mb-8 tracking-tight">
          {post.title}
        </h1>

        <div className="flex items-center justify-between py-6 mb-12">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 overflow-hidden">
              {post.author.avatar && (
                <Image src={post.author.avatar} alt={post.author.name} width={40} height={40} className="w-full h-full object-cover" />
              )}
            </div>
            <div>
              <Link
                href="/about"
                className="text-sm font-bold text-[#111111] dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                {post.author.name}
              </Link>
              <p className="text-xs text-gray-400">
                {t('publishedAt')} {post.publishedAt.split('T')[0]}
              </p>
            </div>
          </div>
        </div>

        </>}
        {post.columns.length > 0 && <ColumnAttribution columns={post.columns} />}
        <div className="prose prose-lg max-w-none text-[#333333] dark:text-gray-300 leading-relaxed">
          {post.excerpt && !catalogHeading && (
            <p className="magazine-deck">
              {post.excerpt}
            </p>
          )}

          {post.coverImage && (
            <div className="magazine-cover overflow-hidden">
              <Image src={post.coverImage} alt={post.title} width={1200} height={800} className="w-full" priority />
            </div>
          )}

          <div id="post-body" className="markdown-content">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeHighlight]}
              components={{
                h1: ({ node, children, ...props }) => {
                  const id = slugify(String(children))
                  if (catalogHeading && node?.position?.start.line === firstContentLine && String(children).trim() === post.title.trim()) {
                    return <span id={id} aria-hidden="true" />
                  }
                  return <h2 id={id} {...props}>{children}</h2>
                },
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

        {subscription}

        {post.tags.length > 0 && (
          <div className="mt-16 pt-8">
            <div className="flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <span key={tag.id} className="py-2 pr-4 text-sm text-gray-500">
                  #{tag.name}
                </span>
              ))}
            </div>
          </div>
        )}

        <Suspense fallback={null}>
          <ColumnNavigation articleId={post.id} columns={post.columns} />
        </Suspense>

        <PrevNextNav prevArticle={post.prevArticle} nextArticle={post.nextArticle} />

        <Comments slug={post.slug} />
      </div>
    </article>
  )
}
