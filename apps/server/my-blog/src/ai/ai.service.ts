import {
  Injectable,
  Logger,
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  OPENAI_API_BASE_URL,
  DEFAULT_MODEL,
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
} from './dto';

interface ChatCompletionResponse {
  choices: Array<{
    message: {
      content: string;
    };
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

    const response = await this.callOpenAI(TRANSLATE_SYSTEM_PROMPT, prompt);

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

    const response = await this.callOpenAI(SEO_SYSTEM_PROMPT, prompt);

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
   * 调用 OpenAI API
   */
  private async callOpenAI(
    systemPrompt: string,
    userPrompt: string,
  ): Promise<string> {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    const baseUrl = this.configService.get<string>(
      'OPENAI_API_BASE_URL',
      OPENAI_API_BASE_URL,
    );
    const model = this.configService.get<string>('OPENAI_MODEL', DEFAULT_MODEL);

    if (!apiKey) {
      throw new ServiceUnavailableException('OpenAI API Key 未配置');
    }

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(
          () => controller.abort(),
          REQUEST_TIMEOUT,
        );

        const response = await fetch(`${baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
            temperature: 0.7,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`OpenAI API 错误: ${response.status} - ${errorText}`);
        }

        const data = (await response.json()) as ChatCompletionResponse;
        const content = data.choices[0]?.message?.content;

        if (!content) {
          throw new Error('OpenAI 返回内容为空');
        }

        this.logger.log(`OpenAI 调用成功，尝试次数: ${attempt}`);
        return content;
      } catch (error) {
        lastError = error as Error;
        this.logger.warn(
          `OpenAI 调用失败，尝试 ${attempt}/${MAX_RETRIES}: ${lastError.message}`,
        );

        if (attempt < MAX_RETRIES) {
          await this.delay(1000 * attempt);
        }
      }
    }

    this.logger.error('OpenAI 调用最终失败', lastError);
    throw new ServiceUnavailableException('AI 服务暂时不可用，请稍后重试');
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
}
