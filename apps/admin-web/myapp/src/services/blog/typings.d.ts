// 博客系统类型定义

declare namespace BlogAPI {
  // 分页响应
  interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
  }

  // 标签
  interface Tag {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    articleCount: number;
    createdAt: string;
    updatedAt: string;
  }

  interface CreateTagParams {
    name: string;
    slug: string;
    description?: string;
  }

  interface UpdateTagParams {
    name?: string;
    slug?: string;
    description?: string;
  }

  // 分类
  interface Category {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    parentId: string | null;
    level: number;
    path: string;
    sortOrder: number;
    createdAt: string;
    updatedAt: string;
  }

  interface CategoryTreeNode extends Category {
    children: CategoryTreeNode[];
  }

  // 文章
  interface Article {
    id: string;
    title: string;
    slug: string;
    summary: string | null;
    content: string | null;
    coverImage: string | null;
    isPublished: boolean;
    publishedAt: string | null;
    seoTitle: string | null;
    seoDescription: string | null;
    createdAt: string;
    updatedAt: string;
  }

  interface CreateArticleParams {
    title: string;
    slug: string;
    summary?: string;
    content?: string;
    coverImage?: string;
    seoTitle?: string;
    seoDescription?: string;
  }

  interface UpdateArticleParams {
    title?: string;
    slug?: string;
    summary?: string;
    content?: string;
    coverImage?: string;
    seoTitle?: string;
    seoDescription?: string;
  }

  // AI 翻译
  interface TranslateArticleParams {
    createNewArticle?: boolean;
  }

  interface TranslateArticleResponse {
    title: string;
    content: string;
    summary: string | null;
    targetLanguage: string;
    newArticleId?: string;
  }

  // SEO 优化
  interface SeoOptimizeResponse {
    seoTitle: string;
    seoDescription: string;
    keywords: string;
    autoUpdated: boolean;
  }

  // 发布到微信
  interface PublishToWechatParams {
    author?: string;
    thumbMediaId?: string;
    needOpenComment?: boolean;
    onlyFansCanComment?: boolean;
    publishImmediately?: boolean;
  }

  interface PublishToWechatResponse {
    mediaId: string;
    publishId?: string;
    status: 'draft' | 'publishing' | 'published';
  }
}

// 微信公众号类型定义
declare namespace WechatAPI {
  // 草稿文章项
  interface DraftNewsItem {
    title: string;
    author: string;
    digest: string;
    content: string;
    content_source_url: string;
    thumb_media_id: string;
    thumb_url?: string;
    need_open_comment: number;
    only_fans_can_comment: number;
  }

  // 草稿详情响应
  interface DraftGetResponse {
    news_item: DraftNewsItem[];
  }

  // 草稿列表项
  interface DraftListItem {
    media_id: string;
    content: {
      news_item: DraftNewsItem[];
    };
    update_time: number;
  }

  // 草稿列表响应
  interface DraftBatchGetResponse {
    total_count: number;
    item_count: number;
    item: DraftListItem[];
  }

  // 已发布文章项
  interface PublishedNewsItem {
    title: string;
    author: string;
    digest: string;
    content: string;
    url: string;
    thumb_url?: string;
    is_deleted: boolean;
  }

  // 已发布文章详情响应
  interface FreepublishGetArticleResponse {
    news_item: PublishedNewsItem[];
  }

  // 已发布列表项
  interface PublishedListItem {
    article_id: string;
    content: {
      news_item: PublishedNewsItem[];
    };
    update_time: number;
  }

  // 已发布列表响应
  interface FreepublishBatchGetResponse {
    total_count: number;
    item_count: number;
    item: PublishedListItem[];
  }

  // 发布响应
  interface FreepublishSubmitResponse {
    publish_id: string;
  }

  // 发布状态响应
  interface FreepublishGetResponse {
    publish_id: string;
    publish_status: number;
    article_id?: string;
    article_detail?: {
      count: number;
      item: Array<{ idx: number; article_url: string }>;
    };
  }
}
