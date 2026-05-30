import { Injectable, Logger } from '@nestjs/common';
import { VercelAnalyticsProvider } from './providers/vercel-analytics.provider';
import { WechatAnalyticsProvider } from './providers/wechat-analytics.provider';
import { GoogleAnalyticsProvider } from './providers/google-analytics.provider';
import { SelfHostedAnalyticsProvider } from './providers/self-hosted-analytics.provider';
import {
  AnalyticsOverviewResponseDto,
  TopPageDto,
  TopReferrerDto,
  TimeSeriesPointDto,
} from './dto';

type Period = '24h' | '7d' | '30d' | '90d';

/**
 * 分析数据聚合服务
 * 数据源优先级：自建埋点（最可靠，国内可用）> Google Analytics > Vercel
 */
@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    private readonly selfHosted: SelfHostedAnalyticsProvider,
    private readonly vercel: VercelAnalyticsProvider,
    private readonly wechat: WechatAnalyticsProvider,
    private readonly google: GoogleAnalyticsProvider,
  ) {}

  /**
   * 获取概览数据
   */
  async getOverview(period: Period): Promise<AnalyticsOverviewResponseDto> {
    const [selfSummary, wechatFollowers] = await Promise.all([
      this.selfHosted.getSummary(period),
      this.wechat.getCumulateUser(),
    ]);

    return {
      pageViews: selfSummary.pageViews,
      visitors: selfSummary.visitors,
      bounceRate: selfSummary.bounceRate,
      wechatFollowers,
      sources: {
        selfHosted: true,
        vercel: this.vercel.isConfigured,
        wechat: !!wechatFollowers,
        google: this.google.isConfigured,
      },
    };
  }

  /**
   * 获取时间序列数据（自建埋点）
   */
  async getTimeSeries(period: Period): Promise<TimeSeriesPointDto[]> {
    const series = await this.selfHosted.getTimeSeries(period);
    return series.map((p) => ({ date: p.date, pageViews: p.pageViews, visitors: p.visitors }));
  }

  /**
   * 获取热门页面
   */
  async getTopPages(period: Period, limit = 10): Promise<TopPageDto[]> {
    return this.selfHosted.getTopPages(period, limit);
  }

  /**
   * 获取热门来源
   */
  async getTopReferrers(period: Period, limit = 10): Promise<TopReferrerDto[]> {
    return this.selfHosted.getTopReferrers(period, limit);
  }

  /**
   * 获取设备分布
   */
  async getDevices(period: Period): Promise<{ device: string; views: number }[]> {
    return this.selfHosted.getDevices(period);
  }

  /**
   * 获取国家/地区分布
   */
  async getCountries(period: Period, limit = 10): Promise<{ country: string; views: number }[]> {
    return this.selfHosted.getCountries(period, limit);
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
        formatDate(new Date(endDate.getTime() - 2 * 86400000)),
        formatDate(endDate),
      ),
    ]);

    return { userSummary, articleSummary };
  }
}
