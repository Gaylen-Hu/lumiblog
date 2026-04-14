import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { OssService } from '../oss.service';
import { PrismaService } from '../../prisma/prisma.service';
import { FileCategory } from '../dto';
import { OSS_SIGNATURE_EXPIRE, FILE_SIZE_LIMITS } from '../oss.constants';

describe('OssService', () => {
  let service: OssService;
  let configGet: jest.Mock;

  const ossConfig: Record<string, string> = {
    OSS_ACCESS_KEY_ID: 'test-access-key-id',
    OSS_ACCESS_KEY_SECRET: 'test-access-key-secret',
    OSS_BUCKET: 'test-bucket',
    OSS_REGION: 'oss-cn-hangzhou',
    OSS_ENDPOINT: 'https://test-bucket.oss-cn-hangzhou.aliyuncs.com',
    OSS_CALLBACK_URL: 'https://api.example.com/callback',
  };

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: string) => {
      return ossConfig[key] ?? defaultValue;
    }),
  };

  // Mock global fetch for deleteObject tests
  const mockFetch = jest.fn();
  const originalFetch = global.fetch;

  beforeEach(async () => {
    mockConfigService.get.mockImplementation(
      (key: string, defaultValue?: string) => ossConfig[key] ?? defaultValue,
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OssService,
        { provide: ConfigService, useValue: mockConfigService },
        {
          provide: PrismaService,
          useValue: {
            media: {
              create: jest.fn().mockImplementation(({ data }) => 
                Promise.resolve({
                  id: 'media-1',
                  filename: data.filename,
                  originalName: data.originalName,
                  mimeType: data.mimeType,
                  size: data.size,
                  url: data.url,
                  storageType: data.storageType,
                  storagePath: data.storagePath,
                  mediaType: data.mediaType,
                }),
              ),
            },
          },
        },
      ],
    }).compile();

    service = module.get<OssService>(OssService);
    configGet = mockConfigService.get;
    global.fetch = mockFetch;
    mockFetch.mockReset();
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  describe('getSignature', () => {
    const validParams = {
      filename: 'cover.jpg',
      mimeType: 'image/jpeg',
      size: 1024,
      category: FileCategory.IMAGE,
    };

    it('应返回包含完整字段的签名响应', async () => {
      // Act
      const result = await service.getSignature(validParams);

      // Assert
      expect(result.host).toBe(ossConfig.OSS_ENDPOINT);
      expect(result.key).toBeDefined();
      expect(result.key).toContain('.jpg');
      expect(result.policy).toBeDefined();
      expect(result.signature).toBeDefined();
      expect(result.accessKeyId).toBe(ossConfig.OSS_ACCESS_KEY_ID);
      expect(result.expire).toBeGreaterThan(Math.floor(Date.now() / 1000));
      expect(result.url).toContain(ossConfig.OSS_ENDPOINT);
    });

    it('签名过期时间应为当前时间 + OSS_SIGNATURE_EXPIRE 秒', async () => {
      // Act
      const before = Math.floor(Date.now() / 1000);
      const result = await service.getSignature(validParams);
      const after = Math.floor(Date.now() / 1000);

      // Assert
      expect(result.expire).toBeGreaterThanOrEqual(before + OSS_SIGNATURE_EXPIRE);
      expect(result.expire).toBeLessThanOrEqual(after + OSS_SIGNATURE_EXPIRE);
    });

    it('配置了 OSS_CALLBACK_URL 时应包含 callback 字段', async () => {
      // Act
      const result = await service.getSignature(validParams);

      // Assert
      expect(result.callback).toBeDefined();
      const callbackJson = JSON.parse(
        Buffer.from(result.callback!, 'base64').toString(),
      );
      expect(callbackJson.callbackUrl).toBe(ossConfig.OSS_CALLBACK_URL);
    });

    it('未配置 OSS_CALLBACK_URL 时不应包含 callback 字段', async () => {
      // Arrange
      const configWithoutCallback = { ...ossConfig };
      delete (configWithoutCallback as Record<string, string | undefined>).OSS_CALLBACK_URL;
      configGet.mockImplementation(
        (key: string, defaultValue?: string) =>
          configWithoutCallback[key] ?? defaultValue,
      );

      // Act
      const result = await service.getSignature(validParams);

      // Assert
      expect(result.callback).toBeUndefined();
    });

    it('OSS 配置缺失时应抛出 ServiceUnavailableException', async () => {
      // Arrange
      configGet.mockImplementation(
        (key: string, defaultValue?: string) => {
          if (key === 'OSS_ACCESS_KEY_ID') return undefined;
          return ossConfig[key] ?? defaultValue;
        },
      );

      // Act & Assert
      await expect(service.getSignature(validParams)).rejects.toThrow(
        ServiceUnavailableException,
      );
    });

    it('不支持的文件类型应抛出 BadRequestException', async () => {
      // Arrange
      const params = {
        filename: 'malware.exe',
        mimeType: 'application/x-msdownload',
        size: 1024,
        category: FileCategory.IMAGE,
      };

      // Act & Assert
      await expect(service.getSignature(params)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('文件大小超过限制应抛出 BadRequestException', async () => {
      // Arrange
      const params = {
        filename: 'huge.jpg',
        mimeType: 'image/jpeg',
        size: FILE_SIZE_LIMITS.image + 1,
        category: FileCategory.IMAGE,
      };

      // Act & Assert
      await expect(service.getSignature(params)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('应根据自定义 directory 生成 key', async () => {
      // Arrange
      const params = {
        ...validParams,
        directory: 'custom/path',
      };

      // Act
      const result = await service.getSignature(params);

      // Assert
      expect(result.key).toMatch(/^custom\/path\//);
    });
  });

  describe('handleCallback', () => {
    it('应返回包含 url、filename、size、mimeType 的成功响应', async () => {
      // Arrange
      const params = {
        bucket: 'test-bucket',
        object: 'images/2024/01/01/abc123.jpg',
        etag: '"test-etag"',
        size: 2048,
        mimeType: 'image/jpeg',
      };

      // Act
      const result = await service.handleCallback(params);

      // Assert
      expect(result.success).toBe(true);
      expect(result.url).toBe(
        `${ossConfig.OSS_ENDPOINT}/${params.object}`,
      );
      expect(result.filename).toBe('abc123.jpg');
      expect(result.size).toBe(2048);
      expect(result.mimeType).toBe('image/jpeg');
    });

    it('object 路径无斜杠时 filename 应为完整 object', async () => {
      // Arrange
      const params = {
        bucket: 'test-bucket',
        object: 'simple-file.png',
        etag: '"etag"',
        size: 512,
        mimeType: 'image/png',
      };

      // Act
      const result = await service.handleCallback(params);

      // Assert
      expect(result.filename).toBe('simple-file.png');
    });
  });

  describe('getBatchSignatures', () => {
    it('应返回与输入文件数量相同的签名数组', async () => {
      // Arrange
      const files = [
        { filename: 'a.jpg', mimeType: 'image/jpeg', size: 1024 },
        { filename: 'b.png', mimeType: 'image/png', size: 2048 },
        { filename: 'c.pdf', mimeType: 'application/pdf', size: 4096, category: FileCategory.DOCUMENT },
      ];

      // Act
      const results = await service.getBatchSignatures(files);

      // Assert
      expect(results).toHaveLength(3);
      expect(results[0].key).toContain('.jpg');
      expect(results[1].key).toContain('.png');
      expect(results[2].key).toContain('.pdf');
    });
  });

  describe('deleteObject', () => {
    it('应发送带正确 Authorization 头的 DELETE 请求', async () => {
      // Arrange
      mockFetch.mockResolvedValue({ ok: true, status: 204 });
      const objectKey = 'images/2024/01/test.jpg';

      // Act
      await service.deleteObject(objectKey);

      // Assert
      expect(mockFetch).toHaveBeenCalledWith(
        `${ossConfig.OSS_ENDPOINT}/${objectKey}`,
        expect.objectContaining({
          method: 'DELETE',
          headers: expect.objectContaining({
            Date: expect.any(String),
            Authorization: expect.stringMatching(
              /^OSS test-access-key-id:.+$/,
            ),
          }),
        }),
      );
    });

    it('对象不存在（404）时不应抛出异常', async () => {
      // Arrange
      mockFetch.mockResolvedValue({ ok: false, status: 404, statusText: 'Not Found' });

      // Act & Assert
      await expect(
        service.deleteObject('nonexistent/file.jpg'),
      ).resolves.toBeUndefined();
    });

    it('非 404 失败应抛出 Error', async () => {
      // Arrange
      mockFetch.mockResolvedValue({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
      });

      // Act & Assert
      await expect(
        service.deleteObject('forbidden/file.jpg'),
      ).rejects.toThrow('OSS 对象删除失败: 403 Forbidden');
    });

    it('OSS 配置缺失时应抛出 ServiceUnavailableException', async () => {
      // Arrange
      configGet.mockImplementation(
        (key: string, defaultValue?: string) => {
          if (key === 'OSS_BUCKET') return undefined;
          return ossConfig[key] ?? defaultValue;
        },
      );

      // Act & Assert
      await expect(
        service.deleteObject('some/file.jpg'),
      ).rejects.toThrow(ServiceUnavailableException);
    });
  });
});
