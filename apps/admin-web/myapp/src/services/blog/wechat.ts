import { request } from '@umijs/max';

/** 获取草稿列表 GET /api/wechat/drafts */
export async function getWechatDrafts(params?: {
  offset?: number;
  count?: number;
  noContent?: number;
}) {
  return request<WechatAPI.DraftBatchGetResponse>('/api/wechat/drafts', {
    method: 'GET',
    params,
  });
}

/** 获取草稿详情 GET /api/wechat/draft/:mediaId */
export async function getWechatDraft(mediaId: string) {
  return request<WechatAPI.DraftGetResponse>(`/api/wechat/draft/${mediaId}`, {
    method: 'GET',
  });
}

/** 删除草稿 DELETE /api/wechat/draft/:mediaId */
export async function deleteWechatDraft(mediaId: string) {
  return request<{ success: boolean }>(`/api/wechat/draft/${mediaId}`, {
    method: 'DELETE',
  });
}

/** 获取已发布文章列表 GET /api/wechat/publish/list */
export async function getWechatPublishedList(params?: {
  offset?: number;
  count?: number;
  noContent?: number;
}) {
  return request<WechatAPI.FreepublishBatchGetResponse>('/api/wechat/publish/list', {
    method: 'GET',
    params,
  });
}

/** 获取已发布文章详情 GET /api/wechat/publish/article */
export async function getWechatPublishedArticle(articleId: string) {
  return request<WechatAPI.FreepublishGetArticleResponse>('/api/wechat/publish/article', {
    method: 'GET',
    params: { articleId },
  });
}

/** 发布草稿 POST /api/wechat/publish */
export async function publishWechatDraft(mediaId: string) {
  return request<WechatAPI.FreepublishSubmitResponse>('/api/wechat/publish', {
    method: 'POST',
    data: { mediaId },
  });
}

/** 删除已发布文章 DELETE /api/wechat/publish */
export async function deleteWechatPublished(articleId: string, index?: number) {
  return request<{ success: boolean }>('/api/wechat/publish', {
    method: 'DELETE',
    data: { articleId, index },
  });
}

/** 获取发布状态 GET /api/wechat/publish/status */
export async function getWechatPublishStatus(publishId: string) {
  return request<WechatAPI.FreepublishGetResponse>('/api/wechat/publish/status', {
    method: 'GET',
    params: { publishId },
  });
}
