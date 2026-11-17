import { Body, Controller, Headers, HttpCode, HttpStatus, Ip, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { SelfHostedAnalyticsProvider } from './providers/self-hosted-analytics.provider';
import { CollectEventDto } from './dto/collect.dto';

/**
 * 埋点采集控制器（公开，无需认证）
 * 前端通过 navigator.sendBeacon 上报
 */
@ApiTags('Analytics Collect')
@Controller({ path: 'collect', version: '1' })
export class CollectController {
  constructor(private readonly selfHosted: SelfHostedAnalyticsProvider) {}

  @ApiOperation({ summary: '上报访问/事件埋点', description: '公开端点，前端 sendBeacon 调用' })
  @ApiResponse({ status: 204, description: '上报成功' })
  @UseGuards(ThrottlerGuard)
  @Throttle({
    short: { limit: 90, ttl: 10_000 }, medium: { limit: 360, ttl: 60_000 },
    long: { limit: 4_000, ttl: 3_600_000 },
  })
  @Post()
  @HttpCode(HttpStatus.NO_CONTENT)
  async collect(
    @Body() dto: CollectEventDto,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ): Promise<void> {
    await this.selfHosted.collect(dto, { ip: ip || 'unknown', userAgent: userAgent || 'unknown' });
  }
}
