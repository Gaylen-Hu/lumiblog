'use client'

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import Link from 'next/link'
import RoomAlbum from './RoomAlbum'
import RoomImprint from './RoomImprint'
import { useStudyNavigation } from './StudyNavigation'
import { openStudyObject, closeStudyObject } from './study-route'
import RoomJournal from './RoomJournal'
import Logo from '../Logo'
import RoomPortfolio from './RoomPortfolio'
import DeskNote from './DeskNote'
import ShelfCatalog, { type ShelfSelection } from './ShelfCatalog'
import { useReadingBox, ReadingBoxContents, SaveReadingCard } from './ReadingBox'
import boxSkin from './reading-box.module.css'
import { deskNotes } from './desk-notes'
import noteStyles from './desk-note.module.css'
import { bookmarkHref, readBookmark, type ReadingBookmark } from '@/lib/reading-bookmark'
import type { Post, Project } from '@/types'
import type { PublicColumnListItemDto } from '@/types/column'
import type { TimelineEntry } from '@/lib/api'
import { isDestination, itemLabels, labels, type ClockView, type Destination, type RoomDetail, type RoomItem } from './model'
import styles from './study.module.css'
import type { RoomQuality } from './room-quality'
import opening from './opening.module.css'
import { useRainAudio } from './environment/useRainAudio'
import { useEnvironment } from './environment/useEnvironment'
import RoomSettings from './RoomSettings'

export type StudyRoomProps = { locale: string; siteName: string; posts: Post[]; projects: Project[]; timeline: TimelineEntry[]; columns: PublicColumnListItemDto[]; name: string; bio: string }
type Controller = ReturnType<typeof import('./room-scene').createRoom>

export default function StudyRoom({ locale, siteName, posts, projects, timeline, columns, name, bio }: StudyRoomProps) {
  const environment = useEnvironment()
  const environmentRef = useRef(environment.state)
  environmentRef.current = environment.state
  const en = locale === 'en', text = labels[en ? 'en' : 'zh']
  const objects = itemLabels[en ? 'en' : 'zh']
  const notes = useMemo(() => deskNotes(timeline,en),[timeline,en])
  const readingBox = useReadingBox(locale)
  const categories = useMemo(() => Array.from(new Map(posts.filter(p => p.category).map(p => [p.category!.id,p.category!])).values()),[posts])
  const [bookmark,setBookmark] = useState<ReadingBookmark | null>(null)
  const ribbonLink = useRef<HTMLAnchorElement>(null)
  useEffect(() => {
    const refresh = () => setBookmark(readBookmark(locale))
    refresh()
    window.addEventListener('pageshow',refresh)
    window.addEventListener('focus',refresh)
    window.addEventListener('storage',refresh)
    return () => {
      window.removeEventListener('pageshow',refresh)
      window.removeEventListener('focus',refresh)
      window.removeEventListener('storage',refresh)
    }
  },[locale])
  const navigation = useStudyNavigation(locale)
  const { route } = navigation
  const isMagazine = route.mode === 'magazine'
  const navigationRef = useRef(navigation)
  useLayoutEffect(() => { navigationRef.current = navigation }, [navigation])
  const [cameraAtRest, setCameraAtRest] = useState(false)
  const host = useRef<HTMLDivElement>(null), controller = useRef<Controller | null>(null)
  const room = useRef<HTMLElement>(null)
  const shelfCue = useCallback((matches: string[], selection?: ShelfSelection, open?: boolean) => {
    controller.current?.setCatalogCue?.(matches, selection, open)
  }, [])
  const [portfolioTrip, setPortfolioTrip] = useState(false)
  const [clockView, setClockView] = useState<ClockView>('room')
  const clockViewRef = useRef<ClockView>('room')
  const clockBack = useRef<HTMLButtonElement>(null)
  const reflectClockView = useCallback((view: ClockView) => {
    clockViewRef.current = view
    setClockView(view)
  }, [])
  const inspectingClock = clockView !== 'room'
  const panel = useRef<HTMLDivElement>(null), previousFocus = useRef<HTMLElement | null>(null)
  const active = route.mode === 'object' ? route.target : null
  const [settledView, setSettled] = useState<Destination | null>(null)
  const settled = settledView === active ? settledView : null
  const [menu, setMenu] = useState(false), [settings, setSettings] = useState(false)
  const [ready, setReady] = useState(false), [failed, setFailed] = useState(false)
  const [recovering, setRecovering] = useState(false)
  const recoveries = useRef(0)
  const [quality, setQuality] = useState<RoomQuality>('auto')
  const qualityRef = useRef<RoomQuality>('auto')
  const [lightQuality, setLightQuality] = useState(false)
  const [simple, setSimple] = useState(false), [motion, setMotion] = useState(true)
  const [sound, setSound] = useState(false), [retry, setRetry] = useState(0)
  const rainAudio = useRainAudio(environment.state.weather, sound)
  const [, setNight] = useState(false)
  const [lampOn, setLampOn] = useState(false)
  const [curtainsDrawn, setCurtainsDrawn] = useState(false)
  const [hover, setHover] = useState<RoomItem | null>(null)
  const category = categories.find(c => c.id === route.category)?.id || ''
  const [hoveredColumn, setHoveredColumn] = useState<string>()
  const selectedColumn = route.column
  const [detail, setDetail] = useState<RoomDetail | null>(null)
  const [notice, setNotice] = useState<{ text: string } | null>(null)
  const [teaIndex, setTeaIndex] = useState(-1)
  const activeRef = useRef(active), motionRef = useRef(motion)
  useLayoutEffect(() => { activeRef.current = active }, [active])
  const pickRef = useRef<(item: RoomItem, columnSlug?: string) => void>(() => {})
  const audio = useRef<AudioContext | null>(null)
  const close = useCallback(() => {
    if (navigationRef.current.catalogPath) { window.history.back(); return }
    if (navigationRef.current.route.mode === 'object') closeStudyObject(locale)
    setMenu(false); setSettings(false); setDetail(null)
  }, [locale])
  const rememberFocus = useCallback(() => {
    const focused = document.activeElement as HTMLElement | null
    previousFocus.current = focused && focused !== document.body && !focused.closest('[role="dialog"]')
      ? focused : document.querySelector<HTMLElement>('[data-room-menu]')
  }, [])
  const choose = useCallback((d: Destination, columnSlug?: string) => {
    if (clockViewRef.current !== 'room') return
    rememberFocus()
    setDetail(null); setHover(null); setNotice(null)
    setMenu(false); setSettings(false)
    openStudyObject(locale, d, columnSlug)
  }, [rememberFocus, locale])
  const explore = useCallback((item: RoomItem, columnSlug?: string) => {
    if (clockViewRef.current !== 'room' || activeRef.current) return
    setHover(null); setNotice(null)
    if (isDestination(item)) { choose(item, columnSlug); return }
    if (item === 'bookmark') {
      if (ribbonLink.current) ribbonLink.current.click()
      else choose('bookshelf')
      return
    }
    rememberFocus()
    if (item === 'lamp') {
      controller.current?.toggleLamp()
    } else if (item === 'curtains') {
      const drawn = controller.current?.toggleCurtains()
      if (drawn !== undefined) setCurtainsDrawn(drawn)
    } else if (item === 'clock') {
      controller.current?.inspectClock()
    } else {
      if (item === 'tea' && posts.length) setTeaIndex(i => (i + 1) % posts.length)
      setDetail(item)
    }
  }, [choose, posts.length, rememberFocus])
  useEffect(() => { pickRef.current = explore }, [explore])
  useEffect(() => {
    if (!notice) return
    const id = window.setTimeout(() => setNotice(null), 3800)
    return () => window.clearTimeout(id)
  }, [notice])
  const soundRef = useRef(false)
  const playing = useRef<AudioBufferSourceNode | null>(null)
  useEffect(() => { soundRef.current = sound }, [sound])
  const revealSound = useCallback((kind: 'diary' | 'bookshelf') => {
    const ctx = audio.current
    if (!soundRef.current || !ctx || ctx.state !== 'running') return
    playing.current?.stop(); playing.current = null
    const duration = kind === 'diary' ? .22 : .16
    const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * duration), ctx.sampleRate)
    const samples = buffer.getChannelData(0)
    for (let i = 0; i < samples.length; i++)
      samples[i] = (Math.random()*2-1) * Math.sin(i / samples.length * Math.PI) * .035
    const source = ctx.createBufferSource(), filter = ctx.createBiquadFilter()
    source.buffer = buffer; filter.type = 'bandpass'; filter.frequency.value = kind === 'diary' ? 1850 : 670
    source.connect(filter); filter.connect(ctx.destination); playing.current = source
    source.onended = () => { source.disconnect(); filter.disconnect(); if (playing.current === source) playing.current = null }
    source.start()
  }, [])
  const soundKey = useRef<string | null>(null)
  const revealNavigationSound = useCallback((kind: 'diary' | 'bookshelf') => {
    const key = navigationRef.current.route.key
    if (soundKey.current === key) return
    soundKey.current = key
    revealSound(kind)
  }, [revealSound])
  useEffect(() => {
    try {
      setSimple(localStorage.getItem('study-simple') === 'true')
      setMotion(localStorage.getItem('study-motion') !== 'false')
      qualityRef.current = localStorage.getItem('study-quality') === 'light' ? 'light' : 'auto'
      setQuality(qualityRef.current)
    } catch { /* Storage is optional. */ }
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => {
      let preferred = true
      try { preferred = localStorage.getItem('study-motion') !== 'false' } catch { /* optional */ }
      setMotion(preferred && !media.matches)
    }
    update(); media.addEventListener('change', update)
    return () => {
      media.removeEventListener('change', update)
      const ctx = audio.current; audio.current = null
      void ctx?.close().catch(() => {})
    }
  }, [])
  useEffect(() => {
    const silence = () => {
      if (!document.hidden) { if (soundRef.current) void audio.current?.resume().catch(() => {}); return }
      playing.current?.stop(); playing.current = null
      void audio.current?.suspend().catch(() => {})
    }
    document.addEventListener('visibilitychange', silence)
    return () => document.removeEventListener('visibilitychange', silence)
  }, [])
  useEffect(() => {
    if (playing.current) { playing.current.stop(); playing.current = null }
    setMenu(false); setSettings(false); setDetail(null); setHover(null); setNotice(null)
    setSettled(null); setCameraAtRest(false)
    if (simple || failed) {
      setPortfolioTrip(false); setSettled(activeRef.current); setCameraAtRest(true)
      navigationRef.current.cameraSettled(route.key)
    } else {
      if (!controller.current) setPortfolioTrip(false)
      else if (activeRef.current === 'computer') setPortfolioTrip(true)
      controller.current?.setPaused(false)
      controller.current?.setTarget(route.target, route.column)
    }
    if (route.mode === 'magazine') revealNavigationSound(route.target === 'diary' ? 'diary' : 'bookshelf')
  }, [route.key, route.target, route.column, route.mode, simple, failed, revealNavigationSound])
  useEffect(() => {
    motionRef.current = motion; controller.current?.setMotion(motion)

  }, [motion])
  useEffect(() => {
    if (simple || !host.current) return
    let cancelled = false, timedOut = false
    const fail = () => { if (!cancelled && !timedOut) { timedOut = true; window.clearTimeout(timeout); setRecovering(false); reflectClockView('room'); setFailed(true); setReady(false); setSettled(activeRef.current); controller.current?.dispose(); controller.current = null } }
    const timeout = window.setTimeout(fail, 15000)
    import('./room-scene').then(({ createRoom }) => {
      if (cancelled || timedOut || !host.current) return
      controller.current = createRoom(host.current, {
        columns, categories, seriesLabel: en ? 'SERIES' : '专栏', projects, en, siteName, note: notes[0],
        onReady: () => { if (cancelled || timedOut) return; window.clearTimeout(timeout); setReady(true); setCurtainsDrawn(false); setFailed(false); setRecovering(false) },
        onContextLost: () => {
          if (cancelled || timedOut) return
          if (recoveries.current >= 1) { fail(); return }
          recoveries.current++
          timedOut = true // Invalidate any late callbacks from this renderer generation.
          window.clearTimeout(timeout); setReady(false); setRecovering(true); reflectClockView('room')
          controller.current?.dispose(); controller.current = null
          setRetry(value => value + 1)
        },
        onQuality: setLightQuality,
        onError: fail, onPick: (item, slug) => pickRef.current(item, slug),
        onHover: (item, slug) => { setHover(item); setHoveredColumn(slug) },
        onReveal: revealNavigationSound,
        onClockView: reflectClockView,
        onNight: setNight, onLamp: setLampOn,
        onShelfFrame: (x, y) => {
          room.current?.style.setProperty('--rail-x', x + '%')
          room.current?.style.setProperty('--rail-y', y + '%')
        },
        onPortfolioFrame: (ink, scale) => {
          room.current?.style.setProperty('--folio-ink', String(ink))
          room.current?.style.setProperty('--folio-scale', String(scale))
        },
        onSettled: d => {
          const { route: current, cameraSettled } = navigationRef.current
          if (cancelled || d !== current.target) return
          setSettled(current.mode === 'object' ? d : null)
          setPortfolioTrip(current.mode !== 'magazine' && d === 'computer')
          setCameraAtRest(true)
          // A second article may share the same camera target; React can batch
          // false → true into no state change. Pause here as well as in the effect.
          if (current.mode === 'magazine') controller.current?.setPaused(true)
          cameraSettled(current.key)
        },
      })
      controller.current.setEnvironment?.(environmentRef.current)
      controller.current.setMotion(motionRef.current)
      controller.current.setQuality?.(qualityRef.current)
      const current = navigationRef.current.route
      if (current.mode === 'object' && current.target === 'computer') setPortfolioTrip(true)
      controller.current.setTarget(current.target, current.column)
    }).catch(fail)
    return () => { cancelled = true; window.clearTimeout(timeout); controller.current?.dispose(); controller.current = null; reflectClockView('room'); setReady(false) }
  }, [simple, retry, revealNavigationSound, columns, projects, en, siteName, reflectClockView, notes, categories])
  const { phase, season, weather, preset } = environment.state
  const solarMinute = environment.time.hour * 60 + environment.time.minute
  useEffect(() => { controller.current?.setEnvironment?.(environmentRef.current) }, [phase, season, weather, preset, solarMinute, environment.state.intensity, environment.state.windSpeedMps, environment.state.cloudCover, environment.state.timezone, environment.state.clockOffsetMs, ready])
  const modal = !isMagazine && (!!settled || menu || settings || !!detail)
  useEffect(() => { controller.current?.setWindowPreview?.(modal && settings) }, [modal, settings, ready])
  useEffect(() => { controller.current?.setBoxCount?.(readingBox.cards.length) },[readingBox.cards.length,ready])
  useEffect(() => { controller.current?.setPaused((modal && !settings) || (isMagazine && cameraAtRest)) }, [modal, settings, isMagazine, cameraAtRest, ready])
  useEffect(() => {
    if (!inspectingClock) return
    clockBack.current?.focus({preventScroll:true})
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return
      event.preventDefault()
      controller.current?.leaveClock()
    }
    window.addEventListener('keydown', escape)
    return () => window.removeEventListener('keydown', escape)
  }, [inspectingClock])
  useEffect(() => {
    if (isMagazine) return
    if (!modal) { if (!portfolioTrip && !inspectingClock) previousFocus.current?.focus(); return }
    const dialog = panel.current
    const first = dialog?.querySelector<HTMLElement>('button, a, input, [tabindex="0"]'); first?.focus()
    function keys(event: KeyboardEvent) {
      if (event.defaultPrevented || event.isComposing || event.keyCode === 229 || dialog?.closest('[inert]')) return
      if (Array.from(document.querySelectorAll('[aria-modal="true"]')).some(other => other !== dialog && !other.closest('[inert]'))) return
      if (event.key === 'Escape') { event.preventDefault(); close() }
      if (event.key !== 'Tab' || !dialog) return
      const items = Array.from(dialog.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input, textarea, select, [tabindex="0"]')).filter(item => !item.closest('[inert]'))
      const first = items[0], last = items[items.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
    }
    window.addEventListener('keydown', keys); return () => window.removeEventListener('keydown', keys)
  }, [modal, settled, menu, settings, close, portfolioTrip, inspectingClock, isMagazine])
  useEffect(() => {
    if (!active || settled) return
    function escape(event: KeyboardEvent) { if (event.key === 'Escape' && !event.defaultPrevented) { event.preventDefault(); close() } }
    window.addEventListener('keydown', escape); return () => window.removeEventListener('keydown', escape)
  }, [active, settled, close])
  function toggleSimple() {
    setNotice(null); setHover(null)
    const next = !simple; setSimple(next); setSettled(active)
    try { localStorage.setItem('study-simple', String(next)) } catch { /* optional */ }
  }
  function toggleSound() {
    if (sound) { soundRef.current = false; setSound(false); playing.current?.stop(); playing.current = null; void audio.current?.suspend().catch(() => {}); return }
    try { audio.current ||= new AudioContext(); const ctx = audio.current; void ctx.resume().then(() => { soundRef.current = ctx.state === 'running' && !document.hidden; setSound(soundRef.current) }).catch(() => setSound(false)) }
    catch { setSound(false) }
  }
  function chooseQuality(value: RoomQuality) {
    qualityRef.current = value; setQuality(value)
    controller.current?.setQuality?.(value)
    try { localStorage.setItem('study-quality', value) } catch { /* optional */ }
  }
  const links = [
    ['posts', en ? 'Writing' : '文章'], ['timeline', en ? 'Life' : '日常'],
    ['projects', en ? 'Projects' : '作品'], ['about', en ? 'About' : '关于'],
    ['columns', en ? 'Collections' : '专栏'], ['links', en ? 'Friends' : '朋友'],
  ]
  const filteredPosts = category ? posts.filter(p => p.category?.id === category) : posts
  const pickedColumn = selectedColumn ? columns.find(column => column.slug === selectedColumn) : undefined
  const shelfColumns = pickedColumn ? [pickedColumn, ...columns.filter(column => column !== pickedColumn)] : columns
  const hoveredTitle = hoveredColumn && columns.find(column => column.slug === hoveredColumn)?.title
  const noContent = en ? 'There is nothing here yet. You can still explore the full page below.' : '这里暂时没有内容，或内容服务暂不可用。你仍可以访问下方完整页面。'
  const panelTitle = settled === 'drawer' ? (en ? 'Inside the desk drawer' : '抽屉里的收藏')
    : settled ? text[settled].split(' · ')[1] : detail ? (en ? 'A tea-break read' : '茶歇，读一篇')
    : menu ? (en ? 'Where would you like to go?' : '想去哪里看看？') : (en ? 'Make yourself comfortable' : '让自己舒服一点')
  const imprints: Record<Destination, string> = {
    bookshelf: 'THE READING ROOM', diary: 'A JOURNAL OF ORDINARY DAYS', computer: 'WORKSPACE',
    columns: 'COLLECTED EDITIONS', album: 'MOMENTS, KEPT ON PAPER', portrait: 'A NOTE FROM THE HOST', drawer: 'LITTLE THINGS TO KEEP', readingBox: 'PERSONAL READING FILE',
  }
  const openingWords: Record<Destination, string> = en ? {
    bookshelf: 'Approaching the bookshelf', columns: 'Choosing an edition', diary: 'Unfolding the journal',
    computer: 'Opening the portfolio', album: 'Opening the photograph folio', portrait: 'Turning over a postcard', drawer: 'Opening the drawer', readingBox: 'Lifting the lid',
  } : {
    bookshelf: '走近书架', columns: '取下一本专栏', diary: '翻开这本日记',
    computer: '走近作品集', album: '展开收藏的照片', portrait: '翻到相片背面', drawer: '正在拉开抽屉', readingBox: '揭开待阅匣',
  }
  const showPortfolio = !isMagazine && (active === 'computer' || settled === 'computer' || portfolioTrip)
  const resumeTitle = en ? 'Continue reading' : '接着读'
  const ribbonLabel = bookmark ? `${resumeTitle} · ${bookmark.title}` : (en ? 'Reading ribbon · Choose a book' : '书签 · 选一篇开始读')
  const busy = isMagazine || modal || !!active || portfolioTrip || inspectingClock
  return <main className={`${styles.study} ${ready && !simple ? styles.live : ''}`} ref={room} data-magazine={isMagazine || undefined} data-portfolio={showPortfolio || undefined} data-busy={busy || undefined} data-motion={motion ? 'full' : 'reduced'}>
    <div className={styles.canvas} ref={host} />
    <div className={styles.vignette} aria-hidden="true" />
    <div className={styles.shell} inert={busy || undefined}>
      <header className={styles.header}>
        <Link prefetch={false} className={styles.brand} href={`/${locale}`} aria-label={siteName}><Logo height={28} /><strong>{siteName}<span className="text-blue-500">.</span></strong></Link>
        <div className={styles.actions}>
          <button onClick={() => { previousFocus.current = document.activeElement as HTMLElement; setSettings(true) }} aria-label={en ? 'Settings' : '环境设置'}>☷</button>
          <button data-room-menu onClick={() => { previousFocus.current = document.activeElement as HTMLElement; setMenu(true) }}>☰ <span>{en ? 'Explore' : '导航'}</span></button>
        </div>
      </header>
      <section className={styles.welcome} aria-label={en ? 'Welcome' : '欢迎来到书房'}>
        <span className={styles.eyebrow}>{en ? 'MAKE YOURSELF AT HOME' : '欢迎，随便坐坐'}</span>
        <h1>{en ? 'A quiet place for' : '把日子写下来，'}<br /><em>{en ? 'thoughts & little things.' : '也把想法留下来。'}</em></h1>
        <p>{en ? 'Writing on the shelf. Life on the desk. A little room to explore at your own pace.' : '书架里放着文章，桌上留着日常。慢慢看看，也许会有一些小发现。'}</p>
        <nav className={styles.fallbackLinks} aria-label={en ? 'Content navigation' : '内容导航'}>{links.map(([url, label]) => <Link prefetch={false} key={url} href={`/${locale}/${url}`}>{label} ↗</Link>)}</nav>
        {!ready && !failed && !simple && <p role="status" className={styles.loading}><i />{recovering ? (en ? 'Restoring the study… Reading stays available.' : '正在恢复书房… 内容仍可正常浏览') : (en ? 'Opening the study… Content links are ready.' : '正在打开书房… 文字入口已可使用')}</p>}
        {failed && <div role="status" className={styles.failure}>{en ? 'The 3D room could not load. Your reading links are still here.' : '3D 书房暂未打开，内容仍可正常浏览。'} <button onClick={() => { recoveries.current = 0; setFailed(false); setRetry(v => v + 1) }}>{en ? 'Try again' : '重试'}</button></div>}
        {simple && <button className={styles.enter} onClick={toggleSimple}>{en ? 'Enter the 3D study' : '进入 3D 书房'} <span>→</span></button>}
        <div className={styles.staticLatest}>{posts.slice(0, 3).map(post => <Link prefetch={false} href={`/${locale}/posts/${encodeURIComponent(post.slug)}`} key={post.id}>{post.title} <span>↗</span></Link>)}</div>
      </section>
      <footer className={styles.footer}>
        <div className={styles.footerActions}><button onClick={toggleSimple}>{simple ? (en ? '3D mode' : '3D 模式') : (en ? 'Simple view' : '简洁模式')}</button><button onClick={toggleSound} aria-pressed={sound} aria-label={sound ? (en ? 'Mute' : '关闭声音') : (en ? 'Enable sound' : '开启声音')}>{sound ? '♫' : '♪'}<span>{sound ? (en ? 'On' : '开') : (en ? 'Off' : '关')}</span></button></div>
      </footer>
      <nav className={styles.keyboardNav} aria-label={en ? 'Room objects' : '房间物件'}>{Object.entries(text).map(([key, value]) => <button key={key} onClick={() => choose(key as Destination)}>{value}</button>)}
        {ready && !simple && <button onClick={() => explore('clock')}>{en ? 'Wall clock' : '墙上挂钟'}</button>}
        {ready && !simple && <button onClick={() => explore('lamp')} aria-pressed={lampOn}>{en ? 'Reading lamp' : '阅读灯'}</button>}
        {ready && !simple && <button onClick={() => explore('curtains')} aria-pressed={curtainsDrawn}>{objects.curtains}</button>}
        <button onClick={() => explore('note')}>{objects.note}</button>
        {bookmark ? <Link className={noteStyles.keyboardRibbon} ref={ribbonLink} prefetch={false} href={bookmarkHref(locale,bookmark)}>{ribbonLabel}</Link>
          : <button onClick={() => explore('bookmark')}>{ribbonLabel}</button>}
      </nav>
      {hover === 'bookshelf' && hoveredColumn && !active && <span className={styles.hoverHint}>{categories.find(c => c.id === hoveredColumn)?.name}</span>}
      {hover && !['bookshelf','diary','computer','clock'].includes(hover) && !notice && !active && <span className={styles.hoverHint}>{hover === 'columns' && hoveredTitle ? (en ? 'Series · ' : '专栏 · ') + hoveredTitle
        : hover === 'bookmark' ? ribbonLabel : objects[hover]}</span>}
      {ready && !simple && <div role="status" className={notice && !active ? styles.objectNotice : undefined}>{notice && !active ? notice.text : ''}</div>}
    </div>
    {inspectingClock && <button className={`${styles.cancel} ${styles.clockBack}`} ref={clockBack} disabled={clockView === 'returning'} onClick={() => controller.current?.leaveClock()}>
      <span aria-hidden="true">← </span>{en ? 'Back to the study' : '返回书房'}
    </button>}
    {active && !settled && <><button className={styles.cancel} onClick={close}>{en ? '← Back to the room' : '← 返回书房'}</button>
      <span role="status" className={active === 'computer' ? styles.visuallyHidden : styles.objectNotice}>{openingWords[active]}…</span></>}
    {showPortfolio && <RoomPortfolio siteName={siteName} projects={projects} locale={locale} open={settled === 'computer'}
      motion={motion} onClose={close} panelRef={panel} />}
    {detail === 'note' && <div className={`${styles.overlay} ${noteStyles.stage}`}>
      <div className={noteStyles.paper} role="dialog" aria-modal="true" aria-labelledby="desk-note-title" ref={panel} data-room-scroll>
        <button className={noteStyles.back} onClick={close} aria-label={en ? 'Put the note back' : '放回便签'}>↶</button>
        <DeskNote notes={notes} locale={locale} siteName={siteName} />
      </div>
    </div>}
    {settled === 'bookshelf' && <ShelfCatalog locale={locale} posts={posts} path={navigation.catalogPath} motion={motion}
      sceneVisible={ready && !simple && !failed} panelRef={panel} onClose={close} onCue={shelfCue}>
      {bookmark && <Link className={noteStyles.slip} prefetch={false} href={bookmarkHref(locale,bookmark)}><small>{resumeTitle}</small>{bookmark.title} ↗</Link>}
      {!!categories.length && <div className={styles.categories}><button aria-pressed={!category} onClick={() => openStudyObject(locale,'bookshelf')}>{en ? 'All' : '全部'}</button>{categories.map(c => <button key={c.id} aria-pressed={category === c.id} onClick={() => openStudyObject(locale,'bookshelf',c.id)}>{c.name}</button>)}</div>}
      <div className={styles.entries}>{filteredPosts.map((post, i) => (
        <div key={post.id} className={boxSkin.catalogRow}>
          <Link prefetch={false} className={styles.entry} href={`/${locale}/posts/${encodeURIComponent(post.slug)}`}>
            <span className={styles.entryNumber}>{String(i + 1).padStart(2, '0')}</span>
            <div><small>{post.category?.name || (en ? 'WRITING' : '随笔')} · {post.publishedAt?.slice(0, 10)}</small>
              <h3>{post.title}</h3>{post.excerpt && <p>{post.excerpt}</p>}
            </div>
            <span className={boxSkin.pageCorner} aria-hidden="true" />
          </Link>
          <SaveReadingCard card={post} en={en} saved={readingBox.cards.some(card => card.slug === post.slug)} onChange={readingBox.put} />
        </div>
      ))}</div>
      {!filteredPosts.length && <p className={styles.empty}>{noContent}</p>}<Link prefetch={false} className={styles.more} href={`/${locale}/posts`}>{en ? 'All writing' : '查看全部文章'} →</Link><Link prefetch={false} className={styles.more} href={`/${locale}/columns`}>{en ? 'Browse collections' : '按专栏阅读'} →</Link>
    </ShelfCatalog>}
    {modal && settings && <RoomSettings en={en} panel={panel} close={close}
      environment={environment} rainAudio={rainAudio} sound={sound} toggleSound={toggleSound}
      motion={motion} toggleMotion={() => {
        const next = !motion
        try { localStorage.setItem('study-motion', String(next)) } catch { /* optional */ }
        setMotion(next && !window.matchMedia('(prefers-reduced-motion: reduce)').matches)
      }}
      simple={simple} toggleSimple={toggleSimple} quality={quality} chooseQuality={chooseQuality}
      lightQuality={lightQuality} resetLamp={() => controller.current?.resetLamp?.()} />}
    {modal && !settings && detail !== 'note' && settled !== 'bookshelf' && settled !== 'computer' && <div className={`${styles.overlay} ${settled === 'readingBox' ? boxSkin.stage : opening.stage}`} data-object={settled || undefined} data-motion={motion ? 'full' : 'reduced'}>
      <div className={`${styles.panel} ${settled === 'readingBox' ? boxSkin.panel : opening.surface}`} data-object={settled || undefined} role="dialog" aria-modal="true" aria-labelledby="room-panel-title" ref={panel}>
        <button className={styles.close} inert={!!navigation.catalogPath} onClick={close} aria-label={en ? 'Close and return' : '关闭并返回'}>×</button>
        <header className={opening.heading}>
          <span className={styles.eyebrow}>{settled ? imprints[settled] : menu ? 'MAKE YOURSELF AT HOME' : 'A SMALL PERSONAL COLLECTION'}</span>
          <h2 id="room-panel-title">{panelTitle}</h2>
          {settled === 'portrait' && <span className={opening.postmark}><RoomImprint siteName={siteName} /></span>}
        </header>
        <div className={opening.contents} inert={!!navigation.catalogPath} data-room-scroll>
        {settled === 'readingBox' && <ReadingBoxContents siteName={(!ready || simple) ? siteName : undefined} locale={locale} cards={readingBox.cards} remove={readingBox.put} choose={() => choose('bookshelf')} />}
        {settled === 'album' && <RoomAlbum siteName={siteName} timeline={timeline} locale={locale} motion={motion} />}
        {settled === 'drawer' && <nav className={opening.keepsakes}>
          <Link prefetch={false} href={`/${locale}/columns`}><small>01 / READ</small><strong>{en ? 'Collections' : '翻看专栏'}</strong><span>{en ? 'A few things worth keeping.' : '收在一起，慢慢读。'}</span><i aria-hidden="true">↗</i></Link>
          <Link prefetch={false} href={`/${locale}/links`}><small>02 / VISIT</small><strong>{en ? 'Friends' : '拜访朋友'}</strong><span>{en ? 'Other little corners of the web.' : '去朋友的小天地坐坐。'}</span><i aria-hidden="true">↗</i></Link>
        </nav>}
        {detail === 'tea' && <>{posts[teaIndex] && <Link prefetch={false} className={styles.entry} href={`/${locale}/posts/${encodeURIComponent(posts[teaIndex].slug)}`}><div><h3>{posts[teaIndex].title}</h3><p>{posts[teaIndex].excerpt}</p></div><span>↗</span></Link>}<Link prefetch={false} className={styles.more} href={`/${locale}/posts`}>{en ? 'Browse the bookshelf' : '去书架选一篇'} →</Link></>}
        {menu && <><nav className={styles.menuGrid}>{Object.entries(text).map(([key, value], index) => <button key={key} onClick={() => choose(key as Destination)}><span>0{index + 1}</span>{value}<i>↗</i></button>)}</nav><nav className={styles.extraLinks}>{links.map(([url, label]) => <Link prefetch={false} key={url} onNavigate={url === 'posts' ? e => { e.preventDefault(); choose('bookshelf') } : undefined} href={url === 'posts' ? `/${locale}?room=bookshelf` : `/${locale}/${url}`}>{label} ↗</Link>)}<Link prefetch={false} href={`/${locale}/classic`}>{en ? 'Original home' : '原版首页'} ↗</Link><Link prefetch={false} href={`/${en ? 'zh' : 'en'}`}>{en ? '中文' : 'English'} ↗</Link></nav></>}
        {settled === 'columns' && <>
          <p className={styles.intro}>{en ? 'Choose a series to see its articles in reading order.' : '选一本专栏，按顺序翻看其中的文章。'}</p>
          <div className={opening.editions}>
            {shelfColumns.map(column => <Link prefetch={false} className={opening.edition} key={column.id}
              style={{ '--jacket': ['#365857', '#875845', '#4d5b72', '#6e6747', '#77535d'][columns.indexOf(column) % 5] } as CSSProperties}
              href={`/${locale}/columns/${encodeURIComponent(column.slug)}`}>
                <small>{column === pickedColumn && (en ? 'YOUR PICK · ' : '你选的这本 · ')}
                  {en ? `${column.articleCount} ${column.articleCount === 1 ? 'article' : 'articles'}` : `${column.articleCount} 篇文章`}</small>
                <h3>{column.title}</h3>
                {column.description && <p>{column.description}</p>}
                <span>{en ? 'Open this edition' : '翻开这本'} ↗</span>
            </Link>)}
          </div>
          {!columns.length && <p className={styles.empty}>{noContent}</p>}
          <Link prefetch={false} className={styles.more} href={`/${locale}/columns`}>{en ? 'All series' : '查看全部专栏'} →</Link>
        </>}
        {settled === 'diary' && <RoomJournal siteName={siteName} timeline={timeline} locale={locale} motion={motion} onTurn={() => revealSound('diary')} />}
        {settled === 'portrait' && <div className={opening.postcard}><div className={opening.portraitStamp} aria-hidden="true"><span>{name.slice(0, 1)}</span><small>FROM MY<br />LITTLE STUDY</small></div><div><h3>{name}</h3><p>{bio}</p><p>{en ? 'Thank you for stopping by this little corner of the internet.' : '很高兴你来到互联网里的这个小角落。希望你在这里，找到一点共鸣。'}</p><Link prefetch={false} href={`/${locale}/about`}>{en ? 'A little more about me' : '多了解我一点'} ↗</Link></div></div>}
        </div>
      </div>
    </div>}
  </main>
}
