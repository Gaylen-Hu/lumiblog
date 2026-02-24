import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SiteConfigService } from './site-config.service';
import { UpdateSiteConfigDto, SiteConfigResponseDto } from './dto';

@ApiTags('网站配置')
@Controller('site-config')
export class SiteConfigController {
  constructor(private readonly siteConfigService: SiteConfigService) {}

  @ApiOperation({ summary: '获取网站配置' })
  @ApiResponse({ status: 200, type: SiteConfigResponseDto })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get()
  async getConfig(): Promise<SiteConfigResponseDto> {
    return this.siteConfigService.getConfig();
  }

  @ApiOperation({ summary: '更新网站配置' })
  @ApiResponse({ status: 200, type: SiteConfigResponseDto })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Put()
  async updateConfig(
    @Body() dto: UpdateSiteConfigDto,
  ): Promise<SiteConfigResponseDto> {
    return this.siteConfigService.updateConfig(dto);
  }
}
