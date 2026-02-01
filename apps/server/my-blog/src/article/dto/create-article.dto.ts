import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  MaxLength,
  Matches,
  IsIn,
  IsUUID,
} from 'class-validator';

/**
 * 创建文章 DTO
 * 用于管理端创建文章草稿
 */
export class CreateArticleDto {
  @ApiProperty({
    description: '文章标题',
    example: '如何使用 NestJS 构建 RESTful API',
    maxLength: 200,
  })
  @IsString()
  @IsNotEmpty({ message: '标题不能为空' })
  @MaxLength(200, { message: '标题长度不能超过200字符' })
  title: string;

  @ApiProperty({
    description: '文章 URL 别名',
    example: 'how-to-build-restful-api-with-nestjs',
    maxLength: 200,
    pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$',
  })
  @IsString()
  @IsNotEmpty({ message: 'slug 不能为空' })
  @MaxLength(200, { message: 'slug 长度不能超过200字符' })
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'slug 只能包含小写字母、数字和连字符',
  })
  slug: string;

  @ApiPropertyOptional({
    description: '文章摘要',
    example: '本文介绍如何使用 NestJS 框架构建高性能的 RESTful API...',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: '摘要长度不能超过500字符' })
  summary?: string;

  @ApiPropertyOptional({
    description: '文章正文内容（Markdown 或 HTML）',
    example: '# 引言\n\nNestJS 是一个...',
  })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({
    description: '封面图片 URL',
    example: 'https://example.com/cover.jpg',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: '封面图片URL长度不能超过500字符' })
  coverImage?: string;

  @ApiPropertyOptional({
    description: 'SEO 标题',
    example: 'NestJS RESTful API 开发指南 | 我的博客',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'SEO标题长度不能超过100字符' })
  seoTitle?: string;

  @ApiPropertyOptional({
    description: 'SEO 描述',
    example: '详细介绍如何使用 NestJS 框架构建高性能、可扩展的 RESTful API',
    maxLength: 300,
  })
  @IsOptional()
  @IsString()
  @MaxLength(300, { message: 'SEO描述长度不能超过300字符' })
  seoDescription?: string;

  @ApiPropertyOptional({
    description: '语言标识',
    example: 'zh-CN',
    enum: ['zh-CN', 'en-US'],
    default: 'zh-CN',
  })
  @IsOptional()
  @IsString()
  @IsIn(['zh-CN', 'en-US'], { message: '语言标识只能是 zh-CN 或 en-US' })
  locale?: string;

  @ApiPropertyOptional({
    description: '翻译组ID，同组文章互为翻译版本',
    example: 'a1971975-1cbf-492a-9943-59b9263035d1',
  })
  @IsOptional()
  @IsUUID('4', { message: '翻译组ID必须是有效的UUID' })
  translationGroupId?: string;
}
