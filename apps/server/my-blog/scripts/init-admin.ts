import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { UserService } from '../src/user/user.service';
import { UserRole } from '../src/user/dto/create-user.dto';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const userService = app.select(AppModule).get(UserService);

  const existingUser = await userService.findByEmail('admin@outlook.com');
  if (existingUser) {
    console.log('管理员账号已存在');
    await app.close();
    process.exit(0);
  }

  await userService.create({
    email: 'admin@outlook.com',
    password: 'admin123',
    name: '管理员',
    role: UserRole.ADMIN,
  });

  console.log('✓ 管理员账号创建成功');
  console.log('  邮箱: admin@outlook.com');
  console.log('  密码: admin123');

  await app.close();
  process.exit(0);
}

bootstrap().catch((err) => {
  console.error('创建失败:', err);
  process.exit(1);
});
