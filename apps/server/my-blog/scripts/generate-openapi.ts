import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { writeFileSync } from 'fs';
import { join } from 'path';
import { AppModule } from '../src/app.module';

async function generateOpenApiSpec() {
  const app = await NestFactory.create(AppModule, { logger: false });

  const config = new DocumentBuilder()
    .setTitle('My Blog API')
    .setDescription('个人博客系统 API 文档')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: '输入 JWT Token',
        in: 'header',
      },
      'JWT-auth',
    )
    .addTag('认证', '用户登录和身份验证')
    .addTag('用户管理', '用户 CRUD 操作')
    .addTag('文章管理', '文章 CRUD 和发布操作（管理端）')
    .addTag('文章', '文章公开接口（C端）')
    .addTag('分类管理', '分类 CRUD 操作（管理端）')
    .addTag('分类', '分类公开接口（C端）')
    .addTag('标签管理', '标签 CRUD 操作（管理端）')
    .addTag('标签', '标签公开接口（C端）')
    .addTag('媒体管理', '媒体文件上传和管理')
    .addTag('OSS', '阿里云 OSS 直传签名')
    .addTag('AI', 'AI 翻译和 SEO 优化')
    .addTag('微信公众号', '微信公众号素材和发布管理')
    .addTag('SEO', 'SEO 相关接口')
    .addServer('http://localhost:3000', '本地开发环境')
    .build();

  const document = SwaggerModule.createDocument(app, config);

  // 输出到文件
  const outputPath = join(__dirname, '..', 'openapi.json');
  writeFileSync(outputPath, JSON.stringify(document, null, 2));
  console.log(`OpenAPI 文档已生成: ${outputPath}`);

  await app.close();
}

generateOpenApiSpec();
