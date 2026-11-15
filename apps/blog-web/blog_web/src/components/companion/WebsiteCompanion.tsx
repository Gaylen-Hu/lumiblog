'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { mountWebsiteCat } from './runtime/website-cat.js'
import { getRoomStage, subscribeRoomStage } from './room-stage'
import { websiteAssistant } from './website-assistant'
import { getWebsiteAgentConnection } from './website-agent-connection'
import styles from './website-companion.module.css'

type Companion = Awaited<ReturnType<typeof mountWebsiteCat>>
type Phase = 'idle' | 'loading' | 'ready' | 'error'
const visibilityKey = 'blog:companion:hidden'

function rememberHidden(hidden: boolean) {
  try { localStorage.setItem(visibilityKey, String(hidden)) } catch { /* Private browsing can disable storage. */ }
}

/** One small, lazy WebGL companion survives both shallow and canonical reading routes. */
export default function WebsiteCompanion({ locale, reading }: { locale: string; reading: boolean }) {
  const en = locale === 'en'
  const root = useRef<HTMLDivElement>(null), stage = useRef<HTMLDivElement>(null)
  const companion = useRef<Companion | null>(null)
  const readingRef = useRef(reading), hiddenRef = useRef(true)
  const suspendedRef = useRef(false), reducedRef = useRef(false), mobileRef = useRef(false)
  const [mounted, setMounted] = useState(false), [hidden, setHidden] = useState(true)
  const [requested, setRequested] = useState(false), [attempt, setAttempt] = useState(0)
  const [phase, setPhase] = useState<Phase>('idle'), [suspended, setSuspended] = useState(false)

  const reflectHidden = useCallback((value: boolean) => {
    hiddenRef.current = value
    setHidden(value)
    rememberHidden(value)
  }, [])

  const wake = useCallback(() => {
    reflectHidden(false)
    if (companion.current) { companion.current.setHidden(false); return }
    setPhase('loading'); setRequested(true); setAttempt(value => value + 1)
  }, [reflectHidden])

  useEffect(() => {
    readingRef.current = reading
    companion.current?.setRoomStage(reading ? null : getRoomStage())
    companion.current?.setReading(reading)
    return subscribeRoomStage(() => {
      companion.current?.setRoomStage(readingRef.current ? null : getRoomStage())
    })
  }, [reading])

  useEffect(() => {
    let cancelled = false, timer: number | undefined, idle: number | undefined
    const narrow = window.matchMedia('(max-width: 700px)')
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    mobileRef.current = narrow.matches
    reducedRef.current = motion.matches
    const reduced = () => {
      reducedRef.current = motion.matches
      companion.current?.setReducedMotion(motion.matches)
    }
    const clearScheduled = () => {
      if (timer !== undefined) window.clearTimeout(timer)
      if (idle !== undefined) window.cancelIdleCallback(idle)
      timer = idle = undefined
    }
    const resized = () => {
      mobileRef.current = narrow.matches
      if (!narrow.matches || companion.current) return
      // A resize before first load must not download a desktop pet on mobile.
      clearScheduled(); hiddenRef.current = true; setHidden(true)
      setRequested(false); setPhase('idle')
    }
    motion.addEventListener('change', reduced)
    narrow.addEventListener('change', resized)
    // The first render stays identical to SSR. Mobile never downloads the model
    // until its owner explicitly summons the cat, even after a previous visit.
    queueMicrotask(() => {
      if (cancelled) return
      let saved = false
      try { saved = localStorage.getItem(visibilityKey) === 'true' } catch { /* Optional preference. */ }
      const collapsed = narrow.matches || saved
      hiddenRef.current = collapsed; setHidden(collapsed); setMounted(true)
      if (collapsed) return
      const load = () => {
        if (cancelled || hiddenRef.current) return
        setPhase('loading'); setRequested(true)
      }
      if (typeof window.requestIdleCallback === 'function') idle = window.requestIdleCallback(load, { timeout: 2200 })
      else timer = window.setTimeout(load, 1200)
    })
    return () => {
      cancelled = true
      clearScheduled()
      motion.removeEventListener('change', reduced)
      narrow.removeEventListener('change', resized)
    }
  }, [])

  useEffect(() => {
    // A catalog article is a reading surface, not a blocking room dialog.
    // Other dialogs (settings, photos, forms) take priority over the pet.
    const refresh = () => {
      const blocking = Array.from(document.querySelectorAll<HTMLElement>('[aria-modal="true"], dialog[open]')).some(element => {
        if (element.closest('[data-companion-root]') || element.matches('.study-magazine')) return false
        if (element instanceof HTMLDialogElement && !element.open) return false
        if (element.closest('[hidden], [inert], [aria-hidden="true"]')) return false
        if (readingRef.current && Array.from(element.querySelectorAll('[data-article-scroll]'))
          .some(article => !article.closest('[hidden], [inert], [aria-hidden="true"]'))) return false
        return true
      })
      const value = document.hidden || blocking
      if (value === suspendedRef.current) return
      suspendedRef.current = value; setSuspended(value)
      companion.current?.setSuspended(value)
    }
    refresh()
    const observer = new MutationObserver(refresh)
    observer.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['aria-modal', 'hidden', 'inert', 'aria-hidden', 'data-open', 'open'] })
    document.addEventListener('visibilitychange', refresh)
    return () => { observer.disconnect(); document.removeEventListener('visibilitychange', refresh) }
  }, [reading])

  useEffect(() => {
    if (!requested || !stage.current) return
    const abort = new AbortController()
    let instance: Companion | undefined
    const container = stage.current
    const owner = root.current
    void import('./runtime/website-cat.js').then(async ({ mountWebsiteCat: mount }) => {
      if (abort.signal.aborted) return
      const loaded = await mount({
        container, ...getWebsiteAgentConnection(window.location.origin), quality: 'medium', mobile: mobileRef.current, bottomOffset: 76,
        locale, initialHidden: hiddenRef.current, signal: abort.signal, website: websiteAssistant,
        onVisibilityChange: (visible: boolean) => { if (!abort.signal.aborted) reflectHidden(!visible) },
        onChatOpenChange: (open: boolean) => {
          if (owner) owner.dataset.companionChatOpen = String(open && !abort.signal.aborted)
        },
      })
      if (abort.signal.aborted) { loaded.destroy(); return }
      instance = loaded; companion.current = loaded
      loaded.setReducedMotion(reducedRef.current)
      loaded.setRoomStage(readingRef.current ? null : getRoomStage())
      loaded.setReading(readingRef.current)
      loaded.setHidden(hiddenRef.current)
      loaded.setSuspended(suspendedRef.current)
      setPhase('ready')
    }).catch(() => { if (!abort.signal.aborted) setPhase('error') })
    return () => {
      abort.abort(); instance?.destroy()
      if (companion.current === instance) companion.current = null
      if (owner) owner.dataset.companionChatOpen = 'false'
    }
  }, [requested, attempt, locale, reflectHidden])

  function fold() {
    reflectHidden(true)
    companion.current?.setHidden(true)
  }

  if (!mounted) return null
  return <div ref={root} className={styles.root} data-companion-root data-companion-chat-open="false"
    data-reading={reading || undefined} hidden={suspended} inert={suspended || undefined}
    onKeyDown={event => {
      // Keep the light-DOM keyboard entry in the reader's focus loop. All
      // other pet shortcuts stay inside the pet, including its shadow chat.
      if (event.key === 'Tab' && (event.target as HTMLElement).hasAttribute('data-companion-keyboard-entry')) return
      event.stopPropagation()
    }}>
    {!hidden && phase === 'ready' && <button type="button" data-companion-keyboard-entry className={styles.keyboardEntry}
      onClick={() => companion.current?.openChat()}>{en ? 'Talk to Little Grey' : '和小灰说句话'}</button>}
    <div ref={stage} hidden={hidden} />
    {hidden && <button type="button" data-companion-keyboard-entry className={styles.summon} onClick={wake}
      aria-label={en ? 'Invite Little Grey' : '唤回小灰'} title={en ? 'Invite Little Grey' : '唤回小灰'}>
      <svg viewBox="0 0 24 24" aria-hidden="true"><ellipse cx="5.5" cy="9" rx="2.2" ry="2.9" transform="rotate(-25 5.5 9)"/><ellipse cx="10" cy="5.8" rx="2.1" ry="2.8"/><ellipse cx="15.2" cy="6.2" rx="2.1" ry="2.8" transform="rotate(12 15.2 6.2)"/><ellipse cx="19" cy="10" rx="2" ry="2.7" transform="rotate(28 19 10)"/><path d="M6.2 16.9c0-2.1 3.2-6.2 5.8-6.2s5.8 4.1 5.8 6.2c0 2-1.4 3-3.3 2.4a7.9 7.9 0 0 0-5 0c-1.9.6-3.3-.4-3.3-2.4Z"/></svg>
    </button>}
    {!hidden && phase === 'loading' && <div className={styles.notice}>
      <span role="status">{en ? 'Little Grey is on the way…' : '小灰正在过来…'}</span>
      <button type="button" onClick={fold}>{en ? 'Later' : '稍后再来'}</button>
    </div>}
    {!hidden && phase === 'error' && <div className={styles.notice}>
      <span role="status">{en ? 'Little Grey could not arrive just now.' : '小灰暂时没能过来。'}</span>
      <button type="button" onClick={wake}>{en ? 'Try again' : '再试一次'}</button>
      <button type="button" onClick={fold}>{en ? 'Hide' : '收起'}</button>
    </div>}
  </div>
}
