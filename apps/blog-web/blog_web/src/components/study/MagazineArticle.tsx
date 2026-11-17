'use client'
import Image from 'next/image'
import { Suspense, useEffect, useRef, type ReactNode } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import type { PostDetail } from '@/types'
import ReadingProgress from '@/components/ReadingProgress'
import { ArticleReadingCard } from './ReadingBox'
import Comments from '@/components/Comments'
import PrevNextNav from '@/components/PrevNextNav'
import ColumnNavigation from '@/components/ColumnNavigation'
import { ColumnAttribution } from '@/components/ColumnAttribution'
import { registerWebsiteArticle } from '../companion/website-context'
export default function MagazineArticle({ post, locale, subscription, catalogHeading, children }: { post: Omit<PostDetail, 'content'>; children: ReactNode; locale: string; subscription?: ReactNode; catalogHeading?: boolean }) {
  const t = useTranslations('posts')
  const article = useRef<HTMLElement>(null)
  useEffect(() => {
    if (!article.current || (locale !== 'zh' && locale !== 'en')) return
    return registerWebsiteArticle({ slug: post.slug, title: post.title, locale }, article.current)
  }, [post.slug, post.title, locale])
  return (
    <article ref={article} className="magazine-article">
      <ReadingProgress locale={locale} slug={post.slug} title={post.title} hidden />
      <div className="magazine-reading-column">
        {!catalogHeading && <><p className="study-imprint">FROM THE BOOKSHELF / A PAGE TO KEEP</p>
        <div className="flex items-center gap-4 mb-3 md:mb-6">
          {post.category && (
            <span className="px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[10px] font-bold tracking-widest uppercase rounded-full">
              {post.category.name}
            </span>
          )}
          <div className="flex items-center gap-1.5 text-xs text-gray-600 font-medium">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {post.readTime}
          </div>
          <ArticleReadingCard locale={locale} title={post.title} slug={post.slug} />
        </div>

        <h1 className="text-3xl md:text-6xl font-bold text-[#111111] dark:text-white leading-[1.1] mb-4 md:mb-8 tracking-tight">
          {post.title}
        </h1>

        <div className="flex items-center justify-between py-2 mb-4 md:py-6 md:mb-12">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 overflow-hidden">
              {post.author.avatar && (
                <Image src={post.author.avatar} alt={post.author.name} width={40} height={40} className="w-full h-full object-cover" />
              )}
            </div>
            <div>
              <Link
                href="/about"
                className="inline-flex min-h-6 min-w-6 items-center text-sm font-bold text-[#111111] dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                {post.author.name}
              </Link>
              <p className="text-xs text-gray-600">
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
              <Image src={post.coverImage} alt={post.title} width={1200} height={800} className="w-full" sizes="(max-width: 828px) 100vw, 828px" />
            </div>
          )}

          {children}
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

        <div data-website-comments tabIndex={-1} aria-label={locale === 'en' ? 'Article comments' : '文章评论'}>
          <Comments slug={post.slug} />
        </div>
      </div>
    </article>
  )
}
