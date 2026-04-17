# Skill: 博客管理

管理博客网站 `badmin.new-universe.cn` 的全部内容：文章（中/英文）、分类、标签、项目、媒体、站点配置。
脚本和配置文件位于本目录（`publish.js`、`config.json`）。

## 基础信息

- API 基础地址：`https://badmin.new-universe.cn/api`
- 认证方式：`Authorization: Bearer {API_KEY}`
- API Key 来源：环境变量 `BLOG_API_KEY` 或 `config.json` 中的 `api_key`

---

## 一、文章管理

### 多语言支持

文章支持 `zh-CN`（中文）和 `en-US`（英文）两种语言。同一篇文章的中英文版本通过 `translationGroupId` 关联。

**发布双语文章的流程：**
1. 先发布中文版（不传 `translationGroupId`，系统自动生成文章 ID）
2. 用中文版的 `id` 作为 `translationGroupId`，发布英文版
3. 英文版的 `slug` 建议在中文版基础上加 `-en` 后缀

### 使用 publish.js 发布文章

#### ⚠️ 强制要求

**每次发布必须提供以下所有参数，不允许省略任何一个：**

| 参数 | 必填 | 说明 |
|------|------|------|
| --file | ✅ | Markdown 文章路径 |
| --cover | ✅* | 封面图路径（有封面图时必传，OSS 直传） |
| --seo-title | ✅ | Agent 根据文章内容生成的 SEO 标题（≤100字符） |
| --seo-description | ✅ | Agent 根据文章内容生成的 SEO 描述（≤300字符） |
| --summary | ✅ | Agent 根据文章内容生成的摘要（≤500字符） |
| --category | ✅ | 分类 ID（通过 API 查询已有分类，选择最匹配的） |
| --tags | ✅ | 标签 ID 列表（逗号分隔，通过 API 查询后选择） |
| --locale | ❌ | 语言标识：`zh-CN`（默认）或 `en-US` |
| --translation-group-id | ❌ | 翻译组 ID，发布英文版时传中文版的文章 ID |
| --slug | ❌ | 自定义 slug（不传则自动从标题生成） |
| --no-publish | ❌ | 加此 flag 只创建草稿不发布（默认直接发布） |

**脚本默认直接发布。** 只有 Boss 明确说"先不发"时才加 `--no-publish` 创建草稿。

#### 发布前准备（Agent 必须完成）

1. **阅读文章全文** — 理解核心主题、关键论点和目标读者
2. **生成 SEO 信息**（不允许跳过）：
   - seoTitle：包含核心关键词，格式 `核心主题关键词 — 补充价值描述 | 新宇宙博客`
   - seoDescription：1-2 句话概括文章核心价值，包含主要关键词
   - summary：提炼核心观点和结论
3. **匹配分类和标签**（不允许跳过）：
   - 分类：`GET /admin/categories/tree` 查询，没有合适的就 `POST /admin/categories` 创建
   - 标签：`GET /admin/tags` 查询，缺少的就 `POST /admin/tags` 逐个创建，通常 3-5 个

#### 调用示例

```bash
# 发布中文文章
node publish.js \
  --file "文章.md" \
  --cover "封面.png" \
  --seo-title "SEO标题 | 新宇宙博客" \
  --seo-description "SEO描述" \
  --summary "摘要" \
  --category "分类ID" \
  --tags "标签ID1,标签ID2"

# 发布英文文章（关联中文版）
node publish.js \
  --file "article-en.md" \
  --cover "cover.png" \
  --locale "en-US" \
  --translation-group-id "中文版文章ID" \
  --slug "article-title-en" \
  --seo-title "SEO Title | Blog" \
  --seo-description "SEO description" \
  --summary "Summary" \
  --category "分类ID" \
  --tags "标签ID1,标签ID2"
```

### 直接通过 API 管理文章

不使用 publish.js 时，可以直接调用 API：

| 操作 | 方法 | 路径 | 说明 |
|------|------|------|------|
| 创建文章 | POST | `/admin/articles` | 创建草稿 |
| 获取文章列表 | GET | `/admin/articles?page=1&limit=10&keyword=xxx&isPublished=true` | 管理端列表 |
| 获取文章详情 | GET | `/admin/articles/:id` | 含 content |
| 更新文章 | PATCH | `/admin/articles/:id` | 部分更新 |
| 删除文章 | DELETE | `/admin/articles/:id` | 204 |
| 发布文章 | POST | `/admin/articles/:id/publish` | 草稿→发布 |
| 取消发布 | POST | `/admin/articles/:id/unpublish` | 发布→草稿 |
| AI 翻译 | POST | `/admin/articles/:id/translate` | 可选 `createNewArticle: true` 自动创建英文版 |
| AI SEO 优化 | POST | `/admin/articles/:id/seo-optimize` | 自动更新 seoTitle/seoDescription |

#### 创建文章请求体

```json
{
  "title": "文章标题",
  "slug": "article-slug",
  "summary": "摘要",
  "content": "Markdown 正文",
  "coverImage": "https://oss-url/cover.jpg",
  "seoTitle": "SEO 标题",
  "seoDescription": "SEO 描述",
  "locale": "zh-CN",
  "translationGroupId": "关联翻译组 ID（可选）",
  "categoryId": "分类 ID",
  "tagIds": ["标签ID1", "标签ID2"]
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| title | string | ✅ | 标题（≤200字符） |
| slug | string | ✅ | URL 标识（小写字母、数字、连字符） |
| summary | string | ❌ | 摘要（≤500字符） |
| content | string | ❌ | Markdown 正文 |
| coverImage | string | ❌ | 封面图 URL |
| seoTitle | string | ❌ | SEO 标题（≤100字符） |
| seoDescription | string | ❌ | SEO 描述（≤300字符） |
| locale | string | ❌ | `zh-CN`（默认）或 `en-US` |
| translationGroupId | string | ❌ | 翻译组 ID，同组文章互为翻译版本 |
| categoryId | string | ❌ | 分类 ID |
| tagIds | string[] | ❌ | 标签 ID 列表 |

---

## 二、分类管理

| 操作 | 方法 | 路径 |
|------|------|------|
| 获取分类树 | GET | `/admin/categories/tree` |
| 获取分类列表 | GET | `/admin/categories` |
| 创建分类 | POST | `/admin/categories` |
| 更新分类 | PATCH | `/admin/categories/:id` |
| 删除分类 | DELETE | `/admin/categories/:id` |

#### 创建分类

```json
{
  "name": "技术",
  "slug": "tech",
  "description": "技术相关文章",
  "parentId": null,
  "sortOrder": 1
}
```

> 支持最多 3 级嵌套。存在子分类时无法删除。

---

## 三、标签管理

| 操作 | 方法 | 路径 |
|------|------|------|
| 获取所有标签 | GET | `/admin/tags` |
| 创建标签 | POST | `/admin/tags` |
| 更新标签 | PATCH | `/admin/tags/:id` |
| 删除标签 | DELETE | `/admin/tags/:id` |

#### 创建标签

```json
{
  "name": "TypeScript",
  "slug": "typescript",
  "description": "TypeScript 相关内容"
}
```

---

## 四、项目管理

| 操作 | 方法 | 路径 |
|------|------|------|
| 获取项目列表 | GET | `/v1/projects?page=1&limit=10&featured=true` |
| 获取项目详情 | GET | `/v1/projects/:id` |
| 创建项目 | POST | `/v1/projects` |
| 更新项目 | PATCH | `/v1/projects/:id` |
| 删除项目 | DELETE | `/v1/projects/:id` |

#### 创建项目

```json
{
  "title": "项目名称",
  "description": "项目描述",
  "techStack": ["NestJS", "Next.js", "PostgreSQL"],
  "coverImage": "https://oss-url/cover.jpg",
  "link": "https://project-url.com",
  "githubUrl": "https://github.com/user/repo",
  "featured": true,
  "order": 1
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| title | string | ✅ | 项目名称 |
| description | string | ✅ | 项目描述 |
| techStack | string[] | ❌ | 技术栈列表 |
| coverImage | string | ❌ | 封面图 URL |
| link | string | ❌ | 项目链接 |
| githubUrl | string | ❌ | GitHub 地址 |
| featured | boolean | ❌ | 是否精选（默认 false） |
| order | number | ❌ | 排序权重（越小越靠前，默认 0） |

---

## 五、媒体管理

| 操作 | 方法 | 路径 |
|------|------|------|
| 上传文件 | POST | `/admin/media/upload`（multipart/form-data） |
| 获取媒体列表 | GET | `/admin/media?page=1&limit=20&mediaType=image` |
| 删除媒体 | DELETE | `/admin/media/:id` |

### OSS 直传流程

1. `POST /oss/signature` — 获取上传签名（传 filename、mimeType、size）
2. `POST {host}` — 直接上传文件到 OSS
3. `POST /admin/media/oss-record` — 无回调时记录媒体信息

---

## 六、站点配置

站点配置通过管理后台 UI 修改，公开接口可读取：

| 操作 | 方法 | 路径 |
|------|------|------|
| 获取站点配置 | GET | `/v1/public/site-config` |
| 获取站点统计 | GET | `/v1/public/stats` |

---

## 七、AI 能力

| 操作 | 方法 | 路径 | 说明 |
|------|------|------|------|
| 翻译文章 | POST | `/admin/ai/translate` | 传 title/content/summary/targetLanguage |
| SEO 优化 | POST | `/admin/ai/seo-optimize` | 传 title/content/summary |
| 文章翻译 | POST | `/admin/articles/:id/translate` | `createNewArticle: true` 自动创建翻译版 |
| 文章 SEO | POST | `/admin/articles/:id/seo-optimize` | 自动更新文章 SEO 字段 |
| 豆包对话 | POST | `/admin/ai/doubao/chat` | 传 prompt/systemPrompt |

---

## 八、公开接口（博客前端使用）

| 操作 | 方法 | 路径 | 说明 |
|------|------|------|------|
| 文章列表 | GET | `/v1/public/articles?page=1&pageSize=10&locale=zh-CN` | 支持 locale/category/tag/search |
| 文章详情 | GET | `/v1/public/articles/:slug?locale=zh-CN` | 按 slug 获取 |
| 文章 slugs | GET | `/v1/public/articles/slugs` | SSG 用 |
| 项目列表 | GET | `/v1/public/projects?featured=true` | 支持分页 |
| 项目详情 | GET | `/v1/public/projects/:id` | 按 ID 获取 |
| 分类列表 | GET | `/v1/public/categories` | 含文章数量 |
| 标签列表 | GET | `/v1/public/tags` | 含文章数量 |
| 搜索 | GET | `/v1/public/search?q=keyword&locale=zh-CN` | 全文搜索 |
| 时间轴 | GET | `/v1/public/timeline` | 可见条目 |

---

## 错误码

| 状态码 | 说明 |
|--------|------|
| 400 | 请求参数错误 |
| 401 | 未认证 |
| 403 | 无权限 |
| 404 | 资源不存在 |
| 409 | 资源冲突（如 slug 重复） |
| 500 | 服务器内部错误 |

## 什么时候用这个技能

- 发布新文章（中文/英文）
- 管理分类和标签
- 管理项目/作品集
- 上传媒体文件
- 查询站点数据和统计
- AI 翻译或 SEO 优化文章
