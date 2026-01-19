import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { MediaService } from '../media.service';
import { StorageType, MediaType, UploadMediaParams } from '../domain/media.model';

describe('MediaService', () => {
  let service: MediaService;

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue: string) => {
      const config: Record<string, string> = {
        BASE_URL: 'http://localhost:3000',
        OSS_ENDPOINT: 'https://oss.example.com',
        S3_BUCKET: 'my-bucket',
        S3_REGION: 'us-east-1',
      };
      return config[key] || defaultValue;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MediaService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<MediaService>(MediaService);
  });

  describe('upload', () => {
    it('应该成功上传本地文件', async () => {
      // Arrange
      const inputParams: UploadMediaParams = {
        filename: 'test-123.jpg',
        originalName: 'test.jpg',
        mimeType: 'image/jpeg',
        size: 1024,
        storageType: StorageType.LOCAL,
        storagePath: 'test-123.jpg',
      };

      // Act
      const actual = await service.upload(inputParams);

      // Assert
      expect(actual.id).toBeDefined();
      expect(actual.filename).toBe(inputParams.filename);
      expect(actual.mediaType).toBe(MediaType.IMAGE);
      expect(actual.url).toBe('http://localhost:3000/uploads/test-123.jpg');
    });

    it('应该正确检测媒体类型', async () => {
      // Arrange
      const testCases = [
        { mimeType: 'image/png', expected: MediaType.IMAGE },
        { mimeType: 'video/mp4', expected: MediaType.VIDEO },
        { mimeType: 'audio/mpeg', expected: MediaType.AUDIO },
        { mimeType: 'application/pdf', expected: MediaType.DOCUMENT },
        { mimeType: 'application/zip', expected: MediaType.OTHER },
      ];

      for (const testCase of testCases) {
        // Act
        const actual = await service.upload({
          filename: 'test.file',
          originalName: 'test.file',
          mimeType: testCase.mimeType,
          size: 1024,
          storageType: StorageType.LOCAL,
          storagePath: 'test.file',
        });

        // Assert
        expect(actual.mediaType).toBe(testCase.expected);
      }
    });

    it('应该在文件过大时抛出 BadRequestException', async () => {
      // Arrange
      const inputParams: UploadMediaParams = {
        filename: 'large.jpg',
        originalName: 'large.jpg',
        mimeType: 'image/jpeg',
        size: 11 * 1024 * 1024, // 11MB
        storageType: StorageType.LOCAL,
        storagePath: 'large.jpg',
      };

      // Act & Assert
      await expect(service.upload(inputParams)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('应该正确生成 OSS URL', async () => {
      // Arrange
      const inputParams: UploadMediaParams = {
        filename: 'test.jpg',
        originalName: 'test.jpg',
        mimeType: 'image/jpeg',
        size: 1024,
        storageType: StorageType.OSS,
        storagePath: 'images/test.jpg',
      };

      // Act
      const actual = await service.upload(inputParams);

      // Assert
      expect(actual.url).toBe('https://oss.example.com/images/test.jpg');
    });

    it('应该正确生成 S3 URL', async () => {
      // Arrange
      const inputParams: UploadMediaParams = {
        filename: 'test.jpg',
        originalName: 'test.jpg',
        mimeType: 'image/jpeg',
        size: 1024,
        storageType: StorageType.S3,
        storagePath: 'images/test.jpg',
      };

      // Act
      const actual = await service.upload(inputParams);

      // Assert
      expect(actual.url).toBe(
        'https://my-bucket.s3.us-east-1.amazonaws.com/images/test.jpg',
      );
    });
  });

  describe('findAll', () => {
    beforeEach(async () => {
      await service.upload({
        filename: 'image1.jpg',
        originalName: 'image1.jpg',
        mimeType: 'image/jpeg',
        size: 1024,
        storageType: StorageType.LOCAL,
        storagePath: 'image1.jpg',
      });
      await service.upload({
        filename: 'video1.mp4',
        originalName: 'video1.mp4',
        mimeType: 'video/mp4',
        size: 2048,
        storageType: StorageType.LOCAL,
        storagePath: 'video1.mp4',
      });
      await service.upload({
        filename: 'image2.png',
        originalName: 'image2.png',
        mimeType: 'image/png',
        size: 1024,
        storageType: StorageType.LOCAL,
        storagePath: 'image2.png',
      });
    });

    it('应该返回所有媒体', async () => {
      // Act
      const actual = await service.findAll({ page: 1, limit: 10 });

      // Assert
      expect(actual.data.length).toBe(3);
      expect(actual.total).toBe(3);
    });

    it('应该按媒体类型筛选', async () => {
      // Act
      const actual = await service.findAll({
        page: 1,
        limit: 10,
        mediaType: MediaType.IMAGE,
      });

      // Assert
      expect(actual.data.length).toBe(2);
      actual.data.forEach((item) => {
        expect(item.mediaType).toBe(MediaType.IMAGE);
      });
    });

    it('应该支持分页', async () => {
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
      const created = await service.upload({
        filename: 'test.jpg',
        originalName: 'test.jpg',
        mimeType: 'image/jpeg',
        size: 1024,
        storageType: StorageType.LOCAL,
        storagePath: 'test.jpg',
      });

      // Act
      const actual = await service.findOne(created.id);

      // Assert
      expect(actual.id).toBe(created.id);
    });

    it('应该在媒体不存在时抛出 NotFoundException', async () => {
      // Act & Assert
      await expect(service.findOne('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('应该成功删除媒体', async () => {
      // Arrange
      const created = await service.upload({
        filename: 'test.jpg',
        originalName: 'test.jpg',
        mimeType: 'image/jpeg',
        size: 1024,
        storageType: StorageType.LOCAL,
        storagePath: 'test.jpg',
      });

      // Act
      await service.remove(created.id);

      // Assert
      await expect(service.findOne(created.id)).rejects.toThrow(
        NotFoundException,
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
