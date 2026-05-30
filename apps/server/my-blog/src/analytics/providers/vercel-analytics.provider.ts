import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface VercelAnalyticsData {
  pageViews: number;
  visitors: number;
  topPages: { page: string; views: number }[];
  topReferrers: { referrer: string; views: number }[];
  topCountries: { country: string; views: number }[];
  topDevices: { device: string; views: number }[];
}

export interface VercelTimeSeriesPoint {
  date: string;
  pageViews: number;
  visitors: number;
}

@Injectable()
export class VercelAnalyticsProvider {
  private readonly logger = new Logger(VercelAnalyticsProvider.name);
  private readonly token: string;
  private readonly teamId: string;
  private readonly projectId: string;
  private readonly baseUrl = 'https://vercel.com/api/web/insights';

  constructor(private readonly configService: ConfigService) {
    this.token = this.configService.get<string>('VERCEL_TOKEN', '');
    this.teamId = this.configService.get<string>('VERCEL_TEAM_ID', '');
    this.projectId = this.configService.get<string>('VERCEL_PROJECT_ID', '');
  }

  private get headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.token}`,
      'Content-Type': 'application/json',
    };
  }

  private buildParams(params: Record<string, string>): URLSearchParams {
    const sp = new URLSearchParams(params);
    if (this.teamId) sp.set('teamId', this.teamId);
    sp.set('projectId', this.projectId);
    return sp;
  }

  /**
   * 获取页面浏览量时间序列
   */
  async getTimeSeries(period: '24h' | '7d' | '30d' | '90d'): Promise<VercelTimeSeriesPoint[]> {
    if (!this.token) return [];

    try {
      const params = this.buildParams({
        environment: 'production',
        filter: '{}',
        from: this.getFromDate(period),
        to: new Date().toISOString(),
      });

      const res = await fetch(`${this.baseUrl}/stats?${params}`, {
        headers: this.headers,
      });

      if (!res.ok) {
        this.logger.warn(`Vercel API error: ${res.status} ${res.statusText}`);
        return [];
      }

      const data = await res.json();
      return this.mapTimeSeries(data);
    } catch (err) {
      this.logger.error('Failed to fetch Vercel time series', err);
      return [];
    }
  }

  /**
   * 获取热门页面
   */
  async getTopPages(period: '24h' | '7d' | '30d' | '90d', limit = 10): Promise<{ page: string; views: number }[]> {
    return this.getInsight('path', period, limit);
  }

  /**
   * 获取热门来源
   */
  async getTopReferrers(period: '24h' | '7d' | '30d' | '90d', limit = 10): Promise<{ referrer: string; views: number }[]> {
    const data = await this.getInsight('referrer', period, limit);
    return data.map((item) => ({ referrer: item.page, views: item.views }));
  }

  /**
   * 获取设备分布
   */
  async getDevices(period: '24h' | '7d' | '30d' | '90d'): Promise<{ device: string; views: number }[]> {
    const data = await this.getInsight('device', period, 5);
    return data.map((item) => ({ device: item.page, views: item.views }));
  }

  /**
   * 获取国家/地区分布
   */
  async getCountries(period: '24h' | '7d' | '30d' | '90d', limit = 10): Promise<{ country: string; views: number }[]> {
    const data = await this.getInsight('country', period, limit);
    return data.map((item) => ({ country: item.page, views: item.views }));
  }

  private async getInsight(
    type: string,
    period: '24h' | '7d' | '30d' | '90d',
    limit: number,
  ): Promise<{ page: string; views: number }[]> {
    if (!this.token) return [];

    try {
      const params = this.buildParams({
        environment: 'production',
        filter: '{}',
        from: this.getFromDate(period),
        to: new Date().toISOString(),
        limit: String(limit),
      });

      const res = await fetch(`${this.baseUrl}/${type}?${params}`, {
        headers: this.headers,
      });

      if (!res.ok) {
        this.logger.warn(`Vercel insight ${type} error: ${res.status}`);
        return [];
      }

      const data = await res.json();
      return (data.data || []).map((item: { key: string; total: number }) => ({
        page: item.key,
        views: item.total,
      }));
    } catch (err) {
      this.logger.error(`Failed to fetch Vercel ${type}`, err);
      return [];
    }
  }

  private getFromDate(period: '24h' | '7d' | '30d' | '90d'): string {
    const now = new Date();
    const msMap: Record<string, number> = {
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
      '90d': 90 * 24 * 60 * 60 * 1000,
    };
    return new Date(now.getTime() - msMap[period]).toISOString();
  }

  private mapTimeSeries(data: unknown): VercelTimeSeriesPoint[] {
    if (!data || typeof data !== 'object') return [];
    const series = (data as { data?: { key: string; total: number; devices: number }[] }).data;
    if (!Array.isArray(series)) return [];
    return series.map((point) => ({
      date: point.key,
      pageViews: point.total || 0,
      visitors: point.devices || 0,
    }));
  }
}
