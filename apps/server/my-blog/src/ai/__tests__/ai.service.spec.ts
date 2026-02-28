import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { AiService } from '../ai.service';
import {
  DOUBAO_API_BASE_URL,
  DOUBAO_DEFAULT_MODEL,
  MAX_RETRIES,
} from '../ai.constants';
import { TargetLanguage } from '../dto';

describe('AiService', () => {
  let service: AiService;
  let configGet: jest.Mock;
  const mockFetch = jest.fn();
  const originalFetch = global.fetch;

  const aiConfig: Record<string, string> = {
    DOUBAO_API_KEY: 'test-api-key',
    DOUBAO_MODEL: 'test-model',
  };

  beforeEach(async () => {
    configGet = jest.fn(
      (key: string, defaultValue?: string) =>
        aiConfig[key] ?? defaultValue ?? undefined,
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiService,
        { provide: ConfigService, useValue: { get: configGet } },
      ],
    }).compile();

    service = module.get<AiService>(AiService);
    global.fetch = mockFetch;
    mockFetch.mockReset();
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  /** Helper: build a successful Doubao Responses API response */
  function mockDoubaoResponse(text: string): void {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: 'resp-123',
        output: [
          {
            type: 'message',
            content: [{ type: 'output_text', text }],
          },
        ],
      }),
    });
  }

  // ============ translate ============

  describe('translate', () => {
    it('应成功翻译文章并返回 TranslateResponseDto', async () => {
      // Arrange
      const jsonResult = JSON.stringify({
        title: 'How to Build RESTful API',
        content: '# Introduction\n\nNestJS is...',
        summary: 'This article introduces...',
      });
      mockDoubaoResponse(jsonResult);

      // Act
      const result = await service.translate({
        title: '如何构建 RESTful API',
        content: '# 引言\n\nNestJS 是...',
        summary: '本文介绍...',
      });

      // Assert
      expect(result.title).toBe('How to Build RESTful API');
      expect(result.content).toBe('# Introduction\n\nNestJS is...');
      expect(result.summary).toBe('This article introduces...');
      expect(result.targetLanguage).toBe(TargetLanguage.EN);
    });

    it('默认目标语言应为英文', async () => {
      // Arrange
      mockDoubaoResponse(JSON.stringify({ title: 'T', content: 'C' }));

      // Act
      const result = await service.translate({
        title: '标题',
        content: '内容',
      });

      // Assert
      expect(result.targetLanguage).toBe(TargetLanguage.EN);
    });

    it('应支持翻译为中文', async () => {
      // Arrange
      mockDoubaoResponse(
        JSON.stringify({ title: '标题', content: '内容', summary: '摘要' }),
      );

      // Act
      const result = await service.translate({
        title: 'Title',
        content: 'Content',
        targetLanguage: TargetLanguage.ZH,
      });

      // Assert
      expect(result.targetLanguage).toBe(TargetLanguage.ZH);
      expect(result.title).toBe('标题');
    });

    it('无摘要时 summary 应为 null', async () => {
      // Arrange
      mockDoubaoResponse(JSON.stringify({ title: 'T', content: 'C' }));

      // Act
      const result = await service.translate({
        title: '标题',
        content: '内容',
      });

      // Assert
      expect(result.summary).toBeNull();
    });

    it('翻译结果解析失败时应抛出 BadRequestException', async () => {
      // Arrange
      mockDoubaoResponse('这不是有效的 JSON');

      // Act & Assert
      await expect(
        service.translate({ title: '标题', content: '内容' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ============ optimizeSeo ============

  describe('optimizeSeo', () => {
    it('应成功生成 SEO 优化信息', async () => {
      // Arrange
      const jsonResult = JSON.stringify({
        seoTitle: 'NestJS RESTful API Guide',
        seoDescription: 'Learn how to build scalable APIs with NestJS',
        keywords: 'NestJS, RESTful, API',
      });
      mockDoubaoResponse(jsonResult);

      // Act
      const result = await service.optimizeSeo({
        title: '如何构建 RESTful API',
        content: '# 引言\n\nNestJS 是...',
      });

      // Assert
      expect(result.seoTitle).toBe('NestJS RESTful API Guide');
      expect(result.seoDescription).toBe(
        'Learn how to build scalable APIs with NestJS',
      );
      expect(result.keywords).toBe('NestJS, RESTful, API');
    });

    it('应支持带摘要的 SEO 优化', async () => {
      // Arrange
      mockDoubaoResponse(
        JSON.stringify({
          seoTitle: 'Title',
          seoDescription: 'Desc',
          keywords: 'kw',
        }),
      );

      // Act
      const result = await service.optimizeSeo({
        title: '标题',
        content: '内容',
        summary: '摘要',
      });

      // Assert
      expect(result.seoTitle).toBe('Title');
    });

    it('SEO 结果解析失败时应抛出 BadRequestException', async () => {
      // Arrange
      mockDoubaoResponse('invalid json response');

      // Act & Assert
      await expect(
        service.optimizeSeo({ title: '标题', content: '内容' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ============ callDoubao ============

  describe('callDoubao', () => {
    it('应正确调用豆包 Responses API', async () => {
      // Arrange
      mockDoubaoResponse('Hello');

      // Act
      const result = await service.callDoubao('Say hello');

      // Assert
      expect(result).toBe('Hello');
      expect(mockFetch).toHaveBeenCalledWith(
        `${DOUBAO_API_BASE_URL}/responses`,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-api-key',
          }),
        }),
      );
    });

    it('应在请求体中包含 model 和 input', async () => {
      // Arrange
      mockDoubaoResponse('response');

      // Act
      await service.callDoubao('prompt', 'system prompt');

      // Assert
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.model).toBe('test-model');
      expect(body.input).toHaveLength(2);
      expect(body.input[0]).toEqual({
        role: 'system',
        content: 'system prompt',
      });
      expect(body.input[1].role).toBe('user');
    });

    it('无 systemPrompt 时 input 应只包含 user 消息', async () => {
      // Arrange
      mockDoubaoResponse('response');

      // Act
      await service.callDoubao('prompt');

      // Assert
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.input).toHaveLength(1);
      expect(body.input[0].role).toBe('user');
    });

    it('API Key 未配置时应抛出 ServiceUnavailableException', async () => {
      // Arrange
      configGet.mockImplementation(() => undefined);

      // Act & Assert
      await expect(service.callDoubao('prompt')).rejects.toThrow(
        ServiceUnavailableException,
      );
    });

    it('API 返回非 200 时应重试并最终抛出 ServiceUnavailableException', async () => {
      // Arrange - all retries fail
      for (let i = 0; i < MAX_RETRIES; i++) {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 500,
          text: async () => 'Internal Server Error',
        });
      }

      // Act & Assert
      await expect(service.callDoubao('prompt')).rejects.toThrow(
        ServiceUnavailableException,
      );
      expect(mockFetch).toHaveBeenCalledTimes(MAX_RETRIES);
    });

    it('返回内容为空时应重试并最终抛出 ServiceUnavailableException', async () => {
      // Arrange - all retries return empty content
      for (let i = 0; i < MAX_RETRIES; i++) {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            id: 'resp-empty',
            output: [{ type: 'message', content: [] }],
          }),
        });
      }

      // Act & Assert
      await expect(service.callDoubao('prompt')).rejects.toThrow(
        ServiceUnavailableException,
      );
    });

    it('第一次失败后第二次成功应返回结果', async () => {
      // Arrange - first attempt fails, second succeeds
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
        text: async () => 'Service Unavailable',
      });
      mockDoubaoResponse('success after retry');

      // Act
      const result = await service.callDoubao('prompt');

      // Assert
      expect(result).toBe('success after retry');
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  // ============ callDoubaoWithImage ============

  describe('callDoubaoWithImage', () => {
    it('应在请求体中包含图片 URL', async () => {
      // Arrange
      mockDoubaoResponse('I see an image');

      // Act
      const result = await service.callDoubaoWithImage(
        'What do you see?',
        'https://example.com/image.png',
      );

      // Assert
      expect(result).toBe('I see an image');
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      const userInput = body.input.find(
        (m: { role: string }) => m.role === 'user',
      );
      expect(userInput.content).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'input_image',
            image_url: 'https://example.com/image.png',
          }),
        ]),
      );
    });

    it('API Key 未配置时应抛出 ServiceUnavailableException', async () => {
      // Arrange
      configGet.mockImplementation(() => undefined);

      // Act & Assert
      await expect(
        service.callDoubaoWithImage('prompt', 'https://example.com/img.png'),
      ).rejects.toThrow(ServiceUnavailableException);
    });

    it('所有重试失败后应抛出 ServiceUnavailableException', async () => {
      // Arrange
      for (let i = 0; i < MAX_RETRIES; i++) {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 500,
          text: async () => 'Error',
        });
      }

      // Act & Assert
      await expect(
        service.callDoubaoWithImage('prompt', 'https://example.com/img.png'),
      ).rejects.toThrow(ServiceUnavailableException);
    });
  });

  // ============ parseJsonResponse (via translate/optimizeSeo) ============

  describe('JSON 解析', () => {
    it('应能解析 markdown 代码块中的 JSON', async () => {
      // Arrange
      const wrappedJson = '```json\n{"title":"T","content":"C"}\n```';
      mockDoubaoResponse(wrappedJson);

      // Act
      const result = await service.translate({
        title: '标题',
        content: '内容',
      });

      // Assert
      expect(result.title).toBe('T');
      expect(result.content).toBe('C');
    });

    it('应能解析带有前后缀文本的 JSON', async () => {
      // Arrange
      const messyJson = 'Here is the result: {"title":"T","content":"C"} hope it helps';
      mockDoubaoResponse(messyJson);

      // Act
      const result = await service.translate({
        title: '标题',
        content: '内容',
      });

      // Assert
      expect(result.title).toBe('T');
      expect(result.content).toBe('C');
    });
  });
});
