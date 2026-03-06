# 性能优化方案

**调研日期：** 2026-03-06  
**调研人：** Scout 🔍

---

## 一、Next.js 性能优化最佳实践

### 1. 渲染策略选择

| 策略 | 说明 | 适用场景 |
|------|------|---------|
| **SSG** (Static Site Generation) | 构建时生成静态 HTML | 博客文章、文档、营销页 |
| **ISR** (Incremental Static Regeneration) | 静态生成 + 后台更新 | 经常更新但不实时的内容 |
| **SSR** (Server-Side Rendering) | 每次请求时渲染 | 个性化内容、实时数据 |
| **CSR** (Client-Side Rendering) | 浏览器端渲染 | 交互复杂的 Dashboard |

### 2. SSG 实现（博客推荐）
```typescript
// app/(blog)/[slug]/page.tsx
import { getPostBySlug, getAllPosts } from '@/lib/content'

// 静态生成所有文章
export async function generateStaticParams() {
  const posts = await getAllPosts()
  return posts.map((post) => ({
    slug: post.slug,
  }))
}

// 构建时生成静态页面
export default async function BlogPost({ params }) {
  const { slug } = await params
  const post = await getPostBySlug(slug)
  
  return <ArticleContent post={post} />
}
```

### 3. ISR 实现（定时更新）
```typescript
// 添加 revalidate 选项
export const revalidate = 3600 // 1 小时重新生成

// 或者在 fetch 中指定
const data = await fetch('https://api.example.com/posts', {
  next: { revalidate: 3600 },
})
```

### 4. SSR 实现（实时数据）
```typescript
// 不导出 generateStaticParams，每次请求时渲染
export const dynamic = 'force-dynamic'

export default async function Page() {
  const data = await fetchData()
  return <Content data={data} />
}
```

---

## 二、图片优化方案

### 1. Next.js Image 组件
```typescript
import Image from 'next/image'

// 基础使用
<Image
  src="/images/cover.jpg"
  alt="文章封面"
  width={1200}
  height={630}
  priority  // 首屏图片使用 priority
  quality={85}
/>

// 响应式图片
<Image
  src="/images/responsive.jpg"
  alt="响应式图片"
  fill  // 填充父容器
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
  style={{ objectFit: 'cover' }}
/>

// 远程图片（需要配置 domains）
<Image
  src="https://cdn.example.com/image.jpg"
  alt="远程图片"
  width={800}
  height={600}
/>
```

### 2. next.config.ts 图片配置
```typescript
// next.config.ts
const nextConfig = {
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.example.com',
      },
    ],
    minimumCacheTTL: 60,
  },
}
```

### 3. 图片优化效果对比
| 格式 | 压缩率 | 浏览器支持 |
|------|--------|-----------|
| WebP | 25-35% 小于 JPEG | 95%+ |
| AVIF | 40-50% 小于 JPEG | 85%+ |
| JPEG | 基准 | 100% |

---

## 三、缓存策略

### 1. HTTP 缓存头
```typescript
// API 路由中设置缓存
export const dynamic = 'force-static'
export const revalidate = 3600

// 或者在 fetch 中
const data = await fetch(url, {
  next: {
    revalidate: 3600,
    tags: ['posts'],
  },
})
```

### 2. 按需重新验证
```typescript
// 更新内容后手动重新验证
// app/api/revalidate/route.ts
import { revalidateTag } from 'next/cache'

export async function POST(request: Request) {
  const { tag } = await request.json()
  revalidateTag(tag)
  return Response.json({ revalidated: true })
}

// 使用
await fetch('https://your-site.com/api/revalidate', {
  method: 'POST',
  body: JSON.stringify({ tag: 'posts' }),
})
```

### 3. SWR (Stale-While-Revalidate)
```typescript
// 使用 SWR 进行客户端数据获取
import useSWR from 'swr'

function ArticleList() {
  const { data, error, isLoading } = useSWR('/api/posts', fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    dedupingInterval: 2000,
  })
  
  if (isLoading) return <Loading />
  if (error) return <Error />
  
  return <List data={data} />
}
```

---

## 四、代码分割与懒加载

### 1. 动态导入（自动代码分割）
```typescript
// 懒加载重型组件
import dynamic from 'next/dynamic'

const HeavyComponent = dynamic(() => import('@/components/HeavyComponent'), {
  loading: () => <LoadingSpinner />,
  ssr: false, // 仅客户端渲染
})

// 图表库懒加载
const Chart = dynamic(() => import('react-chartjs-2').then(mod => mod.Line), {
  ssr: false,
})
```

### 2. 路由级代码分割
```typescript
// Next.js 自动进行路由级代码分割
// 每个页面只加载必要的 JavaScript

// 使用 Link 组件预加载
import Link from 'next/link'

<Link href="/blog">博客</Link>
// 鼠标悬停时自动预加载
```

### 3. 图片懒加载
```typescript
// next/image 默认懒加载
<Image
  src="/images/large.jpg"
  alt="大图"
  width={1920}
  height={1080}
  loading="lazy"  // 默认值
/>

// 首屏图片使用 priority
<Image
  src="/images/hero.jpg"
  alt="首屏图"
  width={1200}
  height={600}
  priority  // 不懒加载
/>
```

---

## 五、字体优化

### 1. next/font (推荐)
```typescript
// app/layout.tsx
import { Inter } from 'next/font/google'
import { localFont } from 'next/font/local'

// Google 字体
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
  preload: true,
})

// 本地字体
const myFont = localFont({
  src: '../fonts/MyFont.woff2',
  display: 'swap',
  variable: '--font-my-font',
})

export default function RootLayout({ children }) {
  return (
    <html className={`${inter.variable} ${myFont.variable}`}>
      <body className="font-sans">{children}</body>
    </html>
  )
}
```

### 2. 字体优化效果
| 优化项 | 效果 |
|--------|------|
| `display: swap` | 避免 FOIT，先显示系统字体 |
| `preload` | 优先加载关键字体 |
| `variable` | 使用 CSS 变量，避免布局偏移 |
| 子集化 | 只加载需要的字符集 |

---

## 六、Core Web Vitals 优化

### 1. LCP (Largest Contentful Paint) 目标：< 2.5s

**优化策略:**
```typescript
// 1. 首屏图片使用 priority
<Image src="/hero.jpg" alt="Hero" priority fill />

// 2. 预加载关键资源
<link rel="preload" as="image" href="/hero.jpg" />

// 3. 使用服务器组件，减少客户端 JavaScript
// 4. 优化服务器响应时间
```

### 2. FID/INP (Interaction to Next Paint) 目标：< 200ms

**优化策略:**
```typescript
// 1. 减少 JavaScript 执行时间
// 2. 使用 Web Workers 处理重型任务
// 3. 代码分割，按需加载

// 4. 使用 React Transition API
'use client'
import { useOptimistic } from 'react'

function LikeButton() {
  const [optimisticLikes, addOptimisticLike] = useOptimistic(
    likes,
    (state) => state + 1
  )
  
  return <button>{optimisticLikes}</button>
}
```

### 3. CLS (Cumulative Layout Shift) 目标：< 0.1

**优化策略:**
```typescript
// 1. 图片指定宽高
<Image width={1200} height={630} alt="Cover" />

// 2. 字体使用 display: swap + size-adjust
const font = Inter({
  display: 'swap',
  adjustFontFallback: 'Arial',
})

// 3. 避免动态插入内容
// 4. 为广告和嵌入内容预留空间
<div className="min-h-[200px]">{adContent}</div>
```

---

## 七、性能监控

### 1. Vercel Analytics
```typescript
// app/layout.tsx
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
```

### 2. Web Vitals 报告
```typescript
// app/web-vitals/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { name, value, id } = body
  
  // 发送到分析服务
  console.log('Web Vitals:', { name, value, id })
  
  return NextResponse.json({ success: true })
}
```

### 3. Lighthouse CI
```yaml
# .github/workflows/lighthouse.yml
name: Lighthouse
on: [push, pull_request]
jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Lighthouse
        uses: treosh/lighthouse-ci-action@v8
        with:
          urls: |
            http://localhost:3000/
            http://localhost:3000/blog
          uploadArtifacts: true
```

---

## 八、性能优化清单

### 构建优化
- [ ] 启用 SSG/ISR 减少 SSR
- [ ] 使用 `next build` 分析包大小
- [ ] 移除未使用的依赖
- [ ] 使用 `@next/bundle-analyzer` 分析

### 资源优化
- [ ] 图片使用 WebP/AVIF 格式
- [ ] 图片懒加载（首屏除外）
- [ ] 字体使用 next/font
- [ ] 图标使用 SVG sprite

### 代码优化
- [ ] 重型组件动态导入
- [ ] 减少客户端 JavaScript
- [ ] 使用 React Server Components
- [ ] 避免不必要的 useEffect

### 缓存优化
- [ ] 设置合理的 revalidate 时间
- [ ] 使用 CDN 缓存静态资源
- [ ] API 响应添加缓存头
- [ ] 使用 SWR 进行客户端缓存

---

## 九、性能测试工具

| 工具 | 用途 | 链接 |
|------|------|------|
| **Lighthouse** | 综合性能审计 | Chrome DevTools |
| **PageSpeed Insights** | 在线性能测试 | pagespeed.web.dev |
| **WebPageTest** | 多地测试 | webpagetest.org |
| **Chrome UX Report** | 真实用户数据 | crux dashboard |
| **Vercel Analytics** | 实时性能监控 | vercel.com/analytics |

---

## 十、参考链接

- [Next.js 性能官方文档](https://nextjs.org/docs/app/building-your-application/optimizing)
- [Web.dev 性能指南](https://web.dev/fast/)
- [Core Web Vitals](https://web.dev/vitals/)
- [Image Optimization](https://nextjs.org/docs/app/building-your-application/optimizing/images)
- [Font Optimization](https://nextjs.org/docs/app/building-your-application/optimizing/fonts)

---

**调研总结:**
1. **SSG + ISR** 是博客的最佳渲染策略
2. **next/image** 自动优化图片（格式转换、尺寸调整、懒加载）
3. **next/font** 优化字体加载，避免布局偏移
4. **Core Web Vitals** 直接影响搜索排名
5. **代码分割** 减少初始加载时间
6. **缓存策略** 平衡新鲜度和性能
7. **持续监控** 使用 Vercel Analytics 或类似工具
