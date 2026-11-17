import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR || '.next',
  output: 'standalone',
  env: {
    NEXT_PUBLIC_COMPANION_SPLIT_HOST: process.env.VERCEL_ENV === 'production' ? 'true' : 'false',
  },
  // Older local tabs cached unversioned dev chunks as immutable.
  deploymentId: process.env.NODE_ENV === 'development' ? 'study-daylight-preview' : undefined,
  async rewrites() {
    // Vercel serves the frontend without the origin server's Nginx routes.
    if (process.env.VERCEL_ENV === 'production') {
      return [
        { source: '/api/v1/collect', destination: 'https://api.new-universe.cn/v1/collect' },
        { source: '/blog-release.json', destination: '/api/release' },
        { source: '/api/v1/public/letters', destination: 'https://api.new-universe.cn/v1/public/letters' },
      ]
    }
    // Self-hosted releases use Nginx. Preview writes require an explicit local mailbox.
    const local = process.env.LETTERS_PREVIEW_API
    if (!local || !/^http:\/\/127\.0\.0\.1:\d+$/.test(local)) return []
    const routes = [{source:'/api/v1/public/letters',destination:local+'/v1/public/letters'}]
    const publicApi = process.env.NEXT_PUBLIC_API_URL
    if (publicApi && /^https:\/\/[^?#@]+\/v1\/public$/.test(publicApi)) {
      routes.push({source:'/api/v1/public/environment',destination:publicApi+'/environment'})
    }
    return routes
  },
  images: {
    remotePatterns: [
      ...(process.env.NODE_ENV === 'development' ? [{
        protocol: 'http' as const,
        hostname: 'localhost',
        port: '3000',
        pathname: '/uploads/**',
      }] : []),
      ...['www.new-universe.cn', 'api.new-universe.cn', 'badmin.new-universe.cn'].map(hostname => ({
        protocol: 'https' as const, hostname, port: '', pathname: '/uploads/**',
      })),
      {
        protocol: 'https',
        hostname: 'myblog-rkcy.oss-cn-beijing.aliyuncs.com',
        port: '',
        pathname: '/**',
      },
    ],
    maximumRedirects: 0,
    formats: ['image/webp'],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          ...(process.env.NODE_ENV === 'production' ? [
            { key: 'Strict-Transport-Security', value: 'max-age=31536000' },
            { key: 'Content-Security-Policy', value: [
              "default-src 'self'", "base-uri 'self'", "object-src 'none'", "frame-ancestors 'none'",
              "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://hm.baidu.com https://giscus.app https://va.vercel-scripts.com",
              "style-src 'self' 'unsafe-inline'", "img-src 'self' https: data: blob:", "font-src 'self' data:",
              "connect-src 'self' blob: data: https://*.new-universe.cn https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com https://hm.baidu.com https://vitals.vercel-insights.com",
              "worker-src 'self' blob:", "frame-src https://giscus.app", "media-src 'self' https: blob:", "form-action 'self'", "upgrade-insecure-requests",
            ].join('; ') },
          ] : []),
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
      ...(process.env.NODE_ENV === 'production' ? [{
        source: '/companion/v1/:name.:hash([a-f0-9]{12}).:ext(glb\\.gz|webp)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/_next/static/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/study-assets/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
        ],
      },
      {
        source: '/study-assets/web/:name.:hash([0-9a-f]{12}).webp',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      {
        // Public content is locale-specific in its URL and has no user state.
        // Shared caching reduces TTFB while ISR refreshes article data every minute.
        source: '/:locale(zh|en)/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, s-maxage=60, stale-while-revalidate=300' },
        ],
      },
      ] : []),
    ]
  },
  async redirects() {
    return [
      { source: '/posts/:path*', destination: '/zh/posts/:path*', permanent: true },
      { source: '/columns/:path*', destination: '/zh/columns/:path*', permanent: true },
      { source: '/projects/:path*', destination: '/zh/projects/:path*', permanent: true },
      { source: '/about', destination: '/zh/about', permanent: true },
      { source: '/timeline', destination: '/zh/timeline', permanent: true },
    ]
  },
}

export default withNextIntl(nextConfig)
