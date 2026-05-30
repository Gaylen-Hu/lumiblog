'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/v1/public'
/** 采集端点：API_BASE 形如 https://www.new-universe.cn/api/v1/public，取其 /v1 根 */
const COLLECT_URL = API_BASE.replace(/\/public\/?$/, '').replace(/\/$/, '') + '/collect'

interface CollectPayload {
  type: 'pageview'
  url: string
  query?: string
  title?: string
  referrer?: string
  locale?: string
}

function send(payload: CollectPayload): void {
  try {
    const body = JSON.stringify(payload)
    // 优先 sendBeacon（页面卸载也能送达），降级 fetch keepalive
    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: 'application/json' })
      navigator.sendBeacon(COLLECT_URL, blob)
    } else {
      fetch(COLLECT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
      }).catch(() => {})
    }
  } catch {
    // 静默失败，绝不影响用户体验
  }
}

/**
 * 自建埋点上报组件（参考 Umami）
 * - 无 Cookie，路由变化时上报 pageview
 * - 仅在生产环境且非爬虫时上报
 */
export default function SiteAnalytics() {
  const pathname = usePathname()
  const lastPath = useRef<string | null>(null)

  useEffect(() => {
    if (!pathname || pathname === lastPath.current) return
    lastPath.current = pathname

    // 过滤明显的爬虫
    if (/bot|crawler|spider|crawling/i.test(navigator.userAgent)) return

    const locale = pathname.split('/')[1] || ''

    send({
      type: 'pageview',
      url: pathname,
      query: window.location.search.replace(/^\?/, '') || undefined,
      title: document.title || undefined,
      referrer: document.referrer || undefined,
      locale: locale === 'zh' || locale === 'en' ? locale : undefined,
    })
  }, [pathname])

  return null
}
