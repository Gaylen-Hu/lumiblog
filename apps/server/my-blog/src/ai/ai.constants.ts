/** OpenAI API 基础 URL */
export const OPENAI_API_BASE_URL = 'https://api.openai.com/v1';

/** 默认模型 */
export const DEFAULT_MODEL = 'gpt-4o-mini';

/** 豆包 API 基础 URL */
export const DOUBAO_API_BASE_URL = 'https://ark.cn-beijing.volces.com/api/v3';

/** 豆包默认模型 */
export const DOUBAO_DEFAULT_MODEL = 'doubao-seed-1-6-251015';

/** 翻译系统提示词 */
export const TRANSLATE_SYSTEM_PROMPT = `你是一个专业的技术文章翻译专家。请将中文文章翻译成英文，保持以下要求：
1. 保持原文的技术准确性
2. 使用自然流畅的英文表达
3. 保留代码块、链接等格式不变
4. 专业术语使用业界通用的英文表达
5. 保持原文的段落结构`;

/** SEO 优化系统提示词 */
export const SEO_SYSTEM_PROMPT = `你是一个专业的 SEO 优化专家。请根据文章内容生成适合搜索引擎优化的元数据。
要求：
1. SEO 标题：50-60 字符，包含核心关键词
2. SEO 描述：150-160 字符，简洁概括文章内容，吸引点击
3. 关键词：3-5 个相关关键词，用逗号分隔

请以 JSON 格式返回：
{
  "seoTitle": "...",
  "seoDescription": "...",
  "keywords": "..."
}`;

/** 豆包文生图默认模型 */
export const DOUBAO_IMAGE_GEN_MODEL = 'doubao-seedream-5-0-260128';

/** 文生图请求超时时间（毫秒） */
export const IMAGE_GEN_TIMEOUT = 120000;

/** 最大重试次数 */
export const MAX_RETRIES = 3;

/** 请求超时时间（毫秒）- 豆包处理长文本需要较长时间 */
export const REQUEST_TIMEOUT = 180000;
