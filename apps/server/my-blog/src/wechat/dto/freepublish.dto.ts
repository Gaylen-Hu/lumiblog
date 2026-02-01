import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * 发布草稿 DTO
 */
export class FreepublishSubmitDto {
  @ApiProperty({ description: '草稿 media_id', example: 'xxx_media_id' })
  @IsString()
  @IsNotEmpty({ message: 'media_id 不能为空' })
  mediaId: string;
}

/**
 * 获取发布状态 DTO
 */
export class FreepublishGetDto {
  @ApiProperty({ description: '发布任务 ID', example: 'xxx_publish_id' })
  @IsString()
  @IsNotEmpty({ message: 'publish_id 不能为空' })
  publishId: string;
}

/**
 * 删除发布文章 DTO
 */
export class FreepublishDeleteDto {
  @ApiProperty({ description: '文章 ID', example: 'xxx_article_id' })
  @IsString()
  @IsNotEmpty({ message: 'article_id 不能为空' })
  articleId: string;

  @ApiPropertyOptional({ description: '文章索引（多图文时使用）', example: 0 })
  @Type(() => Number)
  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  index?: number;
}

/**
 * 获取已发布图文 DTO
 */
export class FreepublishGetArticleDto {
  @ApiProperty({ description: '文章 ID', example: 'xxx_article_id' })
  @IsString()
  @IsNotEmpty({ message: 'article_id 不能为空' })
  articleId: string;
}

/**
 * 已发布消息分页查询 DTO
 */
export class FreepublishPaginationDto {
  @ApiPropertyOptional({ description: '偏移量', example: 0, default: 0 })
  @Type(() => Number)
  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  offset?: number = 0;

  @ApiPropertyOptional({ description: '每页数量', example: 20, default: 20 })
  @Type(() => Number)
  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  count?: number = 20;

  @ApiPropertyOptional({ description: '是否不返回内容（0-返回，1-不返回）', example: 0, default: 0 })
  @Type(() => Number)
  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  noContent?: number = 0;
}
