import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsNumber, IsEnum } from 'class-validator';

export enum FileCategory {
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
  DOCUMENT = 'document',
}

/**
 * 获取 OSS 直传签名请求 DTO
 */
export class GetOssSignatureDto {
  @ApiProperty({
    description: '文件名',
    example: 'cover.jpg',
  })
  @IsString()
  @IsNotEmpty({ message: '文件名不能为空' })
  filename: string;

  @ApiProperty({
    description: 'MIME 类型',
    example: 'image/jpeg',
  })
  @IsString()
  @IsNotEmpty({ message: 'MIME 类型不能为空' })
  mimeType: string;

  @ApiProperty({
    description: '文件大小（字节）',
    example: 102400,
  })
  @IsNumber()
  @IsNotEmpty({ message: '文件大小不能为空' })
  size: number;

  @ApiPropertyOptional({
    description: '文件类别',
    enum: FileCategory,
    example: 'image',
  })
  @IsOptional()
  @IsEnum(FileCategory, { message: '文件类别必须是 image/video/audio/document' })
  category?: FileCategory;

  @ApiPropertyOptional({
    description: '存储目录',
    example: 'articles/covers',
  })
  @IsOptional()
  @IsString()
  directory?: string;
}

/**
 * OSS 直传签名响应 DTO
 */
export class OssSignatureResponseDto {
  @ApiProperty({ description: 'OSS 上传地址', example: 'https://bucket.oss-cn-hangzhou.aliyuncs.com' })
  host: string;

  @ApiProperty({ description: '文件存储路径（key）', example: 'articles/covers/1234567890.jpg' })
  key: string;

  @ApiProperty({ description: '访问策略（Base64 编码）', example: 'eyJleHBpcmF0aW9uIjoiMjAyNC0wMS0wMVQwMDowMDowMFoiLCJjb25kaXRpb25zIjpbXX0=' })
  policy: string;

  @ApiProperty({ description: '签名', example: 'xxx_signature' })
  signature: string;

  @ApiProperty({ description: 'AccessKey ID', example: 'LTAI5xxx' })
  accessKeyId: string;

  @ApiProperty({ description: '签名过期时间（Unix 时间戳）', example: 1704067200 })
  expire: number;

  @ApiProperty({ description: '文件访问 URL', example: 'https://cdn.example.com/articles/covers/1234567890.jpg' })
  url: string;

  @ApiPropertyOptional({ description: '回调配置（Base64 编码）', example: 'eyJ1cmwiOiJodHRwczovL2V4YW1wbGUuY29tL2NhbGxiYWNrIn0=' })
  callback?: string;

  constructor(partial: Partial<OssSignatureResponseDto>) {
    Object.assign(this, partial);
  }
}

/**
 * OSS 上传回调 DTO
 */
export class OssCallbackDto {
  @ApiProperty({ description: 'Bucket 名称', example: 'my-blog-bucket' })
  @IsString()
  bucket: string;

  @ApiProperty({ description: '文件路径', example: 'articles/covers/1234567890.jpg' })
  @IsString()
  object: string;

  @ApiProperty({ description: '文件 ETag', example: '"xxx_etag"' })
  @IsString()
  etag: string;

  @ApiProperty({ description: '文件大小（字节）', example: 102400 })
  @IsNumber()
  size: number;

  @ApiProperty({ description: 'MIME 类型', example: 'image/jpeg' })
  @IsString()
  mimeType: string;
}

/**
 * OSS 回调响应 DTO
 */
export class OssCallbackResponseDto {
  @ApiProperty({ description: '是否成功', example: true })
  success: boolean;

  @ApiProperty({ description: '文件访问 URL', example: 'https://cdn.example.com/articles/covers/1234567890.jpg' })
  url: string;

  @ApiProperty({ description: '文件名', example: '1234567890.jpg' })
  filename: string;

  @ApiProperty({ description: '文件大小（字节）', example: 102400 })
  size: number;

  @ApiProperty({ description: 'MIME 类型', example: 'image/jpeg' })
  mimeType: string;

  constructor(partial: Partial<OssCallbackResponseDto>) {
    Object.assign(this, partial);
  }
}
