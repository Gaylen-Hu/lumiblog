import type { Post, PostDetail } from '@/types'
import type { SiteConfig } from '@/lib/api'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.new-universe.cn'
const ORGANIZATION_ID = `${SITE_URL}/#organization`
const WEBSITE_ID = `${SITE_URL}/#website`

function toAbsoluteUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined
  try {
    return new URL(url, SITE_URL).toString()
  } catch {
    return undefined
  }
}

function JsonLd({ data }: { data: Record<string, unknown> }) {
  // Prevent user-managed content from prematurely terminating the script element.
  const json = JSON.stringify(data).replace(/</g, '\\u003c')
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />
}

/** Site-wide entities shared by all localized pages. */
export function SiteJsonLd({ config }: { config: SiteConfig }) {
  const logo = toAbsoluteUrl(config.logo)
  const sameAs = Object.values(config.socialLinks).filter((url): url is string => Boolean(url))
  const email = config.owner.email || undefined

  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'Organization',
            '@id': ORGANIZATION_ID,
            name: config.siteName,
            url: SITE_URL,
            ...(logo ? { logo } : {}),
            ...(sameAs.length > 0 ? { sameAs } : {}),
            ...(email ? { email } : {}),
          },
          {
            '@type': 'WebSite',
            '@id': WEBSITE_ID,
            url: SITE_URL,
            name: config.siteName,
            description: config.siteDescription,
            inLanguage: ['zh-CN', 'en-US'],
            publisher: { '@id': ORGANIZATION_ID },
          },
        ],
      }}
    />
  )
}

/** Article JSON-LD. Values are sourced from the article rendered on the page. */
export function ArticleJsonLd({ post, locale }: { post: PostDetail; locale: string }) {
  const canonicalUrl = `${SITE_URL}/${locale}/posts/${post.slug}`
  const image = toAbsoluteUrl(post.seo.ogImage || post.coverImage)
  const authorImage = toAbsoluteUrl(post.author.avatar)

  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        '@id': `${canonicalUrl}#article`,
        mainEntityOfPage: { '@type': 'WebPage', '@id': canonicalUrl },
        headline: post.title,
        description: post.seo.metaDescription || post.excerpt || undefined,
        ...(image ? { image: [image] } : {}),
        datePublished: post.publishedAt,
        dateModified: post.updatedAt || post.publishedAt,
        author: {
          '@type': 'Person',
          name: post.author.name,
          ...(authorImage ? { image: authorImage } : {}),
        },
        publisher: { '@id': ORGANIZATION_ID },
        inLanguage: locale === 'zh' ? 'zh-CN' : 'en-US',
        ...(post.tags.length > 0 ? { keywords: post.tags.map((tag) => tag.name).join(', ') } : {}),
      }}
    />
  )
}

/** A collection page only lists articles visibly rendered on that page. */
export function PostsCollectionJsonLd({ posts, locale }: { posts: Post[]; locale: string }) {
  const pageUrl = `${SITE_URL}/${locale}/posts`

  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        '@id': `${pageUrl}#webpage`,
        url: pageUrl,
        name: locale === 'zh' ? '文章' : 'Posts',
        inLanguage: locale === 'zh' ? 'zh-CN' : 'en-US',
        mainEntity: {
          '@type': 'ItemList',
          itemListElement: posts.map((post, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            url: `${SITE_URL}/${locale}/posts/${post.slug}`,
            name: post.title,
          })),
        },
      }}
    />
  )
}

/** Breadcrumb JSON-LD for pages that visibly expose the same navigation path. */
export function BreadcrumbJsonLd({ items }: { items: { name: string; url: string }[] }) {
  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: items.map((item, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: item.name,
          item: item.url,
        })),
      }}
    />
  )
}
