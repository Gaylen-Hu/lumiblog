import { request } from '@umijs/max';

/** 获取时间轴条目列表 GET /api/admin/timeline */
export async function getTimelines(params?: { page?: number; limit?: number }) {
  return request<BlogAPI.PaginatedResponse<BlogAPI.Timeline>>(
    '/api/admin/timeline',
    {
      method: 'GET',
      params,
    },
  );
}

/** 创建时间轴条目 POST /api/admin/timeline */
export async function createTimeline(data: BlogAPI.CreateTimelineParams) {
  return request<BlogAPI.Timeline>('/api/admin/timeline', {
    method: 'POST',
    data,
  });
}

/** 更新时间轴条目 PATCH /api/admin/timeline/:id */
export async function updateTimeline(
  id: string,
  data: BlogAPI.UpdateTimelineParams,
) {
  return request<BlogAPI.Timeline>(`/api/admin/timeline/${id}`, {
    method: 'PATCH',
    data,
  });
}

/** 删除时间轴条目 DELETE /api/admin/timeline/:id */
export async function deleteTimeline(id: string) {
  return request<void>(`/api/admin/timeline/${id}`, {
    method: 'DELETE',
  });
}
