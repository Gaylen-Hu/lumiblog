import { StorageType, MediaType } from '../domain/media.model';

/**
 * 媒体响应 DTO
 */
export class MediaResponseDto {
  readonly id: string;
  readonly filename: string;
  readonly originalName: string;
  readonly mimeType: string;
  readonly size: number;
  readonly url: string;
  readonly storageType: StorageType;
  readonly mediaType: MediaType;
  readonly width: number | null;
  readonly height: number | null;
  readonly alt: string | null;
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
  readonly data: MediaResponseDto[];
  readonly total: number;
  readonly page: number;
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
