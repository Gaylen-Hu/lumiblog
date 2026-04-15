# Skill: 博客发布

将审校通过的文章发布到博客网站 `badmin.new-universe.cn`。
脚本和配置文件位于本目录（`publish.js`、`config.json`）。
文章默认在 `/root/qqopenclawlgo/my-articles`。

## ⚠️ 强制要求

**每次发布必须提供以下所有参数，不允许省略任何一个：**

1. `--file` — 文章 Markdown 文件路径
2. `--cover` — 封面图路径（如果有封面图的话）
3. `--seo-title` — Agent 根据文章内容生成的 SEO 标题
4. `--seo-description` — Agent 根据文章内容生成的 SEO 描述
5. `--summary` — Agent 根据文章内容生成的摘要
6. `--category` — 分类 ID（通过 API 查询已有分类，选择最匹配的）
7. `--tags` — 标签 ID 列表（通过 API 查询已有标签，选择相关的，逗号分隔）

**脚本默认直接发布。** 只有 Boss 明确说"先不发"时才加 `--no-publish` 创建草稿。

## 发布前准备（Agent 必须完成）

### 1. 阅读文章全文

仔细阅读文章内容，理解核心主题、关键论点和目标读者。

### 2. 生成 SEO 信息（不允许跳过）

根据文章内容生成以下三项，每一项都必须认真撰写：

- **seoTitle**（≤100字符）：包含核心关键词，格式参考 `核心主题关键词 — 补充价值描述 | 新宇宙博客`，要能吸引搜索引擎点击
- **seoDescription**（≤300字符）：用 1-2 句话概括文章核心价值，必须包含主要关键词，让搜索引擎用户一眼看懂文章讲什么
- **summary**（≤500字符）：提炼文章的核心观点和结论，帮助读者快速判断是否值得阅读

### 3. 匹配分类和标签（不允许跳过）

**分类：**
1. 调用 `GET /admin/categories/tree` 获取已有分类列表
2. 根据文章主题选择最匹配的分类 ID
3. 如果没有合适的分类，调用 `POST /admin/categories` 创建新分类（需提供 name、slug），然后使用返回的 ID

**标签：**
1. 调用 `GET /admin/tags` 获取已有标签列表
2. 根据文章内容确定需要哪些标签（通常 3-5 个，覆盖文章核心主题和关键技术词）
3. 已有的标签直接使用其 ID
4. 缺少的标签调用 `POST /admin/tags` 逐个创建（需提供 name、slug），然后使用返回的 ID
5. 最终将所有标签 ID 用逗号拼接传入 `--tags`

**原则：以文章内容为准，需要什么分类/标签就用什么，已有的直接用，没有的就创建。**

## 调用示例

```bash
# 标准发布（默认直接发布）
node publish.js \
  --file "/root/qqopenclawlgo/my-articles/文章标题.md" \
  --cover "/root/qqopenclawlgo/downloads/images/封面图.png" \
  --seo-title "核心关键词 — 价值描述 | 新宇宙博客" \
  --seo-description "1-2句话概括文章核心价值，包含关键词" \
  --summary "提炼文章核心观点和结论的摘要" \
  --category "分类ID" \
  --tags "标签ID1,标签ID2,标签ID3"

# 仅创建草稿（Boss 说先不发时）
node publish.js \
  --file "/root/qqopenclawlgo/my-articles/文章标题.md" \
  --cover "/root/qqopenclawlgo/downloads/images/封面图.png" \
  --seo-title "SEO标题" \
  --seo-description "SEO描述" \
  --summary "摘要" \
  --category "分类ID" \
  --tags "标签ID1,标签ID2" \
  --no-publish
```

## 发布流程

1. Agent 阅读文章全文
2. Agent 生成 seoTitle、seoDescription、summary
3. Agent 查询分类和标签，匹配 categoryId 和 tagIds
4. 脚本用 API Key 认证
5. 封面图通过 OSS 直传（获取签名 → 上传 OSS → 记录媒体）
6. 解析 Markdown（标题、正文、slug）
7. 创建文章（包含所有字段：标题、正文、摘要、封面图、SEO 信息、分类、标签）
8. 直接发布（默认行为）

## 参数说明

| 参数 | 必填 | 说明 |
|------|------|------|
| --file | ✅ | Markdown 文章路径 |
| --cover | ✅* | 封面图路径（OSS 直传），有封面图时必传 |
| --seo-title | ✅ | SEO 标题，Agent 必须根据文章内容生成 |
| --seo-description | ✅ | SEO 描述，Agent 必须根据文章内容生成 |
| --summary | ✅ | 文章摘要，Agent 必须根据文章内容生成 |
| --category | ✅ | 分类 ID，Agent 必须查询后选择 |
| --tags | ✅ | 标签 ID（逗号分隔），Agent 必须查询后选择 |
| --no-publish | ❌ | 加此 flag 只创建草稿不发布（默认直接发布） |

## 图片上传方式

封面图使用 OSS 直传，流程：
1. `POST /oss/signature` 获取上传签名
2. 直接上传文件到 OSS（`POST {host}`）
3. 无回调时调用 `POST /admin/media/oss-record` 记录媒体信息

## API 接口

- 基础地址：`https://badmin.new-universe.cn/api`
- 认证方式：`Authorization: Bearer {API_KEY}`
- 创建文章：`POST /admin/articles`
- 发布文章：`POST /admin/articles/{id}/publish`
- OSS 签名：`POST /oss/signature`
- 媒体记录：`POST /admin/media/oss-record`
- 分类树：`GET /admin/categories/tree`
- 标签列表：`GET /admin/tags`
- 创建标签：`POST /admin/tags`

## 配置

`config.json`（与 `publish.js` 同目录）中的 `base_url` 已配好。API Key 通过环境变量 `BLOG_API_KEY` 或 `config.json` 中的 `api_key` 读取。

## 什么时候用

- 镜微审校通过（70分以上）后执行
- 默认直接发布
- Boss 说"先不发"时加 `--no-publish` 只创建草稿
