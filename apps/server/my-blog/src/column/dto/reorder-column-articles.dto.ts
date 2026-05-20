import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString, ArrayNotEmpty } from 'class-validator';

/**
 * 重排序专栏文章 DTO
 */
export class ReorderColumnArticlesDto {
  @ApiProperty({
    description: '该专栏所有文章 ID 的完整有序数组',
    example: ['article-id-1', 'article-id-2', 'article-id-3'],
    type: [String],
  })
  @IsArray({ message: 'articleIds 必须是数组' })
  @ArrayNotEmpty({ message: 'articleIds 不能为空' })
  @IsString({ each: true, message: '每个 articleId 必须是字符串' })
  articleIds: string[];
}
