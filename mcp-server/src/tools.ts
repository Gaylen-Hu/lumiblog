import type { BlogApiClient } from './client.js'

// ── 工具定义列表 ────────────────────────────────────────
export const TOOLS = [
  // 认证
  {
    name: 'login',
    description: '登录博客管理系统，获取 JWT Token（后续操作自动携带）',
    inputSchema: {
      type: 'object',
      properties: {
        email: { type: 'string', description: '管理员邮箱' },
        password: { type: 'string', description: '密码' },
      },
      required: ['email', 'password'],
    },
  },
  // 文章
  {
    name: 'list_articles',
    description: '获取文章列表，支持分页、关键词搜索和发布状态筛选',
    inputSchema: {
      type: 'object',
      properties: {
        page: { type: 'number', description: '页码，默认 1' },
        limit: { type: 'number', description: '每页数量，默认 10' },
        keyword: { type: 'string', description: '搜索关键词' },
        isPublished: { type: 'boolean', description: '筛选发布状态' },
      },
    },
  },
  {
    name: 'get_article',
    description: '根据 ID 获取文章详情',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string', description: '文章 ID' } },
      required: ['id'],
    },
  },
  {
    name: 'create_article',
    description: '创建新文章草稿',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: '文章标题' },
        slug: { type: 'string', description: 'URL slug（可选）' },
        content: { type: 'string', description: '文章内容（Markdown）' },
        categoryId: { type: 'string', description: '分类 ID' },
        tagIds: { type: 'array', items: { type: 'string' }, description: '标签 ID 列表' },
      },
      required: ['title'],
    },
  },
  {
    name: 'update_article',
    description: '更新文章内容',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: '文章 ID' },
        title: { type: 'string', description: '新标题' },
        slug: { type: 'string', description: '新 slug' },
        content: { type: 'string', description: '新内容（Markdown）' },
        categoryId: { type: 'string', description: '新分类 ID' },
        tagIds: { type: 'array', items: { type: 'string' }, description: '新标签 ID 列表' },
      },
      required: ['id'],
    },
  },
  {
    name: 'delete_article',
    description: '删除文章',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string', description: '文章 ID' } },
      required: ['id'],
    },
  },
  {
    name: 'publish_article',
    description: '发布文章（草稿 → 已发布）',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string', description: '文章 ID' } },
      required: ['id'],
    },
  },
  {
    name: 'unpublish_article',
    description: '取消发布文章（已发布 → 草稿）',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string', description: '文章 ID' } },
      required: ['id'],
    },
  },
  {
    name: 'translate_article',
    description: '使用 AI 翻译文章到目标语言',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: '文章 ID' },
        targetLanguage: { type: 'string', description: '目标语言，如 en-US 或 zh-CN' },
      },
      required: ['id', 'targetLanguage'],
    },
  },
  {
    name: 'seo_optimize_article',
    description: '使用 AI 自动生成文章的 SEO 标题、描述和关键词',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string', description: '文章 ID' } },
      required: ['id'],
    },
  },
  // 分类
  {
    name: 'list_categories',
    description: '获取所有分类列表',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'get_category_tree',
    description: '获取分类树形结构',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'create_category',
    description: '创建新分类',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: '分类名称' },
        slug: { type: 'string', description: 'URL slug（可选）' },
        parentId: { type: 'string', description: '父分类 ID（可选）' },
      },
      required: ['name'],
    },
  },
  {
    name: 'update_category',
    description: '更新分类信息',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: '分类 ID' },
        name: { type: 'string', description: '新名称' },
        slug: { type: 'string', description: '新 slug' },
      },
      required: ['id'],
    },
  },
  {
    name: 'delete_category',
    description: '删除分类（需先删除子分类）',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string', description: '分类 ID' } },
      required: ['id'],
    },
  },
  // 标签
  {
    name: 'list_tags',
    description: '获取所有标签列表',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'create_tag',
    description: '创建新标签',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: '标签名称' },
        slug: { type: 'string', description: 'URL slug（可选）' },
      },
      required: ['name'],
    },
  },
  {
    name: 'update_tag',
    description: '更新标签信息',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: '标签 ID' },
        name: { type: 'string', description: '新名称' },
        slug: { type: 'string', description: '新 slug' },
      },
      required: ['id'],
    },
  },
  {
    name: 'delete_tag',
    description: '删除标签',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string', description: '标签 ID' } },
      required: ['id'],
    },
  },
]

// ── 工具处理器 ──────────────────────────────────────────
export async function handleTool(
  name: string,
  args: Record<string, unknown>,
  client: BlogApiClient,
): Promise<unknown> {
  switch (name) {
    case 'login': {
      const res = await client.login(args.email as string, args.password as string)
      client.setToken(res.access_token)
      return { success: true, user: res.user, message: '登录成功，Token 已保存' }
    }
    case 'list_articles':
      return client.listArticles(args as Parameters<typeof client.listArticles>[0])
    case 'get_article':
      return client.getArticle(args.id as string)
    case 'create_article':
      return client.createArticle(args as Parameters<typeof client.createArticle>[0])
    case 'update_article': {
      const { id, ...data } = args as { id: string } & Parameters<typeof client.updateArticle>[1]
      return client.updateArticle(id, data)
    }
    case 'delete_article':
      await client.deleteArticle(args.id as string)
      return { success: true, message: '文章已删除' }
    case 'publish_article':
      return client.publishArticle(args.id as string)
    case 'unpublish_article':
      return client.unpublishArticle(args.id as string)
    case 'translate_article':
      return client.translateArticle(args.id as string, args.targetLanguage as string)
    case 'seo_optimize_article':
      return client.seoOptimizeArticle(args.id as string)
    case 'list_categories':
      return client.listCategories()
    case 'get_category_tree':
      return client.getCategoryTree()
    case 'create_category':
      return client.createCategory(args as Parameters<typeof client.createCategory>[0])
    case 'update_category': {
      const { id, ...data } = args as { id: string } & Parameters<typeof client.updateCategory>[1]
      return client.updateCategory(id, data)
    }
    case 'delete_category':
      await client.deleteCategory(args.id as string)
      return { success: true, message: '分类已删除' }
    case 'list_tags':
      return client.listTags()
    case 'create_tag':
      return client.createTag(args as Parameters<typeof client.createTag>[0])
    case 'update_tag': {
      const { id, ...data } = args as { id: string } & Parameters<typeof client.updateTag>[1]
      return client.updateTag(id, data)
    }
    case 'delete_tag':
      await client.deleteTag(args.id as string)
      return { success: true, message: '标签已删除' }
    default:
      throw new Error(`未知工具: ${name}`)
  }
}
