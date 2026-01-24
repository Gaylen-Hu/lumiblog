import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, MaxLength } from 'class-validator';

/**
 * 上传媒体 DTO
 * 文件通过 multipart/form-data 上传，此 DTO 用于附加信息
 */
export class UploadMediaDto {
  @ApiPropertyOptional({
    description: '图片 alt 文本（用于 SEO 和无障碍访问）',
    example: '文章封面图片',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200, { message: 'alt 文本长度不能超过200字符' })
  alt?: string;
}
