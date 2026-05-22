/**
 * Feature: blog-column-display, Property 3: PostCard column badge rendering
 *
 * For any Post object, the PostCard component SHALL render a ColumnBadge
 * linking to `/columns/{slug}` with the column title if and only if the
 * `column` field is non-null.
 *
 * Validates: Requirements 3.1, 3.2, 3.3
 */
import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import fc from 'fast-check'
import type { Post } from '@/types'

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => 'en',
}))

// Mock @/i18n/navigation - render Link as a plain <a> tag
vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children, ...props }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}))

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, whileHover, whileTap, animate, initial, exit, variants, transition, ...props }: Record<string, unknown>) => <div {...props}>{children as React.ReactNode}</div>,
  },
  useMotionValue: () => ({ set: () => {} }),
  useSpring: () => ({ set: () => {} }),
  useTransform: () => ({ set: () => {} }),
}))

import PostCard from '@/components/PostCard'

// --- Arbitraries ---

const arbColumnObject = fc.record({
  id: fc.uuid(),
  title: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
  slug: fc.stringMatching(/^[a-z][a-z0-9-]{1,20}[a-z0-9]$/),
})

const arbColumn = fc.oneof(
  { weight: 1, arbitrary: fc.constant(null) },
  { weight: 2, arbitrary: arbColumnObject },
)

const arbTag = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
  slug: fc.stringMatching(/^[a-z][a-z0-9-]{0,10}[a-z0-9]$/),
})

const arbPost: fc.Arbitrary<Post> = fc.record({
  id: fc.uuid(),
  slug: fc.stringMatching(/^[a-z][a-z0-9-]{1,20}[a-z0-9]$/),
  title: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
  excerpt: fc.oneof(fc.constant(null), fc.string({ minLength: 1, maxLength: 200 })),
  coverImage: fc.constant(null),
  author: fc.record({
    name: fc.string({ minLength: 1, maxLength: 30 }).filter(s => s.trim().length > 0),
    avatar: fc.constant(null),
  }),
  publishedAt: fc.integer({ min: new Date('2020-01-01').getTime(), max: new Date('2025-12-31').getTime() }).map(ts => new Date(ts).toISOString()),
  readTime: fc.stringMatching(/^\d+ min$/),
  category: fc.oneof(
    fc.constant(null),
    fc.record({
      id: fc.uuid(),
      name: fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
      slug: fc.stringMatching(/^[a-z][a-z0-9-]{0,10}[a-z0-9]$/),
    }),
  ),
  tags: fc.array(arbTag, { minLength: 0, maxLength: 3 }),
  column: arbColumn,
})

describe('Property 3: PostCard column badge rendering', () => {
  it('renders ColumnBadge with correct link when column is non-null, and omits it when null', () => {
    fc.assert(
      fc.property(arbPost, (post) => {
        const { container, unmount } = render(<PostCard post={post} />)

        // Query for column badge links by href pattern /columns/
        const columnLinks = container.querySelectorAll('a[href^="/columns/"]')

        if (post.column !== null) {
          // When column is non-null: exactly one link to /columns/{slug} should exist
          expect(columnLinks.length).toBe(1)

          const badge = columnLinks[0]
          // The badge text content should be the column title
          expect(badge.textContent).toBe(post.column.title)
          // Its href should be /columns/{slug}
          expect(badge.getAttribute('href')).toBe(`/columns/${post.column.slug}`)
        } else {
          // When column is null: no link to /columns/ should exist
          expect(columnLinks.length).toBe(0)
        }

        unmount()
      }),
      { numRuns: 100 },
    )
  })
})
