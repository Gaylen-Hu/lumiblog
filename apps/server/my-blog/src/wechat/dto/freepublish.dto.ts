import { IsString, IsNotEmpty, IsOptional, IsNumber } from 'class-validator';

/**
 * 发布草稿 DTO
 */
export class FreepublishSubmitDto {
  @IsString()
  @IsNotEmpty({ message: 'media_id 不能为空' })
  mediaId: string;
}

/**
 * 获取发布状态 DTO
 */
export class FreepublishGetDto {
  @IsString()
  @IsNotEmpty({ message: 'publish_id 不能为空' })
  publishId: string;
}

/**
 * 删除发布文章 DTO
 */
export class FreepublishDeleteDto {
  @IsString()
  @IsNotEmpty({ message: 'article_id 不能为空' })
  articleId: string;

  @IsNumber()
  @IsOptional()
  index?: number;
}

/**
 * 获取已发布图文 DTO
 */
export class FreepublishGetArticleDto {
  @IsString()
  @IsNotEmpty({ message: 'article_id 不能为空' })
  articleId: string;
}

/**
 * 已发布消息分页查询 DTO
 */
export class FreepublishPaginationDto {
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
