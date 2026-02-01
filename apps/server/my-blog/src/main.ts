import { ValidationPipe, VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 启用 CORS
  app.enableCors({
    origin: [
      'http://localhost:8002',
      'https://badmin.example.com',
      'https://admin.example.com',
    ],
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
