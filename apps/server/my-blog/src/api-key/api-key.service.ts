import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateApiKeyDto, ApiKeyResponseDto, CreateApiKeyResponseDto } from './dto/api-key.dto';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';

/**
 * 恒定时间字符串比较，防止时序攻击
 * 即使两个字符串长度不同，也保证比较时间一致
 */
function constantTimeCompare(a: string, b: string): boolean {
  const aBuffer = Buffer.from(a, 'utf8');
  const bBuffer = Buffer.from(b, 'utf8');
  
  // 即使长度不同，也遍历较长的缓冲区，避免通过时间推断长度信息
  const maxLength = Math.max(aBuffer.length, bBuffer.length);
  let result = aBuffer.length === bBuffer.length ? 0 : 1;
  
  for (let i = 0; i < maxLength; i++) {
    // 如果超出某个缓冲区长度，用 0 填充，确保始终执行相同次数的比较
    const aByte = i < aBuffer.length ? aBuffer[i] : 0;
    const bByte = i < bBuffer.length ? bBuffer[i] : 0;
    result |= aByte ^ bByte;
  }
  
  return result === 0;
}

const API_KEY_PREFIX = 'sk-';
const KEY_RANDOM_BYTES = 32;

@Injectable()
export class ApiKeyService {
  private readonly logger = new Logger(ApiKeyService.name);

  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateApiKeyDto): Promise<CreateApiKeyResponseDto> {
    const rawKey = API_KEY_PREFIX + crypto.randomBytes(KEY_RANDOM_BYTES).toString('hex');
    const keyHash = await bcrypt.hash(rawKey, 10);
    const keyPrefix = rawKey.slice(0, 7) + '****';

    const apiKey = await this.prisma.apiKey.create({
      data: {
        name: dto.name,
        keyHash,
        keyPrefix,
        userId,
      },
    });

    this.logger.log(`API Key created: ${apiKey.id} for user ${userId}`);

    return {
      id: apiKey.id,
      name: apiKey.name,
      keyPrefix: apiKey.keyPrefix,
      userId: apiKey.userId,
      lastUsedAt: apiKey.lastUsedAt,
      isRevoked: apiKey.isRevoked,
      createdAt: apiKey.createdAt,
      key: rawKey,
    };
  }

  async findAllByUser(userId: string): Promise<ApiKeyResponseDto[]> {
    const keys = await this.prisma.apiKey.findMany({
      where: { userId },
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
    return keys;
  }

  async revoke(userId: string, keyId: string): Promise<ApiKeyResponseDto> {
    const apiKey = await this.prisma.apiKey.findFirst({
      where: { id: keyId, userId },
    });

    if (!apiKey) {
      throw new NotFoundException('API Key 不存在');
    }

    const updated = await this.prisma.apiKey.update({
      where: { id: keyId },
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

    this.logger.log(`API Key revoked: ${keyId} by user ${userId}`);
    return updated;
  }

  async delete(userId: string, keyId: string): Promise<void> {
    const apiKey = await this.prisma.apiKey.findFirst({
      where: { id: keyId, userId },
    });

    if (!apiKey) {
      throw new NotFoundException('API Key 不存在');
    }

    await this.prisma.apiKey.delete({ where: { id: keyId } });
    this.logger.log(`API Key deleted: ${keyId} by user ${userId}`);
  }

  async validateKey(rawKey: string): Promise<{ userId: string; email: string } | null> {
    // 用 keyPrefix 前 7 位缩小候选范围，避免全表 bcrypt 扫描
    const prefix = rawKey.slice(0, 7);
    const candidates = await this.prisma.apiKey.findMany({
      where: {
        isRevoked: false,
        keyPrefix: { startsWith: prefix },
      },
      select: {
        id: true,
        keyHash: true,
        user: { select: { id: true, email: true } },
      },
    });

    for (const key of candidates) {
      // 使用 bcrypt.compare 进行哈希比较（bcrypt 本身是恒定时间的）
      const isMatch = await bcrypt.compare(rawKey, key.keyHash);
      if (isMatch) {
        // 异步更新最后使用时间，不阻塞请求
        this.prisma.apiKey
          .update({
            where: { id: key.id },
            data: { lastUsedAt: new Date() },
          })
          .catch((err: Error) => {
            this.logger.warn(`Failed to update lastUsedAt for key ${key.id}: ${err.message}`);
          });
        return { userId: key.user.id, email: key.user.email };
      }
    }

    // 即使没有找到匹配的 key，也执行一次虚拟的 bcrypt 比较，防止通过时间差异判断 key 是否存在
    await bcrypt.compare(rawKey, '$2a$10$dummy.hash.for.constant.time.compareXXXXXXXXXXXXXXXXXXXXX');
    
    return null;
  }
}
