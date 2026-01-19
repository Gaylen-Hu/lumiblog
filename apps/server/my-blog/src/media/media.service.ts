import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Media,
  StorageType,
  MediaType,
  UploadMediaParams,
  QueryMediaParams,
} from './domain/media.model';
import { MediaResponseDto, PaginatedMediaListDto } from './dto';

/** 允许的图片 MIME 类型 */
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
/** 最大文件大小 (10MB) */
const MAX_FILE_SIZE = 10 * 1024 * 1024;

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);
  private medias: Media[] = [];
  private idCounter = 1;

  constructor(private readonly configService: ConfigService) {}

  /**
   * 上传媒体文件
   */
  async upload(params: UploadMediaParams): Promise<MediaResponseDto> {
    this.validateFileSize(params.size);

    const mediaType = this.detectMediaType(params.mimeType);
    const url = this.buildUrl(params.storageType, params.storagePath);

    const now = new Date();
    const media: Media = {
      id: String(this.idCounter++),
      filename: params.filename,
      originalName: params.originalName,
      mimeType: params.mimeType,
      size: params.size,
      url,
      storageType: params.storageType,
      storagePath: params.storagePath,
      mediaType,
      width: params.width ?? null,
      height: params.height ?? null,
      alt: params.alt ?? null,
      createdAt: now,
      updatedAt: now,
    };

    this.medias.push(media);
    this.logger.log(`媒体上传成功: ${media.id}`);

    return this.toResponseDto(media);
  }

  /**
   * 查询媒体列表
   */
  async findAll(params: QueryMediaParams): Promise<PaginatedMediaListDto> {
    let filtered = [...this.medias];

    if (params.mediaType) {
      filtered = filtered.filter((m) => m.mediaType === params.mediaType);
    }

    const total = filtered.length;
    const start = (params.page - 1) * params.limit;
    const items = filtered
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(start, start + params.limit);

    return new PaginatedMediaListDto({
      data: items.map((m) => this.toResponseDto(m)),
      total,
      page: params.page,
      limit: params.limit,
    });
  }

  /**
   * 根据 ID 获取媒体
   */
  async findOne(id: string): Promise<MediaResponseDto> {
    const media = await this.findById(id);
    return this.toResponseDto(media);
  }

  /**
   * 删除媒体
   */
  async remove(id: string): Promise<void> {
    const media = await this.findById(id);
    // TODO: 实际删除存储文件
    this.medias = this.medias.filter((m) => m.id !== id);
    this.logger.log(`媒体删除成功: ${id}, 路径: ${media.storagePath}`);
  }

  /**
   * 验证是否为允许的图片类型
   */
  isAllowedImageType(mimeType: string): boolean {
    return ALLOWED_IMAGE_TYPES.includes(mimeType);
  }

  private async findById(id: string): Promise<Media> {
    const media = this.medias.find((m) => m.id === id);
    if (!media) {
      throw new NotFoundException('媒体不存在');
    }
    return media;
  }

  private validateFileSize(size: number): void {
    if (size > MAX_FILE_SIZE) {
      throw new BadRequestException('文件大小不能超过 10MB');
    }
  }

  private detectMediaType(mimeType: string): MediaType {
    if (mimeType.startsWith('image/')) return MediaType.IMAGE;
    if (mimeType.startsWith('video/')) return MediaType.VIDEO;
    if (mimeType.startsWith('audio/')) return MediaType.AUDIO;
    if (mimeType.includes('pdf') || mimeType.includes('document')) {
      return MediaType.DOCUMENT;
    }
    return MediaType.OTHER;
  }

  private buildUrl(storageType: StorageType, storagePath: string): string {
    switch (storageType) {
      case StorageType.LOCAL:
        const baseUrl = this.configService.get<string>('BASE_URL', 'http://localhost:3000');
        return `${baseUrl}/uploads/${storagePath}`;
      case StorageType.OSS:
        const ossEndpoint = this.configService.get<string>('OSS_ENDPOINT', '');
        return `${ossEndpoint}/${storagePath}`;
      case StorageType.S3:
        const s3Bucket = this.configService.get<string>('S3_BUCKET', '');
        const s3Region = this.configService.get<string>('S3_REGION', '');
        return `https://${s3Bucket}.s3.${s3Region}.amazonaws.com/${storagePath}`;
      default:
        return storagePath;
    }
  }

  private toResponseDto(media: Media): MediaResponseDto {
    return new MediaResponseDto({
      id: media.id,
      filename: media.filename,
      originalName: media.originalName,
      mimeType: media.mimeType,
      size: media.size,
      url: media.url,
      storageType: media.storageType,
      mediaType: media.mediaType,
      width: media.width,
      height: media.height,
      alt: media.alt,
      createdAt: media.createdAt,
    });
  }
}
