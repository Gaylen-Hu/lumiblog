import { request } from '@umijs/max';

/** 获取分类树 GET /api/admin/categories/tree */
export async function getCategoryTree() {
  return request<BlogAPI.CategoryTreeNode[]>('/api/admin/categories/tree', {
    method: 'GET',
  });
}

/** 获取分类列表（扁平） GET /api/admin/categories */
export async function getCategories() {
  return request<BlogAPI.Category[]>('/api/admin/categories', {
    method: 'GET',
  });
}

/** 获取单个分类 GET /api/admin/categories/:id */
export async function getCategory(id: string) {
  return request<BlogAPI.Category>(`/api/admin/categories/${id}`, {
    method: 'GET',
  });
}

/** 创建分类 POST /api/admin/categories */
export async function createCategory(data: BlogAPI.CreateCategoryParams) {
  return request<BlogAPI.Category>('/api/admin/categories', {
    method: 'POST',
    data,
  });
}

/** 更新分类 PATCH /api/admin/categories/:id */
export async function updateCategory(id: string, data: BlogAPI.UpdateCategoryParams) {
  return request<BlogAPI.Category>(`/api/admin/categories/${id}`, {
    method: 'PATCH',
    data,
  });
}

/** 删除分类 DELETE /api/admin/categories/:id */
export async function deleteCategory(id: string) {
  return request<void>(`/api/admin/categories/${id}`, {
    method: 'DELETE',
  });
}
