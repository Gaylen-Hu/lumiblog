'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { Post } from '@/types'
import { ArticleReadingCard } from './ReadingBox'
import paper from './catalog-leaf.module.css'

const ArticleContent = dynamic(() => import('./SpatialContent'))
const turnDuration = 460

export default function CatalogLeaf({ path, locale, posts, motion }: {
  path?: string; locale: string; posts: Post[]; motion: boolean
}) {
  const [lastPath, setLastPath] = useState(path)
  if (path && path !== lastPath) setLastPath(path)
  const displayed = path || (motion ? lastPath : undefined)
  const scroll = useRef<HTMLDivElement>(null)
  const back = useRef<HTMLButtonElement>(null)
  const en = locale === 'en'
  useEffect(() => {
    if (path || !lastPath) return
    // Retain the printed page until the reverse turn reveals the index.
    const timer = window.setTimeout(() => setLastPath(undefined),motion ? turnDuration : 0)
    return () => window.clearTimeout(timer)
  },[path,motion,lastPath])
  useLayoutEffect(() => {
    if (!path) return
    if (scroll.current) scroll.current.scrollTop = 0
    back.current?.focus({preventScroll:true})
  },[path])
  const ready = useCallback(() => {
    if (document.activeElement === back.current) {
      scroll.current?.querySelector<HTMLElement>('h1')?.focus({preventScroll:true})
    }
  },[])
  const post = displayed && posts.find(post => displayed.split('?')[0] === `/${locale}/posts/${encodeURIComponent(post.slug)}`)
  return <section className={paper.leaf} data-open={!!path} inert={!path} aria-hidden={!path} aria-label={en ? 'Article page' : '文章内页'}>
    <div className={paper.bar}>
      <button ref={back} type="button" onClick={() => window.history.back()}>← {en ? 'Back to contents' : '返回目录'}</button>
      {post && <span>{post.category?.name}</span>}
    </div>
    <div ref={scroll} className={paper.scroll} data-article-scroll data-room-scroll>
      {post && <header className={paper.masthead}>
        <div><time dateTime={post.publishedAt}>{post.publishedAt?.slice(0,10)}</time><span>{post.readTime}</span></div>
        <h1 tabIndex={-1}>{post.title}</h1>
        <p><Link href={`/${locale}/about`}>{post.author.name}</Link><ArticleReadingCard locale={locale} slug={post.slug} title={post.title} /></p>
      </header>}
      {displayed && <ArticleContent key={displayed} path={displayed} locale={locale} onReady={ready} catalog={post ? 'with-heading' : 'page'} />}
    </div>
  </section>
}
