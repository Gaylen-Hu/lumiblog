import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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
  @ApiProperty({
    description: '标签名称',
    example: 'TypeScript',
    maxLength: 30,
  })
  @IsString()
  @IsNotEmpty({ message: '标签名称不能为空' })
  @MaxLength(30, { message: '标签名称长度不能超过30字符' })
  name: string;

  @ApiProperty({
    description: '标签 URL 别名',
    example: 'typescript',
    maxLength: 30,
    pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$',
  })
  @IsString()
  @IsNotEmpty({ message: 'slug 不能为空' })
  @MaxLength(30, { message: 'slug 长度不能超过30字符' })
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'slug 只能包含小写字母、数字和连字符',
  })
  slug: string;

  @ApiPropertyOptional({
    description: '标签描述',
    example: 'TypeScript 相关的文章',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200, { message: '描述长度不能超过200字符' })
  description?: string;
}
