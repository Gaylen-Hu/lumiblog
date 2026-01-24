import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AiService } from './ai.service';
import { TranslateDto, TranslateResponseDto } from './dto/translate.dto';
import { SeoOptimizeDto, SeoOptimizeResponseDto } from './dto/seo-optimize.dto';

@ApiTags('AI')
@ApiBearerAuth('JWT-auth')
@Controller({ path: 'admin/ai', version: '1' })
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @ApiOperation({ summary: 'AI 翻译', description: '使用 AI 将文本翻译为目标语言' })
  @ApiResponse({ status: 200, description: '翻译成功', type: TranslateResponseDto })
  @ApiResponse({ status: 400, description: '参数错误' })
  @Post('translate')
  async translate(@Body() dto: TranslateDto): Promise<TranslateResponseDto> {
    return this.aiService.translate(dto);
  }

  @ApiOperation({ summary: 'AI SEO 优化', description: '使用 AI 生成 SEO 标题、描述和关键词' })
  @ApiResponse({ status: 200, description: '生成成功', type: SeoOptimizeResponseDto })
  @ApiResponse({ status: 400, description: '参数错误' })
  @Post('seo-optimize')
  async optimizeSeo(
    @Body() dto: SeoOptimizeDto,
  ): Promise<SeoOptimizeResponseDto> {
    return this.aiService.optimizeSeo(dto);
  }
}
