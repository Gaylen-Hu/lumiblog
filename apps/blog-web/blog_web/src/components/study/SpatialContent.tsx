'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { Link } from '@/i18n/navigation'
import PostCard from '@/components/PostCard'
import ProjectCard from '@/components/ProjectCard'
import PersonalProfile from '@/components/PersonalProfile'
import TimelineMedia from '@/components/media/TimelineMedia'
import { noteText } from './desk-notes'
import MagazineArticle from './MagazineArticle'
import PaperLoading from './PaperLoading'
import ReadingError from './ReadingError'
import type { ReadingData } from './reading-data'

type LoadState = { status: 'loading' } | { status: 'error' } | { status: 'ready'; data: ReadingData }

export default function SpatialContent({ path, locale, onReady, catalog }: { path: string; locale: string; onReady: () => void; catalog?: 'with-heading' | 'page' }) {
  const [state, setState] = useState<LoadState>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    let live = true
    const timeout = window.setTimeout(() => controller.abort(), 15000)
    fetch(`/api/study/reading?${new URLSearchParams({ path })}`, { signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error('Page unavailable')
        const data: ReadingData = await response.json()
        if (live) setState({ status: 'ready', data })
      }).catch(() => { if (live) setState({ status: 'error' }) })
      .finally(() => window.clearTimeout(timeout))
    return () => { live = false; window.clearTimeout(timeout); controller.abort() }
  }, [path, attempt])
  useEffect(() => {
    if (state.status !== 'ready') return
    onReady()
    // Canonical links keep their journal/TOC fragment in the shallow URL.
    const frame = requestAnimationFrame(() => {
      try {
        const id = decodeURIComponent(window.location.hash.slice(1))
        if (id && id !== 'resume-reading') document.getElementById(id)?.scrollIntoView({ block: 'start' })
      } catch { /* A malformed fragment must not interrupt reading. */ }
    })
    return () => cancelAnimationFrame(frame)
  }, [state, onReady])
  useEffect(() => {
    if (state.status !== 'ready') return
    const data = state.data
    const title = data.kind === 'article' ? data.post.title : data.kind === 'column' ? data.column.title : data.kind === 'project' ? data.project.title : null
    if (!title) return
    const original = document.title
    document.title = title
    return () => { document.title = original }
  }, [state])
  if (state.status === 'loading') return catalog ? <p className="study-loading" role="status">{locale === 'en' ? 'Loading article…' : '正在读取正文…'}</p> : <PaperLoading locale={locale} />
  if (state.status === 'error') return <ReadingError reset={() => { setState({ status: 'loading' }); setAttempt(value => value + 1) }} />
  if (catalog && state.data.kind === 'article') return <MagazineArticle post={state.data.post} locale={locale} catalogHeading={catalog === 'with-heading'} />
  return <ReadingPages data={state.data} locale={locale} path={path} />
}

function ReadingPages({ data, locale, path }: { data: ReadingData; locale: string; path: string }) {
  const en = locale === 'en'
  if (data.kind === 'article') return <MagazineArticle post={data.post} locale={locale} />
  if (data.kind === 'posts') {
    const url = new URL(path, 'https://study.local')
    const page = Math.max(1, Number(url.searchParams.get('page')) || 1), total = Math.ceil(data.posts.total / 9)
    const pageHref = (value: number) => {
      const params = new URLSearchParams(url.search)
      params.set('page', String(value))
      return `/posts?${params}`
    }
    return <main className="magazine-page">
      <Heading imprint="THE READING ROOM / ESSAYS & NOTES" title={en ? 'Writing' : '文章'} />
      <div className="magazine-story-list">{data.posts.data.map(post => <PostCard key={post.id} post={post} variant="magazine" />)}</div>
      {!data.posts.data.length && <Empty en={en} />}
      {total > 1 && <nav className="magazine-pagination" aria-label={en ? 'Pagination' : '文章分页'}>
        {page > 1 && <Link prefetch={false} href={pageHref(page - 1)}>← {en ? 'Previous' : '上一页'}</Link>}
        <span>{page} / {total}</span>
        {page < total && <Link prefetch={false} href={pageHref(page + 1)}>{en ? 'Next' : '下一页'} →</Link>}
      </nav>}
    </main>
  }
  if (data.kind === 'columns') return <main className="magazine-page">
    <Heading imprint="COLLECTED EDITIONS / READ IN SEQUENCE" title={en ? 'Collections' : '专栏'} />
    <div className="magazine-story-list">{data.columns.map(column => <Link prefetch={false} key={column.id} href={`/columns/${encodeURIComponent(column.slug)}`} className="magazine-collection">
      <div className="magazine-collection-cover">{column.coverImage ? <Image src={column.coverImage} alt={column.title} fill sizes="(max-width:700px) 100vw,50vw" className="object-cover" /> : <span aria-hidden="true" style={{fontSize:48}}>Aa</span>}</div>
      <h2>{column.title}</h2><p>{column.description}</p><small>{column.articleCount} {en ? 'articles' : '篇文章'} ↗</small>
    </Link>)}</div>
    {!data.columns.length && <Empty en={en} />}
  </main>
  if (data.kind === 'column') return <main className="magazine-page"><div className="magazine-reading-column">
    <Heading imprint="COLLECTED EDITIONS / CONTENTS" title={data.column.title} />
    <p className="magazine-intro">{data.column.description}</p>
    <ol className="magazine-chapters">{data.column.articles.map((post, index) => <li key={post.id}>
      <Link prefetch={false} href={`/posts/${encodeURIComponent(post.slug)}`}><span className="chapter-number">{String(index + 1).padStart(2,'0')}</span><div><h2>{post.title}</h2><p>{post.summary}</p><time dateTime={post.publishedAt}>{post.publishedAt.split('T')[0]}</time></div></Link>
    </li>)}</ol>
    {!data.column.articles.length && <Empty en={en} />}
  </div></main>
  if (data.kind === 'timeline') return <main className="magazine-page magazine-journal">
    <Heading imprint="A JOURNAL OF ORDINARY DAYS" title={en ? 'Journal' : '日常'} />
    {data.entries.map(entry => {
      const { title, body } = noteText(entry, en)
      return <article id={`day-${entry.id}`} key={entry.id}>
        <small className="study-imprint">{entry.createdAt?.split('T')[0] || entry.year}</small><h2>{title}</h2>
        {body !== title && <p style={{whiteSpace:'pre-wrap'}}>{body}</p>}
        {!!entry.images.length && <TimelineMedia urls={entry.images} en={en} title={title} date={entry.createdAt?.split('T')[0] || entry.year} />}
      </article>
    })}
    {!data.entries.length && <Empty en={en} />}
  </main>
  if (data.kind === 'projects') return <main className="magazine-page">
    <Heading imprint="FROM THE WORK DESK / SELECTED PROJECTS" title={en ? 'Projects' : '作品'} />
    <div className="magazine-story-list">{data.projects.map(project => <ProjectCard key={project.id} project={project} variant="magazine" />)}</div>
    {!data.projects.length && <Empty en={en} />}
  </main>
  if (data.kind === 'project') return <main className="magazine-page"><div className="magazine-reading-column">
    <Heading imprint="FROM THE WORK DESK / PROJECT NOTES" title={data.project.title} />
    {data.project.coverImage && <Image src={data.project.coverImage} alt={data.project.title} width={1200} height={675} className="w-full mb-10" />}
    <p className="magazine-intro">{data.project.description}</p><p>{data.project.techStack.join(' / ')}</p>
    <div className="magazine-pagination">
      {data.project.link && <a href={data.project.link} target="_blank" rel="noopener noreferrer">{en ? 'Visit project' : '打开作品'} ↗</a>}
      {data.project.githubUrl && <a href={data.project.githubUrl} target="_blank" rel="noopener noreferrer">GitHub ↗</a>}
    </div>
  </div></main>
  if (data.kind === 'about') return <main className="magazine-page"><div className="magazine-reading-column">
    <PersonalProfile name={data.owner.name} />
    {(data.owner.bio || data.owner.techStack.length > 0) && (
      <section className="mt-12 space-y-4">
        <h2 className="text-2xl">{en ? 'My work' : '我的工作'}</h2>
        {data.owner.bio && <p className="whitespace-pre-line">{data.owner.bio}</p>}
        {!!data.owner.techStack.length && <p>{data.owner.techStack.join(' / ')}</p>}
      </section>
    )}
  </div></main>
  if (data.kind === 'links') return <main className="magazine-page">
    <Heading imprint="OTHER LITTLE CORNERS OF THE WEB" title={en ? 'Friends' : '朋友'} />
    <div className="magazine-story-list">{data.links.map(link => <article key={link.id} className="magazine-story"><h2><a href={link.siteUrl} target="_blank" rel="noopener noreferrer">{link.siteName} ↗</a></h2><p>{link.description}</p></article>)}</div>
    {!data.links.length && <Empty en={en} />}
  </main>
  return <main className="magazine-page"><Heading imprint="LETTERS FROM THE STUDY" title="RSS" />
    <p>{en ? 'Take new pages to your favorite reader.' : '把书房的新文章，带到你喜欢的阅读器里。'}</p>
    <a href="/feed.xml" target="_blank" rel="noopener noreferrer">{en ? 'Subscribe to the feed' : '订阅文章更新'} ↗</a>
  </main>
}
function Heading({ imprint, title }: { imprint: string; title: string }) { return <header className="magazine-heading"><p className="study-imprint">{imprint}</p><h1>{title}</h1></header> }
function Empty({ en }: { en: boolean }) { return <div className="magazine-empty"><p className="study-imprint">A SHELF FOR NEW IDEAS</p><h2>{en ? 'The next page is still being written.' : '下一页，还在慢慢写。'}</h2></div> }
