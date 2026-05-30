import { Body, Controller, Headers, HttpCode, HttpStatus, Ip, Post } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
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
  // 较宽松的限流：单 IP 每 10 秒最多 20 次
  @Throttle({ short: { limit: 20, ttl: 10000 } })
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
