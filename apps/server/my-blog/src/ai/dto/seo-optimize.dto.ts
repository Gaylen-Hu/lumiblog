import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

/**
 * SEO 优化请求 DTO
 */
export class SeoOptimizeDto {
  @ApiProperty({
    description: '文章标题',
    example: '如何使用 NestJS 构建 RESTful API',
  })
  @IsString()
  @IsNotEmpty({ message: '标题不能为空' })
  title: string;

  @ApiProperty({
    description: '文章内容',
    example: '# 引言\n\nNestJS 是一个...',
  })
  @IsString()
  @IsNotEmpty({ message: '内容不能为空' })
  content: string;

  @ApiPropertyOptional({
    description: '文章摘要',
    example: '本文介绍如何使用 NestJS...',
  })
  @IsOptional()
  @IsString()
  summary?: string;
}

/**
 * SEO 优化响应 DTO
 */
export class SeoOptimizeResponseDto {
  @ApiProperty({ description: 'SEO 标题', example: 'NestJS RESTful API 开发指南 | 我的博客' })
  seoTitle: string;

  @ApiProperty({ description: 'SEO 描述', example: '详细介绍如何使用 NestJS 框架构建高性能、可扩展的 RESTful API' })
  seoDescription: string;

  @ApiProperty({ description: 'SEO 关键词', example: 'NestJS, RESTful API, Node.js, TypeScript' })
  keywords: string;

  constructor(partial: Partial<SeoOptimizeResponseDto>) {
    Object.assign(this, partial);
  }
}
