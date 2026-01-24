# 性能最佳实践完整指南

本文档包含项目所有应用的性能优化最佳实践，作为 `.kiro/steering/` 精简规则的完整参考。

---

## 目录

1. [通用 TypeScript/JavaScript 规则](#1-通用-typescriptjavascript-规则)
2. [NestJS 后端性能](#2-nestjs-后端性能)
3. [Next.js 博客前端性能](#3-nextjs-博客前端性能)
4. [Ant Design Pro 管理后台性能](#4-ant-design-pro-管理后台性能)

---

## 1. 通用 TypeScript/JavaScript 规则

适用于所有项目的基础性能优化。

### 1.1 数据结构优化

#### 使用 Set/Map 进行 O(1) 查找

```typescript
// ❌ 错误：O(n) 每次查找
const allowedIds = ['a', 'b', 'c']
items.filter(item => allowedIds.includes(item.id))

// ✅ 正确：O(1) 每次查找
const allowedIds = new Set(['a', 'b', 'c'])
items.filter(item => allowedIds.has(item.id))
```

#### 构建索引 Map 进行重复查找

```typescript
// ❌ 错误：O(n) 每次查找
function processOrders(orders: Order[], users: User[]) {
  return orders.map(order => ({
    ...order,
    user: users.find(u => u.id === order.userId)
  }))
}

// ✅ 正确：O(1) 每次查找
function processOrders(orders: Order[], users: User[]) {
  const userById = new Map(users.map(u => [u.id, u]))
  return orders.map(order => ({
    ...order,
    user: userById.get(order.userId)
  }))
}
```

### 1.2 数组操作优化

#### 合并多次数组迭代

```typescript
// ❌ 错误：3 次迭代
const admins = users.filter(u => u.isAdmin)
const testers = users.filter(u => u.isTester)
const inactive = users.filter(u => !u.isActive)

// ✅ 正确：1 次迭代
const admins: User[] = []
const testers: User[] = []
const inactive: User[] = []
for (const user of users) {
  if (user.isAdmin) admins.push(user)
  if (user.isTester) testers.push(user)
  if (!user.isActive) inactive.push(user)
}
```

#### 使用 toSorted() 保持不可变性

```typescript
// ❌ 错误：修改原数组
const sorted = users.sort((a, b) => a.name.localeCompare(b.name))

// ✅ 正确：创建新数组
const sorted = users.toSorted((a, b) => a.name.localeCompare(b.name))

// 兼容旧环境
const sorted = [...users].sort((a, b) => a.name.localeCompare(b.name))
```

#### 先检查长度再比较数组

```typescript
// ❌ 错误：总是执行昂贵比较
function hasChanges(current: string[], original: string[]) {
  return current.sort().join() !== original.sort().join()
}

// ✅ 正确：长度不同直接返回
function hasChanges(current: string[], original: string[]) {
  if (current.length !== original.length) return true
  const currentSorted = current.toSorted()
  const originalSorted = original.toSorted()
  for (let i = 0; i < currentSorted.length; i++) {
    if (currentSorted[i] !== originalSorted[i]) return true
  }
  return false
}
```

#### 使用循环查找 min/max 而非排序

```typescript
// ❌ 错误：O(n log n)
function getLatestProject(projects: Project[]) {
  const sorted = [...projects].sort((a, b) => b.updatedAt - a.updatedAt)
  return sorted[0]
}

// ✅ 正确：O(n)
function getLatestProject(projects: Project[]) {
  if (projects.length === 0) return null
  let latest = projects[0]
  for (let i = 1; i < projects.length; i++) {
    if (projects[i].updatedAt > latest.updatedAt) {
      latest = projects[i]
    }
  }
  return latest
}
```

### 1.3 异步操作优化

#### 并行执行独立操作

```typescript
// ❌ 错误：顺序执行，3 次网络往返
const user = await fetchUser()
const posts = await fetchPosts()
const comments = await fetchComments()

// ✅ 正确：并行执行，1 次网络往返
const [user, posts, comments] = await Promise.all([
  fetchUser(),
  fetchPosts(),
  fetchComments()
])
```

#### 依赖链并行化

```typescript
// ❌ 错误：profile 等待 config 完成
const [user, config] = await Promise.all([fetchUser(), fetchConfig()])
const profile = await fetchProfile(user.id)

// ✅ 正确：config 和 profile 并行
const userPromise = fetchUser()
const profilePromise = userPromise.then(user => fetchProfile(user.id))
const [user, config, profile] = await Promise.all([
  userPromise,
  fetchConfig(),
  profilePromise
])
```

#### 延迟 await 到实际使用处

```typescript
// ❌ 错误：阻塞所有分支
async function handleRequest(userId: string, skipProcessing: boolean) {
  const userData = await fetchUserData(userId)
  if (skipProcessing) return { skipped: true }
  return processUserData(userData)
}

// ✅ 正确：仅在需要时阻塞
async function handleRequest(userId: string, skipProcessing: boolean) {
  if (skipProcessing) return { skipped: true }
  const userData = await fetchUserData(userId)
  return processUserData(userData)
}
```

### 1.4 缓存优化

#### 缓存函数调用结果

```typescript
// 模块级缓存
const slugifyCache = new Map<string, string>()

function cachedSlugify(text: string): string {
  if (slugifyCache.has(text)) {
    return slugifyCache.get(text)!
  }
  const result = slugify(text)
  slugifyCache.set(text, result)
  return result
}
```

#### 缓存 Storage API 调用

```typescript
const storageCache = new Map<string, string | null>()

function getLocalStorage(key: string) {
  if (!storageCache.has(key)) {
    storageCache.set(key, localStorage.getItem(key))
  }
  return storageCache.get(key)
}

function setLocalStorage(key: string, value: string) {
  localStorage.setItem(key, value)
  storageCache.set(key, value)
}

// 监听外部变化
window.addEventListener('storage', (e) => {
  if (e.key) storageCache.delete(e.key)
})
```

#### 缓存循环中的属性访问

```typescript
// ❌ 错误：3 次查找 × N 次迭代
for (let i = 0; i < arr.length; i++) {
  process(obj.config.settings.value)
}

// ✅ 正确：1 次查找
const value = obj.config.settings.value
const len = arr.length
for (let i = 0; i < len; i++) {
  process(value)
}
```

### 1.5 其他优化

#### 提升 RegExp 创建

```typescript
// ❌ 错误：每次调用创建新 RegExp
function validate(email: string) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return regex.test(email)
}

// ✅ 正确：模块级常量
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validate(email: string) {
  return EMAIL_REGEX.test(email)
}
```

#### 早期返回

```typescript
// ❌ 错误：处理所有项后才返回
function validateUsers(users: User[]) {
  let hasError = false
  for (const user of users) {
    if (!user.email) hasError = true
    if (!user.name) hasError = true
  }
  return !hasError
}

// ✅ 正确：发现错误立即返回
function validateUsers(users: User[]) {
  for (const user of users) {
    if (!user.email) return { valid: false, error: 'Email required' }
    if (!user.name) return { valid: false, error: 'Name required' }
  }
  return { valid: true }
}
```

---

## 2. NestJS 后端性能

适用于 `apps/server/my-blog`。

### 2.1 数据库查询优化

#### 使用 select 限制返回字段

```typescript
// ❌ 错误：返回所有字段
const users = await this.prisma.user.findMany()

// ✅ 正确：仅返回需要的字段
const users = await this.prisma.user.findMany({
  select: { id: true, name: true, email: true }
})
```

#### 使用 include 避免 N+1 查询

```typescript
// ❌ 错误：N+1 查询
const articles = await this.prisma.article.findMany()
for (const article of articles) {
  article.author = await this.prisma.user.findUnique({ where: { id: article.authorId } })
}

// ✅ 正确：单次查询
const articles = await this.prisma.article.findMany({
  include: { author: { select: { id: true, name: true } } }
})
```

#### 批量操作

```typescript
// ❌ 错误：多次单独操作
for (const tag of tags) {
  await this.prisma.tag.create({ data: tag })
}

// ✅ 正确：批量创建
await this.prisma.tag.createMany({ data: tags })
```

### 2.2 并发处理

#### API 路由中的并行获取

```typescript
// ❌ 错误：顺序执行
async getArticleDetail(id: string) {
  const article = await this.prisma.article.findUnique({ where: { id } })
  const author = await this.prisma.user.findUnique({ where: { id: article.authorId } })
  const tags = await this.prisma.tag.findMany({ where: { articleId: id } })
  return { article, author, tags }
}

// ✅ 正确：并行执行
async getArticleDetail(id: string) {
  const [article, tags] = await Promise.all([
    this.prisma.article.findUnique({
      where: { id },
      include: { author: { select: { id: true, name: true } } }
    }),
    this.prisma.tag.findMany({ where: { articleId: id } })
  ])
  return { ...article, tags }
}
```

### 2.3 缓存策略

#### 使用 Redis 缓存热点数据

```typescript
async getArticle(id: string) {
  const cacheKey = `article:${id}`
  
  // 尝试从缓存获取
  const cached = await this.redis.get(cacheKey)
  if (cached) return JSON.parse(cached)
  
  // 查询数据库
  const article = await this.prisma.article.findUnique({ where: { id } })
  
  // 写入缓存
  await this.redis.set(cacheKey, JSON.stringify(article), 'EX', 3600)
  
  return article
}
```

#### 缓存失效策略

```typescript
async updateArticle(id: string, data: UpdateArticleDto) {
  const article = await this.prisma.article.update({ where: { id }, data })
  
  // 删除相关缓存
  await this.redis.del(`article:${id}`)
  await this.redis.del('articles:list')
  
  return article
}
```

### 2.4 响应优化

#### 分页查询

```typescript
async findAll(page: number, pageSize: number) {
  const [items, total] = await Promise.all([
    this.prisma.article.findMany({
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: 'desc' }
    }),
    this.prisma.article.count()
  ])
  
  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize)
  }
}
```

#### 流式响应大数据

```typescript
@Get('export')
async exportData(@Res() res: Response) {
  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Transfer-Encoding', 'chunked')
  
  const cursor = this.prisma.article.findMany({ cursor: true })
  
  res.write('[')
  let first = true
  for await (const article of cursor) {
    if (!first) res.write(',')
    res.write(JSON.stringify(article))
    first = false
  }
  res.write(']')
  res.end()
}
```

---

## 3. Next.js 博客前端性能

适用于 `apps/blog-web/blog_web`。

### 3.1 消除瀑布流 (CRITICAL)

#### 使用 Suspense 边界流式传输

```tsx
// ✅ 正确：布局立即渲染，数据流式加载
function Page() {
  return (
    <div>
      <Header />
      <Suspense fallback={<Skeleton />}>
        <DataDisplay />
      </Suspense>
      <Footer />
    </div>
  )
}

async function DataDisplay() {
  const data = await fetchData()
  return <div>{data.content}</div>
}
```

#### 共享 Promise 跨组件

```tsx
function Page() {
  const dataPromise = fetchData()
  
  return (
    <Suspense fallback={<Skeleton />}>
      <DataDisplay dataPromise={dataPromise} />
      <DataSummary dataPromise={dataPromise} />
    </Suspense>
  )
}

function DataDisplay({ dataPromise }: { dataPromise: Promise<Data> }) {
  const data = use(dataPromise)
  return <div>{data.content}</div>
}
```

### 3.2 Bundle 优化 (CRITICAL)

#### 避免 Barrel 文件导入

```typescript
// ❌ 错误：加载整个库
import { Check, X, Menu } from 'lucide-react'

// ✅ 正确：直接导入
import Check from 'lucide-react/dist/esm/icons/check'

// ✅ 或使用 Next.js optimizePackageImports
// next.config.ts
export default {
  experimental: {
    optimizePackageImports: ['lucide-react']
  }
}
```

#### 动态导入重型组件

```tsx
import dynamic from 'next/dynamic'

const MonacoEditor = dynamic(
  () => import('./monaco-editor').then(m => m.MonacoEditor),
  { ssr: false }
)
```

#### 基于用户意图预加载

```tsx
function EditorButton({ onClick }: { onClick: () => void }) {
  const preload = () => {
    if (typeof window !== 'undefined') {
      void import('./monaco-editor')
    }
  }

  return (
    <button onMouseEnter={preload} onFocus={preload} onClick={onClick}>
      Open Editor
    </button>
  )
}
```

#### 延迟加载非关键第三方库

```tsx
const Analytics = dynamic(
  () => import('@vercel/analytics/react').then(m => m.Analytics),
  { ssr: false }
)
```

### 3.3 服务端性能 (HIGH)

#### Server Actions 必须验证身份

```typescript
'use server'

export async function deleteUser(userId: string) {
  const session = await verifySession()
  if (!session) throw new Error('Unauthorized')
  if (session.user.role !== 'admin') throw new Error('Forbidden')
  
  await db.user.delete({ where: { id: userId } })
}
```

#### 最小化 RSC 边界序列化

```tsx
// ❌ 错误：序列化所有字段
async function Page() {
  const user = await fetchUser()
  return <Profile user={user} />
}

// ✅ 正确：仅序列化需要的字段
async function Page() {
  const user = await fetchUser()
  return <Profile name={user.name} avatar={user.avatar} />
}
```

#### 避免 RSC Props 重复序列化

```tsx
// ❌ 错误：发送 6 个字符串
<ClientList usernames={usernames} usernamesOrdered={usernames.toSorted()} />

// ✅ 正确：发送 3 个字符串，客户端排序
<ClientList usernames={usernames} />
```

#### 使用 React.cache() 请求去重

```typescript
import { cache } from 'react'

export const getCurrentUser = cache(async () => {
  const session = await auth()
  if (!session?.user?.id) return null
  return await db.user.findUnique({ where: { id: session.user.id } })
})
```

#### 使用 after() 非阻塞操作

```typescript
import { after } from 'next/server'

export async function POST(request: Request) {
  await updateDatabase(request)
  
  after(async () => {
    await logUserAction({ ... })
  })
  
  return Response.json({ status: 'success' })
}
```

### 3.4 重渲染优化 (MEDIUM)

#### 使用函数式 setState

```tsx
// ❌ 错误：需要 items 作为依赖
const addItem = useCallback((newItem: Item) => {
  setItems([...items, newItem])
}, [items])

// ✅ 正确：稳定回调，无依赖
const addItem = useCallback((newItem: Item) => {
  setItems(curr => [...curr, newItem])
}, [])
```

#### 惰性状态初始化

```tsx
// ❌ 错误：每次渲染都执行
const [data] = useState(JSON.parse(localStorage.getItem('data') || '{}'))

// ✅ 正确：仅初始化时执行
const [data] = useState(() => {
  const stored = localStorage.getItem('data')
  return stored ? JSON.parse(stored) : {}
})
```

#### 订阅派生状态

```tsx
// ❌ 错误：每像素变化都重渲染
const width = useWindowWidth()
const isMobile = width < 768

// ✅ 正确：仅布尔值变化时重渲染
const isMobile = useMediaQuery('(max-width: 767px)')
```

#### memo 组件的默认值提取为常量

```tsx
// ❌ 错误：每次渲染创建新函数
const UserAvatar = memo(function UserAvatar({ onClick = () => {} }) {})

// ✅ 正确：稳定的默认值
const NOOP = () => {}
const UserAvatar = memo(function UserAvatar({ onClick = NOOP }) {})
```

#### 不要对简单表达式使用 useMemo

```tsx
// ❌ 错误：useMemo 开销大于表达式本身
const isLoading = useMemo(() => user.isLoading || notifications.isLoading, [...])

// ✅ 正确：直接计算
const isLoading = user.isLoading || notifications.isLoading
```

### 3.5 渲染性能 (MEDIUM)

#### 防止 Hydration 闪烁

```tsx
function ThemeWrapper({ children }: { children: ReactNode }) {
  return (
    <>
      <div id="theme-wrapper">{children}</div>
      <script
        dangerouslySetInnerHTML={{
          __html: `
            (function() {
              try {
                var theme = localStorage.getItem('theme') || 'light';
                document.getElementById('theme-wrapper').className = theme;
              } catch (e) {}
            })();
          `,
        }}
      />
    </>
  )
}
```

#### 使用 Activity 组件保持状态

```tsx
import { Activity } from 'react'

function Dropdown({ isOpen }: Props) {
  return (
    <Activity mode={isOpen ? 'visible' : 'hidden'}>
      <ExpensiveMenu />
    </Activity>
  )
}
```

#### CSS content-visibility 优化长列表

```css
.message-item {
  content-visibility: auto;
  contain-intrinsic-size: 0 80px;
}
```

#### 使用显式条件渲染

```tsx
// ❌ 错误：count 为 0 时渲染 "0"
{count && <Badge>{count}</Badge>}

// ✅ 正确：count 为 0 时不渲染
{count > 0 ? <Badge>{count}</Badge> : null}
```

#### 动画 SVG 包装器而非 SVG 本身

```tsx
// ✅ 正确：硬件加速
<div className="animate-spin">
  <svg>...</svg>
</div>
```

#### 使用 Passive 事件监听器

```typescript
document.addEventListener('wheel', handleWheel, { passive: true })
document.addEventListener('touchstart', handleTouch, { passive: true })
```

---

## 4. Ant Design Pro 管理后台性能

适用于 `apps/admin-web/myapp`。

### 4.1 数据获取优化

#### 使用 useRequest 自动去重

```tsx
import { useRequest } from 'umi'

function UserList() {
  const { data, loading } = useRequest('/api/users')
  // 自动缓存和去重
}
```

#### 服务端分页

```tsx
const { data, loading } = useRequest(
  ({ current, pageSize }) => request('/api/list', { params: { current, pageSize } }),
  { paginated: true }
)
```

### 4.2 表格优化

#### 启用虚拟滚动

```tsx
<Table
  virtual
  scroll={{ y: 500 }}
  dataSource={largeDataset}
  columns={columns}
/>
```

#### 合理使用 rowKey

```tsx
// ✅ 使用唯一标识
<Table rowKey="id" dataSource={data} />

// ❌ 避免使用索引
<Table rowKey={(_, index) => index} dataSource={data} />
```

### 4.3 表单优化

#### 使用 shouldUpdate 精确控制

```tsx
<Form.Item shouldUpdate={(prev, curr) => prev.type !== curr.type}>
  {({ getFieldValue }) => {
    const type = getFieldValue('type')
    return type === 'advanced' ? <AdvancedFields /> : null
  }}
</Form.Item>
```

#### 使用 Form.List 处理动态字段

```tsx
<Form.List name="items">
  {(fields, { add, remove }) => (
    <>
      {fields.map(field => (
        <Form.Item key={field.key} {...field}>
          <Input />
        </Form.Item>
      ))}
      <Button onClick={() => add()}>添加</Button>
    </>
  )}
</Form.List>
```

### 4.4 组件优化

#### 使用函数式 setState

```tsx
const addItem = useCallback((newItem) => {
  setItems(curr => [...curr, newItem])
}, [])
```

#### 惰性状态初始化

```tsx
const [data] = useState(() => {
  const stored = localStorage.getItem('data')
  return stored ? JSON.parse(stored) : {}
})
```

#### 提取到 memo 组件

```tsx
const ExpensiveTable = memo(function ExpensiveTable({ data }) {
  // 复杂表格渲染逻辑
})

function Page({ data, loading }) {
  if (loading) return <Skeleton />
  return <ExpensiveTable data={data} />
}
```

#### 窄化 Effect 依赖

```tsx
// ❌ 错误：user 任何字段变化都触发
useEffect(() => { console.log(user.id) }, [user])

// ✅ 正确：仅 id 变化时触发
useEffect(() => { console.log(user.id) }, [user.id])
```

---

## 参考资源

- [React 官方文档](https://react.dev)
- [Next.js 官方文档](https://nextjs.org)
- [NestJS 官方文档](https://docs.nestjs.com)
- [Ant Design Pro 官方文档](https://pro.ant.design/)
- [Vercel React Best Practices](https://vercel.com/blog)
- [Prisma 性能优化](https://www.prisma.io/docs/guides/performance-and-optimization)
