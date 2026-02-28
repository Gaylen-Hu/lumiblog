import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as path from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { OssService } from '../oss/oss.service';
import {
  StorageType,
  MediaType,
  UploadMediaParams,
  QueryMediaParams,
} from './domain/media.model';
import { MediaResponseDto, PaginatedMediaListDto } from './dto';
import { Media, StorageType as PrismaStorageType, MediaType as PrismaMediaType } from '@prisma/client';

/** 允许的图片 MIME 类型 */
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
/** 最大文件大小 (10MB) */
const MAX_FILE_SIZE = 10 * 1024 * 1024;

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly ossService: OssService,
  ) {}

  /**
   * 上传媒体文件
   */
  async upload(params: UploadMediaParams): Promise<MediaResponseDto> {
    this.validateFileSize(params.size);

    const mediaType = this.detectMediaType(params.mimeType);
    const url = this.buildUrl(params.storageType, params.storagePath);

    const media = await this.prisma.media.create({
      data: {
        filename: params.filename,
        originalName: params.originalName,
        mimeType: params.mimeType,
        size: params.size,
        url,
        storageType: this.toPrismaStorageType(params.storageType),
        storagePath: params.storagePath,
        mediaType: this.toPrismaMediaType(mediaType),
        width: params.width ?? null,
        height: params.height ?? null,
        alt: params.alt ?? null,
      },
    });

    this.logger.log(`媒体上传成功: ${media.id}`);
    return this.toResponseDto(media);
  }

  /**
   * 查询媒体列表
   */
  async findAll(params: QueryMediaParams): Promise<PaginatedMediaListDto> {
    const where = params.mediaType
      ? { mediaType: this.toPrismaMediaType(params.mediaType) }
      : {};

    const [items, total] = await Promise.all([
      this.prisma.media.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.limit,
        take: params.limit,
      }),
      this.prisma.media.count({ where }),
    ]);

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

    // 根据存储类型删除实际文件
    try {
      switch (media.storageType) {
        case 'oss':
          await this.ossService.deleteObject(media.storagePath);
          break;
        case 'local':
          await this.deleteLocalFile(media.storagePath);
          break;
        case 's3':
          // S3 deletion not yet implemented
          this.logger.warn(`S3 文件删除暂未实现: ${media.storagePath}`);
          break;
      }
    } catch (err) {
      this.logger.error(
        `存储文件删除失败: ${media.storagePath}`,
        err instanceof Error ? err.stack : String(err),
      );
      // 即使文件删除失败，仍然删除数据库记录（避免孤立记录）
    }

    await this.prisma.media.delete({ where: { id } });
    this.logger.log(`媒体删除成功: ${id}`);
  }

  /**
   * 验证是否为允许的图片类型
   */
  isAllowedImageType(mimeType: string): boolean {
    return ALLOWED_IMAGE_TYPES.includes(mimeType);
  }

  private async findById(id: string): Promise<Media> {
    const media = await this.prisma.media.findUnique({ where: { id } });
    if (!media) {
      throw new NotFoundException('媒体不存在');
    }
    return media;
  }

  private async deleteLocalFile(storagePath: string): Promise<void> {
    const uploadDir = this.configService.get<string>('UPLOAD_DIR', './uploads');
    const fullPath = path.join(uploadDir, storagePath);
    await fs.unlink(fullPath);
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

  private toPrismaStorageType(type: StorageType): PrismaStorageType {
    const map: Record<StorageType, PrismaStorageType> = {
      [StorageType.LOCAL]: 'local',
      [StorageType.OSS]: 'oss',
      [StorageType.S3]: 's3',
    };
    return map[type];
  }

  private toPrismaMediaType(type: MediaType): PrismaMediaType {
    const map: Record<MediaType, PrismaMediaType> = {
      [MediaType.IMAGE]: 'image',
      [MediaType.VIDEO]: 'video',
      [MediaType.AUDIO]: 'audio',
      [MediaType.DOCUMENT]: 'document',
      [MediaType.OTHER]: 'other',
    };
    return map[type];
  }

  private fromPrismaStorageType(type: PrismaStorageType): StorageType {
    const map: Record<PrismaStorageType, StorageType> = {
      local: StorageType.LOCAL,
      oss: StorageType.OSS,
      s3: StorageType.S3,
    };
    return map[type];
  }

  private fromPrismaMediaType(type: PrismaMediaType): MediaType {
    const map: Record<PrismaMediaType, MediaType> = {
      image: MediaType.IMAGE,
      video: MediaType.VIDEO,
      audio: MediaType.AUDIO,
      document: MediaType.DOCUMENT,
      other: MediaType.OTHER,
    };
    return map[type];
  }

  private toResponseDto(media: Media): MediaResponseDto {
    return new MediaResponseDto({
      id: media.id,
      filename: media.filename,
      originalName: media.originalName,
      mimeType: media.mimeType,
      size: media.size,
      url: media.url,
      storageType: this.fromPrismaStorageType(media.storageType),
      mediaType: this.fromPrismaMediaType(media.mediaType),
      width: media.width,
      height: media.height,
      alt: media.alt,
      createdAt: media.createdAt,
    });
  }
}
