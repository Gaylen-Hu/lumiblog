import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AiService } from './ai.service';
import {
  TranslateDto,
  TranslateResponseDto,
  SeoOptimizeDto,
  SeoOptimizeResponseDto,
} from './dto';

@Controller({ path: 'admin/ai', version: '1' })
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(private readonly aiService: AiService) {}

  /**
   * 翻译文章
   */
  @Post('translate')
  async translate(@Body() dto: TranslateDto): Promise<TranslateResponseDto> {
    return this.aiService.translate(dto);
  }

  /**
   * SEO 优化
   */
  @Post('seo-optimize')
  async optimizeSeo(
    @Body() dto: SeoOptimizeDto,
  ): Promise<SeoOptimizeResponseDto> {
    return this.aiService.optimizeSeo(dto);
  }
}
