# Next.js 博客最佳实践调研

**调研日期：** 2026-03-06  
**调研人：** Scout 🔍

---

## 一、优秀项目参考

### 1. tailwind-nextjs-starter-blog ⭐⭐⭐⭐⭐
- **GitHub:** https://github.com/timlrx/tailwind-nextjs-starter-blog
- **Stars:** 10,403+
- **技术栈:** Next.js 14, Tailwind CSS, MDX, TypeScript
- **特点:**
  - 开箱即用的博客模板
  - 支持 MDX 内容创作
  - 内置 SEO 优化（sitemap, RSS, 结构化数据）
  - 深色模式支持
  - 响应式设计
  - 搜索功能（Algolia）
  - 评论支持（Giscus, Utterances）

**目录结构参考:**
```
├── app/                    # Next.js 13+ App Router
│   ├── about/
│   ├── blog/
│   ├── tags/
│   └── page.tsx
├── components/             # React 组件
├── content/                # MDX 博客文章
├── data/                   # 站点配置
├── lib/                    # 工具函数
└── public/                 # 静态资源
```

### 2. next-mdx-blog ⭐⭐⭐⭐⭐
- **GitHub:** https://github.com/leerob/next-mdx-blog
- **Stars:** 7,561+
- **技术栈:** Next.js, MDX, Vercel
- **特点:**
  - Vercel 官方示例
  - 极简设计
  - MDX 内容创作
  - 自动生成的 RSS feed
  - 阅读时间估算

### 3. nextjs-blog (Vercel 官方)
- **GitHub:** https://github.com/vercel/next.js/tree/canary/examples/blog
- **技术栈:** Next.js App Router, Markdown
- **特点:**
  - 官方维护
  - App Router 最佳实践
  - 静态生成（SSG）
  - 自动优化

### 4. Cactus
- **GitHub:** https://github.com/chenfan0/Cactus
- **Stars:** 1,500+
- **技术栈:** Next.js, TypeScript, Tailwind
- **特点:**
  - 中文博客模板
  - 简洁优雅的设计
  - 支持评论和搜索

---

## 二、目录结构设计建议

基于调研，推荐以下结构：

```
apps/blog-web/
├── app/
│   ├── (blog)/                    # 博客路由组
│   │   ├── [slug]/                # 文章详情页
│   │   │   └── page.tsx
│   │   ├── tags/
│   │   │   ├── [tag]/
│   │   │   │   └── page.tsx
│   │   │   └── page.tsx
│   │   ├── categories/
│   │   │   ├── [category]/
│   │   │   │   └── page.tsx
│   │   │   └── page.tsx
│   │   └── page.tsx               # 首页
│   ├── about/
│   │   └── page.tsx
│   ├── search/
│   │   └── page.tsx
│   ├── sitemap.ts                 # Sitemap 生成
│   ├── robots.ts                  # Robots.txt 生成
│   └── layout.tsx
├── components/
│   ├── blog/
│   │   ├── ArticleCard.tsx
│   │   ├── ArticleContent.tsx
│   │   ├── TableOfContents.tsx
│   │   └── ShareButtons.tsx
│   ├── layout/
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   └── Navigation.tsx
│   └── ui/                        # 基础 UI 组件
├── content/                       # 博客文章 (MDX/Markdown)
│   ├── articles/
│   │   └── 2026/
│   │       └── my-first-post.mdx
│   └── pages/
├── lib/
│   ├── content.ts                 # 内容加载工具
│   ├── utils.ts
│   └── constants.ts
├── styles/
│   └── globals.css
├── public/
│   ├── images/
│   └── fonts/
└── next.config.ts
```

---

## 三、路由设计最佳实践

### 1. 使用 App Router (Next.js 13+)
```typescript
// 推荐：使用 App Router 而非 Pages Router
// 支持 React Server Components，更好的性能
```

### 2. 路由组组织
```
app/
├── (blog)/          # 博客相关路由
├── (docs)/          # 文档相关路由
└── (marketing)/     # 营销页面
```

### 3. 动态路由参数
```typescript
// app/blog/[slug]/page.tsx
export async function generateStaticParams() {
  const posts = await getAllPosts()
  return posts.map((post) => ({ slug: post.slug }))
}

export default async function BlogPost({ params }) {
  const { slug } = await params
  // ...
}
```

---

## 四、SEO 方案（摘要）

详细方案见 `seo-optimization.md`

**核心要点:**
- ✅ 使用 `generateMetadata` 动态生成 meta 标签
- ✅ 自动生成 sitemap.xml 和 robots.txt
- ✅ 添加结构化数据（JSON-LD）
- ✅ 使用语义化 HTML 标签
- ✅ 图片添加 alt 属性
- ✅ 实现规范的 canonical URL

---

## 五、内容管理方案

### 方案对比

| 方案 | 优点 | 缺点 | 适用场景 |
|------|------|------|---------|
| **MDX/Markdown** | 简单、版本控制友好 | 需要技术知识 | 个人博客、技术博客 |
| **Headless CMS** | 非技术友好、富编辑 | 额外成本、依赖 | 团队博客、商业项目 |
| **数据库存储** | 灵活、可查询 | 需要后端支持 | 多用户、复杂内容 |

### 推荐：MDX + 可选 CMS
- 开发阶段使用 MDX（快速、简单）
- 后期可集成 Headless CMS（如 Contentful、Strapi）

---

## 六、代码示例

### 1. 文章列表页面
```typescript
// app/(blog)/page.tsx
import { getAllPosts } from '@/lib/content'
import { ArticleCard } from '@/components/blog/ArticleCard'

export default async function BlogPage() {
  const posts = await getAllPosts()
  
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8">博客</h1>
      <div className="grid gap-6">
        {posts.map(post => (
          <ArticleCard key={post.slug} post={post} />
        ))}
      </div>
    </div>
  )
}
```

### 2. 文章详情页面
```typescript
// app/(blog)/[slug]/page.tsx
import { getPostBySlug } from '@/lib/content'
import { notFound } from 'next/navigation'
import { ArticleContent } from '@/components/blog/ArticleContent'

export async function generateMetadata({ params }) {
  const { slug } = await params
  const post = await getPostBySlug(slug)
  if (!post) return {}
  
  return {
    title: post.title,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      images: [post.coverImage],
    },
  }
}

export default async function BlogPost({ params }) {
  const { slug } = await params
  const post = await getPostBySlug(slug)
  
  if (!post) notFound()
  
  return <ArticleContent post={post} />
}
```

### 3. 内容加载工具
```typescript
// lib/content.ts
import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'

const postsDirectory = path.join(process.cwd(), 'content/articles')

export async function getAllPosts() {
  const fileNames = fs.readdirSync(postsDirectory)
  const posts = fileNames.map(fileName => {
    const slug = fileName.replace(/\.mdx$/, '')
    const fullPath = path.join(postsDirectory, fileName)
    const fileContents = fs.readFileSync(fullPath, 'utf8')
    const { data, content } = matter(fileContents)
    
    return {
      slug,
      title: data.title,
      date: data.date,
      excerpt: data.excerpt || content.slice(0, 200),
      tags: data.tags || [],
      category: data.category,
    }
  })
  
  return posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}
```

---

## 七、参考链接

- [Next.js 官方文档](https://nextjs.org/docs)
- [Next.js App Router](https://nextjs.org/docs/app)
- [Tailwind Next.js Starter Blog](https://github.com/timlrx/tailwind-nextjs-starter-blog)
- [Next.js Blog Example](https://github.com/vercel/next.js/tree/canary/examples/blog)
- [MDX 官方文档](https://mdxjs.com/docs/)

---

**调研总结:**
1. 使用 Next.js 14+ App Router 是最佳选择
2. MDX 是技术博客的理想内容格式
3. Tailwind CSS 4 提供优秀的开发体验
4. SEO 优化需要内置到项目结构中
5. 考虑后期扩展性（CMS 集成、多语言）
