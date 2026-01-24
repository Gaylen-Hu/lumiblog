import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StorageType, MediaType } from '../domain/media.model';

/**
 * 媒体响应 DTO
 */
export class MediaResponseDto {
  @ApiProperty({ description: '媒体 ID', example: 'clxxx...' })
  readonly id: string;

  @ApiProperty({ description: '文件名', example: '1234567890.jpg' })
  readonly filename: string;

  @ApiProperty({ description: '原始文件名', example: 'cover.jpg' })
  readonly originalName: string;

  @ApiProperty({ description: 'MIME 类型', example: 'image/jpeg' })
  readonly mimeType: string;

  @ApiProperty({ description: '文件大小（字节）', example: 102400 })
  readonly size: number;

  @ApiProperty({ description: '文件访问 URL', example: 'https://example.com/uploads/1234567890.jpg' })
  readonly url: string;

  @ApiProperty({ description: '存储类型', enum: StorageType, example: 'local' })
  readonly storageType: StorageType;

  @ApiProperty({ description: '媒体类型', enum: MediaType, example: 'image' })
  readonly mediaType: MediaType;

  @ApiPropertyOptional({ description: '图片宽度（像素）', example: 1920 })
  readonly width: number | null;

  @ApiPropertyOptional({ description: '图片高度（像素）', example: 1080 })
  readonly height: number | null;

  @ApiPropertyOptional({ description: 'alt 文本', example: '文章封面图片' })
  readonly alt: string | null;

  @ApiProperty({ description: '创建时间', example: '2024-01-01T00:00:00.000Z' })
  readonly createdAt: Date;

  constructor(params: {
    id: string;
    filename: string;
    originalName: string;
    mimeType: string;
    size: number;
    url: string;
    storageType: StorageType;
    mediaType: MediaType;
    width: number | null;
    height: number | null;
    alt: string | null;
    createdAt: Date;
  }) {
    this.id = params.id;
    this.filename = params.filename;
    this.originalName = params.originalName;
    this.mimeType = params.mimeType;
    this.size = params.size;
    this.url = params.url;
    this.storageType = params.storageType;
    this.mediaType = params.mediaType;
    this.width = params.width;
    this.height = params.height;
    this.alt = params.alt;
    this.createdAt = params.createdAt;
  }
}

/**
 * 分页媒体列表 DTO
 */
export class PaginatedMediaListDto {
  @ApiProperty({ description: '媒体列表', type: [MediaResponseDto] })
  readonly data: MediaResponseDto[];

  @ApiProperty({ description: '总数', example: 100 })
  readonly total: number;

  @ApiProperty({ description: '当前页码', example: 1 })
  readonly page: number;

  @ApiProperty({ description: '每页数量', example: 20 })
  readonly limit: number;

  constructor(params: {
    data: MediaResponseDto[];
    total: number;
    page: number;
    limit: number;
  }) {
    this.data = params.data;
    this.total = params.total;
    this.page = params.page;
    this.limit = params.limit;
  }
}
