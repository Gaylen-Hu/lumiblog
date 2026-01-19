import { PartialType } from '@nestjs/mapped-types';
import { CreateArticleDto } from './create-article.dto';

/**
 * 更新文章 DTO
 * 所有字段均为可选
 */
export class UpdateArticleDto extends PartialType(CreateArticleDto) {}
