import {
  IsString,
  IsNotEmpty,
  IsOptional,
  MaxLength,
  Matches,
  IsInt,
  Min,
} from 'class-validator';

/**
 * 创建分类 DTO
 */
export class CreateCategoryDto {
  @IsString()
  @IsNotEmpty({ message: '分类名称不能为空' })
  @MaxLength(50, { message: '分类名称长度不能超过50字符' })
  name: string;

  @IsString()
  @IsNotEmpty({ message: 'slug 不能为空' })
  @MaxLength(50, { message: 'slug 长度不能超过50字符' })
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'slug 只能包含小写字母、数字和连字符',
  })
  slug: string;

  @IsOptional()
  @IsString()
  @MaxLength(200, { message: '描述长度不能超过200字符' })
  description?: string;

  @IsOptional()
  @IsString()
  parentId?: string;

  @IsOptional()
  @IsInt({ message: '排序必须是整数' })
  @Min(0, { message: '排序不能为负数' })
  sortOrder?: number;
}
