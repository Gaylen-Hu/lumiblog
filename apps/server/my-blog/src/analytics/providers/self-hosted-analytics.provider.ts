import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import { PrismaService } from '../../prisma';
import { CollectEventDto } from '../dto/collect.dto';

export interface CollectContext {
  ip: string;
  userAgent: string;
}

export interface SelfHostedTimeSeriesPoint {
  date: string;
  pageViews: number;
  visitors: number;
}

type Period = '24h' | '7d' | '30d' | '90d';

/** 每日指纹盐值（每天轮换，进一步降低跨天追踪能力） */
const FINGERPRINT_SALT = 'nu-analytics-v1';

@Injectable()
export class SelfHostedAnalyticsProvider {
  private readonly logger = new Logger(SelfHostedAnalyticsProvider.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 采集一次事件：无 Cookie，按「每日访客指纹」聚合 session
   */
  async collect(dto: CollectEventDto, ctx: CollectContext): Promise<void> {
    const date = this.today();
    const visitorId = this.buildVisitorId(date, ctx.ip, ctx.userAgent);
    const ua = this.parseUserAgent(ctx.userAgent);

    // upsert session（每日每访客一条）
    const session = await this.prisma.analyticsSession.upsert({
      where: { visitorId },
      create: {
        visitorId,
        date,
        device: ua.device,
        os: ua.os,
        browser: ua.browser,
        language: dto.locale ?? null,
        referrer: this.normalizeReferrer(dto.referrer),
      },
      update: {},
    });

    await this.prisma.analyticsEvent.create({
      data: {
        sessionId: session.id,
        eventType: dto.type,
        eventName: dto.type === 'custom' ? (dto.name ?? null) : null,
        urlPath: dto.url.slice(0, 2048),
        urlQuery: dto.query?.slice(0, 2048) ?? null,
        pageTitle: dto.title?.slice(0, 512) ?? null,
        referrer: this.normalizeReferrer(dto.referrer),
        locale: dto.locale ?? null,
      },
    });
  }

  /**
   * 概览：PV / UV / 跳出率
   */
  async getSummary(period: Period): Promise<{ pageViews: number; visitors: number; bounceRate: number }> {
    const since = this.sinceDate(period);

    const [pageViews, visitors, sessionsWithCounts] = await Promise.all([
      this.prisma.analyticsEvent.count({
        where: { eventType: 'pageview', createdAt: { gte: since } },
      }),
      this.prisma.analyticsSession.count({
        where: { createdAt: { gte: since } },
      }),
      this.prisma.analyticsSession.findMany({
        where: { createdAt: { gte: since } },
        select: { _count: { select: { events: true } } },
      }),
    ]);

    // 跳出率：只有 1 个 pageview 的 session 占比
    const bounced = sessionsWithCounts.filter((s) => s._count.events <= 1).length;
    const bounceRate = visitors > 0 ? Math.round((bounced / visitors) * 1000) / 10 : 0;

    return { pageViews, visitors, bounceRate };
  }

  /**
   * 时间序列：按天聚合 PV / UV
   */
  async getTimeSeries(period: Period): Promise<SelfHostedTimeSeriesPoint[]> {
    const since = this.sinceDate(period);

    // PV：按天分组
    const events = await this.prisma.analyticsEvent.findMany({
      where: { eventType: 'pageview', createdAt: { gte: since } },
      select: { createdAt: true, sessionId: true },
    });

    const dayMap = new Map<string, { pv: number; sessions: Set<string> }>();
    for (const ev of events) {
      const day = this.formatDay(ev.createdAt);
      let bucket = dayMap.get(day);
      if (!bucket) {
        bucket = { pv: 0, sessions: new Set() };
        dayMap.set(day, bucket);
      }
      bucket.pv += 1;
      bucket.sessions.add(ev.sessionId);
    }

    return [...dayMap.entries()]
      .map(([date, b]) => ({ date, pageViews: b.pv, visitors: b.sessions.size }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * 热门页面
   */
  async getTopPages(period: Period, limit = 10): Promise<{ page: string; views: number }[]> {
    const since = this.sinceDate(period);
    const grouped = await this.prisma.analyticsEvent.groupBy({
      by: ['urlPath'],
      where: { eventType: 'pageview', createdAt: { gte: since } },
      _count: { urlPath: true },
      orderBy: { _count: { urlPath: 'desc' } },
      take: limit,
    });
    return grouped.map((g) => ({ page: g.urlPath, views: g._count.urlPath }));
  }

  /**
   * 热门来源
   */
  async getTopReferrers(period: Period, limit = 10): Promise<{ referrer: string; views: number }[]> {
    const since = this.sinceDate(period);
    const grouped = await this.prisma.analyticsSession.groupBy({
      by: ['referrer'],
      where: { createdAt: { gte: since }, referrer: { not: null } },
      _count: { referrer: true },
      orderBy: { _count: { referrer: 'desc' } },
      take: limit,
    });
    return grouped.map((g) => ({ referrer: g.referrer ?? 'Direct', views: g._count.referrer }));
  }

  /**
   * 设备分布
   */
  async getDevices(period: Period): Promise<{ device: string; views: number }[]> {
    const since = this.sinceDate(period);
    const grouped = await this.prisma.analyticsSession.groupBy({
      by: ['device'],
      where: { createdAt: { gte: since } },
      _count: { device: true },
      orderBy: { _count: { device: 'desc' } },
    });
    return grouped.map((g) => ({ device: g.device ?? 'unknown', views: g._count.device }));
  }

  /**
   * 国家/地区分布（依赖采集时写入 country，当前未启用 IP 库则多为 null）
   */
  async getCountries(period: Period, limit = 10): Promise<{ country: string; views: number }[]> {
    const since = this.sinceDate(period);
    const grouped = await this.prisma.analyticsSession.groupBy({
      by: ['country'],
      where: { createdAt: { gte: since }, country: { not: null } },
      _count: { country: true },
      orderBy: { _count: { country: 'desc' } },
      take: limit,
    });
    return grouped.map((g) => ({ country: g.country ?? 'unknown', views: g._count.country }));
  }

  // ==================== 私有工具 ====================

  /** 构建每日访客指纹（无 Cookie） */
  private buildVisitorId(date: string, ip: string, userAgent: string): string {
    return createHash('sha256')
      .update(`${FINGERPRINT_SALT}:${date}:${ip}:${userAgent}`)
      .digest('hex');
  }

  /** 极简 UA 解析（避免引入重型依赖） */
  private parseUserAgent(ua: string): { device: string; os: string; browser: string } {
    const lower = ua.toLowerCase();

    const isTablet = /ipad|tablet/.test(lower);
    const isMobile = /mobile|android|iphone|ipod/.test(lower);
    const device = isTablet ? 'tablet' : isMobile ? 'mobile' : 'desktop';

    let os = 'unknown';
    if (/windows/.test(lower)) os = 'Windows';
    else if (/mac os x|macintosh/.test(lower)) os = 'macOS';
    else if (/android/.test(lower)) os = 'Android';
    else if (/iphone|ipad|ipod/.test(lower)) os = 'iOS';
    else if (/linux/.test(lower)) os = 'Linux';

    let browser = 'unknown';
    if (/edg\//.test(lower)) browser = 'Edge';
    else if (/chrome|crios/.test(lower)) browser = 'Chrome';
    else if (/firefox|fxios/.test(lower)) browser = 'Firefox';
    else if (/safari/.test(lower)) browser = 'Safari';

    return { device, os, browser };
  }

  /** 来源归一化：取 hostname，过滤站内来源 */
  private normalizeReferrer(referrer?: string): string | null {
    if (!referrer) return null;
    try {
      const url = new URL(referrer);
      if (url.hostname.includes('new-universe.cn')) return null; // 站内跳转不计来源
      return url.hostname;
    } catch {
      return null;
    }
  }

  private today(): string {
    return this.formatDay(new Date());
  }

  private formatDay(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  private sinceDate(period: Period): Date {
    const dayMap: Record<Period, number> = { '24h': 1, '7d': 7, '30d': 30, '90d': 90 };
    return new Date(Date.now() - dayMap[period] * 86400000);
  }
}
