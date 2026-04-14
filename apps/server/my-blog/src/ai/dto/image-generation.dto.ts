import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsBoolean,
} from 'class-validator';

/** 图片尺寸枚举 */
export enum ImageSize {
  '512x512' = '512x512',
  '1024x1024' = '1024x1024',
  '2K' = '2K',
}

/**
 * 文生图请求 DTO
 */
export class ImageGenerationDto {
  @ApiProperty({
    description: '图片生成提示词',
    example: '一只在星空下奔跑的猫，赛博朋克风格',
  })
  @IsString()
  @IsNotEmpty({ message: '提示词不能为空' })
  prompt: string;

  @ApiPropertyOptional({
    description: '图片尺寸',
    enum: ImageSize,
    default: ImageSize['1024x1024'],
  })
  @IsOptional()
  @IsEnum(ImageSize, { message: '图片尺寸不合法' })
  size?: ImageSize;

  @ApiPropertyOptional({
    description: '是否添加水印',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  watermark?: boolean;
}

/**
 * 文生图响应 DTO
 */
export class ImageGenerationResponseDto {
  @ApiProperty({ description: '生成的图片 URL' })
  url: string;

  constructor(url: string) {
    this.url = url;
  }
}
