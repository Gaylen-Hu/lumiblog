import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CoreModule } from './core';
import { PrismaModule } from './prisma';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { ArticleModule } from './article/article.module';
import { CategoryModule } from './category/category.module';
import { TagModule } from './tag/tag.module';
import { MediaModule } from './media/media.module';
import { SeoModule } from './seo/seo.module';
import { WechatModule } from './wechat/wechat.module';
import { AiModule } from './ai/ai.module';
import { OssModule } from './oss/oss.module';
import { PublicModule } from './public/public.module';
import { RedisModule, CacheKeyRegistry } from './redis';
import { SiteConfigModule } from './site-config/site-config.module';
import { ApiKeyModule } from './api-key/api-key.module';
import { ProjectModule } from './project/project.module';
import { TimelineModule } from './timeline/timeline.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `.env.${process.env.NODE_ENV || 'dev'}`,
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            name: 'short',
            ttl: 10000,
            limit: 10,
          },
          {
            name: 'medium',
            ttl: 60000,
            limit: 30,
          },
          {
            name: 'long',
            ttl: 3600000,
            limit: 100,
          },
        ],
        storage: new ThrottlerStorageRedisService({
          host: config.get<string>('REDIS_HOST', 'localhost'),
          port: config.get<number>('REDIS_PORT', 6379),
          password: config.get<string>('REDIS_PASSWORD', ''),
          keyPrefix: CacheKeyRegistry.THROTTLER_PREFIX,
        }),
      }),
    }),
    RedisModule,
    PrismaModule,
    CoreModule,
    SeoModule,
    AuthModule,
    UserModule,
    ArticleModule,
    CategoryModule,
    TagModule,
    MediaModule,
    WechatModule,
    AiModule,
    OssModule,
    PublicModule,
    SiteConfigModule,
    ApiKeyModule,
    ProjectModule,
    TimelineModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
