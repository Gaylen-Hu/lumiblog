import createMiddleware from 'next-intl/middleware'
import type { NextRequest } from 'next/server'
import { routing } from './i18n/routing'

const localize = createMiddleware(routing)
const localizePosts = createMiddleware({ ...routing, alternateLinks: false })

export default function middleware(request: NextRequest) {
  // Article translations can have different slugs. Only the CMS knows the matching URLs.
  return /^(?:\/(?:en|zh))?\/posts(?:\/|$)/.test(request.nextUrl.pathname)
    ? localizePosts(request)
    : localize(request)
}

export const config = {
  matcher: [
    // 匹配所有路径，排除 _next、api、静态文件、badmin
    '/((?!_next|api|badmin|.*\\..*).*)',
  ],
}
