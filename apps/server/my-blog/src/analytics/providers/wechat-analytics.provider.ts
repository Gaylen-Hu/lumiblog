import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BlogCacheService } from '../../redis';

export interface WechatUserSummary {
  date: string;
  newUser: number;
  cancelUser: number;
  cumulateUser: number;
}

export interface WechatArticleSummary {
  date: string;
  intPageReadUser: number;
  intPageReadCount: number;
  oriPageReadUser: number;
  oriPageReadCount: number;
  shareUser: number;
  shareCount: number;
  addToFavUser: number;
  addToFavCount: number;
}

@Injectable()
export class WechatAnalyticsProvider {
  private readonly logger = new Logger(WechatAnalyticsProvider.name);
  private readonly appId: string;
  private readonly appSecret: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly cacheService: BlogCacheService,
  ) {
    this.appId = this.configService.get<string>('WX_APP_ID', '');
    this.appSecret = this.configService.get<string>('WX_APP_SECRET', '');
  }

  /**
   * 获取微信 access_token（带缓存）
   */
  private async getAccessToken(): Promise<string | null> {
    if (!this.appId || !this.appSecret) return null;

    const cacheKey = 'wechat:access_token';
    const cached = await this.cacheService.get<string>(cacheKey);
    if (cached) return cached;

    try {
      const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${this.appId}&secret=${this.appSecret}`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.access_token) {
        // 缓存 100 分钟（token 有效期 2 小时）
        await this.cacheService.set(cacheKey, data.access_token, 6000);
        return data.access_token;
      }

      this.logger.warn(`WeChat token error: ${data.errcode} ${data.errmsg}`);
      return null;
    } catch (err) {
      this.logger.error('Failed to get WeChat access token', err);
      return null;
    }
  }

  /**
   * 获取用户增减数据（最近 7 天）
   */
  async getUserSummary(beginDate: string, endDate: string): Promise<WechatUserSummary[]> {
    const token = await this.getAccessToken();
    if (!token) return [];

    try {
      const res = await fetch(
        `https://api.weixin.qq.com/datacube/getusersummary?access_token=${token}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ begin_date: beginDate, end_date: endDate }),
        },
      );

      const data = await res.json();
      if (data.errcode) {
        this.logger.warn(`WeChat user summary error: ${data.errcode} ${data.errmsg}`);
        return [];
      }

      return (data.list || []).map((item: Record<string, unknown>) => ({
        date: item.ref_date as string,
        newUser: item.new_user as number,
        cancelUser: item.cancel_user as number,
        cumulateUser: item.cumulate_user as number,
      }));
    } catch (err) {
      this.logger.error('Failed to fetch WeChat user summary', err);
      return [];
    }
  }

  /**
   * 获取图文统计数据（最近 3 天）
   */
  async getArticleSummary(beginDate: string, endDate: string): Promise<WechatArticleSummary[]> {
    const token = await this.getAccessToken();
    if (!token) return [];

    try {
      const res = await fetch(
        `https://api.weixin.qq.com/datacube/getarticlesummary?access_token=${token}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ begin_date: beginDate, end_date: endDate }),
        },
      );

      const data = await res.json();
      if (data.errcode) {
        this.logger.warn(`WeChat article summary error: ${data.errcode} ${data.errmsg}`);
        return [];
      }

      return (data.list || []).map((item: Record<string, unknown>) => ({
        date: item.ref_date as string,
        intPageReadUser: item.int_page_read_user as number,
        intPageReadCount: item.int_page_read_count as number,
        oriPageReadUser: item.ori_page_read_user as number,
        oriPageReadCount: item.ori_page_read_count as number,
        shareUser: item.share_user as number,
        shareCount: item.share_count as number,
        addToFavUser: item.add_to_fav_user as number,
        addToFavCount: item.add_to_fav_count as number,
      }));
    } catch (err) {
      this.logger.error('Failed to fetch WeChat article summary', err);
      return [];
    }
  }

  /**
   * 获取累计用户数
   */
  async getCumulateUser(): Promise<number> {
    const yesterday = this.formatDate(new Date(Date.now() - 86400000));
    const summary = await this.getUserSummary(yesterday, yesterday);
    return summary[0]?.cumulateUser || 0;
  }

  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }
}
