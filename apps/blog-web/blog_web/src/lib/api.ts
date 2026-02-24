const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/v1/public'

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
  analytics: string | null
}

// 默认配置（API 不可用时使用）
const DEFAULT_SITE_CONFIG: SiteConfig = {
  siteName: 'NOVA',
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
  },
  seo: {
    defaultTitle: 'NOVA - 探索技术与设计的前沿',
    defaultDescription: '以极简主义的视角，探索技术、设计与人类潜能的前沿。',
    keywords: null,
    defaultOgImage: null,
  },
  filing: {
    icp: null,
    gongan: null,
    copyright: '© 2024 NOVA. All rights reserved.',
  },
  analytics: null,
}

export async function getSiteConfig(): Promise<SiteConfig> {
  try {
    const res = await fetch(`${API_BASE_URL}/site-config`, {
      next: { revalidate: 3600 }, // 1 小时缓存
    })

    if (!res.ok) {
      console.warn('Failed to fetch site config, using defaults')
      return DEFAULT_SITE_CONFIG
    }

    return res.json()
  } catch {
    console.warn('API unavailable, using default site config')
    return DEFAULT_SITE_CONFIG
  }
}

export type { SiteConfig }
