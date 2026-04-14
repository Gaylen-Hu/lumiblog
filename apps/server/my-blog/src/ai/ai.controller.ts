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
import {
  DoubaoPromptDto,
  DoubaoImagePromptDto,
  DoubaoResponseDto,
} from './dto/doubao.dto';
import {
  ImageGenerationDto,
  ImageGenerationResponseDto,
} from './dto/image-generation.dto';

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

  @ApiOperation({ summary: '豆包对话', description: '使用豆包 AI 进行文本对话' })
  @ApiResponse({ status: 200, description: '对话成功', type: DoubaoResponseDto })
  @ApiResponse({ status: 400, description: '参数错误' })
  @ApiResponse({ status: 503, description: 'AI 服务不可用' })
  @Post('doubao/chat')
  async doubaoChat(@Body() dto: DoubaoPromptDto): Promise<DoubaoResponseDto> {
    const content = await this.aiService.callDoubao(dto.prompt, dto.systemPrompt);
    return new DoubaoResponseDto(content);
  }

  @ApiOperation({ summary: '豆包多模态对话', description: '使用豆包 AI 进行图文对话' })
  @ApiResponse({ status: 200, description: '对话成功', type: DoubaoResponseDto })
  @ApiResponse({ status: 400, description: '参数错误' })
  @ApiResponse({ status: 503, description: 'AI 服务不可用' })
  @Post('doubao/chat-with-image')
  async doubaoChatWithImage(
    @Body() dto: DoubaoImagePromptDto,
  ): Promise<DoubaoResponseDto> {
    const content = await this.aiService.callDoubaoWithImage(
      dto.prompt,
      dto.imageUrl,
      dto.systemPrompt,
    );
    return new DoubaoResponseDto(content);
  }

  @ApiOperation({ summary: 'AI 文生图', description: '使用豆包 AI 根据提示词生成图片' })
  @ApiResponse({ status: 200, description: '生成成功', type: ImageGenerationResponseDto })
  @ApiResponse({ status: 400, description: '参数错误' })
  @ApiResponse({ status: 503, description: 'AI 服务不可用' })
  @Post('image/generate')
  async generateImage(
    @Body() dto: ImageGenerationDto,
  ): Promise<ImageGenerationResponseDto> {
    return this.aiService.generateImage(dto);
  }
}
