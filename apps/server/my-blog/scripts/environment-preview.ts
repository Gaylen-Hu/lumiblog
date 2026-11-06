// Loopback integration service using production modules; never loads .env.dev.
import 'reflect-metadata';
import { Module, ValidationPipe, VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { EnvironmentModule } from '../src/environment/environment.module';
import { PrismaModule } from '../src/prisma/prisma.module';
import { RedisModule } from '../src/redis/redis.module';
import { JwtStrategy } from '../src/auth/strategies/jwt.strategy';

@Module({ imports: [ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }), PrismaModule, RedisModule, PassportModule, EnvironmentModule], providers: [JwtStrategy] })
class PreviewModule {}

async function main() {
  const url = new URL(process.env.DATABASE_URL || '');
  if (!['127.0.0.1', 'localhost'].includes(url.hostname) || url.pathname !== '/environment_test') throw Error('Preview requires isolated localhost environment_test database');
  if (!['127.0.0.1', 'localhost'].includes(process.env.REDIS_HOST || '')) throw Error('Preview requires loopback Redis');
  const app = await NestFactory.create(PreviewModule, { logger: ['error', 'warn', 'log'] });
  app.enableVersioning({ type: VersioningType.URI });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.enableCors({ origin: ['http://127.0.0.1:3100', 'http://127.0.0.1:3101', 'http://localhost:3101'] });
  app.enableShutdownHooks();
  await app.listen(Number(process.env.ENVIRONMENT_PREVIEW_PORT || 3102), '127.0.0.1');
}
void main();
