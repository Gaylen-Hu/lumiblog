import {
  IsString,
  IsNotEmpty,
  IsOptional,
  MaxLength,
  Matches,
} from 'class-validator';

/**
 * 创建文章 DTO
 * 用于管理端创建文章草稿
 */
export class CreateArticleDto {
  @IsString()
  @IsNotEmpty({ message: '标题不能为空' })
  @MaxLength(200, { message: '标题长度不能超过200字符' })
  title: string;

  @IsString()
  @IsNotEmpty({ message: 'slug 不能为空' })
  @MaxLength(200, { message: 'slug 长度不能超过200字符' })
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'slug 只能包含小写字母、数字和连字符',
  })
  slug: string;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: '摘要长度不能超过500字符' })
  summary?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: '封面图片URL长度不能超过500字符' })
  coverImage?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'SEO标题长度不能超过100字符' })
  seoTitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300, { message: 'SEO描述长度不能超过300字符' })
  seoDescription?: string;
}
