import {
  IsString,
  IsNotEmpty,
  IsOptional,
  MaxLength,
  Matches,
} from 'class-validator';

/**
 * 创建标签 DTO
 */
export class CreateTagDto {
  @IsString()
  @IsNotEmpty({ message: '标签名称不能为空' })
  @MaxLength(30, { message: '标签名称长度不能超过30字符' })
  name: string;

  @IsString()
  @IsNotEmpty({ message: 'slug 不能为空' })
  @MaxLength(30, { message: 'slug 长度不能超过30字符' })
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'slug 只能包含小写字母、数字和连字符',
  })
  slug: string;

  @IsOptional()
  @IsString()
  @MaxLength(200, { message: '描述长度不能超过200字符' })
  description?: string;
}
