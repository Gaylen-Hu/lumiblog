import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import WebsiteCompanion from '@/components/companion/WebsiteCompanion'

const runtime = vi.hoisted(() => ({ mount: vi.fn() }))
vi.mock('@/components/companion/runtime/website-cat.js', () => ({ mountWebsiteCat: runtime.mount }))
const roomStage = vi.hoisted(() => ({ current: null as unknown, listeners: new Set<() => void>() }))
vi.mock('@/components/companion/room-stage', () => ({
  getRoomStage: () => roomStage.current,
  subscribeRoomStage: (listener: () => void) => { roomStage.listeners.add(listener); return () => roomStage.listeners.delete(listener) },
}))

type Options = { signal: AbortSignal; onVisibilityChange: (visible: boolean) => void; onChatOpenChange: (open: boolean) => void }
function controller() {
  return { destroy: vi.fn(), openChat: vi.fn(), setReading: vi.fn(), setHidden: vi.fn(),
    setSuspended: vi.fn(), setReducedMotion: vi.fn(), setRoomStage: vi.fn(), state: {} }
}
let app: Root | undefined
let small = false, reduced = false
let motionChanged: (() => void) | undefined
let widthChanged: (() => void) | undefined
let control: ReturnType<typeof controller>

async function mount(reading = false) {
  await act(async () => {
    app = createRoot(document.body.appendChild(document.createElement('div')))
    app.render(<WebsiteCompanion locale="zh" reading={reading} />)
  })
}
async function tick() {
  await act(async () => { await vi.advanceTimersByTimeAsync(1250) })
}
async function click(label: string) {
  const button = Array.from(document.querySelectorAll('button')).find(node => node.getAttribute('aria-label') === label || node.textContent === label)
  expect(button).toBeTruthy()
  await act(async () => button!.click())
}

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  document.body.innerHTML = ''; localStorage.clear()
  roomStage.current = null; roomStage.listeners.clear()
  small = false; reduced = false; motionChanged = widthChanged = undefined
  Object.defineProperty(document, 'hidden', { configurable: true, value: false })
  Object.defineProperty(window, 'requestIdleCallback', { configurable: true, value: undefined })
  Object.defineProperty(window, 'matchMedia', { configurable: true, value: (query: string) => ({
    get matches() { return query.includes('reduced-motion') ? reduced : small },
    addEventListener: (_name: string, fn: () => void) => { if (query.includes('reduced-motion')) motionChanged = fn; else widthChanged = fn },
    removeEventListener: vi.fn(),
  }) })
  control = controller(); runtime.mount.mockReset().mockResolvedValue(control)
  vi.useFakeTimers()
})
afterEach(async () => {
  if (app) await act(async () => app!.unmount())
  app = undefined
  vi.useRealTimers(); vi.restoreAllMocks()
})

describe('website companion lifecycle', () => {
  it('SSR stays empty and desktop model loading yields to the page first', async () => {
    expect(renderToString(<WebsiteCompanion locale="zh" reading={false} />)).toBe('')
    expect(runtime.mount).not.toHaveBeenCalled()
    await mount()
    expect(runtime.mount).not.toHaveBeenCalled()
    await tick()
    expect(runtime.mount).toHaveBeenCalledOnce()
    expect(runtime.mount.mock.calls[0][0]).toMatchObject({ apiBase: '/api/companion', mobile: false, initialHidden: false })
    expect(control.setReading).toHaveBeenLastCalledWith(false)
  })

  it('mobile only loads after summoning and has no permanent chat button', async () => {
    small = true
    await mount(true); await tick()
    expect(runtime.mount).not.toHaveBeenCalled()
    expect(document.body.textContent).not.toContain('聊聊')
    await click('唤回小灰')
    expect(runtime.mount).toHaveBeenCalledOnce()
    expect(runtime.mount.mock.calls[0][0]).toMatchObject({ mobile: true, apiBase: '/api/companion' })
    expect(control.setReading).toHaveBeenLastCalledWith(true)
  })

  it('shows a paw trail only for slow loads and cancels it when dismissed', async () => {
    small = true
    let finish!: (value: ReturnType<typeof controller>) => void
    runtime.mount.mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
    await mount()
    await click('唤回小灰')
    const { signal } = runtime.mount.mock.calls[0][0] as Options
    await act(async () => { await vi.advanceTimersByTimeAsync(349) })
    expect(document.querySelector('[role="status"]')).toBeNull()
    await act(async () => { await vi.advanceTimersByTimeAsync(1) })
    expect(document.querySelector('[role="status"]')).toHaveTextContent('小灰正在过来')
    expect(document.querySelector('[role="status"]')?.parentElement?.querySelectorAll('svg')).toHaveLength(3)
    await click('稍后再来')
    expect(signal.aborted).toBe(true)
    expect(document.querySelector('[role="status"]')).toBeNull()
    await act(async () => finish(control))
    expect(control.destroy).toHaveBeenCalledOnce()
    await click('唤回小灰')
    expect(runtime.mount).toHaveBeenCalledTimes(2)
    await tick()
    expect(document.querySelector('[role="status"]')).toBeNull()
    expect(document.querySelector('[data-companion-keyboard-entry]')).toHaveTextContent('和小灰说句话')
  })
  it('a resize into mobile before the desktop idle delay cancels automatic loading', async () => {
    await mount()
    small = true
    await act(async () => widthChanged?.())
    await tick()
    expect(runtime.mount).not.toHaveBeenCalled()
    await click('唤回小灰')
    expect(runtime.mount.mock.calls[0][0]).toMatchObject({ mobile: true })
  })

  it('respects saved hiding and restores the same runtime after a manual fold', async () => {
    localStorage.setItem('blog:companion:hidden', 'true')
    await mount(); await tick()
    expect(runtime.mount).not.toHaveBeenCalled()
    await click('唤回小灰')
    const options = runtime.mount.mock.calls[0][0] as Options
    await act(async () => options.onVisibilityChange(false))
    expect(localStorage.getItem('blog:companion:hidden')).toBe('true')
    await click('唤回小灰')
    expect(control.setHidden).toHaveBeenLastCalledWith(false)
    expect(localStorage.getItem('blog:companion:hidden')).toBe('false')
    expect(runtime.mount).toHaveBeenCalledOnce()
  })

  it('keeps one runtime across reading transitions and follows reduced motion', async () => {
    await mount(); await tick()
    await act(async () => app!.render(<WebsiteCompanion locale="zh" reading />))
    expect(control.setReading).toHaveBeenLastCalledWith(true)
    reduced = true
    await act(async () => motionChanged?.())
    expect(control.setReducedMotion).toHaveBeenLastCalledWith(true)
    expect(runtime.mount).toHaveBeenCalledOnce()
    expect(control.destroy).not.toHaveBeenCalled()
  })

  it('moves the same cat into a late room and back to reading without reloading it', async () => {
    await mount(); await tick()
    const room = { id: 'room-generation-1' }
    await act(async () => { roomStage.current = room; roomStage.listeners.forEach(listener => listener()) })
    expect(control.setRoomStage).toHaveBeenLastCalledWith(room)
    await act(async () => app!.render(<WebsiteCompanion locale="zh" reading />))
    expect(control.setRoomStage).toHaveBeenLastCalledWith(null)
    await act(async () => app!.render(<WebsiteCompanion locale="zh" reading={false} />))
    expect(control.setRoomStage).toHaveBeenLastCalledWith(room)
    await act(async () => { roomStage.current = null; roomStage.listeners.forEach(listener => listener()) })
    expect(control.setRoomStage).toHaveBeenLastCalledWith(null)
    expect(runtime.mount).toHaveBeenCalledOnce()
    expect(control.destroy).not.toHaveBeenCalled()
  })

  it('chooses the latest room when model loading finishes and unsubscribes on unmount', async () => {
    let resolve!: (value: ReturnType<typeof controller>) => void
    runtime.mount.mockImplementation(() => new Promise(value => { resolve = value }))
    await mount(); await tick()
    const room = { id: 'room-generation-2' }
    roomStage.current = room
    await act(async () => resolve(control))
    expect(control.setRoomStage).toHaveBeenLastCalledWith(room)
    await act(async () => app!.unmount()); app = undefined
    expect(roomStage.listeners.size).toBe(0)
    expect(control.destroy).toHaveBeenCalledOnce()
  })

  it('suspends for page visibility and real modals, without persisting user hiding', async () => {
    await mount(); await tick()
    Object.defineProperty(document, 'hidden', { configurable: true, value: true })
    await act(async () => document.dispatchEvent(new Event('visibilitychange')))
    expect(control.setSuspended).toHaveBeenLastCalledWith(true)
    expect(localStorage.getItem('blog:companion:hidden')).toBeNull()
    Object.defineProperty(document, 'hidden', { configurable: true, value: false })
    await act(async () => document.dispatchEvent(new Event('visibilitychange')))
    expect(control.setSuspended).toHaveBeenLastCalledWith(false)
    const dialog = document.createElement('section'); dialog.setAttribute('aria-modal', 'true')
    await act(async () => document.body.append(dialog))
    expect(control.setSuspended).toHaveBeenLastCalledWith(true)
    await act(async () => dialog.remove())
    expect(control.setSuspended).toHaveBeenLastCalledWith(false)
    const native = document.createElement('dialog'); native.setAttribute('aria-modal', 'true')
    await act(async () => document.body.append(native))
    expect(control.setSuspended).toHaveBeenLastCalledWith(false)
    await act(async () => native.setAttribute('open', ''))
    expect(control.setSuspended).toHaveBeenLastCalledWith(true)
    await act(async () => native.removeAttribute('open'))
    expect(control.setSuspended).toHaveBeenLastCalledWith(false)
  })

  it('does not treat the article reader or an open catalog article as blocking modals', async () => {
    await mount(true); await tick()
    const reader = document.createElement('section'); reader.className = 'study-magazine'; reader.setAttribute('aria-modal', 'true')
    const catalog = document.createElement('section'); catalog.setAttribute('aria-modal', 'true')
    catalog.innerHTML = '<section data-open="true"><article data-article-scroll></article></section>'
    await act(async () => { document.body.append(reader, catalog) })
    expect(control.setSuspended).toHaveBeenLastCalledWith(false)
    await act(async () => catalog.querySelector('section')!.setAttribute('inert', ''))
    expect(control.setSuspended).toHaveBeenLastCalledWith(true)
  })

  it('keeps chat focus markers in sync without leaking keyboard shortcuts to the room', async () => {
    await mount(); await tick()
    const options = runtime.mount.mock.calls[0][0] as Options
    await act(async () => options.onChatOpenChange(true))
    expect(document.querySelector('[data-companion-root]')).toHaveAttribute('data-companion-chat-open', 'true')
    await act(async () => app!.render(<WebsiteCompanion locale="zh" reading />))
    expect(document.querySelector('[data-companion-root]')).toHaveAttribute('data-companion-chat-open', 'true')
    await act(async () => options.onChatOpenChange(false))
    expect(document.querySelector('[data-companion-root]')).toHaveAttribute('data-companion-chat-open', 'false')
  })

  it('aborts an unfinished load and destroys a late result after unmount', async () => {
    let resolve!: (value: typeof control) => void
    runtime.mount.mockImplementationOnce(() => new Promise(done => { resolve = done }))
    await mount(); await tick()
    const { signal } = runtime.mount.mock.calls[0][0] as Options
    await act(async () => app!.unmount()); app = undefined
    expect(signal.aborted).toBe(true)
    await act(async () => resolve(control))
    expect(control.destroy).toHaveBeenCalledOnce()
  })

  it('contains model failures locally and offers a retry', async () => {
    runtime.mount.mockRejectedValueOnce(Error('WebGL failed'))
    await mount(); await tick()
    expect(document.body.textContent).toContain('小灰暂时没能过来')
    await click('再试一次')
    expect(runtime.mount).toHaveBeenCalledTimes(2)
    expect(document.body.textContent).not.toContain('小灰暂时没能过来')
    await act(async () => app!.unmount()); app = undefined
    expect(control.destroy).toHaveBeenCalledOnce()
  })
})
