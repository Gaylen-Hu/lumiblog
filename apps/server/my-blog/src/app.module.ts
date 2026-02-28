import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
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
import { SiteConfigModule } from './site-config/site-config.module';
import { ApiKeyModule } from './api-key/api-key.module';
import { ProjectModule } from './project/project.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `.env.${process.env.NODE_ENV || 'dev'}`,
    }),
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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
