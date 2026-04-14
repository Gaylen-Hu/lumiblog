import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @ApiTags('健康检查')
  @ApiOperation({ summary: '健康检查', description: '返回服务状态和数据库连接状态' })
  @ApiResponse({ status: 200, description: '服务正常' })
  @ApiResponse({ status: 503, description: '服务异常' })
  @Get('health')
  async getHealth() {
    return this.appService.getHealth();
  }
}
