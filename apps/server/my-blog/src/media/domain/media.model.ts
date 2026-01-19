/**
 * 存储类型
 */
export enum StorageType {
  LOCAL = 'local',
  OSS = 'oss',
  S3 = 's3',
}

/**
 * 媒体类型
 */
export enum MediaType {
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
  DOCUMENT = 'document',
  OTHER = 'other',
}

/**
 * 媒体领域模型
 */
export interface Media {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  storageType: StorageType;
  storagePath: string;
  mediaType: MediaType;
  width: number | null;
  height: number | null;
  alt: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 上传媒体参数
 */
export interface UploadMediaParams {
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  storageType: StorageType;
  storagePath: string;
  width?: number;
  height?: number;
  alt?: string;
}

/**
 * 查询媒体参数
 */
export interface QueryMediaParams {
  page: number;
  limit: number;
  mediaType?: MediaType;
}
