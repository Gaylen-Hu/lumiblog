import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  MaxLength,
  Matches,
  IsInt,
  Min,
} from 'class-validator';

/**
 * 创建分类 DTO
 */
export class CreateCategoryDto {
  @ApiProperty({
    description: '分类名称',
    example: '技术文章',
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty({ message: '分类名称不能为空' })
  @MaxLength(50, { message: '分类名称长度不能超过50字符' })
  name: string;

  @ApiProperty({
    description: '分类 URL 别名',
    example: 'tech-articles',
    maxLength: 50,
    pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$',
  })
  @IsString()
  @IsNotEmpty({ message: 'slug 不能为空' })
  @MaxLength(50, { message: 'slug 长度不能超过50字符' })
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'slug 只能包含小写字母、数字和连字符',
  })
  slug: string;

  @ApiPropertyOptional({
    description: '分类描述',
    example: '关于编程和技术的文章',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200, { message: '描述长度不能超过200字符' })
  description?: string;

  @ApiPropertyOptional({
    description: '父分类 ID',
    example: 'clxxx...',
  })
  @IsOptional()
  @IsString()
  parentId?: string;

  @ApiPropertyOptional({
    description: '排序顺序（数字越小越靠前）',
    example: 0,
    minimum: 0,
  })
  @IsOptional()
  @IsInt({ message: '排序必须是整数' })
  @Min(0, { message: '排序不能为负数' })
  sortOrder?: number;
}
