// 博客系统类型定义

declare namespace BlogAPI {
  // 网站配置
  interface SiteConfig {
    id: string;
    title: string;
    description: string;
    keywords: string;
    logo: string | null;
    favicon: string | null;
    icp: string | null;
    gongan: string | null;
    copyright: string | null;
    analytics: string | null;
    analyticsGoogle: string | null;
    analyticsBaidu: string | null;
    ownerName: string | null;
    ownerAvatar: string | null;
    ownerBio: string | null;
    ownerEmail: string | null;
    ownerTechStack: string[];
    yearsOfExperience: number | null;
    openSourceCount: number | null;
    talkCount: number | null;
    socialGithub: string | null;
    socialTwitter: string | null;
    socialLinkedin: string | null;
    socialWeibo: string | null;
    createdAt: string;
    updatedAt: string;
  }

  interface UpdateSiteConfigParams {
    title?: string;
    description?: string;
    keywords?: string;
    logo?: string;
    favicon?: string;
    icp?: string;
    gongan?: string;
    copyright?: string;
    analytics?: string;
    analyticsGoogle?: string;
    analyticsBaidu?: string;
    ownerName?: string;
    ownerAvatar?: string;
    ownerBio?: string;
    ownerEmail?: string;
    ownerTechStack?: string[];
    yearsOfExperience?: number;
    openSourceCount?: number;
    talkCount?: number;
    socialGithub?: string;
    socialTwitter?: string;
    socialLinkedin?: string;
    socialWeibo?: string;
  }
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

  interface CreateCategoryParams {
    name: string;
    slug: string;
    description?: string;
    parentId?: string;
    sortOrder?: number;
  }

  interface UpdateCategoryParams {
    name?: string;
    slug?: string;
    description?: string;
    sortOrder?: number;
  }

  // 媒体
  interface Media {
    id: string;
    filename: string;
    originalName: string;
    mimeType: string;
    size: number;
    url: string;
    storageType: 'local' | 'oss' | 's3';
    mediaType: 'image' | 'video' | 'audio' | 'document' | 'other';
    width: number | null;
    height: number | null;
    alt: string | null;
    createdAt: string;
  }

  interface OssSignatureRequest {
    filename: string;
    mimeType: string;
    size: number;
    category?: 'image' | 'video' | 'audio' | 'document';
    directory?: string;
  }

  interface OssSignatureResponse {
    host: string;
    key: string;
    policy: string;
    signature: string;
    accessKeyId: string;
    expire: number;
    url: string;
    callback?: string;
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
    viewCount: number;
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
    categoryId?: string;
    tagIds?: string[];
  }

  interface UpdateArticleParams {
    title?: string;
    slug?: string;
    summary?: string;
    content?: string;
    coverImage?: string;
    seoTitle?: string;
    seoDescription?: string;
    categoryId?: string;
    tagIds?: string[];
  }

  // 扩展文章类型，添加分类和标签关联
  interface ArticleWithRelations extends Article {
    categoryId: string | null;
    category: Category | null;
    tagIds: string[];
    tags: Tag[];
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

  // 项目
  interface Project {
    id: string;
    title: string;
    description: string;
    techStack: string[];
    coverImage: string | null;
    link: string | null;
    githubUrl: string | null;
    featured: boolean;
    order: number;
    createdAt: string;
    updatedAt: string;
  }

  interface CreateProjectParams {
    title: string;
    description: string;
    techStack?: string[];
    coverImage?: string;
    link?: string;
    githubUrl?: string;
    featured?: boolean;
    order?: number;
  }

  interface UpdateProjectParams {
    title?: string;
    description?: string;
    techStack?: string[];
    coverImage?: string;
    link?: string;
    githubUrl?: string;
    featured?: boolean;
    order?: number;
  }

  // API Key
  interface ApiKey {
    id: string;
    name: string;
    keyPrefix: string;
    userId: string;
    lastUsedAt: string | null;
    isRevoked: boolean;
    createdAt: string;
  }

  interface CreateApiKeyParams {
    name: string;
  }

  interface CreateApiKeyResponse extends ApiKey {
    key: string;
  }

  // 时间轴
  interface Timeline {
    id: string;
    year: string;
    titleZh: string;
    titleEn: string;
    descZh: string;
    descEn: string;
    order: number;
    isVisible: boolean;
    createdAt: string;
    updatedAt: string;
  }

  interface CreateTimelineParams {
    year: string;
    titleZh: string;
    titleEn: string;
    descZh: string;
    descEn: string;
    order: number;
    isVisible: boolean;
  }

  interface UpdateTimelineParams {
    year?: string;
    titleZh?: string;
    titleEn?: string;
    descZh?: string;
    descEn?: string;
    order?: number;
    isVisible?: boolean;
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
