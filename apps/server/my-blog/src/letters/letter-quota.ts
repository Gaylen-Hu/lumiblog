import {
  HttpException,
  Injectable,
  Logger,
  OnModuleDestroy,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

const reserve = `
local ip = tonumber(redis.call('GET', KEYS[1]) or 0)
local all = tonumber(redis.call('GET', KEYS[2]) or 0)
if ip >= tonumber(ARGV[1]) then return math.max(1, redis.call('TTL', KEYS[1])) end
if all >= tonumber(ARGV[2]) then return -math.max(1, redis.call('TTL', KEYS[2])) end
for i = 1, 2 do
  if redis.call('INCR', KEYS[i]) == 1 then redis.call('EXPIRE', KEYS[i], 600) end
end
return 0`;

@Injectable()
export class LetterQuota implements OnModuleDestroy {
  private readonly client: Redis;
  private connecting?: Promise<void>;
  private readonly logger = new Logger(LetterQuota.name);
  constructor(private readonly config: ConfigService) {
    this.client = new Redis({
      host: config.get('REDIS_HOST', 'localhost'),
      port: Number(config.get('REDIS_PORT', 6379)),
      password: config.get<string>('REDIS_PASSWORD') || undefined,
      lazyConnect: true,
      enableOfflineQueue: false,
      connectTimeout: 500,
      commandTimeout: 500,
      maxRetriesPerRequest: 0,
      retryStrategy: () => null,
    });
    this.client.on('error', () => {});
  }
  async take(ipKey: string) {
    let retry: number;
    try {
      if (this.client.status !== 'ready') {
        this.connecting ??= this.client.connect().finally(() => {
          this.connecting = undefined;
        });
        await this.connecting;
      }
      const budget = Number(this.config.get('LETTERS_GLOBAL_PER_10M', 120));
      if (!Number.isSafeInteger(budget) || budget < 1)
        throw new Error('Invalid budget');
      retry = Number(
        await this.client.eval(
          reserve,
          2,
          'letters:q:ip:' + ipKey,
          'letters:q:all:' +
            this.config.get<string>('LETTERS_QUOTA_NAMESPACE', 'production'),
          3,
          budget,
        ),
      );
    } catch {
      this.logger.warn('letter-write quota unavailable');
      throw new ServiceUnavailableException('Mailbox temporarily unavailable');
    }
    if (retry !== 0) {
      this.logger.warn(
        retry > 0
          ? 'letter-write quota reached: source'
          : 'letter-write quota reached: global',
      );
      throw new HttpException(
        { statusCode: 429, retryAfter: Math.abs(retry) },
        429,
      );
    }
  }
  onModuleDestroy() {
    this.client.disconnect();
  }
}
