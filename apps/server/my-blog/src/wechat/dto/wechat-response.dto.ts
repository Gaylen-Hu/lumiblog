/**
 * 微信 access_token 响应
 */
export interface WechatAccessTokenResponse {
  access_token: string;
  expires_in: number;
}

/**
 * 微信 API 错误响应
 */
export interface WechatErrorResponse {
  errcode: number;
  errmsg: string;
}

// ============ 素材管理 ============

/**
 * 上传素材响应
 */
export interface MediaUploadResponse {
  type: string;
  media_id: string;
  created_at: number;
}

/**
 * 上传永久素材响应
 */
export interface MaterialAddResponse {
  media_id: string;
  url?: string;
}

/**
 * 素材总数响应
 */
export interface MaterialCountResponse {
  voice_count: number;
  video_count: number;
  image_count: number;
  news_count: number;
}

/**
 * 素材列表项
 */
export interface MaterialItem {
  media_id: string;
  name?: string;
  update_time: number;
  url?: string;
}

/**
 * 素材列表响应
 */
export interface MaterialBatchGetResponse {
  total_count: number;
  item_count: number;
  item: MaterialItem[];
}

// ============ 草稿箱 ============

/**
 * 草稿文章内容
 */
export interface DraftArticle {
  title: string;
  author?: string;
  digest?: string;
  content: string;
  content_source_url?: string;
  thumb_media_id: string;
  need_open_comment?: number;
  only_fans_can_comment?: number;
}

/**
 * 新增草稿响应
 */
export interface DraftAddResponse {
  media_id: string;
}

/**
 * 草稿详情响应
 */
export interface DraftGetResponse {
  news_item: DraftArticle[];
}

/**
 * 草稿总数响应
 */
export interface DraftCountResponse {
  total_count: number;
}

/**
 * 草稿列表项
 */
export interface DraftListItem {
  media_id: string;
  content: {
    news_item: DraftArticle[];
  };
  update_time: number;
}

/**
 * 草稿列表响应
 */
export interface DraftBatchGetResponse {
  total_count: number;
  item_count: number;
  item: DraftListItem[];
}

// ============ 发布能力 ============

/**
 * 发布草稿响应
 */
export interface FreepublishSubmitResponse {
  publish_id: string;
}

/**
 * 发布状态响应
 */
export interface FreepublishGetResponse {
  publish_id: string;
  publish_status: number;
  article_id?: string;
  article_detail?: {
    count: number;
    item: Array<{
      idx: number;
      article_url: string;
    }>;
  };
  fail_idx?: number[];
}

/**
 * 已发布文章详情
 */
export interface FreepublishArticle {
  title: string;
  author: string;
  digest: string;
  content: string;
  content_source_url: string;
  thumb_media_id: string;
  url: string;
  is_deleted: boolean;
}

/**
 * 获取已发布图文响应
 */
export interface FreepublishGetArticleResponse {
  news_item: FreepublishArticle[];
}

/**
 * 已发布消息列表项
 */
export interface FreepublishListItem {
  article_id: string;
  content: {
    news_item: FreepublishArticle[];
  };
  update_time: number;
}

/**
 * 已发布消息列表响应
 */
export interface FreepublishBatchGetResponse {
  total_count: number;
  item_count: number;
  item: FreepublishListItem[];
}

// ============ 数据分析 ============

/**
 * 被动回复概要数据项
 */
export interface InterfaceSummaryItem {
  ref_date: string;
  callback_count: number;
  fail_count: number;
  total_time_cost: number;
  max_time_cost: number;
}

export interface InterfaceSummaryResponse {
  list: InterfaceSummaryItem[];
}

/**
 * 用户增减数据项
 */
export interface UserSummaryItem {
  ref_date: string;
  user_source: number;
  new_user: number;
  cancel_user: number;
}

export interface UserSummaryResponse {
  list: UserSummaryItem[];
}

/**
 * 累计用户数据项
 */
export interface UserCumulateItem {
  ref_date: string;
  cumulate_user: number;
}

export interface UserCumulateResponse {
  list: UserCumulateItem[];
}

/**
 * 图文群发每日数据项
 */
export interface ArticleSummaryItem {
  ref_date: string;
  msgid: string;
  title: string;
  int_page_read_user: number;
  int_page_read_count: number;
  ori_page_read_user: number;
  ori_page_read_count: number;
  share_user: number;
  share_count: number;
  add_to_fav_user: number;
  add_to_fav_count: number;
}

export interface ArticleSummaryResponse {
  list: ArticleSummaryItem[];
}

/**
 * 消息发送概况数据项
 */
export interface UpstreamMsgItem {
  ref_date: string;
  msg_type: number;
  msg_user: number;
  msg_count: number;
}

export interface UpstreamMsgResponse {
  list: UpstreamMsgItem[];
}
