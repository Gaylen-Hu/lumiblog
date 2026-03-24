export interface TocItem {
  id: string
  text: string
  level: 1 | 2 | 3
}

// 模块级正则，避免重复编译
const HEADING_REGEX = /^(#{1,3})\s+(.+)$/gm
const SPECIAL_CHARS_REGEX = /[^\w\u4e00-\u9fa5-]/g
const MULTI_HYPHEN_REGEX = /-+/g
const LEADING_TRAILING_HYPHEN_REGEX = /^-|-$/g
const WHITESPACE_REGEX = /\s+/g

// 模块级缓存
const slugCache = new Map<string, string>()

export function slugify(text: string): string {
  if (slugCache.has(text)) return slugCache.get(text)!
  const result = text
    .toLowerCase()
    .replace(WHITESPACE_REGEX, '-')
    .replace(SPECIAL_CHARS_REGEX, '')
    .replace(MULTI_HYPHEN_REGEX, '-')
    .replace(LEADING_TRAILING_HYPHEN_REGEX, '')
  slugCache.set(text, result)
  return result
}

export function parseTocItems(content: string): TocItem[] {
  const items: TocItem[] = []
  const regex = new RegExp(HEADING_REGEX.source, 'gm')
  let match: RegExpExecArray | null
  while ((match = regex.exec(content)) !== null) {
    const level = match[1].length as 1 | 2 | 3
    const text = match[2].trim()
    items.push({ id: slugify(text), text, level })
  }
  return items
}
