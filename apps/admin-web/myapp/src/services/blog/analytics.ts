import { request } from '@umijs/max';

/** 时间范围 */
export type AnalyticsPeriod = '24h' | '7d' | '30d' | '90d';

/** 流量概览 GET /api/analytics/overview */
export async function getAnalyticsOverview(period: AnalyticsPeriod) {
  return request<BlogAPI.AnalyticsOverview>('/api/analytics/overview', {
    method: 'GET',
    params: { period },
  });
}

/** 时间序列 GET /api/analytics/time-series */
export async function getAnalyticsTimeSeries(period: AnalyticsPeriod) {
  return request<BlogAPI.AnalyticsTimePoint[]>('/api/analytics/time-series', {
    method: 'GET',
    params: { period },
  });
}

/** 热门页面 GET /api/analytics/top-pages */
export async function getAnalyticsTopPages(period: AnalyticsPeriod) {
  return request<BlogAPI.AnalyticsTopPage[]>('/api/analytics/top-pages', {
    method: 'GET',
    params: { period },
  });
}

/** 热门来源 GET /api/analytics/top-referrers */
export async function getAnalyticsTopReferrers(period: AnalyticsPeriod) {
  return request<BlogAPI.AnalyticsTopReferrer[]>('/api/analytics/top-referrers', {
    method: 'GET',
    params: { period },
  });
}

/** 设备分布 GET /api/analytics/devices */
export async function getAnalyticsDevices(period: AnalyticsPeriod) {
  return request<BlogAPI.AnalyticsDimension[]>('/api/analytics/devices', {
    method: 'GET',
    params: { period },
  });
}

/** 地区分布 GET /api/analytics/countries */
export async function getAnalyticsCountries(period: AnalyticsPeriod) {
  return request<BlogAPI.AnalyticsDimension[]>('/api/analytics/countries', {
    method: 'GET',
    params: { period },
  });
}
