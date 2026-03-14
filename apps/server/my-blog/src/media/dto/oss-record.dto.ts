import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber, IsOptional, MaxLength } from 'class-validator';

/**
 * OSS 直传完成后记录媒体信息的 DTO
 */
export class OssRecordDto {
  @ApiProperty({ description: 'OSS 文件路径（key）', example: 'images/2026/03/14/xxx.jpg' })
  @IsString()
  @IsNotEmpty()
  object: string;

  @ApiProperty({ description: '原始文件名', example: 'photo.jpg' })
  @IsString()
  @IsNotEmpty()
  originalName: string;

  @ApiProperty({ description: 'MIME 类型', example: 'image/jpeg' })
  @IsString()
  @IsNotEmpty()
  mimeType: string;

  @ApiProperty({ description: '文件大小（字节）', example: 102400 })
  @IsNumber()
  size: number;

  @ApiProperty({ description: '文件访问 URL', example: 'https://bucket.oss-cn-beijing.aliyuncs.com/images/xxx.jpg' })
  @IsString()
  @IsNotEmpty()
  url: string;

  @ApiPropertyOptional({ description: '图片 alt 文本', example: '封面图片' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  alt?: string;
}
