import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

interface HealthStatus {
  status: 'ok' | 'error';
  uptime: number;
  timestamp: string;
  database: {
    status: 'up' | 'down';
    responseTime?: number;
  };
}

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);

  constructor(private readonly prisma: PrismaService) {}

  getHello(): string {
    return 'Hello World!';
  }

  async getHealth(): Promise<HealthStatus> {
    const dbStatus = await this.checkDatabase();

    return {
      status: dbStatus.status === 'up' ? 'ok' : 'error',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      database: dbStatus,
    };
  }

  private async checkDatabase(): Promise<HealthStatus['database']> {
    const start = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'up', responseTime: Date.now() - start };
    } catch (err) {
      this.logger.error('数据库健康检查失败', (err as Error).message);
      return { status: 'down' };
    }
  }
}
