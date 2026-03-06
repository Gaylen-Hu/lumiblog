# SEO 优化方案

**调研日期：** 2026-03-06  
**调研人：** Scout 🔍

---

## 一、Next.js SEO 核心方案

### 1. Metadata API (App Router)

Next.js 13+ 提供强大的 Metadata API，支持静态和动态 meta 标签生成。

#### 静态 Meta 标签
```typescript
// app/layout.tsx
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: {
    default: '我的博客',
    template: '%s | 我的博客',
  },
  description: '分享技术文章和心得',
  keywords: ['技术博客', 'Next.js', 'React', '编程'],
  authors: [{ name: '作者名', url: 'https://your-site.com' }],
  creator: '作者名',
  publisher: '我的博客',
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
  verification: {
    google: 'your-google-verification-code',
    yandex: 'your-yandex-verification-code',
  },
}
```

#### 动态 Meta 标签（文章详情页）
```typescript
// app/(blog)/[slug]/page.tsx
import type { Metadata } from 'next'
import { getPostBySlug } from '@/lib/content'

type Props = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const post = await getPostBySlug(slug)
  
  if (!post) {
    return {
      title: '文章未找到',
    }
  }
  
  return {
    title: post.title,
    description: post.excerpt,
    keywords: post.tags,
    authors: [{ name: post.author }],
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: 'article',
      publishedTime: post.date,
      authors: [post.author],
      images: [
        {
          url: post.coverImage,
          width: 1200,
          height: 630,
          alt: post.title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.excerpt,
      images: [post.coverImage],
    },
  }
}
```

---

## 二、Sitemap 生成方案

### 1. 动态 Sitemap (推荐)
```typescript
// app/sitemap.ts
import { MetadataRoute } from 'next'
import { getAllPosts } from '@/lib/content'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://your-site.com'
  const posts = await getAllPosts()
  
  // 静态页面
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
  ]
  
  // 动态文章页面
  const postPages: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${baseUrl}/blog/${post.slug}`,
    lastModified: new Date(post.date),
    changeFrequency: 'monthly',
    priority: 0.7,
  }))
  
  // 分类页面
  const categoryPages: MetadataRoute.Sitemap = [
    // 从数据库或配置获取分类
    {
      url: `${baseUrl}/categories/tech`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.6,
    },
  ]
  
  // 标签页面
  const tagPages: MetadataRoute.Sitemap = [
    // 从数据库或配置获取标签
    {
      url: `${baseUrl}/tags/nextjs`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.5,
    },
  ]
  
  return [...staticPages, ...postPages, ...categoryPages, ...tagPages]
}
```

### 2. Sitemap 索引（大型站点）
```typescript
// app/sitemap.ts
import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: 'https://your-site.com/sitemap-posts.xml',
      lastModified: new Date(),
    },
    {
      url: 'https://your-site.com/sitemap-pages.xml',
      lastModified: new Date(),
    },
    {
      url: 'https://your-site.com/sitemap-categories.xml',
      lastModified: new Date(),
    },
  ]
}
```

---

## 三、Robots.txt 生成

```typescript
// app/robots.ts
import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/admin/',
          '/_next/',
          '/*.json$',
        ],
      },
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow: ['/admin/'],
      },
    ],
    sitemap: 'https://your-site.com/sitemap.xml',
  }
}
```

---

## 四、结构化数据 (JSON-LD)

### 1. 文章结构化数据
```typescript
// components/blog/ArticleJsonLd.tsx
interface ArticleJsonLdProps {
  title: string
  description: string
  datePublished: string
  dateModified: string
  author: string
  image: string
}

export function ArticleJsonLd({
  title,
  description,
  datePublished,
  dateModified,
  author,
  image,
}: ArticleJsonLdProps) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description: description,
    image: image,
    datePublished: datePublished,
    dateModified: dateModified,
    author: {
      '@type': 'Person',
      name: author,
    },
    publisher: {
      '@type': 'Organization',
      name: '我的博客',
      logo: {
        '@type': 'ImageObject',
        url: 'https://your-site.com/logo.png',
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `https://your-site.com/blog/${title}`,
    },
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  )
}

// 在文章页面使用
// <ArticleJsonLd {...post} />
```

### 2. 网站结构化数据
```typescript
// components/WebsiteJsonLd.tsx
export function WebsiteJsonLd() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: '我的博客',
    url: 'https://your-site.com',
    potentialAction: {
      '@type': 'SearchAction',
      target: 'https://your-site.com/search?q={search_term_string}',
      'query-input': 'required name=search_term_string',
    },
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  )
}
```

### 3. Breadcrumb 结构化数据
```typescript
// components/BreadcrumbJsonLd.tsx
interface BreadcrumbJsonLdProps {
  items: Array<{
    position: number
    name: string
    item: string
  }>
}

export function BreadcrumbJsonLd({ items }: BreadcrumbJsonLdProps) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map(item => ({
      '@type': 'ListItem',
      position: item.position,
      name: item.name,
      item: item.item,
    })),
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  )
}
```

---

## 五、SEO 最佳实践清单

### 技术 SEO
- [ ] 使用语义化 HTML 标签 (`<article>`, `<header>`, `<nav>`, `<main>`, `<footer>`)
- [ ] 确保 H1 标签唯一且包含关键词
- [ ] 使用正确的标题层级 (H1 → H2 → H3)
- [ ] 所有图片添加 `alt` 属性
- [ ] 实现响应式设计（移动端友好）
- [ ] 页面加载速度优化（Core Web Vitals）
- [ ] 使用 HTTPS
- [ ] 实现 canonical URL

### 内容 SEO
- [ ] 每篇文章有独特的 title 和 description
- [ ] 标题包含目标关键词（50-60 字符）
- [ ] Meta description 吸引人且包含关键词（150-160 字符）
- [ ] URL 简洁且包含关键词（使用 slug）
- [ ] 内容质量高、原创、有价值
- [ ] 内部链接合理（相关文章推荐）
- [ ] 添加目录（Table of Contents）提升用户体验

### 社交分享优化
- [ ] Open Graph 标签（Facebook, LinkedIn）
- [ ] Twitter Card 标签
- [ ] 分享图片尺寸正确（1200x630）

---

## 六、Next.js Image 优化

```typescript
// 使用 Next.js 内置图片优化
import Image from 'next/image'

<Image
  src="/images/cover.jpg"
  alt="文章封面"
  width={1200}
  height={630}
  priority  // 首屏图片使用 priority
  sizes="(max-width: 768px) 100vw, 1200px"
  quality={85}
/>
```

---

## 七、性能优化对 SEO 的影响

### Core Web Vitals 指标
| 指标 | 目标值 | 说明 |
|------|--------|------|
| LCP (最大内容绘制) | < 2.5s | 加载性能 |
| FID (首次输入延迟) | < 100ms | 交互性能 |
| CLS (累积布局偏移) | < 0.1 | 视觉稳定性 |

### 优化策略
1. **代码分割** - Next.js 自动进行
2. **图片优化** - 使用 `next/image`
3. **字体优化** - 使用 `next/font`
4. **预加载关键资源** - 使用 `link` 标签
5. **缓存策略** - ISR、SWR

```typescript
// 使用 next/font 优化字体
import { Inter } from 'next/font/google'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

// 在 layout.tsx 中使用
<html className={inter.variable}>
```

---

## 八、SEO 工具推荐

### 测试工具
- [Google Search Console](https://search.google.com/search-console) - 监控搜索表现
- [Google PageSpeed Insights](https://pagespeed.web.dev/) - 性能测试
- [Rich Results Test](https://search.google.com/test/rich-results) - 结构化数据测试
- [Mobile-Friendly Test](https://search.google.com/test/mobile-friendly) - 移动端测试

### 分析工具
- Google Analytics 4
- Ahrefs / SEMrush（关键词研究）
- Screaming Frog（技术 SEO 审计）

---

## 九、参考链接

- [Next.js SEO 官方文档](https://nextjs.org/docs/app/building-your-application/optimizing/metadata)
- [Next.js Sitemap](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap)
- [Google SEO 入门指南](https://developers.google.com/search/docs/fundamentals/seo-starter-guide)
- [Schema.org](https://schema.org/) - 结构化数据词汇
- [Web.dev SEO](https://web.dev/learn/seo/)

---

**调研总结:**
1. Next.js App Router 的 Metadata API 是 SEO 的核心
2. 动态生成 sitemap 和 robots.txt
3. 结构化数据（JSON-LD）提升搜索结果展示
4. Core Web Vitals 影响搜索排名
5. 移动端友好和页面速度至关重要
