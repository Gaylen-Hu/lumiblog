import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

/** URL 路径最大长度 */
const URL_PATH_MAX = 2048;
/** 页面标题最大长度 */
const TITLE_MAX = 512;
/** 来源最大长度 */
const REFERRER_MAX = 2048;
/** 事件名最大长度 */
const EVENT_NAME_MAX = 128;

/**
 * 埋点采集 DTO（公开端点，前端上报）
 */
export class CollectEventDto {
  @ApiProperty({ description: '事件类型', enum: ['pageview', 'custom'], default: 'pageview' })
  @IsString()
  @IsIn(['pageview', 'custom'])
  type: 'pageview' | 'custom';

  @ApiProperty({ description: '页面路径', example: '/zh/posts/hello' })
  @IsString()
  @MaxLength(URL_PATH_MAX)
  url: string;

  @ApiPropertyOptional({ description: '查询字符串', example: 'page=2' })
  @IsOptional()
  @IsString()
  @MaxLength(URL_PATH_MAX)
  query?: string;

  @ApiPropertyOptional({ description: '页面标题' })
  @IsOptional()
  @IsString()
  @MaxLength(TITLE_MAX)
  title?: string;

  @ApiPropertyOptional({ description: '来源 URL（document.referrer）' })
  @IsOptional()
  @IsString()
  @MaxLength(REFERRER_MAX)
  referrer?: string;

  @ApiPropertyOptional({ description: '语言/区域', example: 'zh' })
  @IsOptional()
  @IsString()
  @MaxLength(16)
  locale?: string;

  @ApiPropertyOptional({ description: '自定义事件名（type=custom 时）' })
  @IsOptional()
  @IsString()
  @MaxLength(EVENT_NAME_MAX)
  name?: string;

  @ApiPropertyOptional({ description: '屏幕宽度（用于设备判断辅助）' })
  @IsOptional()
  @IsString()
  @MaxLength(16)
  screen?: string;
}
