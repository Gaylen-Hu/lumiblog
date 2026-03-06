# 多语言实现方案 (i18n)

**调研日期：** 2026-03-06  
**调研人：** Scout 🔍

---

## 一、Next.js i18n 方案对比

### 方案 1：next-intl (推荐 ⭐⭐⭐⭐⭐)
- **GitHub:** https://github.com/amannn/next-intl
- **适用:** Next.js 13+ App Router
- **特点:**
  - 专为 App Router 设计
  - 支持 React Server Components
  - 类型安全
  - 活跃的社区维护
  - 简洁的 API

### 方案 2：next-i18next
- **GitHub:** https://github.com/i18next/next-i18next
- **适用:** Next.js Pages Router（App Router 支持有限）
- **特点:**
  - 基于 i18next 生态
  - 成熟稳定
  - 丰富的插件
  - 但 App Router 支持不如 next-intl

### 方案 3：next-translate
- **GitHub:** https://github.com/vinissimus/next-translate
- **适用:** Next.js 12+
- **特点:**
  - 简单易用
  - 支持 SSR
  - 社区较小

---

## 二、推荐方案：next-intl 实现

### 1. 安装依赖
```bash
npm install next-intl
```

### 2. 项目结构
```
apps/blog-web/
├── app/
│   ├── [locale]/                    # 语言路由
│   │   ├── (blog)/
│   │   │   ├── [slug]/
│   │   │   │   └── page.tsx
│   │   │   └── page.tsx
│   │   ├── about/
│   │   │   └── page.tsx
│   │   ├── layout.tsx
│   │   └── page.tsx
│   └── layout.tsx                   # Root Layout
├── messages/                        # 翻译文件
│   ├── zh-CN.json
│   ├── en-US.json
│   └── ja-JP.json
├── i18n.ts                          # i18n 配置
├── middleware.ts                    # 语言检测中间件
└── next.config.ts
```

### 3. 配置文件

#### i18n.ts
```typescript
// i18n.ts
import { getRequestConfig } from 'next-intl/server'

export const locales = ['zh-CN', 'en-US', 'ja-JP'] as const
export type Locale = (typeof locales)[number]

export const defaultLocale: Locale = 'zh-CN'

export default getRequestConfig(async ({ locale }) => ({
  messages: (await import(`./messages/${locale}.json`)).default,
}))
```

#### next.config.ts
```typescript
// next.config.ts
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin()

/** @type {import('next').NextConfig} */
const nextConfig = {}

export default withNextIntl(nextConfig)
```

#### middleware.ts
```typescript
// middleware.ts
import createMiddleware from 'next-intl/middleware'
import { locales, defaultLocale } from './i18n'

export default createMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'as-needed', // 默认语言不显示前缀
})

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
}
```

### 4. 翻译文件

#### messages/zh-CN.json
```json
{
  "Common": {
    "home": "首页",
    "about": "关于",
    "blog": "博客",
    "search": "搜索",
    "readMore": "阅读更多",
    "publishedAt": "发布于",
    "readingTime": "阅读时间"
  },
  "Home": {
    "title": "我的博客",
    "subtitle": "分享技术文章和心得",
    "latestPosts": "最新文章",
    "viewAll": "查看全部"
  },
  "Article": {
    "tableOfContents": "目录",
    "share": "分享",
    "comments": "评论",
    "previousArticle": "上一篇",
    "nextArticle": "下一篇"
  },
  "Footer": {
    "copyright": "© {year} 我的博客。All rights reserved.",
    "poweredBy": "Powered by Next.js"
  }
}
```

#### messages/en-US.json
```json
{
  "Common": {
    "home": "Home",
    "about": "About",
    "blog": "Blog",
    "search": "Search",
    "readMore": "Read More",
    "publishedAt": "Published at",
    "readingTime": "Reading time"
  },
  "Home": {
    "title": "My Blog",
    "subtitle": "Sharing technical articles and thoughts",
    "latestPosts": "Latest Posts",
    "viewAll": "View All"
  },
  "Article": {
    "tableOfContents": "Table of Contents",
    "share": "Share",
    "comments": "Comments",
    "previousArticle": "Previous",
    "nextArticle": "Next"
  },
  "Footer": {
    "copyright": "© {year} My Blog. All rights reserved.",
    "poweredBy": "Powered by Next.js"
  }
}
```

### 5. Root Layout
```typescript
// app/layout.tsx
import { NextIntlClientProvider } from 'next-intl'
import { notFound } from 'next/navigation'
import { locales } from '@/i18n'

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }))
}

export default function RootLayout({
  children,
  params: { locale }
}: {
  children: React.ReactNode
  params: { locale: string }
}) {
  if (!locales.includes(locale as any)) {
    notFound()
  }

  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  )
}
```

### 6. 使用翻译

#### Server Components
```typescript
// app/[locale]/page.tsx
import { useTranslations } from 'next-intl'
import { getTranslations } from 'next-intl/server'

export async function generateMetadata({ params }: { params: { locale: string } }) {
  const t = await getTranslations({ locale: params.locale, namespace: 'Home' })
  
  return {
    title: t('title'),
    description: t('subtitle'),
  }
}

export default function HomePage({ params }: { params: { locale: string } }) {
  const t = useTranslations('Home')
  
  return (
    <div>
      <h1>{t('title')}</h1>
      <p>{t('subtitle')}</p>
    </div>
  )
}
```

#### Client Components
```typescript
// components/Header.tsx
'use client'

import { useTranslations } from 'next-intl'
import { LocaleSwitcher } from './LocaleSwitcher'

export function Header() {
  const t = useTranslations('Common')
  
  return (
    <header>
      <nav>
        <a href="/">{t('home')}</a>
        <a href="/blog">{t('blog')}</a>
        <a href="/about">{t('about')}</a>
      </nav>
      <LocaleSwitcher />
    </header>
  )
}
```

### 7. 语言切换器
```typescript
// components/LocaleSwitcher.tsx
'use client'

import { useLocale } from 'next-intl'
import { useRouter, usePathname } from 'next/navigation'
import { locales, type Locale } from '@/i18n'

export function LocaleSwitcher() {
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()

  function handleChangeLocale(newLocale: Locale) {
    // 替换 URL 中的语言前缀
    const newPathname = pathname.replace(`/${locale}`, `/${newLocale}`)
    router.push(newPathname)
  }

  return (
    <select
      value={locale}
      onChange={(e) => handleChangeLocale(e.target.value as Locale)}
      className="border rounded px-2 py-1"
    >
      {locales.map((loc) => (
        <option key={loc} value={loc}>
          {loc === 'zh-CN' ? '中文' : loc === 'en-US' ? 'English' : '日本語'}
        </option>
      ))}
    </select>
  )
}
```

---

## 三、URL 路由设计

### 推荐方案：语言前缀
```
https://example.com/              # 默认语言 (zh-CN)
https://example.com/zh-CN/        # 中文
https://example.com/en-US/        # 英文
https://example.com/ja-JP/        # 日文

https://example.com/blog/post-1   # 默认语言文章
https://example.com/en-US/blog/post-1  # 英文文章
```

### next-intl 配置
```typescript
// middleware.ts
export default createMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'as-needed', // 默认语言不显示前缀
  // 或者 'always' - 始终显示前缀
  // 或者 'never' - 从不显示前缀
})
```

---

## 四、内容翻译管理流程

### 方案 1：手动管理（适合小项目）
- 翻译文件放在 `messages/` 目录
- 手动维护 JSON 文件
- 优点：简单、可控
- 缺点：工作量大、易出错

### 方案 2：使用翻译管理平台（推荐）
- **Lokalise** - https://lokalise.com
- **Crowdin** - https://crowdin.com
- **Phrase** - https://phrase.com
- **Transifex** - https://transifex.com

**工作流程:**
1. 开发时提取翻译键
2. 上传到翻译平台
3. 翻译人员在线翻译
4. 下载翻译文件
5. 部署更新

### 方案 3：AI 辅助翻译
```typescript
// scripts/translate.ts
import fs from 'fs'
import path from 'path'

// 使用 AI API 自动翻译缺失的键
async function translateMissingKeys() {
  const sourceLang = 'zh-CN'
  const targetLang = 'en-US'
  
  const source = JSON.parse(
    fs.readFileSync(`messages/${sourceLang}.json`, 'utf8')
  )
  const target = JSON.parse(
    fs.readFileSync(`messages/${targetLang}.json`, 'utf8')
  )
  
  // 找出缺失的键并翻译
  // ...
}
```

---

## 五、文章内容多语言

### 方案 1：基于 slug 区分
```typescript
// content/articles/zh-CN/hello-world.mdx
// content/articles/en-US/hello-world.mdx

// lib/content.ts
export async function getPostBySlug(slug: string, locale: string) {
  const fullPath = path.join(
    process.cwd(),
    `content/articles/${locale}/${slug}.mdx`
  )
  // ...
}
```

### 方案 2：Frontmatter 指定语言
```markdown
---
title: "Hello World"
slug: "hello-world"
locale: "zh-CN"
date: "2026-03-06"
translations:
  en-US: "hello-world"
  ja-JP: "hello-world"
---
```

### 方案 3：数据库存储（推荐用于 CMS）
```prisma
// prisma/schema.prisma
model Article {
  id          String   @id @default(uuid())
  slug        String
  locale      String   // zh-CN, en-US, etc.
  title       String
  content     String   @db.Text
  
  // 关联翻译
  translationId String?
  translations  Article[] @relation("ArticleTranslations")
  
  @@unique([slug, locale])
}
```

---

## 六、SEO 多语言优化

### hreflang 标签
```typescript
// components/HreflangTags.tsx
interface HreflangTagsProps {
  pathname: string
  locales: string[]
}

export function HreflangTags({ pathname, locales }: HreflangTagsProps) {
  return (
    <>
      {locales.map((locale) => (
        <link
          key={locale}
          rel="alternate"
          hrefLang={locale}
          href={`https://example.com/${locale}${pathname}`}
        />
      ))}
      <link rel="alternate" hrefLang="x-default" href="https://example.com/" />
    </>
  )
}
```

### 每页的 language 属性
```typescript
// app/[locale]/layout.tsx
<html lang={locale}>
```

---

## 七、类型安全

### 翻译键类型
```typescript
// types/i18n.ts
import type en from '../messages/en-US.json'

type Messages = typeof en

declare global {
  interface IntlMessages extends Messages {}
}

// 现在 useTranslations 会有类型提示
const t = useTranslations('Home')
t('title') // ✅ 类型安全
t('invalid') // ❌ TypeScript 报错
```

---

## 八、参考链接

- [next-intl 官方文档](https://next-intl-docs.vercel.app/)
- [Next.js i18n 官方指南](https://nextjs.org/docs/app/building-your-application/routing/internationalization)
- [i18n 最佳实践](https://www.i18nguy.com/)
- [Lokalise 翻译平台](https://lokalise.com/)

---

## 九、实施建议

### 阶段 1：基础设置（1-2 天）
- [ ] 安装 next-intl
- [ ] 配置 middleware 和 i18n.ts
- [ ] 创建基础翻译文件（zh-CN, en-US）
- [ ] 实现语言切换器

### 阶段 2：内容翻译（3-5 天）
- [ ] 翻译 UI 组件
- [ ] 翻译静态页面（关于、首页）
- [ ] 设计文章内容多语言方案

### 阶段 3：SEO 优化（1 天）
- [ ] 添加 hreflang 标签
- [ ] 每页设置正确的 lang 属性
- [ ] 多语言 sitemap

---

**调研总结:**
1. **next-intl** 是 Next.js App Router 的最佳选择
2. URL 设计使用语言前缀（`/en-US/`）
3. 翻译文件使用 JSON 格式，按语言分离
4. 考虑使用翻译管理平台简化流程
5. 多语言 SEO 需要 hreflang 标签
6. 类型安全很重要，使用 TypeScript 约束翻译键
