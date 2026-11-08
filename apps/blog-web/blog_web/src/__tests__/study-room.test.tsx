import { act, type ComponentProps } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import StudyRoom from '@/components/study/StudyRoom'
import { isDestination, type ClockView, type RoomItem } from '@/components/study/model'
import { clockHandAngles } from '@/components/study/wall-clock'
import { localLightPeriod } from '@/components/study/room-light'
import { findBookmarkedBlock, readBookmark, writeBookmark } from '@/lib/reading-bookmark'

const mocked = vi.hoisted(() => ({ setCeilingLight: vi.fn(), fail: false, holdReady: false, disposed: 0, created: 0, quality: [] as string[], targets: [] as (string | null)[] }))
let slowRoom: () => boolean
let loseContext: () => void
let presentFrame: () => void
let pickItem: (item: RoomItem, columnSlug?: string) => void
let finishDrawerSlide: () => void
let clockPhase: (view: ClockView) => void
vi.mock('@/components/study/room-scene', () => ({
  createRoom: (_host: HTMLElement, options: { onSlowRoom: typeof slowRoom; onReady: () => void; onSettled: (d: string | null) => void; onPick: typeof pickItem; onClockView: typeof clockPhase; onContextLost: () => void }) => {
    if (mocked.fail) throw new Error('WebGL unavailable')
    mocked.created++
    slowRoom = options.onSlowRoom
    loseContext = options.onContextLost
    presentFrame = options.onReady
    pickItem = options.onPick
    clockPhase = options.onClockView
    if (!mocked.holdReady) options.onReady()
    return {
      setMotion: vi.fn(),
      setCeilingLight: mocked.setCeilingLight,
      setQuality: (value: string) => { mocked.quality.push(value) },
      setPaused: vi.fn(),
      inspectClock: () => clockPhase('approaching'),
      leaveClock: () => clockPhase('returning'),
      setTarget: (d: string | null) => {
        mocked.targets.push(d)
        if (d === 'drawer') finishDrawerSlide = () => options.onSettled(d)
        else queueMicrotask(() => options.onSettled(d))
      },
      dispose: () => { mocked.disposed++ },
    }
  },
}))

const props: ComponentProps<typeof StudyRoom> = { locale: 'zh', siteName: '墨千', name: '测试书房', bio: '个人介绍', posts: [], projects: [], timeline: [], columns: [
  { id: '1', title: '绘图手记', slug: 'sketches', description: null, articleCount: 0, coverImage: null, sortOrder: 1 },
  { id: '2', title: '代码笔记', slug: '代码笔记', description: '从基础到实践', articleCount: 2, coverImage: null, sortOrder: 2 },
] }
const journalEntries: ComponentProps<typeof StudyRoom>['timeline'] = [
  {id:'a',year:'2026',titleZh:'窗边的一天',titleEn:'By the window',descZh:'第一篇的完整内容',descEn:'',order:0,images:['/one.webp']},
  {id:'b',year:'2026',titleZh:'在路上',titleEn:'On the road',descZh:'第二篇的完整内容',descEn:'',order:1,images:[]},
  {id:'c',year:'2026',titleZh:'散步回来',titleEn:'After a walk',descZh:'第三篇的完整内容',descEn:'',order:2,images:[]},
]
async function finishJournalTurn() {
  const leaf = document.querySelector('[data-turning-leaf]')
  expect(leaf).toBeTruthy()
  // JSDOM does not run CSS animations: exercise the missed-animation fallback.
  await act(async () => { await new Promise(resolve => window.setTimeout(resolve, 1000)) })
}
let root: Root
async function mount(overrides: Partial<typeof props> = {}) {
  await act(async () => { root = createRoot(document.body.appendChild(document.createElement('div'))); root.render(<StudyRoom {...props} {...overrides} />) })
}
async function click(label: string) {
  const button = Array.from(document.querySelectorAll('button')).find(b => b.textContent === label || b.getAttribute('aria-label') === label)
  expect(button, label).toBeTruthy()
  await act(async () => { button!.click() })
}
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  document.body.innerHTML = ''
  localStorage.clear()
  window.history.replaceState(null, '', '/zh')
  Object.defineProperty(window, 'matchMedia', { configurable: true, value: () => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }) })
  mocked.fail = false; mocked.holdReady = false; mocked.disposed = 0; mocked.created = 0; mocked.quality = []; mocked.targets = []
})
afterEach(async () => { if (root) await act(async () => root.unmount()) })

describe('书房的内容与恢复流程', () => {
  it('低帧只在自由观察时提示一次，主动恢复画质后仍记住选择', async () => {
    await mount()
    await click('环境设置')
    expect(slowRoom()).toBe(false)
    await click('关闭并返回')
    await act(async () => { expect(slowRoom()).toBe(true) })
    expect(mocked.quality).not.toContain('light')
    await click('开启性能模式')
    expect(mocked.quality.at(-1)).toBe('light')
    await click('环境设置')
    await click('室内设置')
    await click('完整效果')
    expect(mocked.quality.at(-1)).toBe('auto')
    await act(async () => root.unmount())
    await mount()
    await act(async () => { slowRoom() })
    expect(document.body.textContent).not.toContain('画面有些卡。')
  })
  it('墙上开关和键盘入口共用大灯状态，重新进入后记住选择', async () => {
    await mount()
    expect(mocked.setCeilingLight).toHaveBeenLastCalledWith(false)
    await act(async () => pickItem('ceilingLight'))
    expect(mocked.setCeilingLight).toHaveBeenLastCalledWith(true)
    expect(localStorage.getItem('study-ceiling-light')).toBe('true')
    await act(async () => root.unmount())
    await mount()
    expect(mocked.setCeilingLight).toHaveBeenLastCalledWith(true)
    const label = '墙上开关 · 书房大灯'
    const button = Array.from(document.querySelectorAll('button')).find(b => b.textContent === label)
    expect(button?.getAttribute('aria-pressed')).toBe('true')
    await click(label)
    expect(button?.getAttribute('aria-pressed')).toBe('false')
    expect(mocked.setCeilingLight).toHaveBeenLastCalledWith(false)
    expect(localStorage.getItem('study-ceiling-light')).toBe('false')
  })
  it('首帧一直未就绪时降级，迟到的成功回调不能复活已销毁场景', async () => {
    mocked.holdReady = true
    vi.useFakeTimers()
    try {
      await mount()
      await act(async () => { await vi.advanceTimersByTimeAsync(15000) })
      expect(mocked.disposed).toBe(1)
      expect(document.body.textContent).toContain('3D 书房暂未打开')
      await act(async () => presentFrame())
      expect(document.body.textContent).toContain('3D 书房暂未打开')
      expect(document.querySelector('a[href="/zh/posts"]')).toBeTruthy()
    } finally { vi.useRealTimers() }
  })
  it('音频 resume 未真正获得播放许可时仍显示关闭，不阻塞内容入口', async () => {
    const ctx = { state: 'suspended', resume: vi.fn(async () => {}), close: vi.fn(async () => {}) }
    vi.stubGlobal('AudioContext', class { constructor() { return ctx } })
    try {
      await mount()
      await click('开启声音')
      expect(ctx.resume).toHaveBeenCalledOnce()
      expect(document.querySelector('[aria-label="开启声音"]')?.getAttribute('aria-pressed')).toBe('false')
      await click('书架 · 文章')
      expect(document.querySelector('[role="dialog"]')).toBeTruthy()
    } finally { vi.unstubAllGlobals() }
  })
  it('上下文丢失仅自动重建一次，保留当前阅读入口，重复丢失进入可阅读的降级页', async () => {
    await mount()
    await click('书架 · 文章')
    const path = window.location.href
    await act(async () => loseContext())
    expect(mocked.created).toBe(2)
    expect(mocked.disposed).toBe(1)
    expect(window.location.href).toBe(path)
    expect(document.querySelector('[role="dialog"]')).toBeTruthy()
    await act(async () => loseContext())
    expect(mocked.created).toBe(2)
    expect(mocked.disposed).toBe(2)
    await click('关闭并返回')
    expect(document.body.textContent).toContain('3D 书房暂未打开')
    expect(document.querySelector('a[href="/zh/posts"]')).toBeTruthy()
    await click('重试')
    expect(mocked.created).toBe(3)
    await act(async () => loseContext())
    expect(mocked.created).toBe(4) // Explicit retry starts a fresh recovery budget.
  })
  it('轻量画质可保存，重新进入仍使用轻量，选择自动可恢复', async () => {
    await mount()
    await click('环境设置')
    await click('室内设置')
    await click('性能模式')
    expect(localStorage.getItem('study-quality')).toBe('light')
    expect(mocked.quality.at(-1)).toBe('light')
    await act(async () => root.unmount())
    await mount()
    expect(mocked.quality.at(-1)).toBe('light')
    await click('环境设置')
    await click('室内设置')
    await click('完整效果')
    expect(mocked.quality.at(-1)).toBe('auto')
    expect(localStorage.getItem('study-quality')).toBe('auto')
  })
  it('点层板只看该分类，从目录收下文章后重开匣子仍有书笺，移出不影响续读', async () => {
    const base = { excerpt:null,coverImage:null,author:{name:'A',avatar:null},publishedAt:'2026-11-01',readTime:'2 min',tags:[],column:null }
    const post = { ...base,id:'a',slug:'tea-and-books',title:'茶与书',category:{id:'life',slug:'life',name:'随笔'} }
    const other = { ...base,id:'b',slug:'code',title:'另一层的文章',category:{id:'tech',slug:'tech',name:'技术'} }
    const mark = {slug:'yesterday',title:'昨天读的文章',block:2,excerpt:'一段文字',fraction:.2}
    writeBookmark('zh',mark)
    await mount({posts:[post,other]})
    await act(async () => pickItem('bookshelf','life'))
    expect(new URL(location.href).searchParams.get('category')).toBe('life')
    expect(Array.from(document.querySelectorAll('[role="dialog"] h3'),h=>h.textContent)).toEqual(['茶与书'])
    await click('放入待阅匣 · 茶与书')
    expect(document.querySelector('[aria-label="已入匣 · 茶与书"]')?.getAttribute('aria-pressed')).toBe('true')
    await act(async () => { root.unmount() })
    window.history.replaceState(null,'','/zh?room=readingBox')
    await mount({posts:[]}) // A saved card also survives list pagination or a failed feed.
    expect(document.querySelector('[role="dialog"] a')?.getAttribute('href')).toBe('/zh/posts/tea-and-books')
    await click('移出 · 茶与书')
    expect(document.querySelector('[role="dialog"] a')).toBeNull()
    expect(document.activeElement?.textContent).toContain('去书架选文章')
    expect(readBookmark('zh')).toEqual(mark)
  })
  it('便签按真实日期选最新日常，翻下一张后纸角仍链接到对应原文', async () => {
    await mount({timeline: [
      {...journalEntries[1], createdAt:'2026-01-02'},
      {...journalEntries[0], createdAt:'2026-08-03'},
    ]})
    await act(async () => pickItem('note'))
    const dialog = document.querySelector('[role="dialog"]')!
    expect(dialog.textContent).toContain('第一篇的完整内容')
    expect(dialog.querySelector('a')?.hash).toBe('#day-a')
    await click('换一张 ↻')
    expect(dialog.textContent).toContain('第二篇的完整内容')
    expect(dialog.querySelector('a')?.hash).toBe('#day-b')
    expect(dialog.textContent).not.toContain('读万卷书')
    await click('翻看便签背面')
    expect(dialog.textContent).toContain('读万卷书，行千里路')
    await click('翻回便签正面')
    expect(dialog.querySelector('a')?.hash).toBe('#day-b')
  })
  it('同一篇改稿插段后仍能找到原段落，书签分语言保存', () => {
    const mark = {slug:'reading',title:'读书',block:1,excerpt:'继续读这里',fraction:.4}
    writeBookmark('zh',mark)
    expect(readBookmark('zh')).toEqual(mark)
    expect(readBookmark('en')).toBeNull()
    const blocks = ['标题','新插的段落','继续读这里'].map(text => {
      const p = document.createElement('p'); p.textContent = text; return p
    })
    expect(findBookmarkedBlock(blocks,mark)).toBe(2)
    expect(findBookmarkedBlock(blocks.slice(0,1),mark)).toBe(0)
  })
  it('未执行 JavaScript 时已输出可访问的内容链接', () => {
    const html = renderToString(<StudyRoom {...props} />)
    expect(html).toContain('href="/zh/posts"')
    expect(html).toContain('href="/zh/timeline"')
    expect(html).toContain('href="/zh/about"')
    expect(html).not.toContain('<canvas')
  })
  it('物件打开内容，保留真实链接、空态与焦点', async () => {
    await mount()
    await click('书架 · 文章')
    expect(window.location.search).toBe('?room=bookshelf')
    expect(document.querySelector('[role="dialog"]')).toBeTruthy()
    expect(document.querySelector('[role="dialog"]')!.textContent).toContain('内容服务暂不可用')
    expect(document.activeElement?.getAttribute('aria-label')).toBe('关闭并返回')
    expect(mocked.targets).toContain('bookshelf')
    expect(document.querySelector('[role="dialog"] a')?.getAttribute('href')).toBe('/zh/posts')
  })
  it('直达房间内容关闭时留在本站，并恢复默认视角', async () => {
    window.history.replaceState(null, '', '/zh?room=diary')
    await mount()
    expect(document.querySelector('[role="dialog"]')?.textContent).toContain('日常')
    await click('关闭并返回')
    expect(window.location.pathname).toBe('/zh')
    expect(window.location.search).toBe('')
    expect(document.querySelector('[role="dialog"]')).toBeNull()
    expect(mocked.targets.at(-1)).toBeNull()
  })
  it('抽屉滑到位才展示收藏，返回后迟到的打开通知不能重新弹窗', async () => {
    window.history.replaceState(null, '', '/zh?room=drawer')
    await mount()
    expect(document.body.textContent).toContain('正在拉开抽屉')
    expect(document.querySelector('[role="dialog"]')).toBeNull()
    await act(async () => finishDrawerSlide())
    expect(document.querySelector('[role="dialog"] h2')?.textContent).toBe('抽屉里的收藏')
    expect(Array.from(document.querySelectorAll('[role="dialog"] a'), a => a.getAttribute('href')))
      .toEqual(['/zh/columns', '/zh/links'])
    await click('关闭并返回')
    await act(async () => finishDrawerSlide())
    expect(document.querySelector('[role="dialog"]')).toBeNull()
    expect(mocked.targets.at(-1)).toBeNull()
  })
  it('WebGL 启动失败时文字入口和物件内容仍可使用', async () => {
    mocked.fail = true
    await mount()
    expect(document.querySelector('[role="status"]')?.textContent).toContain('暂未打开')
    expect(document.querySelector('a[href="/zh/posts"]')).toBeTruthy()
    await click('日记 · 日常')
    expect(document.querySelector('[role="dialog"] a')?.getAttribute('href')).toBe('/zh/timeline')
  })
  it('简洁模式偏好保留正常内容入口', async () => {
    localStorage.setItem('study-simple', 'true')
    await mount()
    expect(document.body.textContent).toContain('进入 3D 书房')
    expect(document.querySelector('[role="status"]')).toBeNull()
    expect(document.querySelector('a[href="/zh/posts"]')).toBeTruthy()
  })
  it('浏览器历史变动清除内容，拒绝未知物件参数', async () => {
    await mount()
    await click('书架 · 文章')
    await act(async () => {
      window.history.replaceState(null, '', '/zh?room=unknown')
      window.dispatchEvent(new PopStateEvent('popstate'))
    })
    expect(document.querySelector('[role="dialog"]')).toBeNull()
    expect(isDestination('constructor')).toBe(false)
    expect(isDestination(null)).toBe(false)
  })
  it('直接点击画框进入相册，Esc 关闭后焦点回到导航', async () => {
    await mount()
    expect(document.body.textContent).not.toContain('哪里可以点')
    await act(async () => pickItem('album'))
    expect(document.querySelector('[role="dialog"]')?.textContent).toContain('目前还没有可展示的日常照片')
    expect(window.location.search).toBe('?room=album')
    await act(async () => {
      const returned = new Promise<void>(resolve => window.addEventListener('popstate', () => resolve(), { once: true }))
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
      await returned
    })
    expect(document.querySelector('[role="dialog"]')).toBeNull()
    expect(document.activeElement).toBe(document.querySelector('[data-room-menu]'))
  })
  it('画框按公开记录展示去重照片，支持大图翻页和回到对应缩略图', async () => {
    await mount({ timeline: [
      {id:'day', year:'2026', titleZh:'窗边', titleEn:'Window', descZh:'', descEn:'', order:0,
        images:['/one.webp', '/one.webp', '', '/two.webp'], createdAt:'2026-06-10T12:00:00Z'},
    ] })
    await act(async () => pickItem('album'))
    expect(document.querySelector('[role="dialog"] h2')?.textContent).toBe('相册')
    expect(document.querySelectorAll('button[aria-label^="查看第"]')).toHaveLength(2)
    await click('查看第 1 张照片，窗边')
    await act(async () => { await import('@/components/media/MediaViewer') })
    const lightbox = document.querySelector('[aria-label="媒体浏览器"]')!
    expect(lightbox.textContent).toContain('2026-06-10')
    await click('下一项')
    expect(lightbox.textContent).toContain('2 / 2')
    await click('关闭预览')
    await vi.waitFor(async () => {
      await act(async () => { await new Promise(resolve => window.setTimeout(resolve, 20)) })
      expect(document.querySelector('[aria-label="媒体浏览器"]')).toBeNull()
    })
    expect(document.activeElement?.getAttribute('aria-label')).toBe('查看第 2 张照片，窗边')
  })
  it('纸本双页翻动后再点开详情，退出详情保留页码和焦点', async () => {
    window.history.replaceState(null, '', '/zh?room=diary')
    await mount({ timeline: journalEntries })
    const dialog = document.querySelector('[role="dialog"]')!
    expect(dialog.querySelectorAll('button[aria-label^="阅读第"]')).toHaveLength(2)
    expect(dialog.querySelector('button[aria-label="上一页日记"]')?.getAttribute('aria-disabled')).toBe('true')
    expect(dialog.querySelectorAll('img')).toHaveLength(1)
    expect(dialog.querySelector('[aria-label="日记详情"]')).toBeNull()
    await click('下一页日记')
    // Repeated clicks while a leaf is in flight must not skip another spread.
    await click('下一页日记')
    await finishJournalTurn()
    expect(dialog.querySelector('button[aria-label="阅读第 3 页：散步回来"]')).toBeTruthy()
    expect(dialog.querySelector('button[aria-label="下一页日记"]')?.getAttribute('aria-disabled')).toBe('true')
    await click('阅读第 3 页：散步回来')
    expect(dialog.querySelector('[aria-label="日记详情"] h3')?.textContent).toBe('散步回来')
    expect(dialog.querySelector('[aria-label="日记详情"] p')?.textContent).toBe('第三篇的完整内容')
    expect(document.activeElement?.textContent).toBe('← 返回日记')
    await act(async () => { document.activeElement!.dispatchEvent(new KeyboardEvent('keydown', {key:'Escape', bubbles:true})) })
    expect(dialog.querySelector('[aria-label="日记详情"]')).toBeNull()
    expect(document.activeElement?.getAttribute('aria-label')).toBe('阅读第 3 页：散步回来')
    expect(window.location.search).toBe('?room=diary')
    await click('上一页日记')
    await finishJournalTurn()
    expect(dialog.querySelector('button[aria-label="阅读第 1 页：窗边的一天"]')).toBeTruthy()
    expect(dialog.querySelector('a[href="/zh/timeline"]')).toBeTruthy()
    await click('关闭并返回')
    expect(document.querySelector('[role="dialog"]')).toBeNull()
  })
  it('日记用站内预览打开原图和影音，关掉预览仍停在同一篇', async () => {
    await mount({timeline:[{...journalEntries[0], images:['/one.webp','/one.webp','', 'javascript:void(0)','/clip.mp4?version=1','/note.mp3']}]})
    await click('日记 · 日常')
    await click('阅读第 1 页：窗边的一天')
    const detail = document.querySelector('[aria-label="日记详情"]')!
    expect(detail.querySelectorAll('button[aria-label^="预览第"]')).toHaveLength(3)
    expect(detail.querySelector('a[target="_blank"]')).toBeNull()
    await click('预览第 2 项')
    await act(async () => { await import('@/components/media/MediaViewer') })
    const viewer = document.querySelector('[aria-label="媒体浏览器"]')!
    expect(viewer.querySelector('video source')?.getAttribute('src')).toBe('/clip.mp4?version=1')
    await click('下一项')
    expect(viewer.querySelector('audio')?.getAttribute('src')).toBe('/note.mp3')
    await act(async () => { viewer.querySelector('[tabindex]')!.dispatchEvent(new KeyboardEvent('keydown', {key:'Escape',code:'Escape',bubbles:true})) })
    await vi.waitFor(async () => {
      await act(async () => { await new Promise(resolve => window.setTimeout(resolve, 20)) })
      expect(document.querySelector('[aria-label="媒体浏览器"]')).toBeNull()
    })
    expect(document.activeElement?.getAttribute('aria-label')).toBe('预览第 2 项')
    expect(document.querySelector('[aria-label="日记详情"]')).toBe(detail)
    await click('← 返回日记')
    expect(document.activeElement?.getAttribute('aria-label')).toBe('阅读第 1 页：窗边的一天')
  })
  it('日记去重并保留短标题，从初始关闭按钮也能按方向键翻到空白页', async () => {
    localStorage.setItem('study-motion', 'false')
    await mount({ timeline: [
      { ...journalEntries[0], titleZh:'哈哈', descZh:' 哈哈\n' },
      { ...journalEntries[1], titleZh:'', titleEn:'', descZh:'', images:['/photo.webp'] },
      { ...journalEntries[2], titleZh:'', titleEn:'', descZh:'' },
    ] })
    await click('日记 · 日常')
    const page = document.querySelector('button[aria-label="阅读第 1 页：哈哈"]')!
    expect(page.textContent?.match(/哈哈/g)).toHaveLength(1)
    expect(document.querySelector('button[aria-label="阅读第 2 页：影像手记"]')).toBeTruthy()
    expect(document.activeElement?.getAttribute('aria-label')).toBe('关闭并返回')
    const arrow = async (key: string) => act(async () => {
      document.activeElement!.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles:true }))
    })
    await arrow('ArrowRight')
    expect(document.querySelector('button[aria-label="阅读第 3 页：未题日记"]')?.textContent).toContain('尚未落笔')
    await arrow('ArrowLeft')
    expect(document.querySelector('button[aria-label="阅读第 1 页：哈哈"]')).toBeTruthy()
  })
  it('窄屏逐页翻阅，横向拖动不误开详情，关闭动态效果立即到页', async () => {
    localStorage.setItem('study-motion','false')
    Object.defineProperty(window, 'matchMedia', { configurable:true, value:(query:string) => ({matches:query.includes('max-width'), addEventListener:vi.fn(), removeEventListener:vi.fn()}) })
    await mount({timeline:journalEntries})
    await click('日记 · 日常')
    expect(document.querySelectorAll('button[aria-label^="阅读第"]')).toHaveLength(1)
    const pageButton = document.querySelector('button[aria-label="阅读第 1 页：窗边的一天"]')!
    const pointer = (type:string, x:number) => {
      const event = new MouseEvent(type,{bubbles:true,clientX:x,clientY:100,button:0})
      Object.defineProperties(event,{isPrimary:{value:true},pointerId:{value:1}})
      return event
    }
    await act(async () => { pageButton.dispatchEvent(pointer('pointerdown',270)); pageButton.dispatchEvent(pointer('pointerup',80)); pageButton.dispatchEvent(new MouseEvent('click',{bubbles:true,detail:1})) })
    expect(document.querySelector('[aria-label="日记详情"]')).toBeNull()
    expect(document.querySelector('button[aria-label="阅读第 2 页：在路上"]')).toBeTruthy()
    expect(document.querySelector('[data-turning-leaf]')).toBeNull()
    await click('下一页日记')
    expect(document.querySelector('button[aria-label="阅读第 3 页：散步回来"]')).toBeTruthy()
    await click('下一页日记')
    expect(document.querySelector('button[aria-label="阅读第 3 页：散步回来"]')).toBeTruthy()
  })
  it('看钟期间只有退回控件，推进、停留和退镜中都不能误开作品', async () => {
    await mount()
    await act(async () => pickItem('clock'))
    const back = document.activeElement as HTMLButtonElement
    expect(back.textContent).toContain('返回书房')
    expect(document.querySelector('[role="dialog"]')).toBeNull()
    expect(document.querySelector('[role="status"]')?.textContent).toBe('')
    await act(async () => pickItem('computer'))
    expect(window.location.search).toBe('')
    await act(async () => clockPhase('observing'))
    await act(async () => pickItem('diary'))
    expect(window.location.search).toBe('')
    await act(async () => window.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape'})))
    expect(back.disabled).toBe(true)
    await act(async () => pickItem('computer'))
    expect(window.location.search).toBe('')
    await act(async () => clockPhase('room'))
    expect(document.activeElement).toBe(document.querySelector('[data-room-menu]'))
    await act(async () => pickItem('computer'))
    expect(window.location.search).toBe('?room=computer')
    expect(document.querySelector('[role="dialog"] h2')?.textContent).toBe('作品')
  })
  it('指针按本地十二小时制顺时针走，跨午夜后归零', () => {
    const angles = clockHandAngles(new Date(2026,10,5,15,30,30))
    expect(angles.hour).toBeCloseTo(-2*Math.PI*(3 + 30.5/60)/12)
    expect(angles.minute).toBeCloseTo(-2*Math.PI*30.5/60)
    expect(angles.second).toBeCloseTo(-Math.PI)
    expect(clockHandAngles(new Date(2026,10,6,0,0,0)).hour).toBeCloseTo(0)
  })
  it.each([[5,59,true,6,5],[6,0,false,23,5],[22,59,false,23,5],[23,0,true,6,6]] as const)(
    '本地 %i:%i 的光照状态和下个切换点', (hour,minute,night,nextHour,nextDate) => {
      const period = localLightPeriod(new Date(2026,10,5,hour,minute))
      expect(period.night).toBe(night)
      expect(period.until).toBe(new Date(2026,10,nextDate,nextHour).getTime())
    })
  it('点钟下某一本书时优先展示对应专栏和详情链接', async () => {
    await mount()
    await act(async () => pickItem('columns', '代码笔记'))
    expect(window.location.search).toBe(`?room=columns&edition=${encodeURIComponent('代码笔记')}`)
    const panel = document.querySelector('[role="dialog"]')!
    expect(panel.querySelector('h2')?.textContent).toBe('专栏')
    const picked = panel.querySelector('a')!
    expect(picked.textContent).toContain('你选的这本 · 2 篇文章')
    expect(picked.textContent).toContain('从基础到实践')
    expect(picked.getAttribute('href')).toBe('/zh/columns/' + encodeURIComponent('代码笔记'))
    expect(panel.textContent).toContain('绘图手记')
  })
  it('专栏为空时保留专栏目录和退出入口', async () => {
    window.history.replaceState(null, '', '/en?room=columns')
    await mount({ locale: 'en', columns: [] })
    const panel = document.querySelector('[role="dialog"]')!
    expect(panel.querySelector('h2')?.textContent).toBe('Series')
    expect(panel.querySelector('a')?.getAttribute('href')).toBe('/en/columns')
    await click('Close and return')
    expect(document.querySelector('[role="dialog"]')).toBeNull()
  })
})
