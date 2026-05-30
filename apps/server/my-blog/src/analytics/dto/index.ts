import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

export class AnalyticsPeriodDto {
  @ApiPropertyOptional({ description: '时间范围', enum: ['24h', '7d', '30d', '90d'], default: '7d' })
  @IsOptional()
  @IsString()
  @IsIn(['24h', '7d', '30d', '90d'])
  period?: '24h' | '7d' | '30d' | '90d' = '7d';
}

export class AnalyticsOverviewResponseDto {
  @ApiProperty({ description: '页面浏览量' })
  pageViews: number;

  @ApiProperty({ description: '独立访客数' })
  visitors: number;

  @ApiProperty({ description: '微信公众号累计关注数' })
  wechatFollowers: number;

  @ApiProperty({ description: '数据来源' })
  sources: {
    vercel: boolean;
    wechat: boolean;
    google: boolean;
  };
}

export class TopPageDto {
  @ApiProperty()
  page: string;

  @ApiProperty()
  views: number;
}

export class TopReferrerDto {
  @ApiProperty()
  referrer: string;

  @ApiProperty()
  views: number;
}

export class TimeSeriesPointDto {
  @ApiProperty()
  date: string;

  @ApiProperty()
  pageViews: number;

  @ApiProperty()
  visitors: number;
}
