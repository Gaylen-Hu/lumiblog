import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { WechatService } from '../wechat.service';
import {
  WECHAT_API_BASE_URL,
  WECHAT_API_ENDPOINTS,
  ACCESS_TOKEN_CACHE_TTL,
  MAX_DATE_RANGE_DAYS,
} from '../wechat.constants';

describe('WechatService', () => {
  let service: WechatService;
  let configGet: jest.Mock;
  const mockFetch = jest.fn();
  const originalFetch = global.fetch;

  const wxConfig: Record<string, string> = {
    WX_APP_ID: 'test-app-id',
    WX_APP_SECRET: 'test-app-secret',
  };

  beforeEach(async () => {
    configGet = jest.fn(
      (key: string) => wxConfig[key] ?? undefined,
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WechatService,
        { provide: ConfigService, useValue: { get: configGet } },
      ],
    }).compile();

    service = module.get<WechatService>(WechatService);
    global.fetch = mockFetch;
    mockFetch.mockReset();
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  /** Helper: mock a successful access_token fetch */
  function mockAccessToken(token = 'mock-access-token'): void {
    mockFetch.mockResolvedValueOnce({
      json: async () => ({ access_token: token, expires_in: 7200 }),
    });
  }


  /** Helper: mock a successful API call after token */
  function mockApiCall<T>(data: T): void {
    mockAccessToken();
    mockFetch.mockResolvedValueOnce({
      json: async () => data,
    });
  }

  // ============ Token 管理 ============

  describe('getAccessToken', () => {
    it('应成功获取并返回 access_token', async () => {
      // Arrange
      mockAccessToken('fresh-token');

      // Act
      const token = await service.getAccessToken();

      // Assert
      expect(token).toBe('fresh-token');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining(WECHAT_API_ENDPOINTS.ACCESS_TOKEN),
      );
    });

    it('应缓存 token 并在有效期内复用', async () => {
      // Arrange
      mockAccessToken('cached-token');

      // Act
      const first = await service.getAccessToken();
      const second = await service.getAccessToken();

      // Assert
      expect(first).toBe('cached-token');
      expect(second).toBe('cached-token');
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('token 过期后应重新获取', async () => {
      // Arrange - first call
      mockAccessToken('old-token');
      await service.getAccessToken();

      // Force expiry by manipulating the cached token
      (service as any).cachedToken = {
        token: 'old-token',
        expiresAt: Date.now() - 1000,
      };

      // Arrange - second call
      mockAccessToken('new-token');

      // Act
      const token = await service.getAccessToken();

      // Assert
      expect(token).toBe('new-token');
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('WX_APP_ID 缺失时应抛出 UnauthorizedException', async () => {
      // Arrange
      configGet.mockImplementation(() => undefined);

      // Act & Assert
      await expect(service.getAccessToken()).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('WX_APP_SECRET 缺失时应抛出 UnauthorizedException', async () => {
      // Arrange
      configGet.mockImplementation((key: string) =>
        key === 'WX_APP_ID' ? 'test-id' : undefined,
      );

      // Act & Assert
      await expect(service.getAccessToken()).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('微信 API 返回错误时应抛出 UnauthorizedException', async () => {
      // Arrange
      mockFetch.mockResolvedValueOnce({
        json: async () => ({ errcode: 40013, errmsg: 'invalid appid' }),
      });

      // Act & Assert
      await expect(service.getAccessToken()).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });


  // ============ 草稿管理 ============

  describe('createDraft', () => {
    it('应成功创建草稿并返回 media_id', async () => {
      // Arrange
      const articles = [
        {
          title: '测试文章',
          content: '<p>内容</p>',
          thumbMediaId: 'thumb-123',
          author: '作者',
          digest: '摘要',
        },
      ];
      mockApiCall({ media_id: 'draft-media-id' });

      // Act
      const result = await service.createDraft(articles as any);

      // Assert
      expect(result.media_id).toBe('draft-media-id');
      // Second fetch call (after token) should contain the articles body
      const apiCallArgs = mockFetch.mock.calls[1];
      const body = JSON.parse(apiCallArgs[1].body);
      expect(body.articles[0].title).toBe('测试文章');
      expect(body.articles[0].thumb_media_id).toBe('thumb-123');
    });

    it('应正确映射 DTO 字段到微信 API 字段', async () => {
      // Arrange
      const articles = [
        {
          title: '标题',
          content: '<p>正文</p>',
          thumbMediaId: 'thumb-456',
          contentSourceUrl: 'https://example.com',
          needOpenComment: 1,
          onlyFansCanComment: 0,
        },
      ];
      mockApiCall({ media_id: 'new-draft' });

      // Act
      await service.createDraft(articles as any);

      // Assert
      const body = JSON.parse(mockFetch.mock.calls[1][1].body);
      expect(body.articles[0].content_source_url).toBe('https://example.com');
      expect(body.articles[0].need_open_comment).toBe(1);
      expect(body.articles[0].only_fans_can_comment).toBe(0);
    });
  });

  describe('getDraft', () => {
    it('应返回草稿详情', async () => {
      // Arrange
      const mockResponse = {
        news_item: [{ title: '草稿标题', content: '内容' }],
      };
      mockApiCall(mockResponse);

      // Act
      const result = await service.getDraft('media-123');

      // Assert
      expect(result.news_item[0].title).toBe('草稿标题');
    });
  });

  describe('deleteDraft', () => {
    it('应成功删除草稿', async () => {
      // Arrange
      mockApiCall({ errcode: 0, errmsg: 'ok' });

      // Act & Assert
      await expect(service.deleteDraft('media-123')).resolves.toBeUndefined();
    });
  });

  describe('updateDraft', () => {
    it('应发送正确的更新请求体', async () => {
      // Arrange
      const article = {
        title: '更新标题',
        content: '<p>更新内容</p>',
        thumbMediaId: 'new-thumb',
      };
      mockApiCall({ errcode: 0, errmsg: 'ok' });

      // Act
      await service.updateDraft('media-123', 0, article as any);

      // Assert
      const body = JSON.parse(mockFetch.mock.calls[1][1].body);
      expect(body.media_id).toBe('media-123');
      expect(body.index).toBe(0);
      expect(body.articles.title).toBe('更新标题');
      expect(body.articles.thumb_media_id).toBe('new-thumb');
    });
  });

  describe('getDraftCount', () => {
    it('应返回草稿总数', async () => {
      // Arrange
      mockApiCall({ total_count: 5 });

      // Act
      const result = await service.getDraftCount();

      // Assert
      expect(result.total_count).toBe(5);
    });
  });

  describe('getDraftList', () => {
    it('应返回草稿列表', async () => {
      // Arrange
      const mockResponse = {
        total_count: 2,
        item_count: 2,
        item: [
          { media_id: 'draft-1', update_time: 1700000000 },
          { media_id: 'draft-2', update_time: 1700000001 },
        ],
      };
      mockApiCall(mockResponse);

      // Act
      const result = await service.getDraftList(0, 20, 0);

      // Assert
      expect(result.total_count).toBe(2);
      expect(result.item).toHaveLength(2);
    });
  });


  // ============ 素材管理 ============

  describe('getMaterialCount', () => {
    it('应返回各类型素材数量', async () => {
      // Arrange
      mockApiCall({
        voice_count: 1,
        video_count: 2,
        image_count: 10,
        news_count: 5,
      });

      // Act
      const result = await service.getMaterialCount();

      // Assert
      expect(result.image_count).toBe(10);
      expect(result.news_count).toBe(5);
    });
  });

  describe('getMaterialList', () => {
    it('应发送正确的分页参数', async () => {
      // Arrange
      mockApiCall({ total_count: 1, item_count: 1, item: [] });

      // Act
      await service.getMaterialList('image', 10, 5);

      // Assert
      const body = JSON.parse(mockFetch.mock.calls[1][1].body);
      expect(body.type).toBe('image');
      expect(body.offset).toBe(10);
      expect(body.count).toBe(5);
    });
  });

  describe('deleteMaterial', () => {
    it('应发送正确的 media_id', async () => {
      // Arrange
      mockApiCall({ errcode: 0, errmsg: 'ok' });

      // Act
      await service.deleteMaterial('material-to-delete');

      // Assert
      const body = JSON.parse(mockFetch.mock.calls[1][1].body);
      expect(body.media_id).toBe('material-to-delete');
    });
  });

  // ============ 发布能力 ============

  describe('publishDraft', () => {
    it('应返回 publish_id', async () => {
      // Arrange
      mockApiCall({ publish_id: 'pub-123' });

      // Act
      const result = await service.publishDraft('media-123');

      // Assert
      expect(result.publish_id).toBe('pub-123');
    });
  });

  describe('getPublishStatus', () => {
    it('应返回发布状态', async () => {
      // Arrange
      mockApiCall({
        publish_id: 'pub-123',
        publish_status: 0,
        article_id: 'article-456',
      });

      // Act
      const result = await service.getPublishStatus('pub-123');

      // Assert
      expect(result.publish_status).toBe(0);
      expect(result.article_id).toBe('article-456');
    });
  });

  describe('deletePublish', () => {
    it('应发送 article_id', async () => {
      // Arrange
      mockApiCall({ errcode: 0, errmsg: 'ok' });

      // Act
      await service.deletePublish('article-789');

      // Assert
      const body = JSON.parse(mockFetch.mock.calls[1][1].body);
      expect(body.article_id).toBe('article-789');
      expect(body.index).toBeUndefined();
    });

    it('提供 index 时应包含在请求体中', async () => {
      // Arrange
      mockApiCall({ errcode: 0, errmsg: 'ok' });

      // Act
      await service.deletePublish('article-789', 2);

      // Assert
      const body = JSON.parse(mockFetch.mock.calls[1][1].body);
      expect(body.article_id).toBe('article-789');
      expect(body.index).toBe(2);
    });
  });

  describe('getPublishedArticle', () => {
    it('应返回已发布文章详情', async () => {
      // Arrange
      mockApiCall({
        news_item: [{ title: '已发布文章', content: '内容' }],
      });

      // Act
      const result = await service.getPublishedArticle('article-123');

      // Assert
      expect(result.news_item[0].title).toBe('已发布文章');
    });
  });

  describe('getPublishedList', () => {
    it('应返回已发布消息列表', async () => {
      // Arrange
      mockApiCall({
        total_count: 3,
        item_count: 3,
        item: [{ article_id: 'a1' }, { article_id: 'a2' }, { article_id: 'a3' }],
      });

      // Act
      const result = await service.getPublishedList(0, 20, 0);

      // Assert
      expect(result.total_count).toBe(3);
      expect(result.item).toHaveLength(3);
    });
  });


  // ============ 数据分析（日期验证） ============

  describe('date range validation', () => {
    it('结束日期早于起始日期时应抛出 BadRequestException', async () => {
      // Act & Assert
      await expect(
        service.getInterfaceSummary('2024-01-10', '2024-01-05'),
      ).rejects.toThrow(BadRequestException);
    });

    it(`日期跨度超过 ${MAX_DATE_RANGE_DAYS} 天时应抛出 BadRequestException`, async () => {
      // Act & Assert
      await expect(
        service.getUserSummary('2024-01-01', '2024-03-01'),
      ).rejects.toThrow(BadRequestException);
    });

    it('有效日期范围应正常调用 API', async () => {
      // Arrange
      mockApiCall({ list: [] });

      // Act
      const result = await service.getInterfaceSummary('2024-01-01', '2024-01-15');

      // Assert
      expect(result.list).toEqual([]);
      const body = JSON.parse(mockFetch.mock.calls[1][1].body);
      expect(body.begin_date).toBe('2024-01-01');
      expect(body.end_date).toBe('2024-01-15');
    });
  });

  describe('getInterfaceSummary', () => {
    it('应返回接口分析数据', async () => {
      // Arrange
      mockApiCall({
        list: [{ ref_date: '2024-01-01', callback_count: 100 }],
      });

      // Act
      const result = await service.getInterfaceSummary('2024-01-01', '2024-01-02');

      // Assert
      expect(result.list).toHaveLength(1);
      expect(result.list[0].callback_count).toBe(100);
    });
  });

  describe('getUserSummary', () => {
    it('应返回用户增减数据', async () => {
      // Arrange
      mockApiCall({
        list: [{ ref_date: '2024-01-01', new_user: 50, cancel_user: 5 }],
      });

      // Act
      const result = await service.getUserSummary('2024-01-01', '2024-01-07');

      // Assert
      expect(result.list[0].new_user).toBe(50);
    });
  });

  describe('getUserCumulate', () => {
    it('应返回累计用户数据', async () => {
      // Arrange
      mockApiCall({
        list: [{ ref_date: '2024-01-01', cumulate_user: 1000 }],
      });

      // Act
      const result = await service.getUserCumulate('2024-01-01', '2024-01-07');

      // Assert
      expect(result.list[0].cumulate_user).toBe(1000);
    });
  });

  describe('getArticleSummary', () => {
    it('应返回图文群发数据', async () => {
      // Arrange
      mockApiCall({
        list: [{ ref_date: '2024-01-01', title: '文章标题' }],
      });

      // Act
      const result = await service.getArticleSummary('2024-01-01', '2024-01-02');

      // Assert
      expect(result.list[0].title).toBe('文章标题');
    });
  });

  describe('getUpstreamMsg', () => {
    it('应返回消息发送概况', async () => {
      // Arrange
      mockApiCall({
        list: [{ ref_date: '2024-01-01', msg_count: 200 }],
      });

      // Act
      const result = await service.getUpstreamMsg('2024-01-01', '2024-01-07');

      // Assert
      expect(result.list[0].msg_count).toBe(200);
    });
  });

  // ============ callApi 错误处理 ============

  describe('callApi error handling', () => {
    it('微信 API 返回业务错误时应抛出 BadRequestException', async () => {
      // Arrange
      mockAccessToken();
      mockFetch.mockResolvedValueOnce({
        json: async () => ({ errcode: 45009, errmsg: 'reach max api daily quota limit' }),
      });

      // Act & Assert
      await expect(service.getMaterialCount()).rejects.toThrow(
        BadRequestException,
      );
    });

    it('API 调用应在 URL 中包含 access_token', async () => {
      // Arrange
      mockApiCall({ total_count: 0 });

      // Act
      await service.getDraftCount();

      // Assert
      const apiUrl = mockFetch.mock.calls[1][0] as string;
      expect(apiUrl).toContain('access_token=mock-access-token');
    });
  });
});
