import type { Post, PostDetail } from '@/types'
import type { SiteConfig } from '@/lib/api'
import {
  AUTHOR_ID,
  AUTHOR_KNOWS_ABOUT,
  AUTHOR_NAME,
  AUTHOR_PROFILE_URL,
  BRAND_NAME,
  BRAND_NAME_EN,
  BRAND_NAME_ZH,
  ORGANIZATION_ID,
  SITE_URL,
  WEBSITE_ID,
} from '@/lib/site-identity'

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
  const authorName = config.owner.name?.trim() || AUTHOR_NAME
  const authorImage = toAbsoluteUrl(config.owner.avatar)

  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'Organization',
            '@id': ORGANIZATION_ID,
            name: BRAND_NAME,
            alternateName: [BRAND_NAME_ZH, BRAND_NAME_EN],
            url: SITE_URL,
            ...(logo ? { logo } : {}),
            ...(sameAs.length > 0 ? { sameAs } : {}),
            ...(email ? { email } : {}),
            founder: { '@id': AUTHOR_ID },
          },
          {
            '@type': 'Person',
            '@id': AUTHOR_ID,
            name: authorName,
            url: AUTHOR_PROFILE_URL,
            ...(authorImage ? { image: authorImage } : {}),
            ...(sameAs.length > 0 ? { sameAs } : {}),
            knowsAbout: AUTHOR_KNOWS_ABOUT,
          },
          {
            '@type': 'WebSite',
            '@id': WEBSITE_ID,
            url: SITE_URL,
            name: BRAND_NAME,
            alternateName: [BRAND_NAME_ZH, BRAND_NAME_EN],
            description: config.siteDescription,
            inLanguage: ['zh-CN', 'en-US'],
            publisher: { '@id': ORGANIZATION_ID },
            author: { '@id': AUTHOR_ID },
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
  const isSiteOwner = post.author.name.trim() === AUTHOR_NAME

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
          ...(isSiteOwner ? { '@id': AUTHOR_ID, url: AUTHOR_PROFILE_URL } : {}),
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

/** ProfilePage markup for the visible author biography on the About page. */
export function ProfilePageJsonLd({ locale }: { locale: string }) {
  const pageUrl = `${SITE_URL}/${locale}/about`

  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'ProfilePage',
        '@id': `${pageUrl}#profile-page`,
        url: pageUrl,
        inLanguage: locale === 'zh' ? 'zh-CN' : 'en-US',
        mainEntity: { '@id': AUTHOR_ID },
        isPartOf: { '@id': WEBSITE_ID },
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
