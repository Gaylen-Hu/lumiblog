import {
  Injectable,
  Logger,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  WECHAT_API_BASE_URL,
  WECHAT_API_ENDPOINTS,
  ACCESS_TOKEN_CACHE_TTL,
  MAX_DATE_RANGE_DAYS,
} from './wechat.constants';
import {
  WechatAccessTokenResponse,
  WechatErrorResponse,
  InterfaceSummaryResponse,
  UserSummaryResponse,
  UserCumulateResponse,
  ArticleSummaryResponse,
  UpstreamMsgResponse,
  MaterialCountResponse,
  MaterialBatchGetResponse,
  DraftAddResponse,
  DraftGetResponse,
  DraftCountResponse,
  DraftBatchGetResponse,
  FreepublishSubmitResponse,
  FreepublishGetResponse,
  FreepublishGetArticleResponse,
  FreepublishBatchGetResponse,
} from './dto/wechat-response.dto';
import { DraftArticleDto } from './dto/draft.dto';
import { MaterialType } from './dto/material.dto';

interface CachedToken {
  token: string;
  expiresAt: number;
}

@Injectable()
export class WechatService {
  private readonly logger = new Logger(WechatService.name);
  private cachedToken: CachedToken | null = null;
  private tokenRefreshPromise: Promise<string> | null = null;

  constructor(private configService: ConfigService) {}

  async getAccessToken(): Promise<string> {
    if (this.cachedToken && Date.now() < this.cachedToken.expiresAt) {
      return this.cachedToken.token;
    }
    // 防止并发重复刷新 token
    if (!this.tokenRefreshPromise) {
      this.tokenRefreshPromise = this.fetchAccessToken().finally(() => {
        this.tokenRefreshPromise = null;
      });
    }
    return this.tokenRefreshPromise;
  }

  private async fetchAccessToken(): Promise<string> {
    const appId = this.configService.get<string>('WX_APP_ID');
    const appSecret = this.configService.get<string>('WX_APP_SECRET');

    if (!appId || !appSecret) {
      throw new UnauthorizedException('微信公众号配置缺失');
    }

    const url = `${WECHAT_API_BASE_URL}${WECHAT_API_ENDPOINTS.ACCESS_TOKEN}`;
    const params = new URLSearchParams({
      grant_type: 'client_credential',
      appid: appId,
      secret: appSecret,
    });

    const response = await fetch(`${url}?${params.toString()}`);
    const data = (await response.json()) as
      | WechatAccessTokenResponse
      | WechatErrorResponse;

    if ('errcode' in data && data.errcode !== 0) {
      this.logger.error(`获取 access_token 失败: ${data.errmsg}`);
      throw new UnauthorizedException(`微信认证失败: ${data.errmsg}`);
    }

    const tokenData = data as WechatAccessTokenResponse;
    this.cachedToken = {
      token: tokenData.access_token,
      expiresAt: Date.now() + ACCESS_TOKEN_CACHE_TTL * 1000,
    };

    this.logger.log('access_token 获取成功');
    return tokenData.access_token;
  }

  private validateDateRange(beginDate: string, endDate: string): void {
    const begin = new Date(beginDate);
    const end = new Date(endDate);

    if (isNaN(begin.getTime()) || isNaN(end.getTime())) {
      throw new BadRequestException('日期格式无效，请使用 YYYY-MM-DD 格式');
    }

    const diffDays = (end.getTime() - begin.getTime()) / (1000 * 60 * 60 * 24);

    if (diffDays < 0) {
      throw new BadRequestException('结束日期不能早于起始日期');
    }
    if (diffDays > MAX_DATE_RANGE_DAYS) {
      throw new BadRequestException(`日期跨度不能超过 ${MAX_DATE_RANGE_DAYS} 天`);
    }
  }

  private async callApi<T extends object>(
    endpoint: string,
    body?: object,
    method: 'GET' | 'POST' = 'POST',
  ): Promise<T> {
    const accessToken = await this.getAccessToken();
    const url = `${WECHAT_API_BASE_URL}${endpoint}?access_token=${accessToken}`;

    const options: RequestInit = { method };
    if (body && method === 'POST') {
      options.headers = { 'Content-Type': 'application/json' };
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    const data = (await response.json()) as T | WechatErrorResponse;

    if ('errcode' in data && (data as WechatErrorResponse).errcode !== 0) {
      const err = data as WechatErrorResponse;
      this.logger.error(`微信 API 调用失败: ${err.errmsg}`);
      throw new BadRequestException(`微信 API 错误: ${err.errmsg}`);
    }

    return data as T;
  }


  // ============ 素材管理 ============

  async getMaterialCount(): Promise<MaterialCountResponse> {
    return this.callApi<MaterialCountResponse>(
      WECHAT_API_ENDPOINTS.MATERIAL_COUNT,
      {},
    );
  }

  async getMaterialList(
    type: MaterialType,
    offset = 0,
    count = 20,
  ): Promise<MaterialBatchGetResponse> {
    return this.callApi<MaterialBatchGetResponse>(
      WECHAT_API_ENDPOINTS.MATERIAL_BATCHGET,
      { type, offset, count },
    );
  }

  async deleteMaterial(mediaId: string): Promise<void> {
    await this.callApi<{ errcode: number }>(
      WECHAT_API_ENDPOINTS.MATERIAL_DELETE,
      { media_id: mediaId },
    );
  }

  // ============ 草稿箱 ============

  async createDraft(articles: DraftArticleDto[]): Promise<DraftAddResponse> {
    const newsItem = articles.map((a) => ({
      title: a.title,
      author: a.author,
      digest: a.digest,
      content: a.content,
      content_source_url: a.contentSourceUrl,
      thumb_media_id: a.thumbMediaId,
      need_open_comment: a.needOpenComment,
      only_fans_can_comment: a.onlyFansCanComment,
    }));

    return this.callApi<DraftAddResponse>(WECHAT_API_ENDPOINTS.DRAFT_ADD, {
      articles: newsItem,
    });
  }

  async getDraft(mediaId: string): Promise<DraftGetResponse> {
    return this.callApi<DraftGetResponse>(WECHAT_API_ENDPOINTS.DRAFT_GET, {
      media_id: mediaId,
    });
  }

  async deleteDraft(mediaId: string): Promise<void> {
    await this.callApi<{ errcode: number }>(WECHAT_API_ENDPOINTS.DRAFT_DELETE, {
      media_id: mediaId,
    });
  }

  async updateDraft(
    mediaId: string,
    index: number,
    article: DraftArticleDto,
  ): Promise<void> {
    await this.callApi<{ errcode: number }>(WECHAT_API_ENDPOINTS.DRAFT_UPDATE, {
      media_id: mediaId,
      index,
      articles: {
        title: article.title,
        author: article.author,
        digest: article.digest,
        content: article.content,
        content_source_url: article.contentSourceUrl,
        thumb_media_id: article.thumbMediaId,
        need_open_comment: article.needOpenComment,
        only_fans_can_comment: article.onlyFansCanComment,
      },
    });
  }

  async getDraftCount(): Promise<DraftCountResponse> {
    return this.callApi<DraftCountResponse>(
      WECHAT_API_ENDPOINTS.DRAFT_COUNT,
      {},
    );
  }

  async getDraftList(
    offset = 0,
    count = 20,
    noContent = 0,
  ): Promise<DraftBatchGetResponse> {
    return this.callApi<DraftBatchGetResponse>(
      WECHAT_API_ENDPOINTS.DRAFT_BATCHGET,
      { offset, count, no_content: noContent },
    );
  }

  // ============ 发布能力 ============

  async publishDraft(mediaId: string): Promise<FreepublishSubmitResponse> {
    return this.callApi<FreepublishSubmitResponse>(
      WECHAT_API_ENDPOINTS.FREEPUBLISH_SUBMIT,
      { media_id: mediaId },
    );
  }

  async getPublishStatus(publishId: string): Promise<FreepublishGetResponse> {
    return this.callApi<FreepublishGetResponse>(
      WECHAT_API_ENDPOINTS.FREEPUBLISH_GET,
      { publish_id: publishId },
    );
  }

  async deletePublish(articleId: string, index?: number): Promise<void> {
    const body: { article_id: string; index?: number } = {
      article_id: articleId,
    };
    if (index !== undefined) {
      body.index = index;
    }
    await this.callApi<{ errcode: number }>(
      WECHAT_API_ENDPOINTS.FREEPUBLISH_DELETE,
      body,
    );
  }

  async getPublishedArticle(
    articleId: string,
  ): Promise<FreepublishGetArticleResponse> {
    return this.callApi<FreepublishGetArticleResponse>(
      WECHAT_API_ENDPOINTS.FREEPUBLISH_GETARTICLE,
      { article_id: articleId },
    );
  }

  async getPublishedList(
    offset = 0,
    count = 20,
    noContent = 0,
  ): Promise<FreepublishBatchGetResponse> {
    return this.callApi<FreepublishBatchGetResponse>(
      WECHAT_API_ENDPOINTS.FREEPUBLISH_BATCHGET,
      { offset, count, no_content: noContent },
    );
  }

  // ============ 数据分析 ============

  async getInterfaceSummary(
    beginDate: string,
    endDate: string,
  ): Promise<InterfaceSummaryResponse> {
    this.validateDateRange(beginDate, endDate);
    return this.callApi<InterfaceSummaryResponse>(
      WECHAT_API_ENDPOINTS.INTERFACE_SUMMARY,
      { begin_date: beginDate, end_date: endDate },
    );
  }

  async getUserSummary(
    beginDate: string,
    endDate: string,
  ): Promise<UserSummaryResponse> {
    this.validateDateRange(beginDate, endDate);
    return this.callApi<UserSummaryResponse>(
      WECHAT_API_ENDPOINTS.USER_SUMMARY,
      { begin_date: beginDate, end_date: endDate },
    );
  }

  async getUserCumulate(
    beginDate: string,
    endDate: string,
  ): Promise<UserCumulateResponse> {
    this.validateDateRange(beginDate, endDate);
    return this.callApi<UserCumulateResponse>(
      WECHAT_API_ENDPOINTS.USER_CUMULATE,
      { begin_date: beginDate, end_date: endDate },
    );
  }

  async getArticleSummary(
    beginDate: string,
    endDate: string,
  ): Promise<ArticleSummaryResponse> {
    this.validateDateRange(beginDate, endDate);
    return this.callApi<ArticleSummaryResponse>(
      WECHAT_API_ENDPOINTS.ARTICLE_SUMMARY,
      { begin_date: beginDate, end_date: endDate },
    );
  }

  async getUpstreamMsg(
    beginDate: string,
    endDate: string,
  ): Promise<UpstreamMsgResponse> {
    this.validateDateRange(beginDate, endDate);
    return this.callApi<UpstreamMsgResponse>(
      WECHAT_API_ENDPOINTS.UPSTREAM_MSG,
      { begin_date: beginDate, end_date: endDate },
    );
  }
}
