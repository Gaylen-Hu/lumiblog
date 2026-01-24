import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

/**
 * 文章翻译请求 DTO
 */
export class TranslateArticleDto {
  @IsOptional()
  @IsBoolean()
  createNewArticle?: boolean = false;
}

/**
 * 文章翻译响应 DTO
 */
export class TranslateArticleResponseDto {
  title: string;
  content: string;
  summary: string | null;
  targetLanguage: string;
  /** 如果创建了新文章，返回新文章 ID */
  newArticleId?: string;

  constructor(partial: Partial<TranslateArticleResponseDto>) {
    Object.assign(this, partial);
  }
}

/**
 * SEO 优化响应 DTO
 */
export class SeoOptimizeArticleResponseDto {
  seoTitle: string;
  seoDescription: string;
  keywords: string;
  /** 是否已自动更新到文章 */
  autoUpdated: boolean;

  constructor(partial: Partial<SeoOptimizeArticleResponseDto>) {
    Object.assign(this, partial);
  }
}

/**
 * 发布到微信请求 DTO
 */
export class PublishToWechatDto {
  @IsOptional()
  @IsString()
  author?: string;

  @IsOptional()
  @IsString()
  thumbMediaId?: string;

  @IsOptional()
  @IsBoolean()
  needOpenComment?: boolean = true;

  @IsOptional()
  @IsBoolean()
  onlyFansCanComment?: boolean = false;

  @IsOptional()
  @IsBoolean()
  publishImmediately?: boolean = false;
}

/**
 * 发布到微信响应 DTO
 */
export class PublishToWechatResponseDto {
  /** 草稿 media_id */
  mediaId: string;
  /** 如果立即发布，返回 publish_id */
  publishId?: string;
  /** 发布状态 */
  status: 'draft' | 'publishing' | 'published';

  constructor(partial: Partial<PublishToWechatResponseDto>) {
    Object.assign(this, partial);
  }
}
