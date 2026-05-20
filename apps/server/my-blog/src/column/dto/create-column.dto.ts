import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  MaxLength,
  MinLength,
  IsInt,
  Min,
  IsIn,
} from 'class-validator';

/**
 * 创建专栏 DTO
 */
export class CreateColumnDto {
  @ApiProperty({
    description: '专栏标题',
    example: 'Flutter 系列',
    minLength: 1,
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty({ message: '专栏标题不能为空' })
  @MinLength(1, { message: '专栏标题至少1个字符' })
  @MaxLength(100, { message: '专栏标题长度不能超过100字符' })
  title: string;

  @ApiProperty({
    description: '专栏 slug（URL 别名）',
    example: 'flutter-series',
  })
  @IsString()
  @IsNotEmpty({ message: 'slug 不能为空' })
  slug: string;

  @ApiPropertyOptional({
    description: '专栏描述',
    example: 'Flutter 从入门到精通系列文章',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: '描述长度不能超过500字符' })
  description?: string;

  @ApiPropertyOptional({
    description: '封面图片 URL',
    example: 'https://example.com/cover.jpg',
  })
  @IsOptional()
  @IsString()
  coverImage?: string;

  @ApiPropertyOptional({
    description: '排序顺序（数字越小越靠前）',
    example: 0,
    minimum: 0,
  })
  @IsOptional()
  @IsInt({ message: '排序必须是整数' })
  @Min(0, { message: '排序不能为负数' })
  sortOrder?: number;

  @ApiPropertyOptional({
    description: '专栏状态',
    enum: ['draft', 'published'],
    default: 'draft',
  })
  @IsOptional()
  @IsIn(['draft', 'published'], { message: '状态只能是 draft 或 published' })
  status?: 'draft' | 'published';
}
