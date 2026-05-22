/**
 * Feature: blog-column-display, Property 4: Article detail column attribution rendering
 *
 * For any PostDetail object, the ColumnAttribution component SHALL render a link
 * to `/columns/{slug}` for each column in the `columns` array if and only if
 * the array is non-empty.
 *
 * Validates: Requirements 4.1, 4.2, 4.3
 */
import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import fc from 'fast-check'

// Mock @/i18n/navigation - render Link as a plain <a> tag
vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children, ...props }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}))

import { ColumnAttribution } from '@/components/ColumnAttribution'

// --- Arbitraries ---

const arbColumnItem = fc.record({
  id: fc.uuid(),
  title: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
  slug: fc.stringMatching(/^[a-z][a-z0-9-]{1,20}[a-z0-9]$/),
})

const arbColumns = fc.oneof(
  { weight: 1, arbitrary: fc.constant([] as { id: string; title: string; slug: string }[]) },
  { weight: 3, arbitrary: fc.array(arbColumnItem, { minLength: 1, maxLength: 5 }) },
)

describe('Property 4: Article detail column attribution rendering', () => {
  it('renders a link to /columns/{slug} for each column when non-empty, and renders nothing when empty', () => {
    fc.assert(
      fc.property(arbColumns, (columns) => {
        const { container, unmount } = render(<ColumnAttribution columns={columns} />)

        if (columns.length === 0) {
          // When columns is empty: component returns null (nothing rendered)
          expect(container.innerHTML).toBe('')
        } else {
          // When columns is non-empty: one link per column exists
          const columnLinks = container.querySelectorAll('a[href^="/columns/"]')
          expect(columnLinks.length).toBe(columns.length)

          // Each link has correct href and text content
          columns.forEach((col, i) => {
            const link = columnLinks[i]
            expect(link.getAttribute('href')).toBe(`/columns/${col.slug}`)
            expect(link.textContent).toBe(col.title)
          })
        }

        unmount()
      }),
      { numRuns: 100 },
    )
  })
})
