import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsBoolean,
  IsInt,
  MaxLength,
  Length,
  Matches,
  Min,
  Max,
} from 'class-validator';

/** 年份最大/最小长度 */
const YEAR_LENGTH = 4;
/** 标题最大长度 */
const TITLE_MAX_LENGTH = 100;
/** 描述最大长度 */
const DESC_MAX_LENGTH = 500;
/** 排序最大值 */
const ORDER_MAX = 9999;

/**
 * 创建 Timeline 条目 DTO
 */
export class CreateTimelineDto {
  @ApiProperty({
    description: '年份，格式为 4 位数字',
    example: '2017',
    minLength: YEAR_LENGTH,
    maxLength: YEAR_LENGTH,
  })
  @IsString()
  @IsNotEmpty({ message: '年份不能为空' })
  @Length(YEAR_LENGTH, YEAR_LENGTH, { message: '年份必须为 4 位字符' })
  @Matches(/^\d{4}$/, { message: '年份必须为 4 位数字' })
  year: string;

  @ApiProperty({
    description: '中文标题',
    example: '开始编程之旅',
    maxLength: TITLE_MAX_LENGTH,
  })
  @IsString()
  @IsNotEmpty({ message: '中文标题不能为空' })
  @MaxLength(TITLE_MAX_LENGTH, { message: `中文标题长度不能超过 ${TITLE_MAX_LENGTH} 字符` })
  titleZh: string;

  @ApiProperty({
    description: '英文标题',
    example: 'Started Programming Journey',
    maxLength: TITLE_MAX_LENGTH,
  })
  @IsString()
  @IsNotEmpty({ message: '英文标题不能为空' })
  @MaxLength(TITLE_MAX_LENGTH, { message: `英文标题长度不能超过 ${TITLE_MAX_LENGTH} 字符` })
  titleEn: string;

  @ApiProperty({
    description: '中文描述',
    example: '开始学习编程，接触了第一门编程语言',
    maxLength: DESC_MAX_LENGTH,
  })
  @IsString()
  @IsNotEmpty({ message: '中文描述不能为空' })
  @MaxLength(DESC_MAX_LENGTH, { message: `中文描述长度不能超过 ${DESC_MAX_LENGTH} 字符` })
  descZh: string;

  @ApiProperty({
    description: '英文描述',
    example: 'Started learning programming and encountered the first language',
    maxLength: DESC_MAX_LENGTH,
  })
  @IsString()
  @IsNotEmpty({ message: '英文描述不能为空' })
  @MaxLength(DESC_MAX_LENGTH, { message: `英文描述长度不能超过 ${DESC_MAX_LENGTH} 字符` })
  descEn: string;

  @ApiProperty({
    description: '排序权重（越小越靠前）',
    example: 0,
    minimum: 0,
    maximum: ORDER_MAX,
  })
  @IsInt({ message: '排序权重必须是整数' })
  @IsNotEmpty({ message: '排序权重不能为空' })
  @Min(0, { message: '排序权重不能为负数' })
  @Max(ORDER_MAX, { message: `排序权重不能超过 ${ORDER_MAX}` })
  order: number;

  @ApiProperty({
    description: '是否在前端展示',
    example: true,
  })
  @IsBoolean({ message: 'isVisible 必须是布尔值' })
  isVisible: boolean;
}
