import { Body, Controller, ForbiddenException, Get, Injectable, Logger, Patch, Req, UseGuards, BadRequestException } from '@nestjs/common';
import { IsIn, IsLatitude, IsLongitude, IsString, Length } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

export const DEFAULT_ENVIRONMENT = { city: '杭州', timezone: 'Asia/Shanghai', latitude: 30.2741, longitude: 120.1551, preset: 'auto', revision: 0 };
export class EnvironmentConfigDto {
  @IsString() @Length(1, 80) city!: string;
  @IsString() @Length(1, 80) timezone!: string;
  @IsLatitude() latitude!: number;
  @IsLongitude() longitude!: number;
  @IsIn(['auto','sunny','rainy-night','spring','autumn','snow']) preset!: string;
}
@Injectable()
export class EnvironmentConfigService {
  private readonly logger = new Logger(EnvironmentConfigService.name);
  private cached = { ...DEFAULT_ENVIRONMENT };
  private until = 0;
  private generation = 0;
  constructor(private readonly prisma: PrismaService) {}
  async read() {
    if (Date.now() < this.until) return this.cached;
    const generation = this.generation;
    try {
      const value = await this.prisma.environmentConfig.findUnique({ where: { id: 'default' } });
      if (generation !== this.generation) return this.cached;
      if (value) this.cached = { city: value.city, timezone: value.timezone, latitude: value.latitude, longitude: value.longitude, preset: value.preset, revision: value.revision };
      this.until = Date.now() + 30_000;
    } catch { if (generation === this.generation) this.until = Date.now() + 10_000; this.logger.warn('Environment configuration unavailable; using last/default configuration'); }
    return this.cached;
  }
  async authorize(userId: string) {
    const user = userId ? await this.prisma.user.findUnique({ where: { id: userId }, select: { role: true } }) : null;
    if (user?.role !== 'ADMIN') throw new ForbiddenException('仅管理员可管理书房环境');
  }
  async save(dto: EnvironmentConfigDto, userId: string) {
    try { new Intl.DateTimeFormat('en', { timeZone: dto.timezone }).format(); } catch { throw new BadRequestException('无效时区'); }
    const data = { city: dto.city.trim(), timezone: dto.timezone, latitude: Number(dto.latitude), longitude: Number(dto.longitude), preset: dto.preset };
    if (!data.city) throw new BadRequestException('城市不能为空');
    const value = await this.prisma.environmentConfig.upsert({ where: { id: 'default' }, create: { id: 'default', ...data }, update: { ...data, revision: { increment: 1 } } });
    this.generation++;
    if (value.revision >= this.cached.revision) this.cached = { city: value.city, timezone: value.timezone, latitude: value.latitude, longitude: value.longitude, preset: value.preset, revision: value.revision };
    this.until = Date.now() + 30_000;
    this.logger.log({ message: 'Environment configuration saved', userId, revision: value.revision, fields: Object.keys(data) });
    return this.read();
  }
}
@Controller({ path: 'environment-config', version: '1' })
@UseGuards(JwtAuthGuard)
export class EnvironmentConfigController {
  constructor(private readonly settings: EnvironmentConfigService) {}
  @Get()
  async read(@Req() req: { user: { userId: string } }) { await this.settings.authorize(req.user.userId); return this.settings.read(); }
  @Patch()
  async save(@Body() dto: EnvironmentConfigDto, @Req() req: { user: { userId: string } }) { await this.settings.authorize(req.user.userId); return this.settings.save(dto, req.user.userId); }
}
