# API 接口文档

Base URL: `http://localhost:3000`

## 认证说明

需要认证的接口在请求头中携带 JWT Token：
```
Authorization: Bearer <token>
```

---

## 认证模块 (Auth)

### 登录

```
POST /auth/login
```

**请求体：**
```json
{
  "email": "admin@example.com",
  "password": "password123"
}
```

**响应：**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

## 用户模块 (User)

### 获取当前用户信息 🔒

```
GET /users/me
```

**说明：** 根据 JWT Token 获取当前登录用户的信息

**响应：**
```json
{
  "id": "1",
  "email": "admin@example.com",
  "name": "管理员",
  "role": "admin",
  "avatar": "https://example.com/avatar.jpg",
  "createdAt": "2024-01-15T10:00:00.000Z",
  "updatedAt": "2024-01-15T10:00:00.000Z"
}
```

**错误响应：**
- `401 Unauthorized` - Token 无效或已过期

---

### 创建用户 🔒

```
POST /users
```

**请求体：**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "张三",
  "role": "editor",
  "avatar": "https://example.com/avatar.jpg"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| email | string | ✅ | 邮箱地址 |
| password | string | ✅ | 密码（6-32位） |
| name | string | ✅ | 用户名（2-50位） |
| role | string | ❌ | 角色：admin/editor/viewer，默认 viewer |
| avatar | string | ❌ | 头像 URL |

**响应：**
```json
{
  "id": "1",
  "email": "user@example.com",
  "name": "张三",
  "role": "editor",
  "avatar": "https://example.com/avatar.jpg",
  "createdAt": "2024-01-15T10:00:00.000Z",
  "updatedAt": "2024-01-15T10:00:00.000Z"
}
```

### 获取用户列表 🔒

```
GET /users?keyword=张&role=editor&page=1&limit=10
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| keyword | string | ❌ | 搜索关键词（姓名/邮箱） |
| role | string | ❌ | 角色筛选 |
| page | number | ❌ | 页码，默认 1 |
| limit | number | ❌ | 每页数量，默认 10 |

**响应：**
```json
{
  "data": [
    {
      "id": "1",
      "email": "user@example.com",
      "name": "张三",
      "role": "editor",
      "avatar": null,
      "createdAt": "2024-01-15T10:00:00.000Z",
      "updatedAt": "2024-01-15T10:00:00.000Z"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 10
}
```

### 获取单个用户 🔒

```
GET /users/:id
```

### 更新用户 🔒

```
PATCH /users/:id
```

**请求体：**
```json
{
  "name": "李四",
  "role": "admin"
}
```

### 删除用户 🔒

```
DELETE /users/:id
```

**响应：** `204 No Content`

---

## 文章模块 (Article)

### 创建文章 🔒

```
POST /admin/articles
```

**请求体：**
```json
{
  "title": "NestJS 入门指南",
  "slug": "nestjs-getting-started",
  "summary": "本文介绍 NestJS 的基础概念和使用方法",
  "content": "# NestJS 入门\n\nNestJS 是一个...",
  "coverImage": "https://example.com/cover.jpg",
  "seoTitle": "NestJS 入门教程 - 2024最新版",
  "seoDescription": "详细介绍 NestJS 框架的安装、配置和基础使用"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| title | string | ✅ | 标题（最长200字符） |
| slug | string | ✅ | URL 标识（小写字母、数字、连字符） |
| summary | string | ❌ | 摘要（最长500字符） |
| content | string | ❌ | 正文内容 |
| coverImage | string | ❌ | 封面图 URL |
| seoTitle | string | ❌ | SEO 标题（最长100字符） |
| seoDescription | string | ❌ | SEO 描述（最长300字符） |

**响应：**
```json
{
  "id": "1",
  "title": "NestJS 入门指南",
  "slug": "nestjs-getting-started",
  "summary": "本文介绍 NestJS 的基础概念和使用方法",
  "content": "# NestJS 入门\n\nNestJS 是一个...",
  "coverImage": "https://example.com/cover.jpg",
  "isPublished": false,
  "publishedAt": null,
  "seoTitle": "NestJS 入门教程 - 2024最新版",
  "seoDescription": "详细介绍 NestJS 框架的安装、配置和基础使用",
  "createdAt": "2024-01-15T10:00:00.000Z",
  "updatedAt": "2024-01-15T10:00:00.000Z"
}
```

### 获取已发布文章列表（公开）

```
GET /articles?page=1&limit=10
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| page | number | ❌ | 页码，默认 1 |
| limit | number | ❌ | 每页数量，默认 10，最大 100 |

**响应：**
```json
{
  "data": [
    {
      "id": "1",
      "title": "NestJS 入门指南",
      "slug": "nestjs-getting-started",
      "summary": "本文介绍 NestJS 的基础概念和使用方法",
      "coverImage": "https://example.com/cover.jpg",
      "publishedAt": "2024-01-15T12:00:00.000Z",
      "seoTitle": "NestJS 入门教程 - 2024最新版",
      "seoDescription": "详细介绍 NestJS 框架的安装、配置和基础使用"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 10
}
```

> 注意：列表接口不返回 `content` 字段

---

## 分类模块 (Category)

### 创建分类 🔒

```
POST /admin/categories
```

**请求体：**
```json
{
  "name": "技术",
  "slug": "tech",
  "description": "技术相关文章",
  "parentId": null,
  "sortOrder": 1
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| name | string | ✅ | 分类名称（最长50字符） |
| slug | string | ✅ | URL 标识 |
| description | string | ❌ | 描述（最长200字符） |
| parentId | string | ❌ | 父分类 ID（最多3级） |
| sortOrder | number | ❌ | 排序，默认 0 |

**响应：**
```json
{
  "id": "1",
  "name": "技术",
  "slug": "tech",
  "description": "技术相关文章",
  "parentId": null,
  "level": 1,
  "path": "/tech",
  "sortOrder": 1,
  "createdAt": "2024-01-15T10:00:00.000Z",
  "updatedAt": "2024-01-15T10:00:00.000Z"
}
```

### 创建子分类 🔒

```
POST /admin/categories
```

**请求体：**
```json
{
  "name": "后端",
  "slug": "backend",
  "parentId": "1"
}
```

**响应：**
```json
{
  "id": "2",
  "name": "后端",
  "slug": "backend",
  "description": null,
  "parentId": "1",
  "level": 2,
  "path": "/tech/backend",
  "sortOrder": 0,
  "createdAt": "2024-01-15T10:00:00.000Z",
  "updatedAt": "2024-01-15T10:00:00.000Z"
}
```

### 获取分类树（公开）

```
GET /categories/tree
```

**响应：**
```json
[
  {
    "id": "1",
    "name": "技术",
    "slug": "tech",
    "description": "技术相关文章",
    "parentId": null,
    "level": 1,
    "path": "/tech",
    "sortOrder": 1,
    "createdAt": "2024-01-15T10:00:00.000Z",
    "updatedAt": "2024-01-15T10:00:00.000Z",
    "children": [
      {
        "id": "2",
        "name": "后端",
        "slug": "backend",
        "description": null,
        "parentId": "1",
        "level": 2,
        "path": "/tech/backend",
        "sortOrder": 0,
        "children": []
      },
      {
        "id": "3",
        "name": "前端",
        "slug": "frontend",
        "description": null,
        "parentId": "1",
        "level": 2,
        "path": "/tech/frontend",
        "sortOrder": 1,
        "children": []
      }
    ]
  }
]
```

### 获取分类列表（公开）

```
GET /categories
```

**响应：** 扁平列表，结构同单个分类

### 获取单个分类 🔒

```
GET /admin/categories/:id
```

### 更新分类 🔒

```
PATCH /admin/categories/:id
```

**请求体：**
```json
{
  "name": "科技",
  "sortOrder": 2
}
```

> 注意：不允许修改 `parentId`

### 删除分类 🔒

```
DELETE /admin/categories/:id
```

**响应：** `204 No Content`

> 注意：存在子分类时无法删除

---

## 标签模块 (Tag)

### 创建标签 🔒

```
POST /admin/tags
```

**请求体：**
```json
{
  "name": "TypeScript",
  "slug": "typescript",
  "description": "TypeScript 相关内容"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| name | string | ✅ | 标签名称（最长30字符） |
| slug | string | ✅ | URL 标识 |
| description | string | ❌ | 描述（最长200字符） |

**响应：**
```json
{
  "id": "1",
  "name": "TypeScript",
  "slug": "typescript",
  "description": "TypeScript 相关内容",
  "articleCount": 0,
  "createdAt": "2024-01-15T10:00:00.000Z",
  "updatedAt": "2024-01-15T10:00:00.000Z"
}
```

### 获取所有标签（公开）

```
GET /tags
```

**响应：**
```json
[
  {
    "id": "1",
    "name": "TypeScript",
    "slug": "typescript",
    "description": "TypeScript 相关内容",
    "articleCount": 5,
    "createdAt": "2024-01-15T10:00:00.000Z",
    "updatedAt": "2024-01-15T10:00:00.000Z"
  }
]
```

### 获取热门标签（公开）

```
GET /tags/popular?limit=10
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| limit | number | ❌ | 返回数量，默认 10 |

**响应：** 按 `articleCount` 降序排列的标签列表

### 获取单个标签 🔒

```
GET /admin/tags/:id
```

### 更新标签 🔒

```
PATCH /admin/tags/:id
```

### 删除标签 🔒

```
DELETE /admin/tags/:id
```

**响应：** `204 No Content`

---

## 媒体模块 (Media)

### 上传文件 🔒

```
POST /admin/media/upload
Content-Type: multipart/form-data
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| file | File | ✅ | 文件（最大 10MB） |
| alt | string | ❌ | 替代文本（最长200字符） |

**响应：**
```json
{
  "id": "1",
  "filename": "1705312800000-abc123.jpg",
  "originalName": "photo.jpg",
  "mimeType": "image/jpeg",
  "size": 102400,
  "url": "http://localhost:3000/uploads/1705312800000-abc123.jpg",
  "storageType": "local",
  "mediaType": "image",
  "width": 1920,
  "height": 1080,
  "alt": "示例图片",
  "createdAt": "2024-01-15T10:00:00.000Z"
}
```

### 获取媒体列表 🔒

```
GET /admin/media?page=1&limit=20&mediaType=image
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| page | number | ❌ | 页码，默认 1 |
| limit | number | ❌ | 每页数量，默认 20，最大 100 |
| mediaType | string | ❌ | 类型筛选：image/video/audio/document/other |

**响应：**
```json
{
  "data": [
    {
      "id": "1",
      "filename": "1705312800000-abc123.jpg",
      "originalName": "photo.jpg",
      "mimeType": "image/jpeg",
      "size": 102400,
      "url": "http://localhost:3000/uploads/1705312800000-abc123.jpg",
      "storageType": "local",
      "mediaType": "image",
      "width": 1920,
      "height": 1080,
      "alt": "示例图片",
      "createdAt": "2024-01-15T10:00:00.000Z"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 20
}
```

### 获取单个媒体 🔒

```
GET /admin/media/:id
```

### 删除媒体 🔒

```
DELETE /admin/media/:id
```

**响应：** `204 No Content`

---

## SEO 模块

### 获取 robots.txt（公开）

```
GET /robots.txt
```

**响应：**
```
User-agent: *
Allow: /
Disallow: /admin
Disallow: /api

Sitemap: http://localhost:3000/sitemap.xml
```

### 获取 sitemap.xml（公开）

```
GET /sitemap.xml
```

**响应：**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>http://localhost:3000/</loc>
    <lastmod>2024-01-15</lastmod>
    <changefreq>daily</changefreq>
    <priority>1</priority>
  </url>
  <url>
    <loc>http://localhost:3000/about</loc>
    <lastmod>2024-01-15</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
</urlset>
```

---

## 错误响应格式

所有错误返回统一格式：

```json
{
  "statusCode": 400,
  "message": "标题不能为空",
  "error": "Bad Request",
  "path": "/admin/articles",
  "timestamp": "2024-01-15T10:00:00.000Z"
}
```

### 常见错误码

| 状态码 | 说明 |
|--------|------|
| 400 | 请求参数错误 |
| 401 | 未认证 |
| 403 | 无权限 |
| 404 | 资源不存在 |
| 409 | 资源冲突（如 slug 重复） |
| 500 | 服务器内部错误 |

---

## TypeScript 类型定义

```typescript
// 分页响应
interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

// 用户
interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'editor' | 'viewer';
  avatar: string | null;
  createdAt: string;
  updatedAt: string;
}

// 文章
interface Article {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  content: string | null;
  coverImage: string | null;
  isPublished: boolean;
  publishedAt: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  createdAt: string;
  updatedAt: string;
}

// 文章列表项（不含 content）
interface ArticleListItem {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  coverImage: string | null;
  publishedAt: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
}

// 分类
interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parentId: string | null;
  level: number;
  path: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

// 分类树节点
interface CategoryTreeNode extends Category {
  children: CategoryTreeNode[];
}

// 标签
interface Tag {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  articleCount: number;
  createdAt: string;
  updatedAt: string;
}

// 媒体
interface Media {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  storageType: 'local' | 'oss' | 's3';
  mediaType: 'image' | 'video' | 'audio' | 'document' | 'other';
  width: number | null;
  height: number | null;
  alt: string | null;
  createdAt: string;
}
```


---

## 微信公众号模块 (Wechat) 🔒

所有微信接口需要 JWT 认证。

### 素材管理

#### 获取素材总数

```
GET /wechat/material/count
```

**响应：**
```json
{
  "voice_count": 10,
  "video_count": 5,
  "image_count": 100,
  "news_count": 20
}
```

#### 获取素材列表

```
GET /wechat/material/list?type=image&offset=0&count=20
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| type | string | ✅ | 素材类型：image/voice/video/news |
| offset | number | ❌ | 偏移量，默认 0 |
| count | number | ❌ | 数量，默认 20，最大 20 |

**响应：**
```json
{
  "total_count": 100,
  "item_count": 20,
  "item": [
    {
      "media_id": "xxx",
      "name": "image.jpg",
      "update_time": 1704067200,
      "url": "https://..."
    }
  ]
}
```

#### 删除永久素材

```
DELETE /wechat/material/:mediaId
```

**响应：**
```json
{ "success": true }
```

### 草稿箱

#### 新增草稿

```
POST /wechat/draft
```

**请求体：**
```json
{
  "articles": [
    {
      "title": "文章标题",
      "author": "作者",
      "digest": "摘要",
      "content": "<p>正文内容</p>",
      "contentSourceUrl": "https://...",
      "thumbMediaId": "封面图片media_id",
      "needOpenComment": 0,
      "onlyFansCanComment": 0
    }
  ]
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| title | string | ✅ | 标题 |
| content | string | ✅ | 正文（支持HTML） |
| thumbMediaId | string | ✅ | 封面图片 media_id |
| author | string | ❌ | 作者 |
| digest | string | ❌ | 摘要 |
| contentSourceUrl | string | ❌ | 原文链接 |
| needOpenComment | number | ❌ | 是否打开评论（0否/1是） |
| onlyFansCanComment | number | ❌ | 是否仅粉丝可评论 |

**响应：**
```json
{
  "media_id": "xxx"
}
```

#### 获取草稿详情

```
GET /wechat/draft/:mediaId
```

**响应：**
```json
{
  "news_item": [
    {
      "title": "文章标题",
      "author": "作者",
      "digest": "摘要",
      "content": "<p>正文内容</p>",
      "thumb_media_id": "xxx"
    }
  ]
}
```

#### 删除草稿

```
DELETE /wechat/draft/:mediaId
```

**响应：**
```json
{ "success": true }
```

#### 更新草稿

```
POST /wechat/draft/update
```

**请求体：**
```json
{
  "mediaId": "草稿media_id",
  "index": 0,
  "article": {
    "title": "新标题",
    "content": "<p>新内容</p>",
    "thumbMediaId": "xxx"
  }
}
```

**响应：**
```json
{ "success": true }
```

#### 获取草稿总数

```
GET /wechat/draft/count
```

**响应：**
```json
{
  "total_count": 10
}
```

#### 获取草稿列表

```
GET /wechat/drafts?offset=0&count=20&noContent=0
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| offset | number | ❌ | 偏移量，默认 0 |
| count | number | ❌ | 数量，默认 20 |
| noContent | number | ❌ | 是否不返回正文（0返回/1不返回） |

**响应：**
```json
{
  "total_count": 10,
  "item_count": 10,
  "item": [
    {
      "media_id": "xxx",
      "content": {
        "news_item": [...]
      },
      "update_time": 1704067200
    }
  ]
}
```

### 发布能力

#### 发布草稿

```
POST /wechat/publish
```

**请求体：**
```json
{
  "mediaId": "草稿media_id"
}
```

**响应：**
```json
{
  "publish_id": "xxx"
}
```

#### 获取发布状态

```
GET /wechat/publish/status?publishId=xxx
```

**响应：**
```json
{
  "publish_id": "xxx",
  "publish_status": 0,
  "article_id": "xxx",
  "article_detail": {
    "count": 1,
    "item": [
      {
        "idx": 1,
        "article_url": "https://..."
      }
    ]
  }
}
```

| publish_status | 说明 |
|----------------|------|
| 0 | 发布成功 |
| 1 | 发布中 |
| 2 | 原创审核中 |
| 3 | 发布失败 |
| 4 | 已删除 |

#### 删除发布文章

```
DELETE /wechat/publish
```

**请求体：**
```json
{
  "articleId": "article_id",
  "index": 0
}
```

**响应：**
```json
{ "success": true }
```

#### 获取已发布图文详情

```
GET /wechat/publish/article?articleId=xxx
```

**响应：**
```json
{
  "news_item": [
    {
      "title": "文章标题",
      "author": "作者",
      "digest": "摘要",
      "content": "<p>正文</p>",
      "url": "https://...",
      "is_deleted": false
    }
  ]
}
```

#### 获取已发布消息列表

```
GET /wechat/publish/list?offset=0&count=20&noContent=0
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| offset | number | ❌ | 偏移量，默认 0 |
| count | number | ❌ | 数量，默认 20 |
| noContent | number | ❌ | 是否不返回正文 |

**响应：**
```json
{
  "total_count": 10,
  "item_count": 10,
  "item": [
    {
      "article_id": "xxx",
      "content": {
        "news_item": [...]
      },
      "update_time": 1704067200
    }
  ]
}
```

### 数据分析

#### 获取被动回复概要数据

```
GET /wechat/interface-summary?beginDate=2024-01-01&endDate=2024-01-07
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| beginDate | string | ✅ | 起始日期（YYYY-MM-DD） |
| endDate | string | ✅ | 结束日期（最大跨度30天） |

**响应：**
```json
{
  "list": [
    {
      "ref_date": "2024-01-01",
      "callback_count": 100,
      "fail_count": 5,
      "total_time_cost": 5000,
      "max_time_cost": 200
    }
  ]
}
```

#### 获取用户增减数据

```
GET /wechat/user-summary?beginDate=2024-01-01&endDate=2024-01-07
```

#### 获取累计用户数据

```
GET /wechat/user-cumulate?beginDate=2024-01-01&endDate=2024-01-07
```

#### 获取图文群发每日数据

```
GET /wechat/article-summary?beginDate=2024-01-01&endDate=2024-01-01
```

#### 获取消息发送概况数据

```
GET /wechat/upstream-msg?beginDate=2024-01-01&endDate=2024-01-07
```

### 微信接口错误码

| 错误码 | 说明 | 解决方案 |
|--------|------|----------|
| -1 | 系统繁忙 | 稍后重试 |
| 40001 | access_token 无效 | 检查 AppID/AppSecret 配置 |
| 40007 | 无效的 media_id | 检查素材是否存在 |
| 45028 | 草稿不存在 | 检查 media_id |
| 61500 | 日期格式错误 | 使用 YYYY-MM-DD 格式 |
| 61501 | 日期范围错误 | 检查日期跨度限制 |

### TypeScript 类型定义

```typescript
// 素材总数
interface MaterialCountResponse {
  voice_count: number;
  video_count: number;
  image_count: number;
  news_count: number;
}

// 草稿文章
interface DraftArticle {
  title: string;
  author?: string;
  digest?: string;
  content: string;
  content_source_url?: string;
  thumb_media_id: string;
  need_open_comment?: number;
  only_fans_can_comment?: number;
}

// 发布状态
interface FreepublishGetResponse {
  publish_id: string;
  publish_status: number;
  article_id?: string;
  article_detail?: {
    count: number;
    item: Array<{ idx: number; article_url: string }>;
  };
}
```
