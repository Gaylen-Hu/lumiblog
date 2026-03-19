import { Module, Global } from '@nestjs/common';
import { ApiKeyController } from './api-key.controller';
import { ApiKeyService } from './api-key.service';

/**
 * API Key 模块 - 全局模块
 * 提供 API Key 认证服务
 */
@Global()
@Module({
  controllers: [ApiKeyController],
  providers: [ApiKeyService],
  exports: [ApiKeyService],
})
export class ApiKeyModule {}
