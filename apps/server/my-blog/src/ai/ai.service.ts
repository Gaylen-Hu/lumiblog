import {
  Injectable,
  Logger,
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DOUBAO_API_BASE_URL,
  DOUBAO_DEFAULT_MODEL,
  DOUBAO_IMAGE_GEN_MODEL,
  IMAGE_GEN_TIMEOUT,
  TRANSLATE_SYSTEM_PROMPT,
  SEO_SYSTEM_PROMPT,
  MAX_RETRIES,
  REQUEST_TIMEOUT,
} from './ai.constants';
import {
  TranslateDto,
  TranslateResponseDto,
  SeoOptimizeDto,
  SeoOptimizeResponseDto,
  TargetLanguage,
  ImageGenerationDto,
  ImageGenerationResponseDto,
  ImageSize,
} from './dto';

/** 豆包 Responses API 响应结构 */
interface DoubaoResponsesApiResponse {
  id: string;
  output: Array<{
    type: string;
    content?: Array<{
      type: string;
      text?: string;
    }>;
  }>;
}

/** 豆包文生图 API 响应结构 */
interface DoubaoImageGenResponse {
  created: number;
  data: Array<{
    url?: string;
    b64_json?: string;
  }>;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * 翻译文章内容
   */
  async translate(params: TranslateDto): Promise<TranslateResponseDto> {
    const targetLang = params.targetLanguage ?? TargetLanguage.EN;
    const langName = targetLang === TargetLanguage.EN ? '英文' : '中文';

    const prompt = `请将以下文章翻译成${langName}：

标题：${params.title}

${params.summary ? `摘要：${params.summary}\n\n` : ''}内容：
${params.content}

请按以下 JSON 格式返回翻译结果：
{
  "title": "翻译后的标题",
  "summary": "翻译后的摘要（如果有）",
  "content": "翻译后的内容"
}`;

    const response = await this.callDoubao(prompt, TRANSLATE_SYSTEM_PROMPT);

    try {
      const result = this.parseJsonResponse(response);
      return new TranslateResponseDto({
        title: result.title,
        content: result.content,
        summary: result.summary ?? null,
        targetLanguage: targetLang,
      });
    } catch {
      this.logger.error('翻译结果解析失败', response);
      throw new BadRequestException('翻译结果解析失败');
    }
  }

  /**
   * 生成 SEO 优化信息
   */
  async optimizeSeo(params: SeoOptimizeDto): Promise<SeoOptimizeResponseDto> {
    const prompt = `请为以下文章生成 SEO 优化信息：

标题：${params.title}

${params.summary ? `摘要：${params.summary}\n\n` : ''}内容：
${params.content}`;

    const response = await this.callDoubao(prompt, SEO_SYSTEM_PROMPT);

    try {
      const result = this.parseJsonResponse(response);
      return new SeoOptimizeResponseDto({
        seoTitle: result.seoTitle,
        seoDescription: result.seoDescription,
        keywords: result.keywords,
      });
    } catch {
      this.logger.error('SEO 优化结果解析失败', response);
      throw new BadRequestException('SEO 优化结果解析失败');
    }
  }

  /**
   * 解析 JSON 响应
   */
  private parseJsonResponse(response: string): Record<string, string> {
    // 尝试提取 JSON 块
    const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
    const jsonStr = jsonMatch ? jsonMatch[1] : response;

    // 清理可能的前后缀
    const cleaned = jsonStr.trim().replace(/^[^{]*/, '').replace(/[^}]*$/, '');

    return JSON.parse(cleaned) as Record<string, string>;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * 构建豆包 API 请求 input
   */
  private buildInput(
    userContent: Array<{ type: string; text?: string; image_url?: string }>,
    systemPrompt?: string,
  ): Array<{ role: string; content: string | Array<{ type: string; text?: string; image_url?: string }> }> {
    const input: Array<{ role: string; content: string | Array<{ type: string; text?: string; image_url?: string }> }> = [];
    if (systemPrompt) {
      input.push({ role: 'system', content: systemPrompt });
    }
    input.push({ role: 'user', content: userContent });
    return input;
  }

  /**
   * 执行豆包 API 请求（含重试）
   */
  private async executeDoubaoRequest(
    input: Array<{ role: string; content: string | Array<{ type: string; text?: string; image_url?: string }> }>,
    logLabel: string,
  ): Promise<string> {
    const apiKey = this.configService.get<string>('DOUBAO_API_KEY');
    const model = this.configService.get<string>('DOUBAO_MODEL', DOUBAO_DEFAULT_MODEL);

    if (!apiKey) {
      throw new ServiceUnavailableException('豆包 API Key 未配置');
    }

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

        const response = await fetch(`${DOUBAO_API_BASE_URL}/responses`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({ model, input }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`豆包 API 错误: ${response.status} - ${errorText}`);
        }

        const data = (await response.json()) as DoubaoResponsesApiResponse;
        const textContent = data.output
          ?.find((item) => item.type === 'message')
          ?.content?.find((c) => c.type === 'output_text')?.text;

        if (!textContent) {
          throw new Error('豆包返回内容为空');
        }

        this.logger.log(`${logLabel} 调用成功，尝试次数: ${attempt}`);
        return textContent;
      } catch (error) {
        lastError = error as Error;
        this.logger.warn(`${logLabel} 调用失败，尝试 ${attempt}/${MAX_RETRIES}: ${lastError.message}`);
        if (attempt < MAX_RETRIES) {
          await this.delay(1000 * attempt);
        }
      }
    }

    this.logger.error(`${logLabel} 调用最终失败`, lastError);
    throw new ServiceUnavailableException('豆包 AI 服务暂时不可用，请稍后重试');
  }

  /**
   * 调用豆包 Responses API
   */
  async callDoubao(userPrompt: string, systemPrompt?: string): Promise<string> {
    const input = this.buildInput(
      [{ type: 'input_text', text: userPrompt }],
      systemPrompt,
    );
    return this.executeDoubaoRequest(input, '豆包');
  }

  /**
   * 调用豆包进行多模态对话（支持图片）
   */
  async callDoubaoWithImage(
    textPrompt: string,
    imageUrl: string,
    systemPrompt?: string,
  ): Promise<string> {
    const input = this.buildInput(
      [
        { type: 'input_image', image_url: imageUrl },
        { type: 'input_text', text: textPrompt },
      ],
      systemPrompt,
    );
    return this.executeDoubaoRequest(input, '豆包多模态');
  }

  /**
   * 调用豆包文生图 API
   */
  async generateImage(
    params: ImageGenerationDto,
  ): Promise<ImageGenerationResponseDto> {
    const apiKey = this.configService.get<string>('DOUBAO_API_KEY');
    if (!apiKey) {
      throw new ServiceUnavailableException('豆包 API Key 未配置');
    }

    const model = this.configService.get<string>(
      'DOUBAO_IMAGE_GEN_MODEL',
      DOUBAO_IMAGE_GEN_MODEL,
    );

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(
          () => controller.abort(),
          IMAGE_GEN_TIMEOUT,
        );

        const response = await fetch(
          `${DOUBAO_API_BASE_URL}/images/generations`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model,
              prompt: params.prompt,
              response_format: 'url',
              size: params.size ?? ImageSize['1024x1024'],
              watermark: params.watermark ?? true,
            }),
            signal: controller.signal,
          },
        );

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(
            `文生图 API 错误: ${response.status} - ${errorText}`,
          );
        }

        const data = (await response.json()) as DoubaoImageGenResponse;
        const imageUrl = data.data?.[0]?.url;

        if (!imageUrl) {
          throw new Error('文生图返回内容为空');
        }

        this.logger.log(`文生图调用成功，尝试次数: ${attempt}`);
        return new ImageGenerationResponseDto(imageUrl);
      } catch (error) {
        lastError = error as Error;
        this.logger.warn(
          `文生图调用失败，尝试 ${attempt}/${MAX_RETRIES}: ${lastError.message}`,
        );
        if (attempt < MAX_RETRIES) {
          await this.delay(1000 * attempt);
        }
      }
    }

    this.logger.error('文生图调用最终失败', lastError);
    throw new ServiceUnavailableException(
      '文生图服务暂时不可用，请稍后重试',
    );
  }
}
