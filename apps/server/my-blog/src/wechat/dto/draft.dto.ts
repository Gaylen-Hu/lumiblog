import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsNumber, ValidateNested, IsArray } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * 草稿文章 DTO
 */
export class DraftArticleDto {
  @ApiProperty({ description: '文章标题', example: '如何使用 NestJS 构建 RESTful API' })
  @IsString()
  @IsNotEmpty({ message: '标题不能为空' })
  title: string;

  @ApiPropertyOptional({ description: '作者', example: '张三' })
  @IsString()
  @IsOptional()
  author?: string;

  @ApiPropertyOptional({ description: '摘要', example: '本文介绍如何使用 NestJS...' })
  @IsString()
  @IsOptional()
  digest?: string;

  @ApiProperty({ description: '正文内容（HTML 格式）', example: '<p>NestJS 是一个...</p>' })
  @IsString()
  @IsNotEmpty({ message: '正文内容不能为空' })
  content: string;

  @ApiPropertyOptional({ description: '原文链接', example: 'https://example.com/article/1' })
  @IsString()
  @IsOptional()
  contentSourceUrl?: string;

  @ApiProperty({ description: '封面图片 media_id', example: 'xxx_media_id' })
  @IsString()
  @IsNotEmpty({ message: '封面图片 media_id 不能为空' })
  thumbMediaId: string;

  @ApiPropertyOptional({ description: '是否开启评论（0-关闭，1-开启）', example: 1 })
  @IsNumber()
  @IsOptional()
  needOpenComment?: number;

  @ApiPropertyOptional({ description: '是否仅粉丝可评论（0-所有人，1-仅粉丝）', example: 0 })
  @IsNumber()
  @IsOptional()
  onlyFansCanComment?: number;
}

/**
 * 新增草稿 DTO
 */
export class CreateDraftDto {
  @ApiProperty({ description: '文章列表', type: [DraftArticleDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DraftArticleDto)
  articles: DraftArticleDto[];
}

/**
 * 更新草稿 DTO
 */
export class UpdateDraftDto {
  @ApiProperty({ description: '草稿 media_id', example: 'xxx_media_id' })
  @IsString()
  @IsNotEmpty({ message: 'media_id 不能为空' })
  mediaId: string;

  @ApiProperty({ description: '要更新的文章索引（从 0 开始）', example: 0 })
  @IsNumber()
  @Type(() => Number)
  index: number;

  @ApiProperty({ description: '更新后的文章内容', type: DraftArticleDto })
  @ValidateNested()
  @Type(() => DraftArticleDto)
  article: DraftArticleDto;
}

/**
 * 草稿分页查询 DTO
 */
export class DraftPaginationDto {
  @ApiPropertyOptional({ description: '偏移量', example: 0, default: 0 })
  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  offset?: number = 0;

  @ApiPropertyOptional({ description: '每页数量', example: 20, default: 20 })
  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  count?: number = 20;

  @ApiPropertyOptional({ description: '是否不返回内容（0-返回，1-不返回）', example: 0, default: 0 })
  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  noContent?: number = 0;
}
