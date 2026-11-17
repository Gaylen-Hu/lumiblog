import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';

async function bootstrap() {
  // UserService.onModuleInit handles first-run creation when credentials are configured.
  const app = await NestFactory.createApplicationContext(AppModule);
  try {
    if (!app.get(ConfigService).get<string>('ADMIN_DEFAULT_PASSWORD')) {
      throw new Error('请设置 ADMIN_DEFAULT_PASSWORD 后再初始化管理员');
    }
  } finally {
    await app.close();
  }
}

bootstrap().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : '管理员初始化失败');
  process.exitCode = 1;
});
