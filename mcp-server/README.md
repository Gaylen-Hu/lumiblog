# Blog MCP Server

通过 MCP 协议让 Claude 直接管理博客内容。

## 支持的操作

| 工具 | 说明 |
|------|------|
| `login` | 登录获取 Token |
| `list_articles` | 文章列表（支持搜索/筛选） |
| `get_article` | 获取文章详情 |
| `create_article` | 创建文章草稿 |
| `update_article` | 更新文章 |
| `delete_article` | 删除文章 |
| `publish_article` | 发布文章 |
| `unpublish_article` | 取消发布 |
| `translate_article` | AI 翻译文章 |
| `seo_optimize_article` | AI 生成 SEO 信息 |
| `list_categories` | 分类列表 |
| `get_category_tree` | 分类树 |
| `create_category` | 创建分类 |
| `update_category` | 更新分类 |
| `delete_category` | 删除分类 |
| `list_tags` | 标签列表 |
| `create_tag` | 创建标签 |
| `update_tag` | 更新标签 |
| `delete_tag` | 删除标签 |

## 构建

```bash
pnpm install
pnpm build
```

## 配置 Claude Desktop

编辑 `%APPDATA%\Claude\claude_desktop_config.json`（Windows）：

```json
{
  "mcpServers": {
    "blog-manager": {
      "command": "node",
      "args": ["D:/demo/myblog/mcp-server/dist/index.js"],
      "env": {
        "BLOG_API_URL": "http://localhost:3000"
      }
    }
  }
}
```

生产环境把 `BLOG_API_URL` 改为 `https://api.example.com`。

也可以直接设置 Token 跳过每次登录：

```json
"env": {
  "BLOG_API_URL": "https://api.example.com",
  "BLOG_API_TOKEN": "your_jwt_token_here"
}
```

## 使用示例

在 Claude 中直接说：

- "帮我列出所有草稿文章"
- "创建一篇标题为《TypeScript 最佳实践》的文章"
- "把 ID 为 xxx 的文章发布"
- "用 AI 翻译文章 xxx 为英文"
