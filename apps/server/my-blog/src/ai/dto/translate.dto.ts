import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';

export enum TargetLanguage {
  EN = 'en',
  ZH = 'zh',
}

/**
 * 翻译请求 DTO
 */
export class TranslateDto {
  @ApiProperty({
    description: '要翻译的标题',
    example: '如何使用 NestJS 构建 RESTful API',
  })
  @IsString()
  @IsNotEmpty({ message: '标题不能为空' })
  title: string;

  @ApiProperty({
    description: '要翻译的内容',
    example: '# 引言\n\nNestJS 是一个...',
  })
  @IsString()
  @IsNotEmpty({ message: '内容不能为空' })
  content: string;

  @ApiPropertyOptional({
    description: '要翻译的摘要',
    example: '本文介绍如何使用 NestJS...',
  })
  @IsOptional()
  @IsString()
  summary?: string;

  @ApiPropertyOptional({
    description: '目标语言',
    enum: TargetLanguage,
    example: 'en',
    default: 'en',
  })
  @IsOptional()
  @IsEnum(TargetLanguage, { message: '目标语言必须是 en 或 zh' })
  targetLanguage?: TargetLanguage = TargetLanguage.EN;
}

/**
 * 翻译响应 DTO
 */
export class TranslateResponseDto {
  @ApiProperty({ description: '翻译后的标题', example: 'How to Build RESTful API with NestJS' })
  title: string;

  @ApiProperty({ description: '翻译后的内容', example: '# Introduction\n\nNestJS is a...' })
  content: string;

  @ApiPropertyOptional({ description: '翻译后的摘要', example: 'This article introduces how to use NestJS...' })
  summary: string | null;

  @ApiProperty({ description: '目标语言', example: 'en' })
  targetLanguage: string;

  constructor(partial: Partial<TranslateResponseDto>) {
    Object.assign(this, partial);
  }
}
