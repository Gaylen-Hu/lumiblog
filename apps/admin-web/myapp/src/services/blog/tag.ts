import { request } from '@umijs/max';

/** 获取所有标签 GET /api/tags */
export async function getTags() {
  return request<BlogAPI.Tag[]>('/api/tags', {
    method: 'GET',
  });
}

/** 获取单个标签 GET /api/admin/tags/:id */
export async function getTag(id: string) {
  return request<BlogAPI.Tag>(`/api/admin/tags/${id}`, {
    method: 'GET',
  });
}

/** 创建标签 POST /api/admin/tags */
export async function createTag(data: BlogAPI.CreateTagParams) {
  return request<BlogAPI.Tag>('/api/admin/tags', {
    method: 'POST',
    data,
  });
}

/** 更新标签 PATCH /api/admin/tags/:id */
export async function updateTag(id: string, data: BlogAPI.UpdateTagParams) {
  return request<BlogAPI.Tag>(`/api/admin/tags/${id}`, {
    method: 'PATCH',
    data,
  });
}

/** 删除标签 DELETE /api/admin/tags/:id */
export async function deleteTag(id: string) {
  return request<void>(`/api/admin/tags/${id}`, {
    method: 'DELETE',
  });
}
