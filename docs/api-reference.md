# API 接口文档

Base URL: `http://localhost:3000`

测试登录接口  admin@example.com  123456

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
  "password": "123456"
}
```

**响应：**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 获取当前用户 Profile 🔒

```
GET /auth/profile
```

**说明：** 根据 JWT Token 获取当前登录用户的基本信息（来自 Token payload）

**响应：**
```json
{
  "userId": "1",
  "email": "admin@example.com"
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

### 获取文章列表（管理端） 🔒

```
GET /admin/articles?page=1&limit=10&keyword=NestJS&isPublished=true
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| page | number | ❌ | 页码，默认 1 |
| limit | number | ❌ | 每页数量，默认 10，最大 100 |
| keyword | string | ❌ | 搜索关键词（标题） |
| isPublished | boolean | ❌ | 发布状态筛选 |

**响应：**
```json
{
  "data": [
    {
      "id": "1",
      "title": "NestJS 入门指南",
      "slug": "nestjs-getting-started",
      "summary": "本文介绍 NestJS 的基础概念和使用方法",
      "content": "# NestJS 入门\n\nNestJS 是一个...",
      "coverImage": "https://example.com/cover.jpg",
      "isPublished": true,
      "publishedAt": "2024-01-15T12:00:00.000Z",
      "seoTitle": "NestJS 入门教程 - 2024最新版",
      "seoDescription": "详细介绍 NestJS 框架的安装、配置和基础使用",
      "createdAt": "2024-01-15T10:00:00.000Z",
      "updatedAt": "2024-01-15T10:00:00.000Z"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 10
}
```

### 获取单个文章（管理端） 🔒

```
GET /admin/articles/:id
```

**响应：** 同创建文章响应

**错误响应：**
- `404 Not Found` - 文章不存在

### 更新文章 🔒

```
PATCH /admin/articles/:id
```

**请求体：**
```json
{
  "title": "NestJS 入门指南（更新版）",
  "summary": "更新后的摘要",
  "content": "更新后的内容"
}
```

**响应：** 同创建文章响应

### 删除文章 🔒

```
DELETE /admin/articles/:id
```

**响应：** `204 No Content`

### 发布文章 🔒

```
POST /admin/articles/:id/publish
```

**说明：** 将草稿文章发布

**响应：** 同创建文章响应（isPublished 变为 true，publishedAt 设置为当前时间）

### 取消发布文章 🔒

```
POST /admin/articles/:id/unpublish
```

**说明：** 将已发布文章改为草稿

**响应：** 同创建文章响应（isPublished 变为 false）

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

### 获取分类树（管理端） 🔒

```
GET /admin/categories/tree
```

**响应：** 树形结构，同公开接口 `/categories/tree`

### 获取分类列表（管理端） 🔒

```
GET /admin/categories
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

### 获取所有标签（管理端） 🔒

```
GET /admin/tags
```

**响应：** 同公开接口

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

---

## AI 模块 🔒

AI 翻译和 SEO 优化功能，需要配置 OpenAI API Key。

### 翻译文章

```
POST /admin/ai/translate
```

**请求体：**
```json
{
  "title": "NestJS 入门指南",
  "content": "# NestJS 入门\n\nNestJS 是一个...",
  "summary": "本文介绍 NestJS 的基础概念",
  "targetLanguage": "en"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| title | string | ✅ | 标题 |
| content | string | ✅ | 正文内容 |
| summary | string | ❌ | 摘要 |
| targetLanguage | string | ❌ | 目标语言：en/zh，默认 en |

**响应：**
```json
{
  "title": "NestJS Getting Started Guide",
  "content": "# Getting Started with NestJS\n\nNestJS is a...",
  "summary": "This article introduces the basic concepts of NestJS",
  "targetLanguage": "en"
}
```

### SEO 优化

```
POST /admin/ai/seo-optimize
```

**请求体：**
```json
{
  "title": "NestJS 入门指南",
  "content": "# NestJS 入门\n\nNestJS 是一个...",
  "summary": "本文介绍 NestJS 的基础概念"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| title | string | ✅ | 标题 |
| content | string | ✅ | 正文内容 |
| summary | string | ❌ | 摘要 |

**响应：**
```json
{
  "seoTitle": "NestJS 入门教程：从零开始构建企业级 Node.js 应用",
  "seoDescription": "详细介绍 NestJS 框架的核心概念、模块化架构和最佳实践，帮助你快速上手构建可扩展的服务端应用。",
  "keywords": "NestJS, Node.js, TypeScript, 后端框架, 企业级应用"
}
```

### 豆包对话

```
POST /admin/ai/doubao/chat
```

**请求体：**
```json
{
  "prompt": "请帮我总结这篇文章的要点",
  "systemPrompt": "你是一个专业的技术文章助手"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| prompt | string | ✅ | 用户提示词 |
| systemPrompt | string | ❌ | 系统提示词 |

**响应：**
```json
{
  "content": "这篇文章的主要要点包括..."
}
```

### 豆包多模态对话（图文）

```
POST /admin/ai/doubao/chat-with-image
```

**请求体：**
```json
{
  "prompt": "你看见了什么？",
  "imageUrl": "https://example.com/image.png",
  "systemPrompt": "你是一个图像分析助手"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| prompt | string | ✅ | 用户提示词 |
| imageUrl | string | ✅ | 图片 URL |
| systemPrompt | string | ❌ | 系统提示词 |

**响应：**
```json
{
  "content": "图片中显示的是..."
}
```

---

## 文章扩展功能 🔒

### AI 翻译文章

```
POST /admin/articles/:id/translate
```

**请求体：**
```json
{
  "createNewArticle": false
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| createNewArticle | boolean | ❌ | 是否创建新文章保存翻译结果，默认 false |

**响应：**
```json
{
  "title": "NestJS Getting Started Guide",
  "content": "# Getting Started with NestJS\n\nNestJS is a...",
  "summary": "This article introduces the basic concepts of NestJS",
  "targetLanguage": "en",
  "newArticleId": "2"
}
```

> 如果 `createNewArticle` 为 true，会创建一篇新文章（slug 后缀 `-en`），并返回 `newArticleId`

### AI 生成 SEO 信息

```
POST /admin/articles/:id/seo-optimize
```

**响应：**
```json
{
  "seoTitle": "NestJS 入门教程：从零开始构建企业级 Node.js 应用",
  "seoDescription": "详细介绍 NestJS 框架的核心概念、模块化架构和最佳实践。",
  "keywords": "NestJS, Node.js, TypeScript, 后端框架",
  "autoUpdated": true
}
```

> `autoUpdated` 为 true 表示已自动更新文章的 seoTitle 和 seoDescription 字段

### 发布到微信公众号

```
POST /admin/articles/:id/publish-wechat
```

**请求体：**
```json
{
  "author": "作者名",
  "thumbMediaId": "封面图片media_id",
  "needOpenComment": true,
  "onlyFansCanComment": false,
  "publishImmediately": false
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| author | string | ❌ | 作者名 |
| thumbMediaId | string | ❌ | 封面图片 media_id（需先上传到微信） |
| needOpenComment | boolean | ❌ | 是否打开评论，默认 true |
| onlyFansCanComment | boolean | ❌ | 是否仅粉丝可评论，默认 false |
| publishImmediately | boolean | ❌ | 是否立即发布，默认 false（仅保存草稿） |

**响应：**
```json
{
  "mediaId": "草稿media_id",
  "publishId": "发布任务ID（仅立即发布时返回）",
  "status": "draft"
}
```

| status | 说明 |
|--------|------|
| draft | 已保存为草稿 |
| publishing | 发布中 |
| published | 已发布 |

---

## OSS 直传模块

阿里云 OSS 客户端直传，前端直接上传文件到 OSS，无需经过后端中转。

### 获取上传签名 🔒

```
POST /oss/signature
```

**请求体：**
```json
{
  "filename": "photo.jpg",
  "mimeType": "image/jpeg",
  "size": 102400,
  "category": "image",
  "directory": "articles"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| filename | string | ✅ | 原始文件名 |
| mimeType | string | ✅ | MIME 类型 |
| size | number | ✅ | 文件大小（字节） |
| category | string | ❌ | 文件类别：image/video/audio/document |
| directory | string | ❌ | 自定义目录前缀 |

**响应：**
```json
{
  "host": "https://bucket.oss-cn-hangzhou.aliyuncs.com",
  "key": "images/2024/01/15/1705312800000-abc123.jpg",
  "policy": "eyJleHBpcmF0aW9uIjoiMjAyNC0wMS0xNVQxMDowNTowMC4wMDBaIiwiY29uZGl0aW9ucyI6W3siYnVja2V0IjoiYnVja2V0In0sWyJlcSIsIiRrZXkiLCJpbWFnZXMvMjAyNC8wMS8xNS8xNzA1MzEyODAwMDAwLWFiYzEyMy5qcGciXSxbImNvbnRlbnQtbGVuZ3RoLXJhbmdlIiwwLDEwNDg1NzYwXV19",
  "signature": "xxx",
  "accessKeyId": "xxx",
  "expire": 1705312800,
  "url": "https://bucket.oss-cn-hangzhou.aliyuncs.com/images/2024/01/15/1705312800000-abc123.jpg",
  "callback": "eyJjYWxsYmFja1VybCI6Imh0dHBzOi8vYXBpLmV4YW1wbGUuY29tL3YxL29zcy9jYWxsYmFjayIsImNhbGxiYWNrQm9keSI6ImJ1Y2tldD0ke2J1Y2tldH0mb2JqZWN0PSR7b2JqZWN0fSZldGFnPSR7ZXRhZ30mc2l6ZT0ke3NpemV9Jm1pbWVUeXBlPSR7bWltZVR5cGV9IiwiY2FsbGJhY2tCb2R5VHlwZSI6ImFwcGxpY2F0aW9uL3gtd3d3LWZvcm0tdXJsZW5jb2RlZCJ9"
}
```

### 批量获取签名 🔒

```
POST /oss/signatures
```

**请求体：**
```json
[
  { "filename": "photo1.jpg", "mimeType": "image/jpeg", "size": 102400 },
  { "filename": "photo2.png", "mimeType": "image/png", "size": 204800 }
]
```

**响应：** 签名数组

### OSS 上传回调

```
POST /oss/callback
```

> 由 OSS 服务器调用，无需认证

**请求体：**
```
bucket=xxx&object=images/2024/01/15/xxx.jpg&etag=xxx&size=102400&mimeType=image/jpeg
```

**响应：**
```json
{
  "success": true,
  "url": "https://bucket.oss-cn-hangzhou.aliyuncs.com/images/2024/01/15/xxx.jpg",
  "filename": "xxx.jpg",
  "size": 102400,
  "mimeType": "image/jpeg"
}
```

### 前端上传示例

```typescript
// 1. 获取签名
const signatureRes = await fetch('/v1/oss/signature', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    filename: file.name,
    mimeType: file.type,
    size: file.size
  })
});
const signature = await signatureRes.json();

// 2. 直传到 OSS
const formData = new FormData();
formData.append('key', signature.key);
formData.append('policy', signature.policy);
formData.append('OSSAccessKeyId', signature.accessKeyId);
formData.append('signature', signature.signature);
if (signature.callback) {
  formData.append('callback', signature.callback);
}
formData.append('file', file);

const uploadRes = await fetch(signature.host, {
  method: 'POST',
  body: formData
});

// 3. 上传成功后使用 signature.url 作为文件地址
console.log('文件地址:', signature.url);
```

### 文件大小限制

| 类别 | 最大大小 |
|------|----------|
| image | 10MB |
| video | 100MB |
| audio | 50MB |
| document | 20MB |

### 支持的文件类型

| 类别 | MIME 类型 |
|------|-----------|
| image | image/jpeg, image/png, image/gif, image/webp, image/svg+xml |
| video | video/mp4, video/webm, video/ogg, video/quicktime |
| audio | audio/mpeg, audio/wav, audio/ogg, audio/webm |
| document | application/pdf, application/msword, application/vnd.openxmlformats-officedocument.wordprocessingml.document |

### TypeScript 类型定义

```typescript
// OSS 签名请求
interface GetOssSignatureDto {
  filename: string;
  mimeType: string;
  size: number;
  category?: 'image' | 'video' | 'audio' | 'document';
  directory?: string;
}

// OSS 签名响应
interface OssSignatureResponse {
  host: string;
  key: string;
  policy: string;
  signature: string;
  accessKeyId: string;
  expire: number;
  url: string;
  callback?: string;
}

// AI 翻译响应
interface TranslateResponse {
  title: string;
  content: string;
  summary: string | null;
  targetLanguage: string;
  newArticleId?: string;
}

// SEO 优化响应
interface SeoOptimizeResponse {
  seoTitle: string;
  seoDescription: string;
  keywords: string;
  autoUpdated?: boolean;
}

// 微信发布响应
interface PublishToWechatResponse {
  mediaId: string;
  publishId?: string;
  status: 'draft' | 'publishing' | 'published';
}
```


---

## 公开接口模块 (Public)

博客前端使用的公开接口，无需认证。

### 获取文章列表

```
GET /public/articles?page=1&pageSize=10&category=tech&tag=typescript&search=NestJS
```

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| page | number | ❌ | 1 | 页码 |
| pageSize | number | ❌ | 10 | 每页数量（最大100） |
| category | string | ❌ | - | 分类 slug 筛选 |
| tag | string | ❌ | - | 标签 slug 筛选 |
| search | string | ❌ | - | 搜索关键词（标题/摘要） |

**响应：**
```json
{
  "data": [
    {
      "id": "1",
      "slug": "future-of-neural-interfaces",
      "title": "神经接口的未来",
      "excerpt": "探索神经接口技术的最新进展",
      "author": {
        "name": "John Doe",
        "avatar": null
      },
      "publishedAt": "2024-10-12T00:00:00.000Z",
      "readTime": "6 分钟",
      "category": {
        "id": "1",
        "name": "技术",
        "slug": "tech"
      },
      "coverImage": "https://example.com/cover.jpg",
      "tags": [
        { "id": "1", "name": "TypeScript", "slug": "typescript" }
      ]
    }
  ],
  "total": 100,
  "page": 1,
  "pageSize": 10,
  "totalPages": 10
}
```

### 获取文章详情

```
GET /public/articles/:slug
```

| 参数 | 类型 | 说明 |
|------|------|------|
| slug | string | 文章唯一标识 |

**响应：**
```json
{
  "id": "1",
  "slug": "future-of-neural-interfaces",
  "title": "神经接口的未来",
  "excerpt": "探索神经接口技术的最新进展",
  "content": "# 神经接口的未来\n\n这是一篇关于...",
  "author": {
    "name": "John Doe",
    "avatar": null,
    "bio": "全栈开发者"
  },
  "publishedAt": "2024-10-12T00:00:00.000Z",
  "updatedAt": "2024-10-12T00:00:00.000Z",
  "readTime": "6 分钟",
  "category": {
    "id": "1",
    "name": "技术",
    "slug": "tech"
  },
  "coverImage": "https://example.com/cover.jpg",
  "tags": [
    { "id": "1", "name": "TypeScript", "slug": "typescript" }
  ],
  "seo": {
    "metaTitle": "神经接口的未来 - 技术前沿",
    "metaDescription": "深入探讨神经接口技术的发展趋势",
    "ogImage": "https://example.com/cover.jpg"
  }
}
```

**错误响应：**
- `404 Not Found` - 文章不存在

### 获取文章 Slugs（SSG 用）

```
GET /public/articles/slugs
```

**响应：**
```json
{
  "slugs": ["future-of-neural-interfaces", "minimalism-in-spatial-computing"]
}
```

### 获取项目列表

```
GET /public/projects?page=1&pageSize=10&featured=true
```

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| page | number | ❌ | 1 | 页码 |
| pageSize | number | ❌ | 10 | 每页数量 |
| featured | boolean | ❌ | - | 是否只返回精选项目 |

**响应：**
```json
{
  "data": [
    {
      "id": "1",
      "title": "My Blog",
      "description": "一个现代化的博客系统",
      "techStack": ["Next.js", "NestJS", "TypeScript"],
      "coverImage": "https://example.com/project.jpg",
      "link": "https://example.com",
      "githubUrl": "https://github.com/example/my-blog",
      "featured": true,
      "order": 1
    }
  ],
  "total": 10,
  "page": 1,
  "pageSize": 10,
  "totalPages": 1
}
```

### 获取分类列表

```
GET /public/categories
```

**响应：**
```json
{
  "data": [
    {
      "id": "1",
      "name": "技术",
      "slug": "tech",
      "description": "技术相关文章",
      "articleCount": 10
    }
  ]
}
```

### 获取标签列表

```
GET /public/tags
```

**响应：**
```json
{
  "data": [
    {
      "id": "1",
      "name": "TypeScript",
      "slug": "typescript",
      "articleCount": 5
    }
  ]
}
```

### 获取站点配置

```
GET /public/site-config
```

**响应：**
```json
{
  "siteName": "NOVA",
  "siteDescription": "探索技术与设计的前沿",
  "logo": null,
  "favicon": null,
  "socialLinks": {
    "github": "https://github.com/example",
    "twitter": "https://twitter.com/example"
  },
  "owner": {
    "name": "John Doe",
    "avatar": null,
    "bio": "全栈开发者，热爱技术与设计",
    "email": "hello@example.com"
  },
  "seo": {
    "defaultTitle": "NOVA - 探索技术与设计的前沿",
    "defaultDescription": "一个关于技术、设计和创新的博客",
    "defaultOgImage": null
  }
}
```

### 搜索文章

```
GET /public/search?q=NestJS&page=1&pageSize=10
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| q | string | ✅ | 搜索关键词 |
| page | number | ❌ | 页码 |
| pageSize | number | ❌ | 每页数量 |

**响应：**
```json
{
  "data": [
    {
      "id": "1",
      "slug": "building-restful-api-with-nestjs",
      "title": "使用 NestJS 构建 RESTful API",
      "excerpt": "学习如何使用 NestJS 构建高质量的 RESTful API",
      "highlight": "...使用 <mark>NestJS</mark> 框架...",
      "category": "技术",
      "publishedAt": "2024-10-12T00:00:00.000Z"
    }
  ],
  "total": 5,
  "page": 1,
  "pageSize": 10
}
```

### TypeScript 类型定义

```typescript
// 作者信息
interface Author {
  name: string;
  avatar: string | null;
  bio?: string | null;
}

// 分类简要信息
interface CategoryBrief {
  id: string;
  name: string;
  slug: string;
}

// 标签简要信息
interface TagBrief {
  id: string;
  name: string;
  slug: string;
}

// 公开文章列表项
interface PublicArticleListItem {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  author: Author;
  publishedAt: string;
  readTime: string;
  category: CategoryBrief | null;
  coverImage: string | null;
  tags: TagBrief[];
}

// SEO 信息
interface SeoInfo {
  metaTitle: string | null;
  metaDescription: string | null;
  ogImage: string | null;
}

// 公开文章详情
interface PublicArticleDetail extends PublicArticleListItem {
  content: string;
  updatedAt: string;
  seo: SeoInfo;
}

// 分页文章列表响应
interface PaginatedPublicArticleList {
  data: PublicArticleListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// 公开项目
interface PublicProject {
  id: string;
  title: string;
  description: string;
  techStack: string[];
  coverImage: string | null;
  link: string | null;
  githubUrl: string | null;
  featured: boolean;
  order: number;
}

// 公开分类（含文章数量）
interface PublicCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  articleCount: number;
}

// 公开标签（含文章数量）
interface PublicTag {
  id: string;
  name: string;
  slug: string;
  articleCount: number;
}

// 站点配置
interface SiteConfig {
  siteName: string;
  siteDescription: string;
  logo: string | null;
  favicon: string | null;
  socialLinks: {
    github?: string;
    twitter?: string;
    linkedin?: string;
    weibo?: string;
  };
  owner: {
    name: string;
    avatar: string | null;
    bio: string | null;
    email: string | null;
  };
  seo: {
    defaultTitle: string | null;
    defaultDescription: string | null;
    defaultOgImage: string | null;
  };
}

// 搜索结果项
interface SearchResultItem {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  highlight: string | null;
  category: string | null;
  publishedAt: string;
}
```


---

## 网站配置模块 (SiteConfig)

### 获取网站配置 🔒

```
GET /site-config
```

**说明：** 获取网站基础配置信息（管理端）

**响应：**
```json
{
  "id": "1",
  "title": "NOVA - 探索技术与设计的前沿",
  "description": "以极简主义的视角，探索技术、设计与人类潜能的前沿。",
  "keywords": "技术,设计,博客",
  "logo": "https://example.com/logo.png",
  "favicon": "https://example.com/favicon.ico",
  "icp": "京ICP备12345678号",
  "gongan": "京公网安备 11010102001234号",
  "copyright": "© 2024 NOVA. All rights reserved.",
  "analytics": "<script>...</script>",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-15T10:00:00.000Z"
}
```

### 更新网站配置 🔒

```
PUT /site-config
```

**请求体：**
```json
{
  "title": "NOVA",
  "description": "探索技术与设计的前沿",
  "keywords": "技术,设计,博客",
  "logo": "https://example.com/logo.png",
  "favicon": "https://example.com/favicon.ico",
  "icp": "京ICP备12345678号",
  "gongan": "京公网安备 11010102001234号",
  "copyright": "© 2024 NOVA. All rights reserved.",
  "analytics": "<script>...</script>"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| title | string | ❌ | 网站标题（最长60字符） |
| description | string | ❌ | 网站描述（最长200字符） |
| keywords | string | ❌ | 关键词，逗号分隔 |
| logo | string | ❌ | Logo URL |
| favicon | string | ❌ | Favicon URL |
| icp | string | ❌ | ICP 备案号 |
| gongan | string | ❌ | 公安备案号 |
| copyright | string | ❌ | 版权信息 |
| analytics | string | ❌ | 统计代码 |

**响应：** 返回更新后的完整配置对象

### 获取网站配置（公开）

```
GET /v1/public/site-config
```

**说明：** 博客前端获取网站配置（无需认证）

**响应：**
```json
{
  "siteName": "NOVA",
  "siteDescription": "探索技术与设计的前沿",
  "logo": "https://example.com/logo.png",
  "favicon": "https://example.com/favicon.ico",
  "socialLinks": {
    "github": "https://github.com/example",
    "twitter": "https://twitter.com/example"
  },
  "owner": {
    "name": "Site Owner",
    "avatar": null,
    "bio": null,
    "email": null
  },
  "seo": {
    "defaultTitle": "NOVA - 探索技术与设计的前沿",
    "defaultDescription": "以极简主义的视角，探索技术、设计与人类潜能的前沿。",
    "keywords": "技术,设计,博客",
    "defaultOgImage": null
  },
  "filing": {
    "icp": "京ICP备12345678号",
    "gongan": "京公网安备 11010102001234号",
    "copyright": "© 2024 NOVA. All rights reserved."
  },
  "analytics": "<script>...</script>"
}
```

### TypeScript 类型定义

```typescript
// 网站配置
interface SiteConfig {
  id: string;
  title: string;
  description: string | null;
  keywords: string | null;
  logo: string | null;
  favicon: string | null;
  icp: string | null;
  gongan: string | null;
  copyright: string | null;
  analytics: string | null;
  createdAt: string;
  updatedAt: string;
}

// 更新网站配置参数
interface UpdateSiteConfigParams {
  title?: string;
  description?: string;
  keywords?: string;
  logo?: string;
  favicon?: string;
  icp?: string;
  gongan?: string;
  copyright?: string;
  analytics?: string;
}

// 公开网站配置响应
interface PublicSiteConfig {
  siteName: string;
  siteDescription: string;
  logo: string | null;
  favicon: string | null;
  socialLinks: {
    github?: string;
    twitter?: string;
    linkedin?: string;
    weibo?: string;
  };
  owner: {
    name: string;
    avatar: string | null;
    bio: string | null;
    email: string | null;
  };
  seo: {
    defaultTitle: string | null;
    defaultDescription: string | null;
    keywords: string | null;
    defaultOgImage: string | null;
  };
  filing: {
    icp: string | null;
    gongan: string | null;
    copyright: string | null;
  };
  analytics: string | null;
}
```
