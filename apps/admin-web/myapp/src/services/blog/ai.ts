import { request } from '@umijs/max';

/** AI 文生图 POST /api/admin/ai/image/generate */
export async function generateImage(data: BlogAPI.ImageGenerationParams) {
  return request<BlogAPI.ImageGenerationResponse>('/api/admin/ai/image/generate', {
    method: 'POST',
    data,
  });
}
