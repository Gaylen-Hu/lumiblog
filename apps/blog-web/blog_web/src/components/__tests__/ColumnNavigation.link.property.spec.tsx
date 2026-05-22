/**
 * Feature: blog-column-display, Property 5: Column navigation link correctness
 *
 * For any ColumnArticleNav data with non-null `prev` or `next`, the navigation
 * links SHALL point to `/posts/{slug}` for the corresponding article.
 *
 * Validates: Requirements 5.5
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import fc from 'fast-check'
import type { ColumnArticleNavDto } from '@/types/column'

// Mock @/i18n/navigation - render Link as a plain <a> tag
vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children, ...props }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}))

import ColumnNavigation from '@/components/ColumnNavigation'

// --- Arbitraries ---

const arbSlug = fc.stringMatching(/^[a-z][a-z0-9-]{1,20}[a-z0-9]$/)

const arbNavItem = fc.record({
  slug: arbSlug,
  title: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
})

const arbNavData: fc.Arbitrary<ColumnArticleNavDto> = fc.record({
  columnSlug: arbSlug,
  columnTitle: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
  prev: fc.oneof(fc.constant(null), arbNavItem),
  next: fc.oneof(fc.constant(null), arbNavItem),
}).filter(nav => nav.prev !== null || nav.next !== null)

describe('Property 5: Column navigation link correctness', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('navigation links point to /posts/{slug} for prev and next articles', async () => {
    await fc.assert(
      fc.asyncProperty(arbNavData, async (navData) => {
        // Mock fetch to return the generated nav data
        const mockFetch = vi.fn().mockResolvedValue({
          ok: true,
          json: async () => navData,
        })
        vi.stubGlobal('fetch', mockFetch)

        // Provide a valid columns prop so the component triggers the fetch
        const columns = [{ id: 'col-1', title: navData.columnTitle, slug: navData.columnSlug }]

        const { container, unmount } = render(
          <ColumnNavigation articleId="test-article-id" columns={columns} />
        )

        // Wait for the async fetch to complete and the component to render nav links
        await waitFor(() => {
          const nav = container.querySelector('nav')
          expect(nav).not.toBeNull()
        })

        // Verify prev link
        if (navData.prev !== null) {
          const prevLink = container.querySelector(`a[href="/posts/${navData.prev.slug}"]`)
          expect(prevLink).not.toBeNull()
          expect(prevLink!.textContent).toContain(navData.prev.title)
        }

        // Verify next link
        if (navData.next !== null) {
          const nextLink = container.querySelector(`a[href="/posts/${navData.next.slug}"]`)
          expect(nextLink).not.toBeNull()
          expect(nextLink!.textContent).toContain(navData.next.title)
        }

        unmount()
        vi.unstubAllGlobals()
      }),
      { numRuns: 100 },
    )
  })
})
