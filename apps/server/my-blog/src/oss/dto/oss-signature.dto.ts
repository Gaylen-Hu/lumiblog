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
  @IsString()
  @IsNotEmpty({ message: '文件名不能为空' })
  filename: string;

  @IsString()
  @IsNotEmpty({ message: 'MIME 类型不能为空' })
  mimeType: string;

  @IsNumber()
  @IsNotEmpty({ message: '文件大小不能为空' })
  size: number;

  @IsOptional()
  @IsEnum(FileCategory, { message: '文件类别必须是 image/video/audio/document' })
  category?: FileCategory;

  @IsOptional()
  @IsString()
  directory?: string;
}

/**
 * OSS 直传签名响应 DTO
 */
export class OssSignatureResponseDto {
  /** OSS 上传地址 */
  host: string;

  /** 文件存储路径（key） */
  key: string;

  /** 访问策略 */
  policy: string;

  /** 签名 */
  signature: string;

  /** AccessKey ID */
  accessKeyId: string;

  /** 签名过期时间 */
  expire: number;

  /** 文件访问 URL */
  url: string;

  /** 回调配置（可选） */
  callback?: string;

  constructor(partial: Partial<OssSignatureResponseDto>) {
    Object.assign(this, partial);
  }
}

/**
 * OSS 上传回调 DTO
 */
export class OssCallbackDto {
  @IsString()
  bucket: string;

  @IsString()
  object: string;

  @IsString()
  etag: string;

  @IsNumber()
  size: number;

  @IsString()
  mimeType: string;
}

/**
 * OSS 回调响应 DTO
 */
export class OssCallbackResponseDto {
  success: boolean;
  url: string;
  filename: string;
  size: number;
  mimeType: string;

  constructor(partial: Partial<OssCallbackResponseDto>) {
    Object.assign(this, partial);
  }
}
