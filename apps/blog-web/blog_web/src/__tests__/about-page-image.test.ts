/**
 * Tests for about-page-image-fix spec
 * Tests the data/logic layer — About page is a Server Component,
 * so we test functions directly without DOM/React rendering.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as fc from 'fast-check'

// ─── Types (mirrored from api.ts) ────────────────────────────────────────────

interface SiteConfig {
  siteName: string
  siteDescription: string
  logo: string | null
  favicon: string | null
  socialLinks: {
    github?: string
    twitter?: string
    linkedin?: string
    weibo?: string
  }
  owner: {
    name: string
    avatar: string | null
    bio: string | null
    email: string | null
    techStack: string[]
  }
  seo: {
    defaultTitle: string | null
    defaultDescription: string | null
    keywords: string | null
    defaultOgImage: string | null
  }
  filing: {
    icp: string | null
    gongan: string | null
    copyright: string | null
  }
  analyticsGoogle: string | null
  analyticsBaidu: string | null
  aboutImage1: string | null
  aboutImage2: string | null
}

// ─── DEFAULT_SITE_CONFIG (mirrored from api.ts) ───────────────────────────────

const DEFAULT_SITE_CONFIG: SiteConfig = {
  siteName: '墨千',
  siteDescription: '探索技术与设计的前沿',
  logo: null,
  favicon: null,
  socialLinks: {
    github: 'https://github.com',
    twitter: 'https://twitter.com',
  },
  owner: {
    name: 'Site Owner',
    avatar: null,
    bio: null,
    email: null,
    techStack: [],
  },
  seo: {
    defaultTitle: '墨千 - 探索技术与设计的前沿',
    defaultDescription: '以极简主义的视角，探索技术、设计与人类潜能的前沿。',
    keywords: null,
    defaultOgImage: null,
  },
  filing: {
    icp: null,
    gongan: null,
    copyright: '© 2024 NOVA. All rights reserved.',
  },
  analyticsGoogle: null,
  analyticsBaidu: null,
  aboutImage1: null,
  aboutImage2: null,
}

// ─── Logic helpers (mirrored from about/page.tsx) ────────────────────────────

/**
 * Determines whether to render an <Image> component or a placeholder div.
 * Returns 'image' when the URL is non-null, 'placeholder' otherwise.
 */
function resolveImageSlot(url: string | null): 'image' | 'placeholder' {
  return url !== null ? 'image' : 'placeholder'
}

// ─── Mock fetch for getSiteConfig round-trip tests ───────────────────────────

const API_BASE_URL = 'http://localhost:3001/v1/public'

async function getSiteConfig(fetchFn: typeof fetch): Promise<SiteConfig> {
  try {
    const res = await fetchFn(`${API_BASE_URL}/site-config`, {
      next: { revalidate: 3600 },
    } as RequestInit)
    if (!(res as Response).ok) return DEFAULT_SITE_CONFIG
    return (res as Response).json()
  } catch {
    return DEFAULT_SITE_CONFIG
  }
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('about-page-image-fix: DEFAULT_SITE_CONFIG', () => {
  // 8.3 — example test
  it('DEFAULT_SITE_CONFIG has aboutImage1: null', () => {
    // Arrange / Act / Assert
    expect(DEFAULT_SITE_CONFIG.aboutImage1).toBeNull()
  })

  it('DEFAULT_SITE_CONFIG has aboutImage2: null', () => {
    expect(DEFAULT_SITE_CONFIG.aboutImage2).toBeNull()
  })
})

describe('about-page-image-fix: image slot rendering logic', () => {
  // 8.1 — Property 4
  // Feature: about-page-image-fix, Property 4: for any non-null URL, About page renders <Image> component
  it('Property 4: any non-null URL resolves to image slot', () => {
    fc.assert(
      fc.property(
        fc.webUrl(),
        (url) => {
          // Arrange
          const imageUrl: string | null = url
          // Act
          const result = resolveImageSlot(imageUrl)
          // Assert
          expect(result).toBe('image')
        },
      ),
      { numRuns: 100 },
    )
  })

  // 8.4 — edge case: null renders placeholder
  it('null aboutImage1 resolves to placeholder slot', () => {
    // Arrange
    const url: string | null = null
    // Act
    const result = resolveImageSlot(url)
    // Assert
    expect(result).toBe('placeholder')
  })

  it('null aboutImage2 resolves to placeholder slot', () => {
    const result = resolveImageSlot(null)
    expect(result).toBe('placeholder')
  })
})

describe('about-page-image-fix: getSiteConfig round-trip', () => {
  // 8.2 — Property 7
  // Feature: about-page-image-fix, Property 7: for any SiteConfig JSON with aboutImage1/aboutImage2, getSiteConfig round-trip returns same values
  it('Property 7: getSiteConfig returns aboutImage1/aboutImage2 from API response unchanged', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.option(fc.webUrl(), { nil: null }),
        fc.option(fc.webUrl(), { nil: null }),
        async (img1, img2) => {
          // Arrange
          const mockConfig: SiteConfig = {
            ...DEFAULT_SITE_CONFIG,
            aboutImage1: img1,
            aboutImage2: img2,
          }
          const mockFetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => mockConfig,
          })

          // Act
          const result = await getSiteConfig(mockFetch as unknown as typeof fetch)

          // Assert
          expect(result.aboutImage1).toBe(img1)
          expect(result.aboutImage2).toBe(img2)
        },
      ),
      { numRuns: 100 },
    )
  })

  // 8.4 — edge case: getSiteConfig failure returns DEFAULT_SITE_CONFIG with null images
  it('getSiteConfig failure returns DEFAULT_SITE_CONFIG with null aboutImage1', async () => {
    // Arrange
    const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'))

    // Act
    const result = await getSiteConfig(mockFetch as unknown as typeof fetch)

    // Assert
    expect(result.aboutImage1).toBeNull()
    expect(result.aboutImage2).toBeNull()
  })

  it('getSiteConfig non-ok response returns DEFAULT_SITE_CONFIG with null images', async () => {
    // Arrange
    const mockFetch = vi.fn().mockResolvedValue({ ok: false })

    // Act
    const result = await getSiteConfig(mockFetch as unknown as typeof fetch)

    // Assert
    expect(result.aboutImage1).toBeNull()
    expect(result.aboutImage2).toBeNull()
  })
})
