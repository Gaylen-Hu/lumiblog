import { Injectable, Logger } from '@nestjs/common';
import { VercelAnalyticsProvider } from './providers/vercel-analytics.provider';
import { WechatAnalyticsProvider } from './providers/wechat-analytics.provider';
import {
  AnalyticsOverviewResponseDto,
  TopPageDto,
  TopReferrerDto,
  TimeSeriesPointDto,
} from './dto';

type Period = '24h' | '7d' | '30d' | '90d';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    private readonly vercel: VercelAnalyticsProvider,
    private readonly wechat: WechatAnalyticsProvider,
  ) {}

  /**
   * 获取概览数据
   */
  async getOverview(period: Period): Promise<AnalyticsOverviewResponseDto> {
    const [timeSeries, wechatFollowers] = await Promise.all([
      this.vercel.getTimeSeries(period),
      this.wechat.getCumulateUser(),
    ]);

    const pageViews = timeSeries.reduce((sum, p) => sum + p.pageViews, 0);
    const visitors = timeSeries.reduce((sum, p) => sum + p.visitors, 0);

    return {
      pageViews,
      visitors,
      wechatFollowers,
      sources: {
        vercel: true,
        wechat: !!wechatFollowers,
        google: false, // TODO: 接入 GA4 Data API
      },
    };
  }

  /**
   * 获取时间序列数据
   */
  async getTimeSeries(period: Period): Promise<TimeSeriesPointDto[]> {
    return this.vercel.getTimeSeries(period);
  }

  /**
   * 获取热门页面
   */
  async getTopPages(period: Period, limit = 10): Promise<TopPageDto[]> {
    return this.vercel.getTopPages(period, limit);
  }

  /**
   * 获取热门来源
   */
  async getTopReferrers(period: Period, limit = 10): Promise<TopReferrerDto[]> {
    return this.vercel.getTopReferrers(period, limit);
  }

  /**
   * 获取设备分布
   */
  async getDevices(period: Period): Promise<{ device: string; views: number }[]> {
    return this.vercel.getDevices(period);
  }

  /**
   * 获取国家/地区分布
   */
  async getCountries(period: Period, limit = 10): Promise<{ country: string; views: number }[]> {
    return this.vercel.getCountries(period, limit);
  }

  /**
   * 获取微信公众号数据
   */
  async getWechatStats(days = 7): Promise<{
    userSummary: { date: string; newUser: number; cancelUser: number; cumulateUser: number }[];
    articleSummary: { date: string; intPageReadUser: number; intPageReadCount: number; shareCount: number }[];
  }> {
    const endDate = new Date(Date.now() - 86400000); // 昨天
    const beginDate = new Date(endDate.getTime() - days * 86400000);

    const formatDate = (d: Date): string => d.toISOString().split('T')[0];

    const [userSummary, articleSummary] = await Promise.all([
      this.wechat.getUserSummary(formatDate(beginDate), formatDate(endDate)),
      this.wechat.getArticleSummary(
        formatDate(new Date(endDate.getTime() - 2 * 86400000)), // 图文接口最多 3 天
        formatDate(endDate),
      ),
    ]);

    return { userSummary, articleSummary };
  }
}
