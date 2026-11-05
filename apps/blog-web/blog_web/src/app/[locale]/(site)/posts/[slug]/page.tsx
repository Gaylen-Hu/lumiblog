import { notFound } from 'next/navigation'
import { getArticleBySlug, getArticleSlugs, toApiLocale } from '@/lib/api'
import type { Metadata } from 'next'
import { ArticleJsonLd, BreadcrumbJsonLd } from '@/components/JsonLd'
import ArticleSubscription from '@/components/ArticleSubscription'
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

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.new-universe.cn'

export async function generateMetadata({ params }: PostPageProps): Promise<Metadata> {
  const { slug, locale } = await params
  const post = await getArticleBySlug(slug, toApiLocale(locale))
  if (!post) return { title: 'Post not found' }

  const title = post.seo.metaTitle || `${post.title} - 墨千`
  const description = post.seo.metaDescription || post.excerpt || ''
  const canonical = `${SITE_URL}/${locale}/posts/${slug}`
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
      languages: {
        zh: `${SITE_URL}/zh/posts/${slug}`,
        en: `${SITE_URL}/en/posts/${slug}`,
      },
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

  return <>
    <ArticleJsonLd post={post} locale={locale} />
    <BreadcrumbJsonLd items={[
      { name: '首页', url: `${SITE_URL}/${locale}` },
      { name: '文章', url: `${SITE_URL}/${locale}/posts` },
      { name: post.title, url: `${SITE_URL}/${locale}/posts/${slug}` },
    ]} />
    <MagazineArticle post={post} locale={locale} subscription={<ArticleSubscription />} />
  </>
}
