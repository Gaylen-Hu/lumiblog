'use client'

import dynamic from 'next/dynamic'
import { Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { StudyNavigationContext, useStudyLocation } from './StudyNavigation'
import { RoomRegistrationContext } from './StudyRoomEntry'
import type { StudyRoomProps } from './StudyRoom'
import { notifyStudyLocation, resolveStudyRoute, spatialReadingHref, stampStudyHistory, studyHistory } from './study-route'
import PaperLoading from './PaperLoading'
import './magazine.css'

const SpatialContent = dynamic(() => import('./SpatialContent'), { loading: () => <PaperLoading /> })
const PersistentRoom = dynamic(() => import('./StudyRoom'), { ssr: false })

function RouteObserver() {
  const pathname = usePathname(), search = useSearchParams()
  useEffect(() => { notifyStudyLocation() }, [pathname, search])
  return null
}

export default function StudyShell({ locale, children }: { locale: string; children: ReactNode }) {
  const pathname = usePathname(), router = useRouter()
  const route = useStudyLocation(locale, pathname)
  const home = `/${locale}`, en = locale === 'en'
  const [roomData, setRoomData] = useState<StudyRoomProps | null>(null)
  const register = useCallback((data: StudyRoomProps) => setRoomData(current => current ?? data), [])
  const catalogOrigin = route.spatial && route.readingPath?.startsWith(`${home}/posts/`) ? studyHistory()?.catalog : undefined
  const catalogRoute = catalogOrigin ? resolveStudyRoute(catalogOrigin, locale) : null
  const inCatalog = catalogRoute?.mode === 'object' && catalogRoute.target === 'bookshelf'
  const reading = route.mode === 'magazine' && !inCatalog
  const [cover, setCover] = useState({ reading, visible: reading })
  if (cover.reading !== reading) setCover({ reading, visible: true })
  const coverVisible = cover.visible
  const [settledKey, setSettledKey] = useState<string | null>(null)
  const content = useRef<HTMLDivElement>(null)
  const magazine = useRef<HTMLElement>(null)
  const returnFocus = useRef<HTMLElement | null>(null)
  const wasInCatalog = useRef(false)
  useLayoutEffect(() => {
    if (wasInCatalog.current && !inCatalog && route.mode === 'object' && returnFocus.current?.isConnected) {
      returnFocus.current.focus({ preventScroll:true })
    }
    wasInCatalog.current = inCatalog
  }, [inCatalog,route.mode])
  const focusedKey = useRef<string | null>(null)
  const currentKey = useRef(route.key)
  useLayoutEffect(() => { currentKey.current = route.key }, [route.key])
  const cameraSettled = useCallback((key: string) => {
    if (key === currentKey.current) setSettledKey(key)
  }, [])
  const phase = reading ? (roomData && settledKey !== route.key ? 'opening' : 'reading') : coverVisible ? 'closing' : 'room'

  useEffect(() => {
    if (reading || !coverVisible) return
    const delay = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 1100
    const timer = window.setTimeout(() => {
      setCover({ reading: false, visible: false })
      // An open drawer or other room object manages focus inside its own dialog.
      if (route.mode === 'object') return
      if (returnFocus.current?.isConnected && !returnFocus.current.closest('[inert]')) returnFocus.current.focus({ preventScroll: true })
      else document.querySelector<HTMLElement>('[data-room-menu]')?.focus({ preventScroll: true })
    }, delay)
    return () => window.clearTimeout(timer)
  }, [reading, coverVisible, route.mode])
  const focusContent = useCallback(() => {
    if (focusedKey.current === currentKey.current || content.current?.closest('[data-phase=opening]')) return
    const heading = content.current?.querySelector<HTMLElement>('h1')
    if (heading) {
      focusedKey.current = currentKey.current
      heading.tabIndex = -1; heading.focus({ preventScroll: true })
    }
  }, [])
  useEffect(() => { if (phase === 'reading') focusContent() }, [phase, route.key, focusContent])
  useEffect(() => {
    if (route.spatial) magazine.current?.querySelector<HTMLButtonElement>('.study-return')?.focus({ preventScroll: true })
  }, [route.spatial, route.key])

  const close = useCallback(() => {
    focusedKey.current = null
    if (route.spatial) {
      if (studyHistory()?.kind === 'magazine' && studyHistory()?.returnToRoom) window.history.back()
      else {
        window.history.replaceState({ ...window.history.state }, '', home)
        stampStudyHistory(undefined); notifyStudyLocation()
      }
    } else router.push(home, { scroll: false })
  }, [home, route.spatial, router])
  useEffect(() => {
    const keys = (event: KeyboardEvent) => {
      if (!reading || event.defaultPrevented || event.isComposing) return
      // Media viewers may live in a portal, outside the magazine DOM subtree.
      const nestedModal = Array.from(document.querySelectorAll<HTMLElement>('[aria-modal="true"]:not(.study-magazine)'))
        .some(element => !element.closest('[inert]'))
      if (nestedModal) return
      if (event.key === 'Escape') { event.preventDefault(); close(); return }
      if (event.key !== 'Tab' || !route.spatial) return
      const controls = Array.from(magazine.current?.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input, textarea, select, [tabindex="0"]') || [])
        .filter(element => !element.closest('[inert]') && element.getClientRects().length > 0)
      const first = controls[0], last = controls.at(-1)
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
    }
    window.addEventListener('keydown', keys)
    return () => window.removeEventListener('keydown', keys)
  }, [reading, close, route.spatial])

  function navigate(event: MouseEvent<HTMLDivElement>) {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    const anchor = (event.target as Element).closest<HTMLAnchorElement>('a[href]')
    if (!anchor || anchor.hasAttribute('download') || anchor.hasAttribute('data-study-native') || (anchor.target && anchor.target !== '_self')) return
    const raw = anchor.getAttribute('href') || ''
    if (raw.startsWith('#')) return
    const url = new URL(anchor.href, window.location.href)
    // Only the study performs shallow navigation. Direct canonical pages remain SSR routes.
    if (url.origin !== window.location.origin || window.location.pathname.replace(/\/$/, '') !== home) return
    if (url.pathname === home && !url.search && reading) { event.preventDefault(); close(); return }
    const href = spatialReadingHref(url.href, locale)
    if (!href) return
    event.preventDefault()
    if (!reading && !inCatalog) returnFocus.current = anchor
    focusedKey.current = null
    const previous = studyHistory()
    const opensFromCatalog = route.mode === 'object' && route.target === 'bookshelf' && url.pathname.startsWith(`${home}/posts/`)
    if (opensFromCatalog || inCatalog) {
      // Push the first leaf over its index. Following another article replaces
      // that leaf, so a single Back always finds the same shelf and category.
      const state = { ...window.history.state, __study: {kind:'magazine',returnToRoom:true,catalog:opensFromCatalog ? route.key : catalogOrigin,slip:previous?.slip} }
      if (opensFromCatalog) window.history.pushState(state,'',href)
      else window.history.replaceState(state,'',href)
      notifyStudyLocation()
      return
    }
    const replace = route.spatial || (route.mode === 'object' && previous?.returnToRoom === true)
    if (route.mode === 'object' && !replace) {
      window.history.replaceState({ ...window.history.state }, '', home)
      stampStudyHistory(undefined)
    }
    const state = { ...window.history.state, __study: { kind: 'magazine', returnToRoom: true } }
    // Never router.push here: the home RSC tree and Canvas keep their identities.
    if (replace) window.history.replaceState(state, '', href)
    else window.history.pushState(state, '', href)
    notifyStudyLocation()
    window.scrollTo({ top: 0, behavior: 'instant' })
  }

  const homeTree = pathname.replace(/\/$/, '') === home
  return <RoomRegistrationContext.Provider value={register}>
    <StudyNavigationContext.Provider value={{ route: inCatalog ? catalogRoute : route, cameraSettled, catalogPath: inCatalog ? route.readingPath : undefined }}>
      <div className="study-experience" data-view-state={route.viewState} data-phase={phase} onClickCapture={navigate}>
        <Suspense fallback={null}><RouteObserver /></Suspense>
        {roomData && <div className={`study-persistent ${reading ? 'study-defocused' : ''}`} inert={reading} aria-hidden={reading}>
          <PersistentRoom {...roomData} />
        </div>}
        {homeTree && <div hidden={!!roomData || reading}>{children}</div>}
        {(reading || coverVisible) && <section className="study-magazine" ref={magazine} data-phase={phase} data-direct={!roomData || undefined}
          role={route.spatial ? 'dialog' : undefined} aria-modal={route.spatial || undefined}
          aria-label={en ? 'Reading room' : '阅览室'} aria-hidden={!reading} inert={!reading}>
          {reading && <button className="study-return" onClick={close}>{en ? '← Return to study' : '← 回到书房大厅'}<kbd>Esc</kbd></button>}
          {reading && phase === 'opening' && <div className="study-turning"><PaperLoading locale={locale} /></div>}
          {reading && <div className="study-magazine-content" data-study-content ref={content} inert={phase === 'opening'} aria-hidden={phase === 'opening'}>
            {route.spatial ? <SpatialContent key={route.readingPath} path={route.readingPath!} locale={locale} onReady={focusContent} /> : children}
          </div>}
        </section>}
      </div>
    </StudyNavigationContext.Provider>
  </RoomRegistrationContext.Provider>
}
