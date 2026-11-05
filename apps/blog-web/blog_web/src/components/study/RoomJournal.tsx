'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent } from 'react'
import MediaPreview from '@/components/media/MediaPreview'
import { useMediaViewer } from '@/components/media/useMediaViewer'
import { mediaFormat, validMediaUrls } from '@/components/media/media'
import Link from 'next/link'
import type { TimelineEntry } from '@/lib/api'
import styles from './journal.module.css'

type Entry = { id: string; title: string; text: string; date: string; photos: string[] }
type Turn = { from: number; to: number; forward: boolean; size: number }
const TURN_MS = 840

function photoPlacement(id: string, src: string, index: number): CSSProperties {
  // Use the permanent entry and media identities so a remount never moves a print.
  let seed = 2166136261
  for (const character of id + src) seed = Math.imul(seed ^ character.charCodeAt(0), 16777619)
  const value = seed >>> 0
  const angle = (index % 2 ? 2 : -2) + ((value % 33) - 16) / 10
  return {
    '--photo-angle': `${angle}deg`,
    '--tape-angle': `${((value >>> 8) % 19) - 9}deg`,
    '--photo-offset': `${((value >>> 16) % 9) - 4}px`,
  } as CSSProperties
}

function JournalPhoto({ src, title, en, full = false }: { src: string; title: string; en: boolean; full?: boolean }) {
  return <span className={styles.imageWrap}>
    <MediaPreview src={src} title={title} en={en} eager={!full}
      sizes={full ? '(max-width: 700px) 80vw, 400px' : '(max-width: 700px) 70vw, 360px'} />
  </span>
}

function PagePreview({ entry, number, en }: { entry?: Entry; number: number; en: boolean }) {
  if (!entry) return <span className={`${styles.paper} ${styles.lastPage}`}>
    <span aria-hidden="true">❧</span><span>{en ? 'To be continued…' : '故事还在继续……'}</span>
  </span>
  return <span className={styles.paper} data-has-photos={entry.photos.length > 0}>
    <span className={styles.dateLine}><time>{entry.date}</time></span>
    <span className={styles.pageTitle}>{entry.title}</span>
    {entry.text && <span className={styles.excerpt}>{entry.text}</span>}
    {!!entry.photos.length && <span className={styles.photoGroup} data-count={Math.min(3, entry.photos.length)}>
      {entry.photos.slice(0, 3).map((src, index) => <span className={styles.pastedPhoto} key={src} style={photoPlacement(entry.id, src, index)}>
        <span className={styles.tape} aria-hidden="true" />
        <JournalPhoto src={src} title="" en={en} />
        <span className={styles.photoCaption}>{index === 2 && entry.photos.length > 3
          ? (en ? `+ ${entry.photos.length - 3} more` : `还有 ${entry.photos.length - 3} 张`)
          : `${entry.date} / ${String(index + 1).padStart(2, '0')}`}</span>
      </span>)}
    </span>}
    <span className={styles.pageFoot}><span>{String(number).padStart(2, '0')}</span><span>{en ? 'Read this day' : '读这一天'} ↗</span></span>
  </span>
}

export default function RoomJournal({ timeline, locale, motion = true, onTurn }: {
  timeline: TimelineEntry[]; locale: string; motion?: boolean; onTurn?: () => void
}) {
  const en = locale === 'en'
  const entries = useMemo<Entry[]>(() => timeline.map(entry => {
    const title = ((en ? entry.titleEn?.trim() : entry.titleZh?.trim()) || entry.titleZh?.trim() || entry.titleEn?.trim() || '')
    const body = ((en ? entry.descEn?.trim() : entry.descZh?.trim()) || entry.descZh?.trim() || entry.descEn?.trim() || '')
    const photos = validMediaUrls(entry.images)
    const duplicate = body.replace(/\s+/g, ' ') === title.replace(/\s+/g, ' ')
    const untitled = en ? 'Untitled entry' : '未题日记'
    const photoOnly = !body && photos.length > 0
    return {
      id: entry.id,
      title: title || (photoOnly ? (en ? 'Photo journal' : '影像手记') : untitled),
      text: !title && !body && !photos.length ? (en ? 'This page is still blank.' : '这一页尚未落笔。') : duplicate ? '' : body,
      date: entry.createdAt?.slice(0, 10) || entry.year,
      photos,
    }
  }), [timeline, en])
  const [page, setPage] = useState(0)
  const [narrow, setNarrow] = useState(false)
  const [turning, setTurning] = useState<Turn | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const turnLock = useRef(false)
  const pageButtons = useRef(new Map<string, HTMLButtonElement>())
  const restorePage = useRef<string | null>(null)
  const backButton = useRef<HTMLButtonElement>(null)
  const gesture = useRef<{ id: number; x: number; y: number } | null>(null)
  const suppressClick = useRef(false)
  const size = narrow ? 1 : 2
  const last = Math.max(0, Math.floor((entries.length - 1) / size) * size)
  const index = Math.min(Math.floor(page / size) * size, last)
  const selected = entries.find(entry => entry.id === selectedId)
  const isDetail = !!selected
  const items = useMemo(() => selected?.photos.map(src => ({
    src, title: selected.title, date: selected.date,
  })) || [], [selected])
  const media = useMediaViewer(items, en, motion)

  useEffect(() => {
    const media = window.matchMedia('(max-width: 700px)')
    const update = () => { setNarrow(media.matches); setTurning(null); turnLock.current = false }
    update(); media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])
  const finishTurn = useCallback(() => {
    if (!turning) return
    setPage(turning.to); setTurning(null); turnLock.current = false
  }, [turning])
  useEffect(() => {
    if (!turning) return
    // Fall back if animationend is missed, e.g. after a tab is hidden.
    const timer = window.setTimeout(finishTurn, motion ? TURN_MS + 100 : 0)
    return () => window.clearTimeout(timer)
  }, [turning, motion, finishTurn])
  const turn = useCallback((direction: number) => {
    if (turnLock.current || isDetail) return
    const next = Math.max(0, Math.min(last, index + direction * size))
    if (next === index) return
    onTurn?.()
    if (!motion || window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setPage(next); return }
    turnLock.current = true
    setTurning({ from:index, to:next, forward:direction > 0, size })
  }, [index, isDetail, last, motion, onTurn, size])

  useEffect(() => {
    if (isDetail || media.isOpen) return
    function onArrow(event: KeyboardEvent) {
      if (event.defaultPrevented || event.repeat || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
      if (event.target instanceof Element && event.target.closest('input, textarea, select, [contenteditable="true"]')) return
      event.preventDefault()
      turn(event.key === 'ArrowLeft' ? -1 : 1)
    }
    document.addEventListener('keydown', onArrow)
    return () => document.removeEventListener('keydown', onArrow)
  }, [isDetail, media.isOpen, turn])
  function read(entry: Entry) {
    if (turnLock.current) return
    restorePage.current = entry.id
    setSelectedId(entry.id)
  }
  const backToBook = useCallback(() => {
    if (selected) setPage(entries.indexOf(selected))
    setSelectedId(null)
  }, [selected, entries])
  useEffect(() => {
    if (isDetail) backButton.current?.focus({ preventScroll:true })
    else if (restorePage.current) {
      pageButtons.current.get(restorePage.current)?.focus({ preventScroll:true })
      restorePage.current = null
    }
  }, [isDetail])
  useEffect(() => {
    if (!isDetail || media.isOpen) return
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); backToBook() }
    }
    document.addEventListener('keydown', escape, true)
    return () => document.removeEventListener('keydown', escape, true)
  }, [isDetail, backToBook, media.isOpen])
  function endGesture(event: PointerEvent<HTMLDivElement>) {
    const start = gesture.current
    gesture.current = null
    if (!start || start.id !== event.pointerId) return
    const dx = event.clientX - start.x, dy = event.clientY - start.y
    if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.4) {
      suppressClick.current = true
      turn(dx < 0 ? 1 : -1)
    }
  }
  function preview(entryIndex: number, side: 'left' | 'right') {
    const entry = entries[entryIndex]
    return <article className={styles.pageSlot} data-side={side} key={side}>
      {entry ? <button className={styles.pageButton} onClick={() => read(entry)}
        ref={node => { if (node) pageButtons.current.set(entry.id, node); else pageButtons.current.delete(entry.id) }}
        aria-label={en ? `Read page ${entryIndex + 1}: ${entry.title}` : `阅读第 ${entryIndex + 1} 页：${entry.title}`}>
        <PagePreview entry={entry} number={entryIndex + 1} en={en} />
      </button> : <PagePreview number={entryIndex + 1} en={en} />}
    </article>
  }
  // The leaf's front is the outgoing page and its back is the incoming page.
  const left = turning && !turning.forward ? turning.to : index
  const right = turning?.forward ? turning.to + 1 : index + 1
  const front = turning ? turning.from + (turning.forward && turning.size === 2 ? 1 : 0) : 0
  const back = turning ? turning.to + (!turning.forward && turning.size === 2 ? 1 : 0) : 0

  return <div className={styles.journal} style={{ '--turn-duration': `${TURN_MS}ms` } as CSSProperties}>
    {isDetail ? <section className={styles.detailSheet} aria-label={en ? 'Journal entry' : '日记详情'}>
      <header className={styles.detailToolbar}>
        <button ref={backButton} onClick={backToBook}>← {en ? 'Back to the journal' : '返回日记'}</button>
        <span>{en ? 'PAGE' : '第'} {String(entries.indexOf(selected) + 1).padStart(2, '0')}{en ? '' : ' 页'}</span>
      </header>
      <div className={styles.detailScroll}>
        <article className={styles.fullEntry}>
          <time>{selected.date}</time><h3>{selected.title}</h3>{selected.text && <p>{selected.text}</p>}
        </article>
        {!!selected.photos.length && <div className={styles.detailPhotos}>
          {selected.photos.map((src, i) => <figure className={styles.detailPhoto} key={src} style={photoPlacement(selected.id, src, i)}>
            <span className={styles.tape} aria-hidden="true" />
            <button type="button" onClick={event => media.openAt(i, event.currentTarget)}
              aria-label={en ? `Open media ${i + 1} in viewer` : `预览第 ${i + 1} 项`}>
              <JournalPhoto src={src} title={`${selected.title} · ${i + 1}`} en={en} full />
              <span className={styles.photoCaption}>{String(i + 1).padStart(2, '0')} / {selected.photos.length}
                <span>{mediaFormat(src) ? (en ? 'Play' : '播放') : (en ? 'View original' : '查看原图')}</span>
              </span>
            </button>
          </figure>)}
        </div>}
      </div>
      {media.viewer}
    </section> : <>
      <div className={styles.book} data-narrow={narrow} aria-busy={!!turning}
        onPointerDown={event => {
          if (!event.isPrimary || event.button !== 0) { gesture.current = null; return }
          suppressClick.current = false
          gesture.current = {id:event.pointerId, x:event.clientX, y:event.clientY}
        }}
        onPointerUp={endGesture} onPointerCancel={() => { gesture.current = null; suppressClick.current = false }}
        onClickCapture={event => {
          if (suppressClick.current && event.detail > 0) { event.preventDefault(); event.stopPropagation() }
          suppressClick.current = false
        }}>
        <div className={styles.pages} inert={!!turning || undefined}>
          {entries.length ? <>{preview(narrow && turning ? turning.to : left, 'left')}{!narrow && preview(right, 'right')}</>
            : <p className={styles.empty}>{en ? 'No public entries yet. The journal is waiting for its first story.' : '还没有公开的日常，这本日记正等着新的故事。'}</p>}
        </div>
        {!narrow && <span className={styles.binding} aria-hidden="true" />}
        <span className={styles.ribbon} aria-hidden="true" />
        {turning && <div className={styles.turningLeaf} data-turning-leaf data-direction={turning.forward ? 'next' : 'previous'}
          aria-hidden="true" inert onAnimationEnd={event => { if (event.target === event.currentTarget) finishTurn() }}>
          <div className={styles.leafFront}><PagePreview entry={entries[front]} number={front + 1} en={en} /></div>
          <div className={styles.leafBack}><PagePreview entry={entries[back]} number={back + 1} en={en} /></div>
        </div>}
      </div>
      <footer className={styles.footer}>
        {!!entries.length && <nav className={styles.pageTurner} aria-label={en ? 'Journal pages' : '日记翻页'}>
          <button onClick={() => turn(-1)} aria-disabled={index === 0 || !!turning} aria-label={en ? 'Previous page' : '上一页日记'}>←</button>
          <span aria-live="polite">{en ? 'PAGE ' : '第 '}{String(index + 1).padStart(2, '0')}{!narrow && index + 1 < entries.length ? ` — ${String(index + 2).padStart(2, '0')}` : ''} / {String(entries.length).padStart(2, '0')}{en ? '' : ' 页'}</span>
          <button onClick={() => turn(1)} aria-disabled={index === last || !!turning} aria-label={en ? 'Next page' : '下一页日记'}>→</button>
        </nav>}
        <Link prefetch={false} className={styles.archive} href={`/${locale}/timeline`}>{en ? 'The full journal' : '全部日常'} ↗</Link>
      </footer>
    </>}
  </div>
}
