import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import StudyRoom from '@/components/study/StudyRoom'
import { isDestination } from '@/components/study/model'

const mocked = vi.hoisted(() => ({ fail: false, disposed: 0, targets: [] as (string | null)[] }))
vi.mock('@/components/study/room-scene', () => ({
  createRoom: (_host: HTMLElement, options: { onReady: () => void; onSettled: (d: string | null) => void }) => {
    if (mocked.fail) throw new Error('WebGL unavailable')
    options.onReady()
    return {
      setMotion: vi.fn(),
      setPaused: vi.fn(),
      setTarget: (d: string | null) => { mocked.targets.push(d); queueMicrotask(() => options.onSettled(d)) },
      dispose: () => { mocked.disposed++ },
    }
  },
}))

const props = { locale: 'zh', name: '测试书房', bio: '个人介绍', posts: [], projects: [], timeline: [] }
let root: Root
async function mount() {
  await act(async () => { root = createRoot(document.body.appendChild(document.createElement('div'))); root.render(<StudyRoom {...props} />) })
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
  mocked.fail = false; mocked.disposed = 0; mocked.targets = []
})
afterEach(async () => { if (root) await act(async () => root.unmount()) })

describe('书房的内容与恢复流程', () => {
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
})
