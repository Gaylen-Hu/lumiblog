/**
 * 微信 API 基础 URL
 */
export const WECHAT_API_BASE_URL = 'https://api.weixin.qq.com';

/**
 * 微信 API 端点
 */
export const WECHAT_API_ENDPOINTS = {
  /** 获取 access_token */
  ACCESS_TOKEN: '/cgi-bin/token',

  // 素材管理 - 临时素材
  /** 新增临时素材 */
  MEDIA_UPLOAD: '/cgi-bin/media/upload',
  /** 获取临时素材 */
  MEDIA_GET: '/cgi-bin/media/get',

  // 素材管理 - 永久素材
  /** 上传永久素材 */
  MATERIAL_ADD: '/cgi-bin/material/add_material',
  /** 获取永久素材 */
  MATERIAL_GET: '/cgi-bin/material/get_material',
  /** 删除永久素材 */
  MATERIAL_DELETE: '/cgi-bin/material/del_material',
  /** 获取永久素材总数 */
  MATERIAL_COUNT: '/cgi-bin/material/get_materialcount',
  /** 获取永久素材列表 */
  MATERIAL_BATCHGET: '/cgi-bin/material/batchget_material',
  /** 上传图文消息图片 */
  MEDIA_UPLOADIMG: '/cgi-bin/media/uploadimg',

  // 草稿箱
  /** 新增草稿 */
  DRAFT_ADD: '/cgi-bin/draft/add',
  /** 获取草稿详情 */
  DRAFT_GET: '/cgi-bin/draft/get',
  /** 删除草稿 */
  DRAFT_DELETE: '/cgi-bin/draft/delete',
  /** 更新草稿 */
  DRAFT_UPDATE: '/cgi-bin/draft/update',
  /** 获取草稿总数 */
  DRAFT_COUNT: '/cgi-bin/draft/count',
  /** 获取草稿列表 */
  DRAFT_BATCHGET: '/cgi-bin/draft/batchget',

  // 发布能力
  /** 发布草稿 */
  FREEPUBLISH_SUBMIT: '/cgi-bin/freepublish/submit',
  /** 获取发布状态 */
  FREEPUBLISH_GET: '/cgi-bin/freepublish/get',
  /** 删除发布文章 */
  FREEPUBLISH_DELETE: '/cgi-bin/freepublish/delete',
  /** 获取已发布图文信息 */
  FREEPUBLISH_GETARTICLE: '/cgi-bin/freepublish/getarticle',
  /** 获取已发布消息列表 */
  FREEPUBLISH_BATCHGET: '/cgi-bin/freepublish/batchget',

  // 数据分析 - 用户分析
  /** 获取用户增减数据 */
  USER_SUMMARY: '/datacube/getusersummary',
  /** 获取累计用户数据 */
  USER_CUMULATE: '/datacube/getusercumulate',

  // 数据分析 - 图文分析
  /** 获取图文群发每日数据 */
  ARTICLE_SUMMARY: '/datacube/getarticlesummary',

  // 数据分析 - 消息分析
  /** 获取消息发送概况数据 */
  UPSTREAM_MSG: '/datacube/getupstreammsg',

  // 数据分析 - 接口分析
  /** 获取接口分析数据 */
  INTERFACE_SUMMARY: '/datacube/getinterfacesummary',
} as const;

/**
 * access_token 缓存时间（秒）
 * 微信 access_token 有效期为 7200 秒，提前 5 分钟刷新
 */
export const ACCESS_TOKEN_CACHE_TTL = 7200 - 300;

/**
 * 数据分析接口最大查询天数
 */
export const MAX_DATE_RANGE_DAYS = 30;
