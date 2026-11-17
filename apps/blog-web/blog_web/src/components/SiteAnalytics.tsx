'use client'

import { useCallback, useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { useReportWebVitals } from 'next/web-vitals'
import { useStudyLocation } from './study/StudyNavigation'

const endpoint = process.env.NEXT_PUBLIC_COLLECT_URL || '/api/v1/collect'
type EventPayload = { type: 'pageview' | 'custom'; url: string; name?: string; query?: string; title?: string; referrer?: string; locale?: string }
type BrowserNavigator = Navigator & { connection?: { effectiveType?: string } }
type BrowserPerformance = Performance & { memory?: { usedJSHeapSize: number } }

function send(event: EventPayload) {
  if (process.env.NODE_ENV !== 'production' || /bot|crawler|spider/i.test(navigator.userAgent)) return
  const body = JSON.stringify(event)
  try {
    if (navigator.sendBeacon?.(endpoint, new Blob([body], { type: 'application/json' }))) return
    void fetch(endpoint, { method: 'POST', body, headers: { 'Content-Type': 'application/json' }, keepalive: true }).catch(() => {})
  } catch { /* Analytics must never interrupt reading. */ }
}

function metric(name: string, value: number, url: string) {
  if (!Number.isFinite(value) || value < 0) return
  const network = (navigator as BrowserNavigator).connection?.effectiveType || 'unknown'
  const query = new URLSearchParams({ value: String(Math.round(value * 1000) / 1000), network })
  send({ type: 'custom', url, name, query: query.toString() })
}

const roomEvents = new Set(['room_init', 'room_init_error', 'room_fps', 'room_slow_frame_pct', 'room_draw_calls'])
const articlePath = /^\/(zh|en)\/posts\/[^/]+\/?$/

export default function SiteAnalytics() {
  const pathname = usePathname() || '/'
  const locale = pathname.split('/')[1]
  const route = useStudyLocation(locale, pathname)
  const path = (route.readingPath || pathname).split(/[?#]/)[0]
  const entry = useRef(path)
  const navigation = useRef<{ time: number; heading: Element | null } | null>(null)
  const lastPath = useRef('')

  useReportWebVitals(useCallback(({ name, value }) => {
    if (['LCP', 'CLS', 'INP'].includes(name)) metric(name, value, entry.current)
  }, []))

  useEffect(() => {
    const click = (event: MouseEvent) => {
      const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[href]') : null
      if (!link || link.origin !== location.origin || link.target === '_blank' || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return
      navigation.current = { time: performance.now(), heading: document.querySelector('#post-body') }
    }
    document.addEventListener('click', click, true)
    return () => document.removeEventListener('click', click, true)
  }, [])

  useEffect(() => {
    if (!path || path === lastPath.current) return
    lastPath.current = path
    send({ type: 'pageview', url: path, title: document.title, locale, referrer: document.referrer ? new URL(document.referrer).origin : undefined })
    const start = navigation.current
    navigation.current = null
    if (!start || performance.now() - start.time > 30_000) return
    let frame = 0
    const painted = () => {
      const article = document.querySelector('#post-body')
      if (articlePath.test(path) && (!article || article === start.heading || !article.getClientRects().length)) return false
      frame = requestAnimationFrame(() => {
        metric('route_ms', performance.now() - start.time, path)
        const heap = (performance as BrowserPerformance).memory?.usedJSHeapSize
        if (heap) metric('route_heap_mb', heap / 1048576, path)
      })
      return true
    }
    const observer = new MutationObserver(() => { if (painted()) observer.disconnect() })
    if (!painted()) observer.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['hidden', 'aria-hidden'] })
    const timeout = setTimeout(() => observer.disconnect(), 30_000)
    return () => { observer.disconnect(); clearTimeout(timeout); cancelAnimationFrame(frame) }
  }, [path, locale])

  useEffect(() => {
    const seen = new Set<string>()
    const once = (name: string, value = 1) => {
      if (!seen.has(name)) { seen.add(name); metric(name, value, path) }
    }
    const room = (event: Event) => {
      const { name, value } = (event as CustomEvent).detail || {}
      if (roomEvents.has(name)) metric(name, value ?? 1, path)
    }
    const contextLost = () => once('webgl_context_lost')
    const error = (event: Event) => {
      if (event instanceof ErrorEvent) once('js_error')
      else if (event.target instanceof HTMLElement) {
        const src = event.target.getAttribute('src')
        if (src && /^\/(study-assets|companion)\//.test(src)) once('room_asset_error')
      }
    }
    const rejected = () => once('unhandled_rejection')
    const resources = typeof PerformanceObserver !== 'undefined' ? new PerformanceObserver(list => {
      for (const item of list.getEntries() as PerformanceResourceTiming[]) {
        if (!item.name.startsWith(location.origin + '/')) continue
        if (/^\/(study-assets|companion)\//.test(new URL(item.name).pathname) && item.responseStatus >= 400) {
          once(item.responseStatus >= 500 ? 'room_asset_5xx' : 'room_asset_4xx')
        }
      }
    }) : null
    try { resources?.observe({ type: 'resource' }) } catch { /* Resource Timing is optional. */ }
    window.addEventListener('study-metric', room)
    document.addEventListener('webglcontextlost', contextLost, true)
    window.addEventListener('error', error, true)
    window.addEventListener('unhandledrejection', rejected)
    return () => {
      resources?.disconnect()
      window.removeEventListener('study-metric', room)
      document.removeEventListener('webglcontextlost', contextLost, true)
      window.removeEventListener('error', error, true)
      window.removeEventListener('unhandledrejection', rejected)
    }
  }, [path])

  useEffect(() => {
    if (!articlePath.test(path)) return
    let activeSince: number | null = null
    let visibleMs = 0, depth = 0, reportedDepth = -1, completed = false
    const measure = () => {
      const body = document.getElementById('post-body')
      if (!body || document.hidden || !body.getClientRects().length) return
      if (activeSince === null) activeSince = performance.now()
      const bounds = body.getBoundingClientRect()
      if (bounds.height <= 0) return
      let bottom = window.innerHeight
      for (let parent = body.parentElement; parent; parent = parent.parentElement) {
        if (/auto|scroll/.test(getComputedStyle(parent).overflowY)) bottom = Math.min(bottom, parent.getBoundingClientRect().bottom)
      }
      depth = Math.max(depth, Math.min(100, Math.max(0, Math.round(100 * (bottom - bounds.top) / bounds.height))))
      if (depth >= 99 && !completed) { completed = true; metric('article_complete', 1, path) }
    }
    let frame = 0
    const scroll = () => { if (!frame) frame = requestAnimationFrame(() => { frame = 0; measure() }) }
    const flush = () => {
      if (activeSince !== null) { visibleMs += performance.now() - activeSince; activeSince = null }
      if (visibleMs > 0) { metric('article_visible_ms', visibleMs, path); visibleMs = 0 }
      if (depth > reportedDepth && (depth || document.getElementById('post-body'))) {
        metric('article_depth_pct', depth, path); reportedDepth = depth
      }
    }
    const visibility = () => { if (document.hidden) flush(); else scroll() }
    const observer = new MutationObserver(() => { if (document.getElementById('post-body')) { scroll(); observer.disconnect() } })
    if (!document.getElementById('post-body')) observer.observe(document.body, { childList: true, subtree: true })
    scroll()
    document.addEventListener('scroll', scroll, { capture: true, passive: true })
    document.addEventListener('visibilitychange', visibility)
    window.addEventListener('pagehide', flush)
    window.addEventListener('resize', scroll)
    return () => {
      cancelAnimationFrame(frame); observer.disconnect(); flush()
      document.removeEventListener('scroll', scroll, true)
      document.removeEventListener('visibilitychange', visibility)
      window.removeEventListener('pagehide', flush)
      window.removeEventListener('resize', scroll)
    }
  }, [path])

  return null
}
