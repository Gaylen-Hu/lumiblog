import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import * as fc from 'fast-check';
import { MediaService } from '../media.service';
import { PrismaService } from '../../prisma/prisma.service';
import { OssService } from '../../oss/oss.service';
import { StorageType, MediaType } from '../domain/media.model';

// Mock fs/promises for local file deletion tests
jest.mock('fs/promises', () => ({
  unlink: jest.fn().mockResolvedValue(undefined),
}));
import * as fs from 'fs/promises';

function buildMockMedia(overrides: Partial<{
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  storageType: string;
  storagePath: string;
  mediaType: string;
  width: number | null;
  height: number | null;
  alt: string | null;
  createdAt: Date;
  updatedAt: Date;
}> = {}) {
  const now = new Date();
  return {
    id: overrides.id ?? 'media-1',
    filename: overrides.filename ?? 'test.jpg',
    originalName: overrides.originalName ?? 'test.jpg',
    mimeType: overrides.mimeType ?? 'image/jpeg',
    size: overrides.size ?? 1024,
    url: overrides.url ?? 'http://localhost:3000/uploads/test.jpg',
    storageType: overrides.storageType ?? 'local',
    storagePath: overrides.storagePath ?? 'test.jpg',
    mediaType: overrides.mediaType ?? 'image',
    width: overrides.width ?? null,
    height: overrides.height ?? null,
    alt: overrides.alt ?? null,
    createdAt: overrides.createdAt ?? now,
    updatedAt: overrides.updatedAt ?? now,
  };
}

describe('MediaService', () => {
  let service: MediaService;
  let prisma: {
    media: {
      create: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      delete: jest.Mock;
      count: jest.Mock;
    };
  };
  let ossService: { deleteObject: jest.Mock };

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: string) => {
      const config: Record<string, string> = {
        BASE_URL: 'http://localhost:3000',
        OSS_ENDPOINT: 'https://oss.example.com',
        S3_BUCKET: 'my-bucket',
        S3_REGION: 'us-east-1',
        UPLOAD_DIR: './uploads',
      };
      return config[key] || defaultValue;
    }),
  };

  beforeEach(async () => {
    prisma = {
      media: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
    };

    ossService = {
      deleteObject: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MediaService,
        { provide: PrismaService, useValue: prisma },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: OssService, useValue: ossService },
      ],
    }).compile();

    service = module.get<MediaService>(MediaService);
  });

  describe('upload', () => {
    it('应该成功上传本地文件', async () => {
      // Arrange
      prisma.media.create.mockResolvedValue(buildMockMedia({
        filename: 'test-123.jpg',
        url: 'http://localhost:3000/uploads/test-123.jpg',
        mediaType: 'image',
      }));

      // Act
      const actual = await service.upload({
        filename: 'test-123.jpg',
        originalName: 'test.jpg',
        mimeType: 'image/jpeg',
        size: 1024,
        storageType: StorageType.LOCAL,
        storagePath: 'test-123.jpg',
      });

      // Assert
      expect(actual.id).toBeDefined();
      expect(actual.filename).toBe('test-123.jpg');
      expect(actual.mediaType).toBe(MediaType.IMAGE);
      expect(actual.url).toBe('http://localhost:3000/uploads/test-123.jpg');
    });

    it('应该正确检测媒体类型', async () => {
      // Arrange
      const testCases = [
        { mimeType: 'image/png', expected: 'image' },
        { mimeType: 'video/mp4', expected: 'video' },
        { mimeType: 'audio/mpeg', expected: 'audio' },
        { mimeType: 'application/pdf', expected: 'document' },
        { mimeType: 'application/zip', expected: 'other' },
      ];

      for (const testCase of testCases) {
        prisma.media.create.mockResolvedValue(buildMockMedia({ mediaType: testCase.expected }));

        const actual = await service.upload({
          filename: 'test.file',
          originalName: 'test.file',
          mimeType: testCase.mimeType,
          size: 1024,
          storageType: StorageType.LOCAL,
          storagePath: 'test.file',
        });

        expect(actual.mediaType).toBe(testCase.expected);
      }
    });

    it('应该在文件过大时抛出 BadRequestException', async () => {
      // Act & Assert
      await expect(service.upload({
        filename: 'large.jpg',
        originalName: 'large.jpg',
        mimeType: 'image/jpeg',
        size: 11 * 1024 * 1024,
        storageType: StorageType.LOCAL,
        storagePath: 'large.jpg',
      })).rejects.toThrow(BadRequestException);
    });

    it('应该正确生成 OSS URL', async () => {
      // Arrange
      prisma.media.create.mockResolvedValue(buildMockMedia({
        url: 'https://oss.example.com/images/test.jpg',
        storageType: 'oss',
      }));

      // Act
      const actual = await service.upload({
        filename: 'test.jpg',
        originalName: 'test.jpg',
        mimeType: 'image/jpeg',
        size: 1024,
        storageType: StorageType.OSS,
        storagePath: 'images/test.jpg',
      });

      // Assert
      expect(actual.url).toBe('https://oss.example.com/images/test.jpg');
    });

    it('应该正确生成 S3 URL', async () => {
      // Arrange
      prisma.media.create.mockResolvedValue(buildMockMedia({
        url: 'https://my-bucket.s3.us-east-1.amazonaws.com/images/test.jpg',
        storageType: 's3',
      }));

      // Act
      const actual = await service.upload({
        filename: 'test.jpg',
        originalName: 'test.jpg',
        mimeType: 'image/jpeg',
        size: 1024,
        storageType: StorageType.S3,
        storagePath: 'images/test.jpg',
      });

      // Assert
      expect(actual.url).toBe('https://my-bucket.s3.us-east-1.amazonaws.com/images/test.jpg');
    });
  });

  describe('findAll', () => {
    it('应该返回所有媒体', async () => {
      // Arrange
      prisma.media.findMany.mockResolvedValue([
        buildMockMedia({ id: 'media-1' }),
        buildMockMedia({ id: 'media-2' }),
        buildMockMedia({ id: 'media-3' }),
      ]);
      prisma.media.count.mockResolvedValue(3);

      // Act
      const actual = await service.findAll({ page: 1, limit: 10 });

      // Assert
      expect(actual.data.length).toBe(3);
      expect(actual.total).toBe(3);
    });

    it('应该按媒体类型筛选', async () => {
      // Arrange
      prisma.media.findMany.mockResolvedValue([
        buildMockMedia({ id: 'media-1', mediaType: 'image' }),
        buildMockMedia({ id: 'media-2', mediaType: 'image' }),
      ]);
      prisma.media.count.mockResolvedValue(2);

      // Act
      const actual = await service.findAll({ page: 1, limit: 10, mediaType: MediaType.IMAGE });

      // Assert
      expect(actual.data.length).toBe(2);
      actual.data.forEach((item) => {
        expect(item.mediaType).toBe(MediaType.IMAGE);
      });
    });

    it('应该支持分页', async () => {
      // Arrange
      prisma.media.findMany.mockResolvedValue([
        buildMockMedia({ id: 'media-1' }),
        buildMockMedia({ id: 'media-2' }),
      ]);
      prisma.media.count.mockResolvedValue(3);

      // Act
      const actual = await service.findAll({ page: 1, limit: 2 });

      // Assert
      expect(actual.data.length).toBe(2);
      expect(actual.total).toBe(3);
      expect(actual.page).toBe(1);
      expect(actual.limit).toBe(2);
    });
  });

  describe('findOne', () => {
    it('应该返回指定媒体', async () => {
      // Arrange
      prisma.media.findUnique.mockResolvedValue(buildMockMedia({ id: 'media-1' }));

      // Act
      const actual = await service.findOne('media-1');

      // Assert
      expect(actual.id).toBe('media-1');
    });

    it('应该在媒体不存在时抛出 NotFoundException', async () => {
      // Arrange
      prisma.media.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('应该成功删除媒体', async () => {
      // Arrange
      prisma.media.findUnique.mockResolvedValue(buildMockMedia({ id: 'media-1' }));
      prisma.media.delete.mockResolvedValue(buildMockMedia({ id: 'media-1' }));

      // Act & Assert
      await expect(service.remove('media-1')).resolves.toBeUndefined();
      expect(prisma.media.delete).toHaveBeenCalledWith({ where: { id: 'media-1' } });
    });

    it('应该在删除 OSS 类型媒体时调用 ossService.deleteObject', async () => {
      // Arrange
      prisma.media.findUnique.mockResolvedValue(
        buildMockMedia({ id: 'media-oss', storageType: 'oss', storagePath: 'images/test.jpg' }),
      );
      prisma.media.delete.mockResolvedValue(buildMockMedia({ id: 'media-oss' }));

      // Act
      await service.remove('media-oss');

      // Assert
      expect(ossService.deleteObject).toHaveBeenCalledWith('images/test.jpg');
      expect(prisma.media.delete).toHaveBeenCalledWith({ where: { id: 'media-oss' } });
    });

    it('应该在删除 local 类型媒体时调用 fs.unlink', async () => {
      // Arrange
      prisma.media.findUnique.mockResolvedValue(
        buildMockMedia({ id: 'media-local', storageType: 'local', storagePath: 'uploads/photo.jpg' }),
      );
      prisma.media.delete.mockResolvedValue(buildMockMedia({ id: 'media-local' }));

      // Act
      await service.remove('media-local');

      // Assert
      expect(fs.unlink).toHaveBeenCalledWith(
        expect.stringContaining('photo.jpg'),
      );
      expect(prisma.media.delete).toHaveBeenCalledWith({ where: { id: 'media-local' } });
    });

    it('应该在存储文件删除失败时仍删除数据库记录', async () => {
      // Arrange
      prisma.media.findUnique.mockResolvedValue(
        buildMockMedia({ id: 'media-fail', storageType: 'oss', storagePath: 'images/fail.jpg' }),
      );
      ossService.deleteObject.mockRejectedValueOnce(new Error('OSS error'));
      prisma.media.delete.mockResolvedValue(buildMockMedia({ id: 'media-fail' }));

      // Act
      await service.remove('media-fail');

      // Assert - DB record should still be deleted even though file deletion failed
      expect(prisma.media.delete).toHaveBeenCalledWith({ where: { id: 'media-fail' } });
    });

    it('应该在媒体不存在时抛出 NotFoundException', async () => {
      // Arrange
      prisma.media.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.remove('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  /**
   * **Validates: Requirements 6.3**
   * 属性 7: 媒体删除完整性 — 删除后数据库中不存在该记录
   */
  describe('Property 7: 媒体删除完整性', () => {
    it('对任意存储类型，删除操作始终调用 prisma.media.delete', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('local', 'oss', 's3'),
          fc.uuid(),
          fc.string({ minLength: 1, maxLength: 50 }),
          async (storageType, mediaId, storagePath) => {
            // Arrange
            prisma.media.findUnique.mockResolvedValue(
              buildMockMedia({ id: mediaId, storageType, storagePath }),
            );
            prisma.media.delete.mockResolvedValue(buildMockMedia({ id: mediaId }));
            ossService.deleteObject.mockResolvedValue(undefined);
            (fs.unlink as jest.Mock).mockResolvedValue(undefined);

            // Act
            await service.remove(mediaId);

            // Assert — DB record is always deleted regardless of storage type
            expect(prisma.media.delete).toHaveBeenCalledWith({ where: { id: mediaId } });
          },
        ),
        { numRuns: 20 },
      );
    });
  });

  describe('isAllowedImageType', () => {
    it('应该正确判断允许的图片类型', () => {
      expect(service.isAllowedImageType('image/jpeg')).toBe(true);
      expect(service.isAllowedImageType('image/png')).toBe(true);
      expect(service.isAllowedImageType('image/gif')).toBe(true);
      expect(service.isAllowedImageType('image/webp')).toBe(true);
      expect(service.isAllowedImageType('image/bmp')).toBe(false);
      expect(service.isAllowedImageType('video/mp4')).toBe(false);
    });
  });
});
