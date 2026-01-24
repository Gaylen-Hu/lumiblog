import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

/**
 * SEO 优化请求 DTO
 */
export class SeoOptimizeDto {
  @IsString()
  @IsNotEmpty({ message: '标题不能为空' })
  title: string;

  @IsString()
  @IsNotEmpty({ message: '内容不能为空' })
  content: string;

  @IsOptional()
  @IsString()
  summary?: string;
}

/**
 * SEO 优化响应 DTO
 */
export class SeoOptimizeResponseDto {
  seoTitle: string;
  seoDescription: string;
  keywords: string;

  constructor(partial: Partial<SeoOptimizeResponseDto>) {
    Object.assign(this, partial);
  }
}
