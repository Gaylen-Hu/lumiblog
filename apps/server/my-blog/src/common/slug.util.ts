import { pinyin } from 'pinyin-pro';
import { randomUUID } from 'node:crypto';

/** 最大 slug 长度 */
const MAX_SLUG_LENGTH = 150;

/** 匹配中文字符 */
const CHINESE_CHAR_REGEX = /[\u4e00-\u9fa5]/;

/** 匹配非 slug 安全字符（保留字母、数字、中文、空格、连字符） */
const UNSAFE_CHARS_REGEX = /[^\w\s\u4e00-\u9fa5-]/g;

/** 匹配空格和下划线 */
const WHITESPACE_REGEX = /[\s_]+/g;

/** 匹配连续连字符 */
const MULTI_HYPHEN_REGEX = /-+/g;

/** 匹配首尾连字符 */
const TRIM_HYPHEN_REGEX = /^-|-$/g;

/**
 * 将标题文本转换为 URL 友好的 slug
 *
 * - 中文标题自动转拼音
 * - 英文标题直接 slugify
 * - 混合内容逐段处理
 */
export function createSlug(text: string): string {
  let processed = text.trim().toLowerCase();

  // 中文转拼音（空格分隔）
  if (CHINESE_CHAR_REGEX.test(processed)) {
    processed = pinyin(processed, { toneType: 'none', type: 'array' }).join(' ');
  }

  const slug = processed
    .replace(UNSAFE_CHARS_REGEX, '')
    .replace(WHITESPACE_REGEX, '-')
    .replace(MULTI_HYPHEN_REGEX, '-')
    .replace(TRIM_HYPHEN_REGEX, '');

  if (!slug) return 'untitled';

  if (slug.length <= MAX_SLUG_LENGTH) return slug;

  // 截断时避免在连字符中间断开
  return slug.substring(0, MAX_SLUG_LENGTH).replace(/-+$/, '');
}

/**
 * 生成 8 位短随机后缀（基于 crypto）
 */
export function shortId(): string {
  return randomUUID().replace(/-/g, '').substring(0, 8);
}
