import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { CollectController } from './collect.controller';
import { AnalyticsService } from './analytics.service';
import { SelfHostedAnalyticsProvider } from './providers/self-hosted-analytics.provider';
import { VercelAnalyticsProvider } from './providers/vercel-analytics.provider';
import { GoogleAnalyticsProvider } from './providers/google-analytics.provider';

@Module({
  controllers: [AnalyticsController, CollectController],
  providers: [
    AnalyticsService,
    SelfHostedAnalyticsProvider,
    VercelAnalyticsProvider,
    GoogleAnalyticsProvider,
  ],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
