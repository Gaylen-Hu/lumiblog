/**
 * ColumnNavigation 单元测试
 *
 * Validates: Requirements 5.1, 5.2, 5.3, 5.4
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, waitFor } from '@testing-library/react'

// Mock @/i18n/navigation - render Link as a plain <a> tag
vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children, ...props }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}))

import ColumnNavigation from '@/components/ColumnNavigation'

const mockNavResponse = {
  columnSlug: 'nestjs-series',
  columnTitle: 'NestJS 实战',
  prev: { slug: 'prev-article', title: '上一篇文章' },
  next: { slug: 'next-article', title: '下一篇文章' },
}

describe('ColumnNavigation', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders nothing when columns is empty array', () => {
    const { container } = render(
      <ColumnNavigation articleId="article-1" columns={[]} />,
    )
    expect(container.innerHTML).toBe('')
  })

  it('fetches nav data and renders navigation when columns is non-empty', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockNavResponse),
    })
    vi.stubGlobal('fetch', mockFetch)

    const columns = [{ id: '1', title: 'NestJS 实战', slug: 'nestjs-series' }]
    const { container } = render(
      <ColumnNavigation articleId="article-1" columns={columns} />,
    )

    await waitFor(() => {
      expect(container.querySelector('nav')).not.toBeNull()
    })

    // Verify fetch was called with correct URL
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/columns/nestjs-series/nav/article-1'),
    )

    // Verify column title link is rendered
    const columnLink = container.querySelector('a[href="/columns/nestjs-series"]')
    expect(columnLink).not.toBeNull()
    expect(columnLink!.textContent).toBe('NestJS 实战')

    // Verify prev link
    const prevLink = container.querySelector('a[href="/posts/prev-article"]')
    expect(prevLink).not.toBeNull()
    expect(prevLink!.textContent).toContain('上一篇文章')

    // Verify next link
    const nextLink = container.querySelector('a[href="/posts/next-article"]')
    expect(nextLink).not.toBeNull()
    expect(nextLink!.textContent).toContain('下一篇文章')
  })

  it('shows disabled state for "上一篇" when prev is null (first article in column)', async () => {
    const navWithNoPrev = {
      ...mockNavResponse,
      prev: null,
    }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(navWithNoPrev),
    }))

    const columns = [{ id: '1', title: 'NestJS 实战', slug: 'nestjs-series' }]
    const { container } = render(
      <ColumnNavigation articleId="article-1" columns={columns} />,
    )

    await waitFor(() => {
      expect(container.querySelector('nav')).not.toBeNull()
    })

    // "上一篇" should show disabled state with "无上一篇" text
    const disabledPrev = container.querySelector('.cursor-not-allowed')
    expect(disabledPrev).not.toBeNull()
    expect(disabledPrev!.textContent).toContain('无上一篇')

    // No prev link should exist
    const prevLinks = container.querySelectorAll('a[href^="/posts/"]')
    // Only next link should exist
    expect(prevLinks.length).toBe(1)
    expect(prevLinks[0].getAttribute('href')).toBe('/posts/next-article')
  })

  it('shows disabled state for "下一篇" when next is null (last article in column)', async () => {
    const navWithNoNext = {
      ...mockNavResponse,
      next: null,
    }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(navWithNoNext),
    }))

    const columns = [{ id: '1', title: 'NestJS 实战', slug: 'nestjs-series' }]
    const { container } = render(
      <ColumnNavigation articleId="article-1" columns={columns} />,
    )

    await waitFor(() => {
      expect(container.querySelector('nav')).not.toBeNull()
    })

    // "下一篇" should show disabled state with "无下一篇" text
    const disabledElements = container.querySelectorAll('.cursor-not-allowed')
    expect(disabledElements.length).toBe(1)
    const disabledNext = disabledElements[0]
    expect(disabledNext.textContent).toContain('无下一篇')

    // Only prev link should exist
    const postLinks = container.querySelectorAll('a[href^="/posts/"]')
    expect(postLinks.length).toBe(1)
    expect(postLinks[0].getAttribute('href')).toBe('/posts/prev-article')
  })

  it('renders both navigation links when prev and next exist', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockNavResponse),
    }))

    const columns = [{ id: '1', title: 'NestJS 实战', slug: 'nestjs-series' }]
    const { container } = render(
      <ColumnNavigation articleId="article-1" columns={columns} />,
    )

    await waitFor(() => {
      expect(container.querySelector('nav')).not.toBeNull()
    })

    // Both links should exist
    const prevLink = container.querySelector('a[href="/posts/prev-article"]')
    const nextLink = container.querySelector('a[href="/posts/next-article"]')
    expect(prevLink).not.toBeNull()
    expect(nextLink).not.toBeNull()

    // No disabled elements should exist
    const disabledElements = container.querySelectorAll('.cursor-not-allowed')
    expect(disabledElements.length).toBe(0)
  })
})
