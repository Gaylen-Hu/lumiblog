import { IsString, IsNotEmpty, IsOptional, IsNumber, ValidateNested, IsArray } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * 草稿文章 DTO
 */
export class DraftArticleDto {
  @IsString()
  @IsNotEmpty({ message: '标题不能为空' })
  title: string;

  @IsString()
  @IsOptional()
  author?: string;

  @IsString()
  @IsOptional()
  digest?: string;

  @IsString()
  @IsNotEmpty({ message: '正文内容不能为空' })
  content: string;

  @IsString()
  @IsOptional()
  contentSourceUrl?: string;

  @IsString()
  @IsNotEmpty({ message: '封面图片 media_id 不能为空' })
  thumbMediaId: string;

  @IsNumber()
  @IsOptional()
  needOpenComment?: number;

  @IsNumber()
  @IsOptional()
  onlyFansCanComment?: number;
}

/**
 * 新增草稿 DTO
 */
export class CreateDraftDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DraftArticleDto)
  articles: DraftArticleDto[];
}

/**
 * 更新草稿 DTO
 */
export class UpdateDraftDto {
  @IsString()
  @IsNotEmpty({ message: 'media_id 不能为空' })
  mediaId: string;

  @IsNumber()
  index: number;

  @ValidateNested()
  @Type(() => DraftArticleDto)
  article: DraftArticleDto;
}

/**
 * 草稿分页查询 DTO
 */
export class DraftPaginationDto {
  @IsNumber()
  @IsOptional()
  offset?: number = 0;

  @IsNumber()
  @IsOptional()
  count?: number = 20;

  @IsNumber()
  @IsOptional()
  noContent?: number = 0;
}
