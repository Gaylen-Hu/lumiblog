import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR || '.next',
  output: 'standalone',
  // Older local tabs cached unversioned dev chunks as immutable.
  deploymentId: process.env.NODE_ENV === 'development' ? 'study-daylight-preview' : undefined,
  async rewrites() {
    // In production nginx owns /api/v1. A local preview may explicitly target a local mailbox.
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
      {
        protocol: 'https',
        hostname: 'picsum.photos',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3000',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**',
        pathname: '/uploads/**',
      },
      {
        protocol: 'https',
        hostname: '*.oss-cn-beijing.aliyuncs.com',
        pathname: '/**',
      },
    ],
    formats: ['image/avif', 'image/webp'],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
      ...(process.env.NODE_ENV === 'production' ? [{
        source: '/(.*)\\.(js|css|woff2|woff|ttf|ico|svg|png|jpg|jpeg|webp|avif)',
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
