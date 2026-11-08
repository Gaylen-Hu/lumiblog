import type { PerspectiveCamera, Scene } from 'three'
import { afterEach, expect, it, vi } from 'vitest'
import { createRoom } from '@/components/study/room-scene'

const { fovs } = vi.hoisted(() => ({ fovs: [] as number[] }))
// Exercise the room's real camera and frame loop. Only drawing needs a GPU.
vi.mock('three', async importOriginal => ({
  ...await importOriginal<typeof import('three')>(),
  WebGLRenderer: class {
    domElement = document.createElement('canvas')
    shadowMap = {}
    capabilities = { getMaxAnisotropy: () => 1 }
    setPixelRatio() {}
    setSize() {}
    dispose() {}
    forceContextLoss() {}
    render(_scene: Scene, camera: PerspectiveCamera) { fovs.push(camera.fov) }
  },
}))

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  fovs.length = 0
})

it('animates the clock both ways with ambient motion off, and honors system reduced motion', () => {
  vi.useFakeTimers()
  const media = { matches: false }
  vi.stubGlobal('matchMedia', () => media)
  vi.stubGlobal('Path2D', class {})
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} })
  const noop = () => {}
  const gradient = () => ({ addColorStop: noop })
  const context = new Proxy({ measureText: () => ({ width: 12 }), createRadialGradient: gradient, createLinearGradient: gradient }, {
    get(target, key) { return Reflect.get(target, key) ?? noop },
  })
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context as unknown as CanvasRenderingContext2D)
  const host = document.createElement('div')
  vi.spyOn(host, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 1100, 720))
  const phase = vi.fn()
  const room = createRoom(host, {
    categories: [], columns: [], projects: [], siteName: '墨千', seriesLabel: '专栏', en: false,
    onPortfolioFrame: noop, onShelfFrame: noop, onReady: noop, onPick: noop, onHover: noop,
    onError: () => { throw new Error('Room draw failed') }, onContextLost: noop, onQuality: noop,
    onReveal: noop, onSettled: noop, onClockView: phase, onNight: noop,
  })
  try {
    room.setMotion(false)
    vi.advanceTimersByTime(32)
    const wide = fovs.at(-1)!
    room.inspectClock()
    vi.advanceTimersByTime(600)
    const approaching = fovs.at(-1)!
    expect(phase).toHaveBeenLastCalledWith('approaching')
    vi.advanceTimersByTime(700)
    const close = fovs.at(-1)!
    expect(approaching).toBeGreaterThan(close)
    expect(approaching).toBeLessThan(wide)
    expect(phase).toHaveBeenLastCalledWith('observing')
    room.leaveClock()
    vi.advanceTimersByTime(500)
    expect(fovs.at(-1)).toBeGreaterThan(close)
    expect(fovs.at(-1)).toBeLessThan(wide)
    expect(phase).toHaveBeenLastCalledWith('returning')
    vi.advanceTimersByTime(600)
    expect(fovs.at(-1)).toBe(wide)
    expect(phase).toHaveBeenLastCalledWith('room')

    media.matches = true
    room.inspectClock()
    vi.advanceTimersByTime(16)
    expect(fovs.at(-1)).toBe(close)
    room.leaveClock()
    vi.advanceTimersByTime(16)
    expect(fovs.at(-1)).toBe(wide)
  } finally { room.dispose() }
})
