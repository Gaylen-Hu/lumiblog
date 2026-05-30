import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AnalyticsService } from './analytics.service';
import { AnalyticsPeriodDto } from './dto';

@ApiTags('Analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('v1/analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @ApiOperation({ summary: '获取流量概览' })
  @Get('overview')
  async getOverview(@Query() query: AnalyticsPeriodDto) {
    return this.analyticsService.getOverview(query.period || '7d');
  }

  @ApiOperation({ summary: '获取时间序列数据' })
  @Get('time-series')
  async getTimeSeries(@Query() query: AnalyticsPeriodDto) {
    return this.analyticsService.getTimeSeries(query.period || '7d');
  }

  @ApiOperation({ summary: '获取热门页面' })
  @Get('top-pages')
  async getTopPages(@Query() query: AnalyticsPeriodDto) {
    return this.analyticsService.getTopPages(query.period || '7d');
  }

  @ApiOperation({ summary: '获取热门来源' })
  @Get('top-referrers')
  async getTopReferrers(@Query() query: AnalyticsPeriodDto) {
    return this.analyticsService.getTopReferrers(query.period || '7d');
  }

  @ApiOperation({ summary: '获取设备分布' })
  @Get('devices')
  async getDevices(@Query() query: AnalyticsPeriodDto) {
    return this.analyticsService.getDevices(query.period || '7d');
  }

  @ApiOperation({ summary: '获取国家/地区分布' })
  @Get('countries')
  async getCountries(@Query() query: AnalyticsPeriodDto) {
    return this.analyticsService.getCountries(query.period || '7d');
  }

  @ApiOperation({ summary: '获取微信公众号数据' })
  @Get('wechat')
  async getWechatStats() {
    return this.analyticsService.getWechatStats();
  }
}
