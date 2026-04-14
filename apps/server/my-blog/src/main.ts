import { ValidationPipe, VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { json, urlencoded } from 'express';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { StructuredLogger } from './core';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const logger = await app.resolve(StructuredLogger);
  app.useLogger(logger);

  // 安全头：防 XSS、clickjacking、MIME 嗅探等
  app.use(helmet());

  // 增大 body 限制，防止大内容（如文章正文、base64 图片）触发 400
  app.use(json({ limit: '10mb' }));
  app.use(urlencoded({ limit: '10mb', extended: true }));

  // 启用 CORS，从环境变量读取允许的域名（必须显式配置）
  const corsOriginsEnv = process.env.CORS_ORIGINS;
  if (!corsOriginsEnv) {
    throw new Error('CORS_ORIGINS 环境变量未配置，必须显式设置允许的域名列表（逗号分隔）');
  }
  const corsOrigins = corsOriginsEnv
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  });

  // 启用 URI 版本控制，默认版本为 v1
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
    prefix: 'v',
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // 配置 Swagger OpenAPI 文档
  const config = new DocumentBuilder()
    .setTitle('My Blog API')
    .setDescription('个人博客系统 API 文档')
    .setVersion('1.0')
    .addServer('https://api.example.com', '生产环境')
    .addServer('http://localhost:3000', '本地开发')
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
    .build();

  const document = SwaggerModule.createDocument(app, config);
  
  // 设置 Swagger UI，同时提供 JSON 和 YAML 格式
  SwaggerModule.setup('api-docs', app, document, {
    jsonDocumentUrl: '/api-docs/json',
    yamlDocumentUrl: '/api-docs/yaml',
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'none',
      filter: true,
      showRequestDuration: true,
    },
  });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
