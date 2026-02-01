import { request } from '@umijs/max';

/** 获取文章列表（管理端） GET /api/admin/articles */
export async function getArticles(params?: {
  page?: number;
  limit?: number;
  keyword?: string;
  isPublished?: boolean;
}) {
  return request<BlogAPI.PaginatedResponse<BlogAPI.ArticleWithRelations>>('/api/admin/articles', {
    method: 'GET',
    params,
  });
}

/** 获取单个文章 GET /api/admin/articles/:id */
export async function getArticle(id: string) {
  return request<BlogAPI.Article>(`/api/admin/articles/${id}`, {
    method: 'GET',
  });
}

/** 创建文章 POST /api/admin/articles */
export async function createArticle(data: BlogAPI.CreateArticleParams) {
  return request<BlogAPI.Article>('/api/admin/articles', {
    method: 'POST',
    data,
  });
}

/** 更新文章 PATCH /api/admin/articles/:id */
export async function updateArticle(id: string, data: BlogAPI.UpdateArticleParams) {
  return request<BlogAPI.Article>(`/api/admin/articles/${id}`, {
    method: 'PATCH',
    data,
  });
}

/** 删除文章 DELETE /api/admin/articles/:id */
export async function deleteArticle(id: string) {
  return request<void>(`/api/admin/articles/${id}`, {
    method: 'DELETE',
  });
}

/** 发布文章 POST /api/admin/articles/:id/publish */
export async function publishArticle(id: string) {
  return request<BlogAPI.Article>(`/api/admin/articles/${id}/publish`, {
    method: 'POST',
  });
}

/** 取消发布文章 POST /api/admin/articles/:id/unpublish */
export async function unpublishArticle(id: string) {
  return request<BlogAPI.Article>(`/api/admin/articles/${id}/unpublish`, {
    method: 'POST',
  });
}

/** AI 翻译文章 POST /api/admin/articles/:id/translate */
export async function translateArticle(id: string, params?: BlogAPI.TranslateArticleParams) {
  return request<BlogAPI.TranslateArticleResponse>(`/api/admin/articles/${id}/translate`, {
    method: 'POST',
    data: params,
  });
}

/** AI 生成 SEO 信息 POST /api/admin/articles/:id/seo-optimize */
export async function optimizeArticleSeo(id: string) {
  return request<BlogAPI.SeoOptimizeResponse>(`/api/admin/articles/${id}/seo-optimize`, {
    method: 'POST',
  });
}

/** 发布到微信公众号 POST /api/admin/articles/:id/publish-wechat */
export async function publishToWechat(id: string, params?: BlogAPI.PublishToWechatParams) {
  return request<BlogAPI.PublishToWechatResponse>(`/api/admin/articles/${id}/publish-wechat`, {
    method: 'POST',
    data: params,
  });
}
