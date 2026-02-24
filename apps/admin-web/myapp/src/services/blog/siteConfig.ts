import { request } from '@umijs/max';

// TODO: 后端需要实现网站配置接口

/** 获取网站配置 */
export async function getSiteConfig() {
  return request<BlogAPI.SiteConfig>('/api/site-config', {
    method: 'GET',
  });
}

/** 更新网站配置 */
export async function updateSiteConfig(data: BlogAPI.UpdateSiteConfigParams) {
  return request<BlogAPI.SiteConfig>('/api/site-config', {
    method: 'PUT',
    data,
  });
}
