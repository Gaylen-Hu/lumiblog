'use client'

import { useCallback, useMemo, useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import RoomImprint from './RoomImprint'
import skin from './reading-box.module.css'

export type ReadingCard = { slug: string; title: string }
const keyFor = (locale: string) => 'lumi-reading-box-v1:' + locale
const changed = 'study:reading-box'
const sessionCopies = new Map<string, string>()
const serverSnapshot = () => '[]'

function snapshot(key: string) {
  if (sessionCopies.has(key)) return sessionCopies.get(key)!
  try { return localStorage.getItem(key) || '[]' } catch { return '[]' }
}
function unpack(raw: string): ReadingCard[] {
  try {
    const data: unknown = JSON.parse(raw)
    return Array.isArray(data) ? data.filter(card => card && typeof card.slug === 'string' && card.slug && typeof card.title === 'string' && card.title) : []
  } catch { return [] }
}
function subscribe(notify: () => void) {
  window.addEventListener('storage',notify); window.addEventListener(changed,notify)
  return () => { window.removeEventListener('storage',notify); window.removeEventListener(changed,notify) }
}
export function useReadingBox(locale: string) {
  const key = keyFor(locale)
  const get = useCallback(() => snapshot(key),[key])
  const raw = useSyncExternalStore(subscribe,get,serverSnapshot)
  const cards = useMemo(() => unpack(raw),[raw])
  const put = useCallback((card: ReadingCard, keep: boolean) => {
    const previous = unpack(snapshot(key))
    const rest = previous.filter(other => other.slug !== card.slug)
    const next = JSON.stringify(keep ? [{ slug:card.slug, title:card.title },...rest] : rest)
    try { localStorage.setItem(key,next); sessionCopies.delete(key) }
    catch { sessionCopies.set(key,next) }
    window.dispatchEvent(new Event(changed))
  },[key])
  return { cards, put }
}

export function SaveReadingCard({ card, saved, en, onChange }: { card: ReadingCard; saved: boolean; en: boolean; onChange: (card: ReadingCard, keep: boolean) => void }) {
  const label = saved ? (en ? 'In reading box' : '已入匣') : (en ? 'Read later' : '放入待阅匣')
  return <button type="button" className={skin.save} aria-pressed={saved} aria-label={label + ' · ' + card.title}
    onClick={() => onChange(card,!saved)}><span aria-hidden="true">{saved ? '✓' : '＋'}</span> {label}</button>
}
export function ArticleReadingCard({ locale, slug, title }: ReadingCard & { locale: string }) {
  const { cards, put } = useReadingBox(locale)
  return <SaveReadingCard en={locale === 'en'} card={{slug,title}} saved={cards.some(card => card.slug === slug)} onChange={put} />
}
export function ReadingBoxContents({ cards, locale, siteName, choose, remove }: { siteName?: string; cards: ReadingCard[]; locale: string; choose: () => void; remove: (card: ReadingCard, keep: boolean) => void }) {
  const en = locale === 'en'
  const [announcement,setAnnouncement] = useState('')
  return <div className={skin.file}>
    <p className={skin.caption}>{cards.length ? (en ? 'Set aside for another afternoon.' : '上次收下的篇目，今天想读哪一篇？') : (en ? 'A place for the articles you want to return to. Pick one from the shelf and choose “Read later”.' : '看到想读的文章，就在书架目录里点「放入待阅匣」。下次来，它还在这里。')}</p>
    <p className={skin.count}>{siteName && <RoomImprint siteName={siteName} />}<span>{en ? 'ON FILE' : '匣内存笺'} <b>{String(cards.length).padStart(2,'0')}</b></span></p>
    {!!cards.length && <ol>{cards.map((card,i) => <li key={card.slug}>
      <Link prefetch={false} href={`/${locale}/posts/${encodeURIComponent(card.slug)}`}><small>{String(i+1).padStart(2,'0')}</small><strong>{card.title}</strong><span aria-hidden="true">↗</span></Link>
      <button type="button" aria-label={(en ? 'Remove · ' : '移出 · ') + card.title} onClick={e => {
        const row = e.currentTarget.closest('li')
        const next = row?.nextElementSibling || row?.previousElementSibling
        const focus = next?.querySelector<HTMLElement>('button') || row?.closest('div')?.querySelector<HTMLElement>('footer button')
        focus?.focus()
        remove(card,false); setAnnouncement((en ? 'Removed: ' : '已移出：') + card.title)
      }}>{en ? 'Remove' : '移出'}</button>
    </li>)}</ol>}
    <footer><button type="button" onClick={choose}>{en ? 'Choose from the shelf' : '去书架选文章'} →</button><small>{en ? 'Kept in this browser' : '保存在本浏览器'}</small></footer>
    <span aria-live="polite" className={skin.sr}>{announcement}</span>
  </div>
}
