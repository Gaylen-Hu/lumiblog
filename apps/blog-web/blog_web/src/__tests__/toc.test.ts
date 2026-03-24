/**
 * Tests for lib/toc.ts — slugify and parseTocItems
 */
import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { slugify, parseTocItems } from '@/lib/toc'

// ─── 4.1 测试 slugify：基本转换 ─────────────────────────────────────────
describe('slugify', () => {
  it('"Hello World" → "hello-world"', () => {
    expect(slugify('Hello World')).toBe('hello-world')
  })

  it('"NestJS 入门" → "nestjs-入门"', () => {
    expect(slugify('NestJS 入门')).toBe('nestjs-入门')
  })

  it('"React & TypeScript" → "react-typescript"', () => {
    expect(slugify('React & TypeScript')).toBe('react-typescript')
  })

  // ─── 4.2 测试 slugify 幂等性 ────────────────────────────────────────
  // **Validates: Requirements 1.1**
  describe('idempotence', () => {
    it('slugify(x) === slugify(slugify(x)) for various inputs', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }),
          (text) => {
            expect(slugify(text)).toBe(slugify(slugify(text)))
          },
        ),
        { numRuns: 200 },
      )
    })
  })
})

// ─── 4.3 测试 parseTocItems：条目数量与 h1–h3 匹配 ─────────────────────
describe('parseTocItems', () => {
  it('returns correct count matching h1–h3 headings', () => {
    const content = [
      '# Heading 1',
      '## Heading 2',
      '### Heading 3',
      '#### Heading 4',
      '##### Heading 5',
      'Some paragraph text',
      '## Another H2',
    ].join('\n')

    const items = parseTocItems(content)
    // h1 + h2 + h3 + h2 = 4, #### and ##### excluded
    expect(items).toHaveLength(4)
  })

  it('returns empty array when no h1–h3 headings exist', () => {
    const content = '#### Deep heading\nSome text\n##### Even deeper'
    expect(parseTocItems(content)).toHaveLength(0)
  })

  it('returns empty array for empty content', () => {
    expect(parseTocItems('')).toHaveLength(0)
  })

  // ─── 4.4 测试 parseTocItems 层级映射 ──────────────────────────────────
  describe('level mapping', () => {
    it('# → level 1', () => {
      const items = parseTocItems('# Title')
      expect(items[0].level).toBe(1)
    })

    it('## → level 2', () => {
      const items = parseTocItems('## Title')
      expect(items[0].level).toBe(2)
    })

    it('### → level 3', () => {
      const items = parseTocItems('### Title')
      expect(items[0].level).toBe(3)
    })

    it('#### is excluded from results', () => {
      const items = parseTocItems('#### Title')
      expect(items).toHaveLength(0)
    })

    it('maps mixed levels correctly', () => {
      const content = '# A\n## B\n### C\n## D\n# E'
      const items = parseTocItems(content)
      expect(items.map((i) => i.level)).toEqual([1, 2, 3, 2, 1])
    })
  })

  // ─── 4.5 测试 parseTocItems 与 slugify 一致性 ─────────────────────────
  // **Validates: Requirements 1.1, Property 2**
  describe('id consistency with slugify', () => {
    it('parseTocItems id equals slugify result for same text', () => {
      const headings = ['Hello World', 'NestJS 入门', 'React & TypeScript']
      const content = headings.map((h) => `## ${h}`).join('\n')
      const items = parseTocItems(content)

      items.forEach((item, i) => {
        expect(item.id).toBe(slugify(headings[i]))
      })
    })

    it('property: parseTocItems id always matches slugify for arbitrary text', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }).filter((s) => !s.includes('\n') && !s.includes('#')),
          (text) => {
            const content = `## ${text}`
            const items = parseTocItems(content)
            if (items.length === 1) {
              expect(items[0].id).toBe(slugify(text))
            }
          },
        ),
        { numRuns: 200 },
      )
    })
  })
})
