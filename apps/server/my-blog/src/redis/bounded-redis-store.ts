import { EventEmitter } from 'node:events';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

/** Keyv-compatible store. A failed Redis connection never prevents Nest startup.
 * No local cache: instances must not retain stale data after remote invalidation.
 * The weather service owns its bounded last-successful fallback.
 */
export class BoundedRedisStore extends EventEmitter {
  private readonly client: Redis;
  private connecting?: Promise<void>;
  private retryAt = 0;
  private readonly prefix = 'blog:cache:v2:';
  constructor(config: ConfigService) {
    super();
    this.client = new Redis({
      host: config.get<string>('REDIS_HOST', 'localhost'),
      port: Number(config.get('REDIS_PORT', 6379)),
      password: config.get<string>('REDIS_PASSWORD', '') || undefined,
      lazyConnect: true, enableOfflineQueue: false, maxRetriesPerRequest: 0,
      connectTimeout: 800, commandTimeout: 1000, retryStrategy: () => null,
    });
    this.client.on('error', () => { /* Operation falls back without logging secrets. */ });
  }
  private async ready() {
    if (this.client.status === 'ready') return true;
    if (Date.now() < this.retryAt) return false;
    if (!this.connecting) {
      this.connecting = this.client.connect().catch(() => { this.retryAt = Date.now() + 5000; }).finally(() => { this.connecting = undefined; });
    }
    await this.connecting;
    return String(this.client.status) === 'ready';
  }
  async get(key: string) {
    try { return await this.ready() ? (await this.client.get(this.prefix + key)) ?? undefined : undefined; } catch { return undefined; }
  }
  async set(key: string, value: string, ttl?: number) {
    try {
      if (!await this.ready()) return;
      if (ttl && ttl > 0) await this.client.set(this.prefix + key, value, 'PX', ttl);
      else await this.client.set(this.prefix + key, value);
    } catch { /* Cache miss on future reads. */ }
  }
  async delete(key: string) {
    try { return await this.ready() ? (await this.client.del(this.prefix + key)) > 0 : false; } catch { return false; }
  }
  async clear() {
    // Never FLUSHDB: unrelated services may share this Redis database.
    if (!await this.ready()) return;
    let cursor = '0';
    do {
      const page = await this.client.scan(cursor, 'MATCH', this.prefix + '*', 'COUNT', 100);
      cursor = page[0];
      if (page[1].length) await this.client.del(...page[1]);
    } while (cursor !== '0');
  }
  async disconnect() { this.client.disconnect(); }
}
