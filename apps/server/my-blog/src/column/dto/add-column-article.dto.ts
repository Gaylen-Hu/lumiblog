import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsInt, Min } from 'class-validator';

/**
 * 添加文章到专栏 DTO
 */
export class AddColumnArticleDto {
  @ApiProperty({
    description: '文章 ID',
    example: 'clxxx...',
  })
  @IsString()
  @IsNotEmpty({ message: '文章 ID 不能为空' })
  articleId: string;

  @ApiPropertyOptional({
    description: '排序位置（不传时默认追加到末尾）',
    example: 0,
    minimum: 0,
  })
  @IsOptional()
  @IsInt({ message: '排序必须是整数' })
  @Min(0, { message: '排序不能为负数' })
  sortOrder?: number;
}
