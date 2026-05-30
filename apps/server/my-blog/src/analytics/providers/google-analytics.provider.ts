import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BetaAnalyticsDataClient } from '@google-analytics/data';

export interface GaTimeSeriesPoint {
  date: string;
  pageViews: number;
  visitors: number;
}

export interface GaDimensionItem {
  key: string;
  views: number;
}

type Period = '24h' | '7d' | '30d' | '90d';

@Injectable()
export class GoogleAnalyticsProvider {
  private readonly logger = new Logger(GoogleAnalyticsProvider.name);
  private readonly propertyId: string;
  private client: BetaAnalyticsDataClient | null = null;

  constructor(private readonly configService: ConfigService) {
    this.propertyId = this.configService.get<string>('GA4_PROPERTY_ID', '');
    this.initClient();
  }

  get isConfigured(): boolean {
    return !!this.client && !!this.propertyId;
  }

  /**
   * 初始化 GA4 客户端
   * 支持两种凭证来源：
   * 1. GA4_CREDENTIALS_BASE64 - base64 编码的 JSON 密钥（推荐用于生产）
   * 2. GA4_KEY_FILE - JSON 密钥文件路径
   */
  private initClient(): void {
    try {
      const base64 = this.configService.get<string>('GA4_CREDENTIALS_BASE64', '');
      const keyFile = this.configService.get<string>('GA4_KEY_FILE', '');

      if (base64) {
        const credentials = JSON.parse(Buffer.from(base64, 'base64').toString('utf-8'));
        this.client = new BetaAnalyticsDataClient({ credentials });
        this.logger.log('GA4 client initialized from base64 credentials');
      } else if (keyFile) {
        this.client = new BetaAnalyticsDataClient({ keyFilename: keyFile });
        this.logger.log('GA4 client initialized from key file');
      } else {
        this.logger.warn('GA4 credentials not configured, provider disabled');
      }
    } catch (err) {
      this.logger.error('Failed to initialize GA4 client', err);
      this.client = null;
    }
  }

  /**
   * 获取页面浏览量与访客时间序列
   */
  async getTimeSeries(period: Period): Promise<GaTimeSeriesPoint[]> {
    if (!this.isConfigured) return [];

    try {
      const [response] = await this.client!.runReport({
        property: `properties/${this.propertyId}`,
        dateRanges: [{ startDate: this.getStartDate(period), endDate: 'today' }],
        dimensions: [{ name: 'date' }],
        metrics: [{ name: 'screenPageViews' }, { name: 'totalUsers' }],
        orderBys: [{ dimension: { dimensionName: 'date' } }],
      });

      return (response.rows || []).map((row) => ({
        date: this.formatGaDate(row.dimensionValues?.[0]?.value || ''),
        pageViews: Number(row.metricValues?.[0]?.value || 0),
        visitors: Number(row.metricValues?.[1]?.value || 0),
      }));
    } catch (err) {
      this.logger.error('Failed to fetch GA4 time series', err);
      return [];
    }
  }

  /**
   * 获取概览汇总数据
   */
  async getSummary(period: Period): Promise<{ pageViews: number; visitors: number; sessions: number; bounceRate: number }> {
    if (!this.isConfigured) return { pageViews: 0, visitors: 0, sessions: 0, bounceRate: 0 };

    try {
      const [response] = await this.client!.runReport({
        property: `properties/${this.propertyId}`,
        dateRanges: [{ startDate: this.getStartDate(period), endDate: 'today' }],
        metrics: [
          { name: 'screenPageViews' },
          { name: 'totalUsers' },
          { name: 'sessions' },
          { name: 'bounceRate' },
        ],
      });

      const row = response.rows?.[0];
      return {
        pageViews: Number(row?.metricValues?.[0]?.value || 0),
        visitors: Number(row?.metricValues?.[1]?.value || 0),
        sessions: Number(row?.metricValues?.[2]?.value || 0),
        bounceRate: Number(row?.metricValues?.[3]?.value || 0),
      };
    } catch (err) {
      this.logger.error('Failed to fetch GA4 summary', err);
      return { pageViews: 0, visitors: 0, sessions: 0, bounceRate: 0 };
    }
  }

  /**
   * 获取热门页面
   */
  async getTopPages(period: Period, limit = 10): Promise<GaDimensionItem[]> {
    return this.getDimensionReport('pagePath', period, limit);
  }

  /**
   * 获取流量来源
   */
  async getTopReferrers(period: Period, limit = 10): Promise<GaDimensionItem[]> {
    return this.getDimensionReport('sessionSource', period, limit);
  }

  /**
   * 获取国家/地区分布
   */
  async getCountries(period: Period, limit = 10): Promise<GaDimensionItem[]> {
    return this.getDimensionReport('country', period, limit);
  }

  /**
   * 获取设备分布
   */
  async getDevices(period: Period, limit = 5): Promise<GaDimensionItem[]> {
    return this.getDimensionReport('deviceCategory', period, limit);
  }

  /**
   * 通用维度报表查询
   */
  private async getDimensionReport(
    dimension: string,
    period: Period,
    limit: number,
  ): Promise<GaDimensionItem[]> {
    if (!this.isConfigured) return [];

    try {
      const [response] = await this.client!.runReport({
        property: `properties/${this.propertyId}`,
        dateRanges: [{ startDate: this.getStartDate(period), endDate: 'today' }],
        dimensions: [{ name: dimension }],
        metrics: [{ name: 'screenPageViews' }],
        orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
        limit,
      });

      return (response.rows || []).map((row) => ({
        key: row.dimensionValues?.[0]?.value || '(unknown)',
        views: Number(row.metricValues?.[0]?.value || 0),
      }));
    } catch (err) {
      this.logger.error(`Failed to fetch GA4 ${dimension} report`, err);
      return [];
    }
  }

  private getStartDate(period: Period): string {
    const dayMap: Record<Period, string> = {
      '24h': '1daysAgo',
      '7d': '7daysAgo',
      '30d': '30daysAgo',
      '90d': '90daysAgo',
    };
    return dayMap[period];
  }

  /** GA 返回 YYYYMMDD，转为 YYYY-MM-DD */
  private formatGaDate(gaDate: string): string {
    if (gaDate.length !== 8) return gaDate;
    return `${gaDate.slice(0, 4)}-${gaDate.slice(4, 6)}-${gaDate.slice(6, 8)}`;
  }
}
