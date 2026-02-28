import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ApiKeyService } from '../api-key.service';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

// Mock bcrypt
jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

// Mock crypto.randomBytes for deterministic tests
jest.mock('crypto', () => ({
  randomBytes: jest.fn(() => ({
    toString: () => 'a'.repeat(64), // 32 bytes hex = 64 chars
  })),
}));

describe('ApiKeyService', () => {
  let service: ApiKeyService;
  let prisma: Record<string, any>;

  const mockUserId = 'user-001';
  const mockKeyId = 'key-001';
  const mockRawKey = 'sk-' + 'a'.repeat(64);
  const mockKeyHash = '$2b$10$hashedvalue';
  const mockKeyPrefix = 'sk-aaaa****';

  const mockApiKey = {
    id: mockKeyId,
    name: 'Test Key',
    keyHash: mockKeyHash,
    keyPrefix: mockKeyPrefix,
    userId: mockUserId,
    lastUsedAt: null,
    isRevoked: false,
    createdAt: new Date('2024-01-01'),
  };

  beforeEach(async () => {
    prisma = {
      apiKey: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApiKeyService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<ApiKeyService>(ApiKeyService);

    (bcrypt.hash as jest.Mock).mockResolvedValue(mockKeyHash);
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);
  });

  // ============ Key 创建 ============

  describe('create', () => {
    it('应创建 API Key 并返回包含原始 Key 的响应', async () => {
      // Arrange
      prisma.apiKey.create.mockResolvedValue(mockApiKey);

      // Act
      const result = await service.create(mockUserId, { name: 'Test Key' });

      // Assert
      expect(result.key).toBe(mockRawKey);
      expect(result.id).toBe(mockKeyId);
      expect(result.name).toBe('Test Key');
      expect(result.userId).toBe(mockUserId);
      expect(result.isRevoked).toBe(false);
    });

    it('应使用 bcrypt 对原始 Key 进行哈希', async () => {
      // Arrange
      prisma.apiKey.create.mockResolvedValue(mockApiKey);

      // Act
      await service.create(mockUserId, { name: 'Test Key' });

      // Assert
      expect(bcrypt.hash).toHaveBeenCalledWith(mockRawKey, 10);
    });

    it('应将 keyHash 和 keyPrefix 存入数据库', async () => {
      // Arrange
      prisma.apiKey.create.mockResolvedValue(mockApiKey);

      // Act
      await service.create(mockUserId, { name: 'Test Key' });

      // Assert
      expect(prisma.apiKey.create).toHaveBeenCalledWith({
        data: {
          name: 'Test Key',
          keyHash: mockKeyHash,
          keyPrefix: mockKeyPrefix,
          userId: mockUserId,
        },
      });
    });
  });

  // ============ Key 列表 ============

  describe('findAllByUser', () => {
    it('应返回用户的所有 API Key（不含 keyHash）', async () => {
      // Arrange
      const keys = [
        { id: 'key-001', name: 'Key 1', keyPrefix: 'sk-aaa****', userId: mockUserId, lastUsedAt: null, isRevoked: false, createdAt: new Date() },
        { id: 'key-002', name: 'Key 2', keyPrefix: 'sk-bbb****', userId: mockUserId, lastUsedAt: new Date(), isRevoked: true, createdAt: new Date() },
      ];
      prisma.apiKey.findMany.mockResolvedValue(keys);

      // Act
      const result = await service.findAllByUser(mockUserId);

      // Assert
      expect(result).toHaveLength(2);
      expect(prisma.apiKey.findMany).toHaveBeenCalledWith({
        where: { userId: mockUserId },
        select: {
          id: true,
          name: true,
          keyPrefix: true,
          userId: true,
          lastUsedAt: true,
          isRevoked: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('用户无 Key 时应返回空数组', async () => {
      // Arrange
      prisma.apiKey.findMany.mockResolvedValue([]);

      // Act
      const result = await service.findAllByUser(mockUserId);

      // Assert
      expect(result).toEqual([]);
    });
  });

  // ============ Key 吊销 ============

  describe('revoke', () => {
    it('应将 Key 标记为已吊销', async () => {
      // Arrange
      prisma.apiKey.findFirst.mockResolvedValue(mockApiKey);
      prisma.apiKey.update.mockResolvedValue({ ...mockApiKey, isRevoked: true });

      // Act
      const result = await service.revoke(mockUserId, mockKeyId);

      // Assert
      expect(result.isRevoked).toBe(true);
      expect(prisma.apiKey.update).toHaveBeenCalledWith({
        where: { id: mockKeyId },
        data: { isRevoked: true },
        select: {
          id: true,
          name: true,
          keyPrefix: true,
          userId: true,
          lastUsedAt: true,
          isRevoked: true,
          createdAt: true,
        },
      });
    });

    it('Key 不存在时应抛出 NotFoundException', async () => {
      // Arrange
      prisma.apiKey.findFirst.mockResolvedValue(null);

      // Act & Assert
      await expect(service.revoke(mockUserId, 'non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('其他用户的 Key 应抛出 NotFoundException', async () => {
      // Arrange
      prisma.apiKey.findFirst.mockResolvedValue(null);

      // Act & Assert
      await expect(service.revoke('other-user', mockKeyId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ============ Key 删除 ============

  describe('delete', () => {
    it('应成功删除 Key', async () => {
      // Arrange
      prisma.apiKey.findFirst.mockResolvedValue(mockApiKey);
      prisma.apiKey.delete.mockResolvedValue(mockApiKey);

      // Act
      await service.delete(mockUserId, mockKeyId);

      // Assert
      expect(prisma.apiKey.delete).toHaveBeenCalledWith({
        where: { id: mockKeyId },
      });
    });

    it('Key 不存在时应抛出 NotFoundException', async () => {
      // Arrange
      prisma.apiKey.findFirst.mockResolvedValue(null);

      // Act & Assert
      await expect(service.delete(mockUserId, 'non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ============ Key 验证 ============

  describe('validateKey', () => {
    const mockKeysFromDb = [
      {
        id: 'key-001',
        keyHash: 'hash-1',
        user: { id: 'user-001', email: 'user1@test.com' },
      },
      {
        id: 'key-002',
        keyHash: 'hash-2',
        user: { id: 'user-002', email: 'user2@test.com' },
      },
    ];

    it('应验证有效 Key 并返回用户信息', async () => {
      // Arrange
      prisma.apiKey.findMany.mockResolvedValue(mockKeysFromDb);
      (bcrypt.compare as jest.Mock)
        .mockResolvedValueOnce(false)  // first key no match
        .mockResolvedValueOnce(true);  // second key matches
      prisma.apiKey.update.mockResolvedValue({});

      // Act
      const result = await service.validateKey('sk-some-raw-key');

      // Assert
      expect(result).toEqual({ userId: 'user-002', email: 'user2@test.com' });
    });

    it('无效 Key 应返回 null', async () => {
      // Arrange
      prisma.apiKey.findMany.mockResolvedValue(mockKeysFromDb);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      // Act
      const result = await service.validateKey('sk-invalid-key');

      // Assert
      expect(result).toBeNull();
    });

    it('应只查询未吊销的 Key', async () => {
      // Arrange
      prisma.apiKey.findMany.mockResolvedValue([]);

      // Act
      await service.validateKey('sk-any-key');

      // Assert
      expect(prisma.apiKey.findMany).toHaveBeenCalledWith({
        where: { isRevoked: false },
        select: {
          id: true,
          keyHash: true,
          user: { select: { id: true, email: true } },
        },
      });
    });

    it('验证成功后应异步更新 lastUsedAt', async () => {
      // Arrange
      prisma.apiKey.findMany.mockResolvedValue([mockKeysFromDb[0]]);
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(true);
      prisma.apiKey.update.mockResolvedValue({});

      // Act
      await service.validateKey('sk-valid-key');

      // Assert
      expect(prisma.apiKey.update).toHaveBeenCalledWith({
        where: { id: 'key-001' },
        data: { lastUsedAt: expect.any(Date) },
      });
    });

    it('lastUsedAt 更新失败不应影响验证结果', async () => {
      // Arrange
      prisma.apiKey.findMany.mockResolvedValue([mockKeysFromDb[0]]);
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(true);
      prisma.apiKey.update.mockRejectedValue(new Error('DB error'));

      // Act
      const result = await service.validateKey('sk-valid-key');

      // Assert — the promise rejection is caught internally, result still valid
      expect(result).toEqual({ userId: 'user-001', email: 'user1@test.com' });
    });

    it('无未吊销 Key 时应返回 null', async () => {
      // Arrange
      prisma.apiKey.findMany.mockResolvedValue([]);

      // Act
      const result = await service.validateKey('sk-any-key');

      // Assert
      expect(result).toBeNull();
    });
  });
});
