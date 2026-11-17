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
vi.mock('@/components/companion/WebsiteCompanion', () => ({ default: ({ reading }: { reading: boolean }) => <aside data-companion-root data-reading={reading} data-companion-chat-open="false"><button data-companion-keyboard-entry>和小灰说句话</button></aside> }))
vi.mock('@/components/study/room-scene', () => ({ createRoom: (host: HTMLElement, options: {
  onReady: () => void; onSettled: (d: Destination | null) => void
}) => {
  scene.created++
  const canvas = document.createElement('canvas'); host.append(canvas)
  scene.finish = options.onSettled
  options.onReady()
  return {
    setTarget: (target: Destination | null) => { scene.targets.push(target); if (!target) queueMicrotask(() => options.onSettled(null)) },
    setMotion: vi.fn(), setCeilingLight: vi.fn(), setPaused: (paused: boolean) => scene.paused.push(paused),
    leaveClock: vi.fn(), dispose: () => { scene.disposed++; canvas.remove() },
  }
} }))

const data: StudyRoomProps = { locale: 'zh', siteName: '墨千', name: 'Test study', bio: 'A quiet room', birthdayLine: '2 月 7 日生 · 水瓶座', posts: [{
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
  it('keeps the lightweight home on canonical links and loads a renderer only after opt-in', async () => {
    localStorage.setItem('study-simple', 'true')
    await mount()
    expect(scene.created).toBe(0)
    expect(document.querySelector('.study-home-entry a[href="/zh/posts/first"]')).toBeTruthy()
    const enter = Array.from(document.querySelectorAll<HTMLButtonElement>('button')).find(button => button.textContent?.includes('进入 3D 书房'))
    await act(async () => enter!.click())
    expect(scene.created).toBe(1)
    expect(document.querySelector('.study-persistent canvas')).toBeTruthy()
  })
  it('serves linked room objects in simple mode on constrained devices', async () => {
    localStorage.setItem('study-simple', 'true')
    window.history.replaceState(null, '', '/zh?room=bookshelf')
    await mount()
    expect(scene.created).toBe(0)
    expect(document.querySelector('[role="dialog"] a[href="/zh/posts/first"]')).toBeTruthy()
  })
  it('renders the welcome heading and working navigation before the room mounts', async () => {
    const initial = document.createElement('div')
    initial.innerHTML = renderToString(<StudyRoomEntry data={data} />)
    expect(initial.querySelector('h1')?.textContent).toBe('把日子写下来，也把想法留下来。')
    expect(initial.querySelector('a[href="/zh/posts/first"]')?.textContent).toContain('第一篇')
    await mount()
    const room = document.querySelector('.study-persistent main')!
    expect(room.querySelector('h1')?.textContent).toBe(initial.querySelector('h1')?.textContent)
    const navLinks = (root: Element) => Array.from(root.querySelectorAll('nav[aria-label="内容导航"] a'), link => link.getAttribute('href'))
    expect(navLinks(initial)).toHaveLength(7)
    expect(navLinks(room)).toEqual(navLinks(initial))
  })
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
    expect(html).toMatch(/<a[^>]*class="study-return"[^>]*href="\/zh"/)
    expect(html).not.toContain('study-persistent'); expect(html).not.toContain('<canvas')
    await mount(<article><h1>Direct article</h1></article>)
    expect(scene.created).toBe(0)
    expect(document.querySelector('[data-companion-root]')).toHaveAttribute('data-reading','true')
    await act(async () => document.querySelector<HTMLButtonElement>('.study-return')!.click())
    expect(routing.push).toHaveBeenCalledWith('/zh', {scroll:false})
  })
  it('turns the catalog page in place; Back restores the same row, scroll and shelf camera', async () => {
    await mount()
    const canvas = document.querySelector('canvas')!
    const cat = document.querySelector('[data-companion-root]')!
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
    expect(cat).toHaveAttribute('data-reading','true')
    expect(index.closest('[inert]')).toBeTruthy()
    expect(scene.targets.length).toBe(trips)
    expect(scene.paused.at(-1)).toBe(true)
    await traverse('back')
    expect(window.location.search).toBe('?room=bookshelf')
    expect(cat).toHaveAttribute('data-reading','false')
    expect(index.closest('[inert]')).toBeNull()
    expect(index.scrollTop).toBe(240)
    expect(document.activeElement).toBe(article)
    expect(scene.paused.at(-1)).toBe(true)
    await traverse('forward'); await settle('bookshelf')
    expect(window.location.search).toBe('?article=first'); expect(scene.targets.at(-1)).toBe('bookshelf')
    expect(document.querySelector('canvas')).toBe(canvas)
    expect(scene.created).toBe(1); expect(scene.disposed).toBe(0)
    expect(document.querySelector('[data-companion-root]')).toBe(cat)
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
  it('chat Escape does not navigate away from the reading page', async () => {
    window.history.replaceState(null,'','/zh/posts/direct')
    await mount(<article><h1>Direct article</h1></article>)
    const cat = document.querySelector<HTMLElement>('[data-companion-root]')!
    cat.dataset.companionChatOpen = 'true'
    await act(async () => window.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape'})))
    expect(routing.push).not.toHaveBeenCalled()
    cat.dataset.companionChatOpen = 'false'
    await act(async () => window.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape'})))
    expect(routing.push).toHaveBeenCalledWith('/zh', {scroll:false})
  })
  it('includes the companion keyboard entry in the spatial reader focus loop', async () => {
    await mount()
    await act(async () => { window.history.replaceState(window.history.state,'','/zh?view=posts'); notifyStudyLocation() })
    await settle('bookshelf')
    vi.spyOn(HTMLElement.prototype,'getClientRects').mockReturnValue([{}] as unknown as DOMRectList)
    const first = document.querySelector<HTMLButtonElement>('.study-return')!
    const cat = document.querySelector<HTMLButtonElement>('[data-companion-keyboard-entry]')!
    first.focus()
    await act(async () => first.dispatchEvent(new KeyboardEvent('keydown',{key:'Tab',shiftKey:true,bubbles:true,cancelable:true})))
    expect(document.activeElement).toBe(cat)
    await act(async () => cat.dispatchEvent(new KeyboardEvent('keydown',{key:'Tab',bubbles:true,cancelable:true})))
    expect(document.activeElement).toBe(first)
  })
  it('keeps the cat reachable by keyboard when an article opens inside the shelf catalog', async () => {
    await mount(); await open('bookshelf'); await settle('bookshelf')
    await act(async () => document.querySelector<HTMLAnchorElement>('[role="dialog"] a[href="/zh/posts/first"]')!.click())
    const dialog = document.querySelector<HTMLElement>('[role="dialog"]')!
    const first = Array.from(dialog.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input, textarea, select, [tabindex="0"]')).find(element => !element.closest('[inert], [hidden]'))!
    const cat = document.querySelector<HTMLButtonElement>('[data-companion-keyboard-entry]')!
    first.focus()
    await act(async () => first.dispatchEvent(new KeyboardEvent('keydown',{key:'Tab',shiftKey:true,bubbles:true,cancelable:true})))
    expect(document.activeElement).toBe(cat)
    await act(async () => cat.dispatchEvent(new KeyboardEvent('keydown',{key:'Tab',bubbles:true,cancelable:true})))
    expect(document.activeElement).toBe(first)
    cat.parentElement!.dataset.companionChatOpen = 'true'
    await act(async () => window.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape'})))
    expect(window.location.search).toBe('?article=first')
  })
})
