import { act, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import StudyShell from '@/components/study/StudyShell'
import StudyRoom, { type StudyRoomProps } from '@/components/study/StudyRoom'
import StudyRoomEntry from '@/components/study/StudyRoomEntry'
import { notifyStudyLocation, openStudyObject, resolveStudyRoute, spatialReadingHref, canonicalReadingHref } from '@/components/study/study-route'
import type { Destination } from '@/components/study/model'

const scene = vi.hoisted(() => ({ created: 0, disposed: 0, targets: [] as (string | null)[], paused: [] as boolean[], finish: (_d: Destination | null) => {} }))
const routing = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }))
vi.mock('next/navigation', () => ({
  usePathname: () => window.location.pathname,
  useSearchParams: () => new URLSearchParams(window.location.search),
  useRouter: () => routing,
}))
vi.mock('next/dynamic', () => ({ default: (_loader: unknown, options?: {ssr?:boolean}) => options?.ssr === false
  ? (props: StudyRoomProps) => <StudyRoom {...props} /> : () => <article><h1>Reading test content</h1></article> }))
vi.mock('@/components/study/room-scene', () => ({ createRoom: (host: HTMLElement, options: {
  onReady: () => void; onSettled: (d: Destination | null) => void
}) => {
  scene.created++
  const canvas = document.createElement('canvas'); host.append(canvas)
  scene.finish = options.onSettled
  options.onReady()
  return {
    setTarget: (target: Destination | null) => { scene.targets.push(target); if (!target) queueMicrotask(() => options.onSettled(null)) },
    setMotion: vi.fn(), setPaused: (paused: boolean) => scene.paused.push(paused),
    leaveClock: vi.fn(), dispose: () => { scene.disposed++; canvas.remove() },
  }
} }))

const data: StudyRoomProps = { locale: 'zh', name: 'Test study', bio: 'A quiet room', posts: [{
  id:'one', slug:'first', title:'第一篇', excerpt:'A page', coverImage:null, author:{name:'Host',avatar:null},
  publishedAt:'2026-11-05', readTime:'1 min', category:null,tags:[],column:null,
}], projects: [], timeline: [], columns: [] }
let root: Root | undefined
async function mount(children: ReactNode = <StudyRoomEntry data={data} />) {
  await act(async () => { root = createRoot(document.body.appendChild(document.createElement('div'))); root.render(<StudyShell locale="zh">{children}</StudyShell>) })
}
async function settle(target: Destination | null) { await act(async () => scene.finish(target)) }
async function open(target: Destination) { await act(async () => openStudyObject('zh', target)) }
async function traverse(direction: 'back' | 'forward') {
  await act(async () => {
    const done = new Promise(resolve => window.addEventListener('popstate', resolve, {once:true}))
    window.history[direction](); await done
  })
}
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  document.body.innerHTML = ''; localStorage.clear()
  window.history.replaceState({ __NA: true, __PRIVATE_NEXTJS_INTERNALS_TREE: ['tree'] }, '', '/zh')
  Object.defineProperty(window, 'matchMedia', { configurable: true, value: () => ({ matches: false, addEventListener:vi.fn(),removeEventListener:vi.fn() }) })
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
  scene.created = 0; scene.disposed = 0; scene.targets = []; scene.paused = []
  routing.push.mockClear(); routing.replace.mockClear()
})
afterEach(async () => { if (root) await act(async () => root!.unmount()); root = undefined; vi.restoreAllMocks() })

describe('URL-driven spatial reading', () => {
  it('uses shallow article/column URLs with canonical deep-link equivalents', () => {
    expect(spatialReadingHref('/zh/posts/高级阅读#chapter', 'zh')).toBe('/zh?article=%E9%AB%98%E7%BA%A7%E9%98%85%E8%AF%BB#chapter')
    expect(canonicalReadingHref('/zh?article=高级阅读', 'zh')).toBe('/zh/posts/%E9%AB%98%E7%BA%A7%E9%98%85%E8%AF%BB')
    expect(resolveStudyRoute('/zh?room=diary','zh')).toMatchObject({mode:'object',viewState:'DIARY',target:'diary'})
    expect(resolveStudyRoute('/zh?view=projects','zh')).toMatchObject({mode:'magazine',viewState:'WORK',target:'computer',spatial:true})
    expect(resolveStudyRoute('/zh?column=notes','zh')).toMatchObject({readingPath:'/zh/columns/notes',target:'columns'})
    expect(resolveStudyRoute('/zh?room=unknown','zh').viewState).toBe('ROOM')
    expect(spatialReadingHref('/en/posts/first','zh')).toBeNull()
  })
  it('SSR direct articles have reading HTML, without room registration or Canvas', async () => {
    window.history.replaceState(null,'','/zh/posts/direct')
    const html = renderToString(<StudyShell locale="zh"><article><h1>Direct article</h1></article></StudyShell>)
    expect(html).toContain('Direct article'); expect(html).toContain('回到书房大厅')
    expect(html).not.toContain('study-persistent'); expect(html).not.toContain('<canvas')
    await mount(<article><h1>Direct article</h1></article>)
    expect(scene.created).toBe(0)
    await act(async () => document.querySelector<HTMLButtonElement>('.study-return')!.click())
    expect(routing.push).toHaveBeenCalledWith('/zh', {scroll:false})
  })
  it('turns the catalog page in place; Back restores the same row, scroll and shelf camera', async () => {
    await mount()
    const canvas = document.querySelector('canvas')!
    expect(canvas).toBeTruthy()
    await open('diary'); await settle('diary')
    await open('computer'); await settle('computer')
    await open('bookshelf'); await settle('bookshelf')
    const article = document.querySelector<HTMLAnchorElement>('[role="dialog"] a[href="/zh/posts/first"]')!
    expect(article).toBeTruthy()
    const index = article.closest<HTMLElement>('[data-room-scroll]')!
    index.scrollTop = 240
    const trips = scene.targets.length
    await act(async () => article.click())
    expect(window.location.pathname).toBe('/zh'); expect(window.location.search).toBe('?article=first')
    expect(window.history.state.__PRIVATE_NEXTJS_INTERNALS_TREE).toEqual(['tree'])
    expect(routing.push).not.toHaveBeenCalled(); expect(routing.replace).not.toHaveBeenCalled()
    expect(document.querySelector('[data-article-scroll] h1')?.textContent).toBe('第一篇')
    expect(index.closest('[inert]')).toBeTruthy()
    expect(scene.targets.length).toBe(trips)
    expect(scene.paused.at(-1)).toBe(true)
    await traverse('back')
    expect(window.location.search).toBe('?room=bookshelf')
    expect(index.closest('[inert]')).toBeNull()
    expect(index.scrollTop).toBe(240)
    expect(document.activeElement).toBe(article)
    expect(scene.paused.at(-1)).toBe(true)
    await traverse('forward'); await settle('bookshelf')
    expect(window.location.search).toBe('?article=first'); expect(scene.targets.at(-1)).toBe('bookshelf')
    expect(document.querySelector('canvas')).toBe(canvas)
    expect(scene.created).toBe(1); expect(scene.disposed).toBe(0)
  })
  it('Esc during a catalog page turn reveals the index and a second Esc returns to the room', async () => {
    await mount(); await open('bookshelf'); await settle('bookshelf')
    await act(async () => document.querySelector<HTMLAnchorElement>('[role="dialog"] a[href="/zh/posts/first"]')!.click())
    await act(async () => {
      const done = new Promise(resolve => window.addEventListener('popstate', resolve, {once:true}))
      window.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape'})); await done
    })
    expect(window.location.search).toBe('?room=bookshelf')
    await act(async () => {
      const done = new Promise(resolve => window.addEventListener('popstate', resolve, {once:true}))
      window.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape'})); await done
    })
    expect(document.querySelector('.study-experience')).toHaveAttribute('data-view-state','ROOM')
    expect(document.querySelector('.study-magazine')).toBeNull()
    expect(scene.targets.at(-1)).toBeNull(); expect(scene.disposed).toBe(0)
  })
  it('query restoration targets the matching object, never an old component state', async () => {
    await mount()
    await act(async () => { window.history.replaceState(window.history.state,'','/zh?view=projects'); notifyStudyLocation() })
    expect(scene.targets.at(-1)).toBe('computer')
    await act(async () => { window.history.replaceState(window.history.state,'','/zh'); window.dispatchEvent(new PopStateEvent('popstate')) })
    expect(scene.targets.at(-1)).toBeNull(); expect(scene.created).toBe(1)
  })
})
