import { notFound } from 'next/navigation'
import { getArticleBySlug, toApiLocale } from '@/lib/api'
import type { Metadata } from 'next'
import { ArticleJsonLd, BreadcrumbJsonLd } from '@/components/JsonLd'
import ArticleSubscription from '@/components/ArticleSubscription'
import ArticleMarkdown from '@/components/study/ArticleMarkdown'
import MagazineArticle from '@/components/study/MagazineArticle'

// 未预生成的 slug 在运行时按需渲染
export const dynamicParams = true
// Article data comes from the CMS running alongside the deployed application.
// Do not try to statically generate article detail pages during CI, where that
// API is intentionally unavailable; a failed render would otherwise surface as
// an index-blocking 500 response for crawlers.
export const dynamic = 'force-dynamic'

interface PostPageProps {
  params: Promise<{ slug: string; locale: string }>
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.new-universe.cn'

export async function generateMetadata({ params }: PostPageProps): Promise<Metadata> {
  const { slug, locale } = await params
  const post = await getArticleBySlug(slug, toApiLocale(locale))
  if (!post) return { title: locale === 'en' ? 'Article not found' : '文章不存在', robots: { index: false }, alternates: null }

  const title = post.seo.metaTitle || `${post.title} - 墨千`
  const description = post.seo.metaDescription || post.excerpt || ''
  const canonical = `${SITE_URL}/${locale}/posts/${encodeURIComponent(slug)}`
  const languages: Record<string, string> = { [locale]: canonical }
  for (const translation of post.translations ?? []) {
    const route = translation.locale === 'zh-CN' ? 'zh' : translation.locale === 'en-US' ? 'en' : null
    if (route && route !== locale) languages[route] = `${SITE_URL}/${route}/posts/${encodeURIComponent(translation.slug)}`
  }
  const ogImage = post.seo.ogImage || post.coverImage || undefined

  return {
    title,
    description,
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    alternates: {
      canonical,
      languages: Object.keys(languages).length > 1 ? languages : undefined,
    },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: '墨千',
      type: 'article',
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt || undefined,
      authors: [post.author.name],
      ...(ogImage ? { images: [{ url: ogImage, width: 1200, height: 630, alt: post.title }] } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      ...(ogImage ? { images: [ogImage] } : {}),
    },
  }
}

export default async function PostPage({ params }: PostPageProps) {
  const { slug, locale } = await params
  const post = await getArticleBySlug(slug, toApiLocale(locale))

  if (!post) notFound()
  const { content, ...details } = post

  return <>
    <ArticleJsonLd post={post} locale={locale} />
    <BreadcrumbJsonLd items={[
      { name: '首页', url: `${SITE_URL}/${locale}` },
      { name: '文章', url: `${SITE_URL}/${locale}/posts` },
      { name: post.title, url: `${SITE_URL}/${locale}/posts/${encodeURIComponent(slug)}` },
    ]} />
    <MagazineArticle post={details} locale={locale} subscription={<ArticleSubscription />}>
      <ArticleMarkdown content={content} title={post.title} />
    </MagazineArticle>
  </>
}
