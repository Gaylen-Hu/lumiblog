import { CanActivate, ExecutionContext, HttpException, Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomUUID } from 'node:crypto';
import Redis from 'ioredis';

// Separate, bounded connection: weather may degrade without holding up page reads.
@Injectable()
export class WeatherCoordinator implements OnModuleDestroy {
  private readonly redis: Redis;
  private readonly distributed: boolean;
  private readonly visitors = new Map<string, { count: number; until: number }>();
  constructor(config: ConfigService) {
    this.distributed = config.get<string>('WEATHER_MULTI_INSTANCE', 'false') === 'true';
    this.redis = new Redis({
      host: config.get<string>('REDIS_HOST', 'localhost'),
      port: Number(config.get('REDIS_PORT', 6379)),
      password: config.get<string>('REDIS_PASSWORD', '') || undefined,
      lazyConnect: true, enableOfflineQueue: false, maxRetriesPerRequest: 0,
      connectTimeout: 800, commandTimeout: 1000, retryStrategy: () => null,
    });
    this.redis.on('error', () => { /* bounded fallback; no connection strings in logs */ });
  }
  private async ready() {
    if (this.redis.status === 'wait' || this.redis.status === 'end') await this.redis.connect();
    if (this.redis.status !== 'ready') throw new Error('coordination unavailable');
  }
  async refresh(key: string, task: () => Promise<void>) {
    const lock = key + ':lease', owner = randomUUID();
    let acquired = false;
    try {
      await this.ready();
      acquired = await this.redis.set(lock, owner, 'PX', 10000, 'NX') === 'OK';
      if (!acquired) return;
    } catch {
      // With several instances, do not spend provider quota without coordination.
      if (this.distributed) return;
      await task(); return;
    }
    try { await task(); }
    finally {
      await this.redis.eval("if redis.call('get',KEYS[1]) == ARGV[1] then return redis.call('del',KEYS[1]) else return 0 end", 1, lock, owner).catch(() => {});
    }
  }
  async readBackoff(key: string): Promise<number> {
    try { await this.ready(); return Number(await this.redis.get(key + ':retry')) || 0; } catch { return 0; }
  }
  async backoff(key: string, milliseconds: number) {
    try { await this.ready(); await this.redis.set(key + ':retry', String(Date.now() + milliseconds), 'PX', milliseconds); } catch { /* local backoff still applies */ }
  }
  async allow(ip: string) {
    const key = 'environment:rate:' + createHash('sha256').update(ip).digest('hex').slice(0, 24);
    try {
      await this.ready();
      const count = Number(await this.redis.eval("local n=redis.call('incr',KEYS[1]); if n==1 then redis.call('pexpire',KEYS[1],60000) end; return n", 1, key));
      return count <= 60;
    } catch {
      const now = Date.now();
      for (const [id, bucket] of this.visitors) if (bucket.until <= now) this.visitors.delete(id);
      let bucket = this.visitors.get(key);
      if (!bucket) {
        if (this.visitors.size >= 10000) return false;
        bucket = { count: 0, until: now + 60000 }; this.visitors.set(key, bucket);
      }
      return ++bucket.count <= 60;
    }
  }
  onModuleDestroy() { this.redis.disconnect(); this.visitors.clear(); }
}

@Injectable()
export class EnvironmentRateGuard implements CanActivate {
  constructor(private readonly coordinator: WeatherCoordinator) {}
  async canActivate(context: ExecutionContext) {
    const http = context.switchToHttp();
    if (await this.coordinator.allow(http.getRequest<{ ip?: string }>().ip ?? 'unknown')) return true;
    http.getResponse<{ setHeader: (name: string, value: string) => void }>().setHeader('Retry-After', '60');
    throw new HttpException('环境请求过于频繁，请稍后再试', 429);
  }
}
