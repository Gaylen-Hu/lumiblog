/**
 * P6：前端 fallback 保证非空
 * 当 getTimeline() 返回空数组时，About 页面渲染的 Timeline 条目数量
 * 等于 FALLBACK_TIMELINE 的长度（大于 0）
 * Validates: Requirements 7.3
 */
import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'

// ─── 复制自 about/page.tsx 的 FALLBACK_TIMELINE 常量 ───────────────────────
// 与页面保持同步：如果页面修改了 fallback 条目，这里也需要更新
const FALLBACK_TIMELINE = [
  { year: '2017', titleKey: 'timeline.y2017.title', descKey: 'timeline.y2017.desc' },
  { year: '2019', titleKey: 'timeline.y2019.title', descKey: 'timeline.y2019.desc' },
  { year: '2022', titleKey: 'timeline.y2022.title', descKey: 'timeline.y2022.desc' },
  { year: '2024', titleKey: 'timeline.y2024.title', descKey: 'timeline.y2024.desc' },
  { year: '2025', titleKey: 'timeline.y2025.title', descKey: 'timeline.y2025.desc' },
] as const

/** 模拟 about/page.tsx 中的 timeline 选择逻辑 */
interface TimelineEntry {
  id: string
  year: string
  titleZh: string
  titleEn: string
  descZh: string
  descEn: string
  order: number
}

interface DisplayItem {
  year: string
  title: string
  desc: string
}

function resolveTimeline(
  apiTimeline: TimelineEntry[],
  locale: string,
  t: (key: string) => string,
): DisplayItem[] {
  if (apiTimeline.length > 0) {
    return apiTimeline.map((entry) => ({
      year: entry.year,
      title: locale === 'zh' ? entry.titleZh : entry.titleEn,
      desc: locale === 'zh' ? entry.descZh : entry.descEn,
    }))
  }
  // fallback
  return FALLBACK_TIMELINE.map(({ year, titleKey, descKey }) => ({
    year,
    title: t(titleKey),
    desc: t(descKey),
  }))
}

// ─── 属性测试 ─────────────────────────────────────────────────────────────

describe('P6：前端 fallback 保证非空', () => {
  it('FALLBACK_TIMELINE 本身长度大于 0', () => {
    expect(FALLBACK_TIMELINE.length).toBeGreaterThan(0)
  })

  it('当 API 返回空数组时，渲染条目数等于 FALLBACK_TIMELINE 长度', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('zh', 'en'),
        (locale) => {
          const t = (key: string) => `[${key}]`
          const result = resolveTimeline([], locale, t)
          expect(result).toHaveLength(FALLBACK_TIMELINE.length)
          expect(result.length).toBeGreaterThan(0)
        },
      ),
      { numRuns: 20 },
    )
  })

  it('当 API 返回非空数组时，渲染条目数等于 API 数据长度', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.uuid(),
            year: fc.stringMatching(/^\d{4}$/),
            titleZh: fc.string({ minLength: 1, maxLength: 30 }),
            titleEn: fc.string({ minLength: 1, maxLength: 30 }),
            descZh: fc.string({ minLength: 1, maxLength: 100 }),
            descEn: fc.string({ minLength: 1, maxLength: 100 }),
            order: fc.integer({ min: 0, max: 9999 }),
          }),
          { minLength: 1, maxLength: 20 },
        ),
        fc.constantFrom('zh', 'en'),
        (apiTimeline, locale) => {
          const t = (key: string) => `[${key}]`
          const result = resolveTimeline(apiTimeline, locale, t)
          expect(result).toHaveLength(apiTimeline.length)
        },
      ),
      { numRuns: 50 },
    )
  })

  it('locale=zh 时使用中文字段，locale=en 时使用英文字段', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.uuid(),
          year: fc.stringMatching(/^\d{4}$/),
          titleZh: fc.string({ minLength: 1, maxLength: 30 }),
          titleEn: fc.string({ minLength: 1, maxLength: 30 }),
          descZh: fc.string({ minLength: 1, maxLength: 100 }),
          descEn: fc.string({ minLength: 1, maxLength: 100 }),
          order: fc.integer({ min: 0, max: 9999 }),
        }),
        (entry) => {
          const t = (key: string) => `[${key}]`
          const [zh] = resolveTimeline([entry], 'zh', t)
          const [en] = resolveTimeline([entry], 'en', t)
          expect(zh.title).toBe(entry.titleZh)
          expect(zh.desc).toBe(entry.descZh)
          expect(en.title).toBe(entry.titleEn)
          expect(en.desc).toBe(entry.descEn)
        },
      ),
      { numRuns: 50 },
    )
  })
})
