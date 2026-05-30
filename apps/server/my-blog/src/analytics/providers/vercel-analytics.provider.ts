import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface VercelTimeSeriesPoint {
  date: string;
  pageViews: number;
  visitors: number;
  bounceRate: number;
}

export interface VercelStatItem {
  key: string;
  total: number;
  devices: number;
}

type Period = '24h' | '7d' | '30d' | '90d';

/** Vercel Web Analytics stats 支持的维度 */
type StatType =
  | 'path'
  | 'referrer'
  | 'referrer_hostname'
  | 'country'
  | 'client_name'
  | 'os_name'
  | 'device_type'
  | 'route';

@Injectable()
export class VercelAnalyticsProvider {
  private readonly logger = new Logger(VercelAnalyticsProvider.name);
  private readonly token: string;
  private readonly teamId: string;
  private readonly projectId: string;
  private readonly baseUrl = 'https://api.vercel.com/web-analytics';

  constructor(private readonly configService: ConfigService) {
    this.token = this.configService.get<string>('VERCEL_TOKEN', '');
    this.teamId = this.configService.get<string>('VERCEL_TEAM_ID', '');
    this.projectId = this.configService.get<string>('VERCEL_PROJECT_ID', '');
  }

  get isConfigured(): boolean {
    return !!this.token && !!this.projectId;
  }

  private get headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.token}`,
      'Content-Type': 'application/json',
    };
  }

  private buildBaseParams(period: Period): URLSearchParams {
    const sp = new URLSearchParams({
      projectId: this.projectId,
      environment: 'production',
      from: this.getFromDate(period),
      to: this.formatDate(new Date()),
    });
    if (this.teamId) sp.set('teamId', this.teamId);
    return sp;
  }

  /**
   * 获取页面浏览量时间序列
   */
  async getTimeSeries(period: Period): Promise<VercelTimeSeriesPoint[]> {
    if (!this.isConfigured) return [];

    try {
      const params = this.buildBaseParams(period);
      const res = await fetch(`${this.baseUrl}/timeseries?${params}`, {
        headers: this.headers,
      });

      if (!res.ok) {
        this.logger.warn(`Vercel timeseries error: ${res.status}`);
        return [];
      }

      const data = await res.json();
      const series = data?.data?.groups?.all;
      if (!Array.isArray(series)) return [];

      return series.map((point: { key: string; total: number; devices: number; bounceRate: number }) => ({
        date: point.key,
        pageViews: point.total || 0,
        visitors: point.devices || 0,
        bounceRate: point.bounceRate || 0,
      }));
    } catch (err) {
      this.logger.error('Failed to fetch Vercel time series', err);
      return [];
    }
  }

  /**
   * 获取热门页面
   */
  async getTopPages(period: Period, limit = 10): Promise<{ page: string; views: number }[]> {
    const items = await this.getStats('path', period, limit);
    return items.map((item) => ({ page: item.key, views: item.total }));
  }

  /**
   * 获取热门来源
   */
  async getTopReferrers(period: Period, limit = 10): Promise<{ referrer: string; views: number }[]> {
    const items = await this.getStats('referrer', period, limit);
    return items.map((item) => ({ referrer: item.key || 'Direct', views: item.total }));
  }

  /**
   * 获取设备分布
   */
  async getDevices(period: Period, limit = 5): Promise<{ device: string; views: number }[]> {
    const items = await this.getStats('device_type', period, limit);
    return items.map((item) => ({ device: item.key || 'Unknown', views: item.total }));
  }

  /**
   * 获取国家/地区分布
   */
  async getCountries(period: Period, limit = 10): Promise<{ country: string; views: number }[]> {
    const items = await this.getStats('country', period, limit);
    return items.map((item) => ({ country: item.key || 'Unknown', views: item.total }));
  }

  /**
   * 通用维度统计查询
   */
  private async getStats(type: StatType, period: Period, limit: number): Promise<VercelStatItem[]> {
    if (!this.isConfigured) return [];

    try {
      const params = this.buildBaseParams(period);
      params.set('type', type);
      params.set('limit', String(limit));

      const res = await fetch(`${this.baseUrl}/stats?${params}`, {
        headers: this.headers,
      });

      if (!res.ok) {
        this.logger.warn(`Vercel stats[${type}] error: ${res.status}`);
        return [];
      }

      const data = await res.json();
      return Array.isArray(data?.data) ? data.data : [];
    } catch (err) {
      this.logger.error(`Failed to fetch Vercel stats[${type}]`, err);
      return [];
    }
  }

  private getFromDate(period: Period): string {
    const dayMap: Record<Period, number> = {
      '24h': 1,
      '7d': 7,
      '30d': 30,
      '90d': 90,
    };
    const from = new Date(Date.now() - dayMap[period] * 86400000);
    return this.formatDate(from);
  }

  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }
}
