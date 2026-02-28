import { request } from '@umijs/max';

/** 获取项目列表 GET /api/admin/projects */
export async function getProjects(params?: {
  page?: number;
  limit?: number;
  featured?: boolean;
}) {
  return request<BlogAPI.PaginatedResponse<BlogAPI.Project>>(
    '/api/admin/projects',
    {
      method: 'GET',
      params,
    },
  );
}

/** 创建项目 POST /api/admin/projects */
export async function createProject(data: BlogAPI.CreateProjectParams) {
  return request<BlogAPI.Project>('/api/admin/projects', {
    method: 'POST',
    data,
  });
}

/** 更新项目 PATCH /api/admin/projects/:id */
export async function updateProject(
  id: string,
  data: BlogAPI.UpdateProjectParams,
) {
  return request<BlogAPI.Project>(`/api/admin/projects/${id}`, {
    method: 'PATCH',
    data,
  });
}

/** 删除项目 DELETE /api/admin/projects/:id */
export async function deleteProject(id: string) {
  return request<void>(`/api/admin/projects/${id}`, {
    method: 'DELETE',
  });
}
