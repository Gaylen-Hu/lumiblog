// TODO: 后端需要实现文章管理接口
// 当前使用 mock 数据进行前端开发

const mockArticles: BlogAPI.Article[] = [
  {
    id: '1',
    title: 'NestJS 入门指南',
    slug: 'nestjs-getting-started',
    summary: '本文介绍 NestJS 的基础概念和使用方法',
    content: '# NestJS 入门\n\nNestJS 是一个用于构建高效、可扩展的 Node.js 服务端应用程序的框架。',
    coverImage: 'https://picsum.photos/800/400?random=1',
    isPublished: true,
    publishedAt: '2024-01-15T12:00:00.000Z',
    seoTitle: 'NestJS 入门教程 - 2024最新版',
    seoDescription: '详细介绍 NestJS 框架的安装、配置和基础使用',
    createdAt: '2024-01-15T10:00:00.000Z',
    updatedAt: '2024-01-15T12:00:00.000Z',
  },
  {
    id: '2',
    title: 'React 19 新特性解析',
    slug: 'react-19-new-features',
    summary: '深入了解 React 19 带来的新功能和改进',
    content: '# React 19 新特性\n\nReact 19 引入了许多令人兴奋的新特性...',
    coverImage: 'https://picsum.photos/800/400?random=2',
    isPublished: false,
    publishedAt: null,
    seoTitle: null,
    seoDescription: null,
    createdAt: '2024-01-20T08:00:00.000Z',
    updatedAt: '2024-01-20T08:00:00.000Z',
  },
  {
    id: '3',
    title: 'TypeScript 高级类型技巧',
    slug: 'typescript-advanced-types',
    summary: '掌握 TypeScript 中的高级类型系统',
    content: '# TypeScript 高级类型\n\n本文将介绍 TypeScript 中的高级类型技巧...',
    coverImage: null,
    isPublished: true,
    publishedAt: '2024-01-18T14:00:00.000Z',
    seoTitle: 'TypeScript 高级类型完全指南',
    seoDescription: '学习 TypeScript 中的条件类型、映射类型等高级特性',
    createdAt: '2024-01-17T09:00:00.000Z',
    updatedAt: '2024-01-18T14:00:00.000Z',
  },
];

let idCounter = mockArticles.length + 1;

export default {
  // 获取文章列表
  'GET /api/admin/articles': (req: any, res: any) => {
    const { page = 1, limit = 10, keyword, isPublished } = req.query;
    let filtered = [...mockArticles];

    if (keyword) {
      filtered = filtered.filter((a) => a.title.includes(keyword));
    }
    if (isPublished !== undefined) {
      const published = isPublished === 'true';
      filtered = filtered.filter((a) => a.isPublished === published);
    }

    const start = (Number(page) - 1) * Number(limit);
    const data = filtered.slice(start, start + Number(limit));

    res.json({
      data,
      total: filtered.length,
      page: Number(page),
      limit: Number(limit),
    });
  },

  // 获取单个文章
  'GET /api/admin/articles/:id': (req: any, res: any) => {
    const article = mockArticles.find((a) => a.id === req.params.id);
    if (article) {
      res.json(article);
    } else {
      res.status(404).json({ message: '文章不存在' });
    }
  },

  // 创建文章
  'POST /api/admin/articles': (req: any, res: any) => {
    const now = new Date().toISOString();
    const article: BlogAPI.Article = {
      id: String(idCounter++),
      ...req.body,
      isPublished: false,
      publishedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    mockArticles.unshift(article);
    res.json(article);
  },

  // 更新文章
  'PATCH /api/admin/articles/:id': (req: any, res: any) => {
    const index = mockArticles.findIndex((a) => a.id === req.params.id);
    if (index !== -1) {
      mockArticles[index] = {
        ...mockArticles[index],
        ...req.body,
        updatedAt: new Date().toISOString(),
      };
      res.json(mockArticles[index]);
    } else {
      res.status(404).json({ message: '文章不存在' });
    }
  },

  // 删除文章
  'DELETE /api/admin/articles/:id': (req: any, res: any) => {
    const index = mockArticles.findIndex((a) => a.id === req.params.id);
    if (index !== -1) {
      mockArticles.splice(index, 1);
      res.status(204).send();
    } else {
      res.status(404).json({ message: '文章不存在' });
    }
  },

  // 发布文章
  'POST /api/admin/articles/:id/publish': (req: any, res: any) => {
    const index = mockArticles.findIndex((a) => a.id === req.params.id);
    if (index !== -1) {
      mockArticles[index] = {
        ...mockArticles[index],
        isPublished: true,
        publishedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      res.json(mockArticles[index]);
    } else {
      res.status(404).json({ message: '文章不存在' });
    }
  },

  // 取消发布
  'POST /api/admin/articles/:id/unpublish': (req: any, res: any) => {
    const index = mockArticles.findIndex((a) => a.id === req.params.id);
    if (index !== -1) {
      mockArticles[index] = {
        ...mockArticles[index],
        isPublished: false,
        updatedAt: new Date().toISOString(),
      };
      res.json(mockArticles[index]);
    } else {
      res.status(404).json({ message: '文章不存在' });
    }
  },
};
