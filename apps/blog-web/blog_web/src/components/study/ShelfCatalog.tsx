'use client'

import Link from 'next/link'
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import type { PaginatedResponse, Post, SearchResult } from '@/types'
import CatalogLeaf from './CatalogLeaf'
import { stampStudyHistory, studyHistory } from './study-route'
import skin from './shelf-catalog.module.css'

type ResultPage = PaginatedResponse<SearchResult>
type Reply = { key: string; query: string; results?: ResultPage }
export type ShelfSelection = Pick<SearchResult, 'slug' | 'category'>
type Props = {
  locale: string; posts: Post[]; path?: string; motion: boolean; sceneVisible: boolean
  panelRef: RefObject<HTMLDivElement | null>; onClose: () => void; children: ReactNode
  onCue: (categories: string[], selection?: ShelfSelection, open?: boolean) => void
}

function excerpt(result: SearchResult, q: string) {
  const text = (result.highlight || result.excerpt || '')
    .replace(/<\/?mark>/gi, '').replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/(?:^|\s)#{1,6}\s+|(?:^|\s)>\s+|\*\*|~~|`/g, ' ').replace(/\s+/g, ' ').trim()
  const index = text.toLowerCase().indexOf(q.toLowerCase())
  if (index < 0) return text
  // Keep the first match visible even on a one-line mobile card.
  return <>{index > 12 ? '…' : ''}{text.slice(Math.max(0, index - 12), index)}<mark>{text.slice(index, index + q.length)}</mark>{text.slice(index + q.length)}</>
}

export default function ShelfCatalog({ locale, posts, path, motion, sceneVisible, panelRef, onClose, onCue, children }: Props) {
  const en = locale === 'en'
  const [saved] = useState(() => typeof window === 'undefined' ? undefined : studyHistory()?.slip)
  const restore = useRef(saved)
  const [value, setValue] = useState(saved?.query ?? '')
  const [composing, setComposing] = useState(false)
  const [page, setPage] = useState(saved?.page ?? 1)
  const [retry, setRetry] = useState(0)
  const [reply, setReply] = useState<Reply>()
  const [hovered, setHovered] = useState<string>()
  const [focused, setFocused] = useState<string>()
  const input = useRef<HTMLInputElement>(null)
  const list = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const viewport = window.visualViewport
    const stage = panelRef.current
    if (!viewport || !stage) return
    const fitKeyboard = () => {
      const inset = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop)
      stage.style.setProperty('--keyboard-inset', inset + 'px')
    }
    fitKeyboard()
    viewport.addEventListener('resize', fitKeyboard)
    viewport.addEventListener('scroll', fitKeyboard)
    return () => {
      viewport.removeEventListener('resize', fitKeyboard)
      viewport.removeEventListener('scroll', fitKeyboard)
    }
  }, [panelRef])
  const query = value.trim()
  const key = new URLSearchParams({ q: query, page: String(page), locale }).toString()
  const current = !composing && reply?.key === key ? reply : undefined
  const results = current?.results
  const pagination = reply?.query === query ? reply.results : undefined
  useEffect(() => {
    if (!query || composing) return
    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch('/api/study/search?' + key, { signal: controller.signal })
        if (!response.ok) throw new Error('Search failed')
        const data: ResultPage = await response.json()
        if (!controller.signal.aborted) setReply({ key, query, results: data })
      } catch {
        if (!controller.signal.aborted) setReply({ key, query })
      }
    }, 180)
    return () => { window.clearTimeout(timer); controller.abort() }
  }, [query, key, composing, retry])
  useLayoutEffect(() => {
    if (list.current) list.current.scrollTop = 0
  }, [key])
  useEffect(() => {
    const selection = path
      ? results?.data.find(hit => path.split('?')[0] === '/' + locale + '/posts/' + encodeURIComponent(hit.slug))
      : results?.data.find(hit => hit.slug === (hovered || focused))
    const categories = new Set(results?.data.map(hit => hit.category || (en ? 'Writing' : '随笔')))
    onCue([...categories], selection, !!path)
  }, [results, path, locale, hovered, focused, onCue, en])
  useEffect(() => () => onCue([]), [onCue])
  useLayoutEffect(() => {
    if (!results || path || !restore.current || !list.current) return
    list.current.scrollTop = restore.current.scroll
    const match = Array.from(list.current.querySelectorAll('a')).find(a => a.dataset.slug === restore.current?.slug)
    match?.focus({preventScroll:true})
    restore.current = undefined
  }, [results,path])

  function remember(slug: string) {
    const previous = studyHistory()
    stampStudyHistory({kind:'object',returnToRoom:previous?.returnToRoom ?? false,
      slip:{query:value,page,scroll:list.current?.scrollTop ?? 0,slug}})
  }

  function edit(next: string) {
    restore.current = undefined
    const previous = studyHistory()
    if (previous?.slip) stampStudyHistory({...previous,slip:undefined})
    setValue(next); setPage(1); setFocused(undefined); setHovered(undefined)
  }
  const pages = pagination ? Math.ceil(pagination.total / pagination.pageSize) : 0
  let status = ''
  if (query && !composing) {
    if (!current) status = en ? 'Looking through the catalog…' : '正在查阅目录…'
    else if (!results) status = en ? 'The catalog could not be reached.' : '暂时没能连上目录。'
    else if (!results.total) status = en ? 'No matching articles. Try another word.' : '没有找到这篇文章，换个词试试。'
    else status = en ? results.total + (results.total === 1 ? ' article' : ' articles') : '共 ' + results.total + ' 篇'
  }
  return <div ref={panelRef} className={skin.stage} role="dialog" aria-modal="true"
    aria-label={en ? 'Bookshelf catalog' : '书架文章目录'} data-live={sceneVisible} data-reading={!!path}
    data-motion={motion ? 'full' : 'reduced'} data-search={!!query}>
    <button type="button" className={skin.back} inert={!!path} onClick={onClose} aria-label={en ? 'Close and return' : '关闭并返回'}>
      <span aria-hidden="true">←</span> {en ? 'Back to the room' : '返回书房'}
    </button>
    <div className={skin.file} inert={!!path}>
      <div className={skin.rail} role="search">
        <label htmlFor="shelf-index-query">{en ? 'Catalog' : '馆藏目录'}</label>
        <input ref={input} id="shelf-index-query" type="text" role="searchbox" enterKeyHint="search" autoComplete="off"
          maxLength={200} placeholder={en ? 'Title or keyword…' : '输入篇名或关键词…'} value={value}
          onCompositionStart={() => setComposing(true)} onCompositionEnd={() => setComposing(false)}
          onChange={e => edit(e.target.value)} aria-label={en ? 'Search all articles' : '搜索全部文章'} />
        {value && <button type="button" aria-label={en ? 'Clear search' : '清除搜索'} onClick={() => { edit(''); input.current?.focus() }}>×</button>}
      </div>
      <div className={skin.paper}>
        {!query ? <div className={skin.browse} data-room-scroll>{children}</div> : <>
          <div className={skin.status} role="status">{status}
            {current && !results && <button onClick={() => { setReply(undefined); setRetry(n => n + 1) }}>{en ? 'Try again' : '重试'}</button>}
          </div>
          {!!results?.data.length && <div className={skin.cards} ref={list} data-room-scroll>
            {results.data.map(hit => <Link prefetch={false} key={hit.id} className={skin.card}
              data-slug={hit.slug}
              href={'/' + locale + '/posts/' + encodeURIComponent(hit.slug)}
              onPointerDown={e => { if (e.button === 0) remember(hit.slug) }}
              onKeyDown={e => { if (e.key === 'Enter') remember(hit.slug) }}
              onPointerEnter={e => { if (e.pointerType !== 'touch') setHovered(hit.slug) }} onPointerLeave={() => setHovered(undefined)}
              onFocus={() => setFocused(hit.slug)} onBlur={() => setFocused(undefined)}>
              <span>{hit.category || (en ? 'Writing' : '随笔')} <i>·</i> {hit.publishedAt?.slice(0, 10)}</span>
              <strong>{hit.title}</strong><small>{excerpt(hit, query)}</small>
            </Link>)}
          </div>}
          {pages > 1 && <nav className={skin.pager} aria-label={en ? 'Catalog pages' : '目录分页'}>
            <button disabled={page === 1} aria-label={en ? 'Previous page' : '上一页'} onClick={() => setPage(page - 1)}>←</button>
            <span>{page} / {pages}</span>
            <button disabled={page === pages} aria-label={en ? 'Next page' : '下一页'} onClick={() => setPage(page + 1)}>→</button>
          </nav>}
        </>}
      </div>
    </div>
    <CatalogLeaf path={path} locale={locale} posts={posts} motion={motion} />
  </div>
}
