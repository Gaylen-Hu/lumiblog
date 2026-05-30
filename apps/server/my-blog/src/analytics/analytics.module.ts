import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { VercelAnalyticsProvider } from './providers/vercel-analytics.provider';
import { WechatAnalyticsProvider } from './providers/wechat-analytics.provider';

@Module({
  controllers: [AnalyticsController],
  providers: [AnalyticsService, VercelAnalyticsProvider, WechatAnalyticsProvider],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
