import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

/**
 * 文章翻译请求 DTO
 */
export class TranslateArticleDto {
  @ApiPropertyOptional({
    description: '是否创建新文章（翻译后的内容作为新文章）',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  createNewArticle?: boolean = false;
}

/**
 * 文章翻译响应 DTO
 */
export class TranslateArticleResponseDto {
  @ApiProperty({ description: '翻译后的标题', example: 'How to Build RESTful API with NestJS' })
  title: string;

  @ApiProperty({ description: '翻译后的内容', example: '# Introduction\n\nNestJS is a...' })
  content: string;

  @ApiPropertyOptional({ description: '翻译后的摘要', example: 'This article introduces how to use NestJS...' })
  summary: string | null;

  @ApiProperty({ description: '目标语言', example: 'en' })
  targetLanguage: string;

  @ApiPropertyOptional({ description: '新文章 ID（如果创建了新文章）', example: 'clxxx...' })
  newArticleId?: string;

  constructor(partial: Partial<TranslateArticleResponseDto>) {
    Object.assign(this, partial);
  }
}

/**
 * SEO 优化响应 DTO
 */
export class SeoOptimizeArticleResponseDto {
  @ApiProperty({ description: 'SEO 标题', example: 'NestJS RESTful API 开发指南 | 我的博客' })
  seoTitle: string;

  @ApiProperty({ description: 'SEO 描述', example: '详细介绍如何使用 NestJS 框架构建高性能、可扩展的 RESTful API' })
  seoDescription: string;

  @ApiProperty({ description: 'SEO 关键词', example: 'NestJS, RESTful API, Node.js, TypeScript' })
  keywords: string;

  @ApiProperty({ description: '是否已自动更新到文章', example: true })
  autoUpdated: boolean;

  constructor(partial: Partial<SeoOptimizeArticleResponseDto>) {
    Object.assign(this, partial);
  }
}

/**
 * 发布到微信请求 DTO
 */
export class PublishToWechatDto {
  @ApiPropertyOptional({ description: '作者名称', example: '张三' })
  @IsOptional()
  @IsString()
  author?: string;

  @ApiPropertyOptional({ description: '封面图片 media_id', example: 'xxx_media_id' })
  @IsOptional()
  @IsString()
  thumbMediaId?: string;

  @ApiPropertyOptional({ description: '是否开启评论', example: true, default: true })
  @IsOptional()
  @IsBoolean()
  needOpenComment?: boolean = true;

  @ApiPropertyOptional({ description: '是否仅粉丝可评论', example: false, default: false })
  @IsOptional()
  @IsBoolean()
  onlyFansCanComment?: boolean = false;

  @ApiPropertyOptional({ description: '是否立即发布', example: false, default: false })
  @IsOptional()
  @IsBoolean()
  publishImmediately?: boolean = false;
}

/**
 * 发布到微信响应 DTO
 */
export class PublishToWechatResponseDto {
  @ApiProperty({ description: '草稿 media_id', example: 'xxx_media_id' })
  mediaId: string;

  @ApiPropertyOptional({ description: '发布 ID（如果立即发布）', example: 'xxx_publish_id' })
  publishId?: string;

  @ApiProperty({ description: '发布状态', enum: ['draft', 'publishing', 'published'], example: 'draft' })
  status: 'draft' | 'publishing' | 'published';

  constructor(partial: Partial<PublishToWechatResponseDto>) {
    Object.assign(this, partial);
  }
}
