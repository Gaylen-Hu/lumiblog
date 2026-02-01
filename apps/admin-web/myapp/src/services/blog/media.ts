import { request } from '@umijs/max';

/** 获取媒体列表 GET /api/admin/media */
export async function getMediaList(params?: {
  page?: number;
  limit?: number;
  mediaType?: string;
}) {
  return request<BlogAPI.PaginatedResponse<BlogAPI.Media>>('/api/admin/media', {
    method: 'GET',
    params,
  });
}

/** 获取单个媒体 GET /api/admin/media/:id */
export async function getMedia(id: string) {
  return request<BlogAPI.Media>(`/api/admin/media/${id}`, {
    method: 'GET',
  });
}

/** 删除媒体 DELETE /api/admin/media/:id */
export async function deleteMedia(id: string) {
  return request<void>(`/api/admin/media/${id}`, {
    method: 'DELETE',
  });
}

/** 获取 OSS 上传签名 POST /api/oss/signature */
export async function getOssSignature(data: BlogAPI.OssSignatureRequest) {
  return request<BlogAPI.OssSignatureResponse>('/api/oss/signature', {
    method: 'POST',
    data,
  });
}
