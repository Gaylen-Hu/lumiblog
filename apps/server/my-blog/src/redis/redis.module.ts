import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { BlogCacheService } from './blog-cache.service';
import { BoundedRedisStore } from './bounded-redis-store';
import Keyv from 'keyv';

@Global()
@Module({
  imports: [CacheModule.registerAsync({
    isGlobal: true,
    inject: [ConfigService],
    useFactory: (config: ConfigService) => ({ stores: [new Keyv({ store: new BoundedRedisStore(config) })], ttl: 600_000 }),
  })],
  providers: [BlogCacheService],
  exports: [BlogCacheService],
})
export class RedisModule {}
