import { request } from '@umijs/max';

/** 获取 API Key 列表 */
export async function getApiKeys() {
  return request<BlogAPI.ApiKey[]>('/api/api-keys', {
    method: 'GET',
  });
}

/** 创建 API Key */
export async function createApiKey(data: BlogAPI.CreateApiKeyParams) {
  return request<BlogAPI.CreateApiKeyResponse>('/api/api-keys', {
    method: 'POST',
    data,
  });
}

/** 撤销 API Key */
export async function revokeApiKey(id: string) {
  return request<BlogAPI.ApiKey>(`/api/api-keys/${id}/revoke`, {
    method: 'PATCH',
  });
}

/** 删除 API Key */
export async function deleteApiKey(id: string) {
  return request<void>(`/api/api-keys/${id}`, {
    method: 'DELETE',
  });
}
