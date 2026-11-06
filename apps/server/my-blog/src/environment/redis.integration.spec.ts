import { Test } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RedisModule } from '../redis/redis.module';
import { BlogCacheService } from '../redis/blog-cache.service';
import { WeatherCoordinator } from './weather-coordinator';
import Redis from 'ioredis';
import { randomUUID } from 'node:crypto';

const port = Number(process.env.REDIS_INTEGRATION_PORT);
const suite = port ? describe : describe.skip;
suite('real local Redis coordination and cache adapter', () => {
  const prefix = 'environment:test:' + randomUUID();
  const config = (redisPort = port, multi = true) => new ConfigService({ REDIS_HOST: '127.0.0.1', REDIS_PORT: redisPort, REDIS_PASSWORD: '', WEATHER_MULTI_INSTANCE: String(multi) });
  let redis: Redis;
  const coordinators: WeatherCoordinator[] = [];
  const coordinator = (settings = config()) => { const value = new WeatherCoordinator(settings); coordinators.push(value); return value; };
  beforeAll(async () => {
    if (!(port > 0 && port < 65536)) throw Error('Explicit local Redis port required');
    redis = new Redis({ host: '127.0.0.1', port, maxRetriesPerRequest: 0 });
    await redis.ping();
  });
  afterAll(async () => {
    coordinators.forEach(value => value.onModuleDestroy());
    // Only keys created by this suite; never flush a shared database.
    const keys = await redis.keys('*' + prefix + '*');
    if (keys.length) await redis.del(...keys);
    await redis.quit();
  });
  async function cacheModule(settings: ConfigService) {
    return Test.createTestingModule({ imports: [ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }), RedisModule] }).overrideProvider(ConfigService).useValue(settings).compile();
  }
  it('serializes, shares, expires and invalidates cached values across two Nest instances', async () => {
    const a = await cacheModule(config()), b = await cacheModule(config());
    try {
      await a.init(); await b.init();
      const ca = a.get(BlogCacheService), cb = b.get(BlogCacheService), key = prefix + ':cache';
      await ca.set(key, { condition: 'rain', nested: { valid: true } }, 10);
      expect(await cb.get(key)).toEqual({ condition: 'rain', nested: { valid: true } });
      await cb.del(key); expect(await ca.get(key)).toBeUndefined();
      await ca.set(key, 'expires', .04);
      await new Promise(resolve => setTimeout(resolve, 80));
      expect(await cb.get(key)).toBeUndefined();
    } finally { await a.close(); await b.close(); }
  });
  it('cold starts and serves cache misses with unavailable Redis', async () => {
    const module = await cacheModule(config(1));
    try {
      const start = Date.now(); await module.init();
      expect(await module.get(BlogCacheService).get(prefix)).toBeUndefined();
      await module.get(BlogCacheService).set(prefix, 'no connection', 60);
      expect(Date.now() - start).toBeLessThan(2500);
    } finally { await module.close(); }
  });
  it('allows one lease owner, preserves replacement owners and recovers expired locks', async () => {
    const a = coordinator(), b = coordinator(), key = prefix + ':lease-test';
    // Warm each connection before racing independent processes.
    await Promise.all([a.readBackoff(key), b.readBackoff(key)]);
    let release!: () => void;
    const waiting = new Promise<void>(resolve => { release = resolve; });
    let entered!: () => void;
    const acquired = new Promise<void>(resolve => { entered = resolve; });
    const task = jest.fn(async () => { entered(); await waiting; });
    const first = a.refresh(key, task); await acquired;
    await b.refresh(key, task); expect(task).toHaveBeenCalledTimes(1);
    await redis.set(key + ':lease', 'replacement', 'PX', 40);
    release(); await first;
    expect(await redis.get(key + ':lease')).toBe('replacement');
    await new Promise(resolve => setTimeout(resolve, 80));
    await b.refresh(key, task); expect(task).toHaveBeenCalledTimes(2);
    expect(await redis.get(key + ':lease')).toBeNull();
  });
  it('shares backoff and fails closed without coordination', async () => {
    const a = coordinator(), b = coordinator(), key = prefix + ':backoff';
    await a.backoff(key, 10000);
    expect(await b.readBackoff(key)).toBeGreaterThan(Date.now());
    const task = jest.fn();
    await coordinator(config(1, true)).refresh(key, task);
    expect(task).not.toHaveBeenCalled();
    await coordinator(config(1, false)).refresh(key, task);
    expect(task).toHaveBeenCalledTimes(1);
  });
});
