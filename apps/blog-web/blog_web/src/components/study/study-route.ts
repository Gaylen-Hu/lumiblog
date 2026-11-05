import { isDestination, type Destination } from './model'

export type ViewState = 'ROOM' | 'DIARY' | 'WORK' | 'ARTICLE' | 'COLLECTION' | 'ALBUM' | 'ABOUT' | 'LINKS'
export type StudyRoute = {
  key: string
  mode: 'room' | 'object' | 'magazine'
  viewState: ViewState
  target: Destination | null
  column?: string
  category?: string
  readingPath?: string
  spatial: boolean
}

const states: Record<Destination, ViewState> = {
  bookshelf: 'ARTICLE', columns: 'COLLECTION', diary: 'DIARY', computer: 'WORK',
  album: 'ALBUM', portrait: 'ABOUT', drawer: 'LINKS', readingBox: 'ARTICLE',
}
const sections: Record<string, Destination> = {
  posts: 'bookshelf', columns: 'columns', timeline: 'diary', projects: 'computer',
  about: 'portrait', links: 'drawer', rss: 'bookshelf', classic: 'bookshelf',
}

/** The URL is the only durable view state. Animation phases never select a view. */
export function resolveStudyRoute(href: string, locale: string): StudyRoute {
  const url = new URL(href, 'https://study.local')
  const home = url.pathname.replace(/\/$/, '') === `/${locale}`
  const object = url.searchParams.get('room')
  const resource = home && !object ? canonicalReadingHref(url.href, locale) : null
  const reading = !home || !!resource
  const readingUrl = new URL(resource || url.href, 'https://study.local')
  const section = readingUrl.pathname.split('/')[2]
  const target = reading ? (Object.hasOwn(sections, section) ? sections[section] : 'bookshelf') : (isDestination(object) ? object : null)
  return {
    key: url.pathname + url.search,
    mode: reading ? 'magazine' : target ? 'object' : 'room',
    viewState: target ? states[target] : 'ROOM',
    target,
    category: home && object === 'bookshelf' ? url.searchParams.get('category') || undefined : undefined,
    column: !reading ? url.searchParams.get('edition') || url.searchParams.get('column') || undefined : undefined,
    readingPath: reading ? readingUrl.pathname + readingUrl.search : undefined,
    spatial: !!resource,
  }
}

/** Query URLs are used only inside the room. Canonical paths remain shareable/SSR. */
export function canonicalReadingHref(href: string, locale: string): string | null {
  const url = new URL(href, 'https://study.local'), params = new URLSearchParams(url.search)
  let path: string | null = null
  if (params.get('article')) path = `posts/${encodeURIComponent(params.get('article')!)}`
  else if (params.get('column')) path = `columns/${encodeURIComponent(params.get('column')!)}`
  else if (params.has('view')) {
    const view = params.get('view')!
    if (['posts', 'columns', 'timeline', 'projects', 'about', 'links', 'rss', 'classic'].includes(view)) path = view
    if (view === 'projects' && params.has('project')) path += `/${encodeURIComponent(params.get('project')!)}`
  }
  if (!path) return null
  for (const key of ['article', 'column', 'view', 'project', 'room', 'edition']) params.delete(key)
  const query = params.toString()
  return `/${locale}/${path}${query ? `?${query}` : ''}${url.hash}`
}

export function spatialReadingHref(href: string, locale: string): string | null {
  const url = new URL(href, 'https://study.local')
  const parts = url.pathname.split('/').filter(Boolean)
  if (parts[0] !== locale || !Object.hasOwn(sections, parts[1])) return null
  if (parts.length > 3 || (parts[1] === 'links' && parts[2])) return null
  const params = new URLSearchParams(url.search)
  for (const key of ['article', 'column', 'view', 'project', 'room', 'edition']) params.delete(key)
  if (parts[1] === 'posts' && parts[2]) params.set('article', decodeURIComponent(parts[2]))
  else if (parts[1] === 'columns' && parts[2]) params.set('column', decodeURIComponent(parts[2]))
  else {
    params.set('view', parts[1])
    if (parts[1] === 'projects' && parts[2]) params.set('project', decodeURIComponent(parts[2]))
  }
  return `/${locale}?${params}${url.hash}`
}

export type CatalogSlip = { query: string; page: number; scroll: number; slug: string }
export type StudyHistory = { kind: 'object' | 'magazine'; returnToRoom: boolean; catalog?: string; slip?: CatalogSlip }
export function studyHistory(): StudyHistory | undefined {
  return window.history.state?.__study
}
export function stampStudyHistory(value: StudyHistory | undefined) {
  // Keep Next's private tree and navigation keys intact.
  const state = { ...window.history.state }
  if (value) state.__study = value
  else delete state.__study
  window.history.replaceState(state, '', window.location.href)
}

export const locationEvent = 'study:location'
export function notifyStudyLocation() { window.dispatchEvent(new Event(locationEvent)) }
export function subscribeStudyLocation(listener: () => void) {
  window.addEventListener('popstate', listener)
  window.addEventListener(locationEvent, listener)
  return () => {
    window.removeEventListener('popstate', listener)
    window.removeEventListener(locationEvent, listener)
  }
}
export function studyLocation() { return window.location.pathname + window.location.search }

export function openStudyObject(locale: string, target: Destination, column?: string) {
  const current = resolveStudyRoute(studyLocation(), locale)
  const url = new URL(`/${locale}`, window.location.origin)
  url.searchParams.set('room', target)
  if (column) url.searchParams.set(target === 'bookshelf' ? 'category' : 'edition', column)
  const owned = current.mode === 'room' || studyHistory()?.returnToRoom === true
  const state = { ...window.history.state, __study: { kind: 'object', returnToRoom: owned } }
  if (current.mode === 'room') window.history.pushState(state, '', url)
  else window.history.replaceState(state, '', url)
  notifyStudyLocation()
}

export function closeStudyObject(locale: string) {
  if (studyHistory()?.kind === 'object' && studyHistory()?.returnToRoom) window.history.back()
  else {
    const state = { ...window.history.state }
    delete state.__study
    window.history.replaceState(state, '', `/${locale}`)
    notifyStudyLocation()
  }
}
