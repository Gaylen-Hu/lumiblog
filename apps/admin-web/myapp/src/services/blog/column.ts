import { request } from '@umijs/max';

/** 获取专栏列表 GET /api/admin/columns */
export async function getColumns(params?: BlogAPI.QueryColumnParams) {
  return request<BlogAPI.PaginatedResponse<BlogAPI.Column>>('/api/admin/columns', {
    method: 'GET',
    params,
  });
}

/** 获取专栏详情 GET /api/admin/columns/:id */
export async function getColumnDetail(id: string) {
  return request<BlogAPI.ColumnDetail>(`/api/admin/columns/${id}`, {
    method: 'GET',
  });
}

/** 创建专栏 POST /api/admin/columns */
export async function createColumn(data: BlogAPI.CreateColumnParams) {
  return request<BlogAPI.Column>('/api/admin/columns', {
    method: 'POST',
    data,
  });
}

/** 更新专栏 PATCH /api/admin/columns/:id */
export async function updateColumn(id: string, data: BlogAPI.UpdateColumnParams) {
  return request<BlogAPI.Column>(`/api/admin/columns/${id}`, {
    method: 'PATCH',
    data,
  });
}

/** 删除专栏 DELETE /api/admin/columns/:id */
export async function deleteColumn(id: string) {
  return request<void>(`/api/admin/columns/${id}`, {
    method: 'DELETE',
  });
}

/** 添加文章到专栏 POST /api/admin/columns/:id/articles */
export async function addColumnArticle(columnId: string, data: BlogAPI.AddColumnArticleParams) {
  return request<BlogAPI.ColumnArticleItem>(`/api/admin/columns/${columnId}/articles`, {
    method: 'POST',
    data,
  });
}

/** 从专栏移除文章 DELETE /api/admin/columns/:id/articles/:articleId */
export async function removeColumnArticle(columnId: string, articleId: string) {
  return request<void>(`/api/admin/columns/${columnId}/articles/${articleId}`, {
    method: 'DELETE',
  });
}

/** 重新排序专栏文章 PATCH /api/admin/columns/:id/articles/reorder */
export async function reorderColumnArticles(
  columnId: string,
  data: BlogAPI.ReorderColumnArticlesParams,
) {
  return request<void>(`/api/admin/columns/${columnId}/articles/reorder`, {
    method: 'PATCH',
    data,
  });
}
