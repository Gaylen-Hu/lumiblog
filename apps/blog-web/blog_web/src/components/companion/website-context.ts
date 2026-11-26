import { resolveStudyRoute, studyLocation, subscribeStudyLocation } from '../study/study-route'

export type WebsiteArticle = {
  slug: string
  locale: 'zh' | 'en'
  title: string
  selection?: string
  selectionHeading?: string
}
export type WebsiteContext = { article?: WebsiteArticle }
type Registration = { article: WebsiteArticle; element: HTMLElement }
const articles = new Map<symbol, Registration>()
const listeners = new Set<() => void>()
let stopLocation: (() => void) | undefined

function activeArticle(): Registration | undefined {
  if (typeof window === 'undefined') return
  // Do not trust the catalog's substituted object route: its previous page
  // remains mounted briefly while a closing/turning animation runs.
  for (const record of [...articles.values()].reverse()) {
    if (!record.element.isConnected) continue
    const route = resolveStudyRoute(studyLocation(), record.article.locale)
    if (route.mode !== 'magazine' || !route.readingPath) continue
    const path = new URL(route.readingPath, window.location.origin).pathname
    try {
      if (decodeURIComponent(path) === `/${record.article.locale}/posts/${record.article.slug}`) return record
    } catch { /* A malformed URL must not expose a previous article. */ }
  }
}

function notify() { for (const listener of listeners) listener() }
function clearSelection(record: Registration) {
  if (!record.article.selection) return false
  delete record.article.selection
  delete record.article.selectionHeading
  return true
}
function captureSelection(announce = true) {
  const record = activeArticle(), selected = typeof window !== 'undefined' ? window.getSelection() : null
  if (!record || !selected?.rangeCount || selected.isCollapsed) return
  const body = record.element.querySelector<HTMLElement>('#post-body')
  const range = selected.getRangeAt(0)
  if (!body || !body.contains(range.startContainer) || !body.contains(range.endContainer)) {
    if (clearSelection(record) && announce) notify()
    return
  }
  const element = range.startContainer.nodeType === Node.ELEMENT_NODE ? range.startContainer as Element : range.startContainer.parentElement
  if (element?.closest('input, textarea, [contenteditable="true"]')) return
  const text = selected.toString().trim().slice(0, 1000)
  if (!text) return
  let heading: string | undefined
  for (const node of body.querySelectorAll<HTMLElement>('h1,h2,h3,h4,h5,h6')) {
    if (node.contains(range.startContainer) || node.compareDocumentPosition(range.startContainer) & Node.DOCUMENT_POSITION_FOLLOWING) {
      heading = node.textContent?.trim().slice(0, 160) || undefined
    }
  }
  if (record.article.selection === text && record.article.selectionHeading === heading) return
  record.article.selection = text
  record.article.selectionHeading = heading
  if (announce) notify()
}
function locationChanged() {
  // A selection belongs to one reading visit, even if its retained component
  // is reused later when the reader returns through browser history.
  const active = activeArticle()
  for (const record of articles.values()) if (record !== active) clearSelection(record)
  notify()
}

/** Registers already-rendered public metadata; never sends the article body. */
export function registerWebsiteArticle(article: Pick<WebsiteArticle, 'slug' | 'locale' | 'title'>, element: HTMLElement) {
  const owner = Symbol('article')
  articles.set(owner, { article: { ...article }, element })
  if (!stopLocation) {
    stopLocation = subscribeStudyLocation(locationChanged)
    document.addEventListener('selectionchange', selectionChanged)
    // Preserve the paragraph before focus enters the companion's chat input.
    document.addEventListener('pointerdown', selectionChanged, true)
  }
  notify()
  return () => {
    articles.delete(owner)
    if (!articles.size) {
      stopLocation?.(); stopLocation = undefined
      document.removeEventListener('selectionchange', selectionChanged)
      document.removeEventListener('pointerdown', selectionChanged, true)
    }
    notify()
  }
}
function selectionChanged() { captureSelection() }
export function getWebsiteContext(): WebsiteContext {
  captureSelection(false)
  const current = activeArticle()
  return current ? { article: { ...current.article } } : {}
}
export function subscribeWebsiteContext(listener: () => void) {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}
/** Only the active article's own comment mount, never another page/form. */
export function getArticleCommentElement() {
  return activeArticle()?.element.querySelector<HTMLElement>('[data-website-comments]') ?? null
}
export function hasArticleComments() {
  return Boolean(getArticleCommentElement()?.querySelector('script[src="https://giscus.app/client.js"],iframe.giscus-frame'))
}
