import type { PerspectiveCamera, Scene } from 'three'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { createRoom } from '@/components/study/room-scene'

const { fovs, drawn } = vi.hoisted(() => ({ fovs: [] as number[], drawn: { scene: null as Scene | null } }))
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
    render(scene: Scene, camera: PerspectiveCamera) { drawn.scene = scene; fovs.push(camera.fov) }
  },
}))

beforeEach(() => { vi.useFakeTimers() })
afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  fovs.length = 0
  drawn.scene = null
})

function createTestRoom() {
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
  const phase = vi.fn(), settled = vi.fn()
  const room = createRoom(host, {
    categories: [], columns: [], projects: [], siteName: '墨千', seriesLabel: '专栏', en: false,
    onPortfolioFrame: noop, onShelfFrame: noop, onReady: noop, onPick: noop, onHover: noop,
    onError: () => { throw new Error('Room draw failed') }, onContextLost: noop,
    onReveal: noop, onSettled: settled, onClockView: phase, onNight: noop,
  })
  return { room, media, phase, settled }
}

it('animates the clock both ways with ambient motion off, and honors system reduced motion', () => {
  const { room, media, phase } = createTestRoom()
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

it('draws the drawer closed on cold entry, keeps it moving across stalls and reverses from its visible position', () => {
  let frameDelay = 3000
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) =>
    window.setTimeout(() => callback(performance.now()), frameDelay))
  vi.stubGlobal('cancelAnimationFrame', window.clearTimeout.bind(window))
  const { room, settled, media } = createTestRoom()
  try {
    room.setMotion(false)
    room.setTarget('drawer')
    vi.advanceTimersByTime(3000)
    const upper = drawn.scene!.getObjectsByProperty('type', 'Mesh')
      .find(mesh => mesh.userData.drawerIndex === 0)!.parent!
    expect(upper.position.z).toBe(0)
    expect(settled).not.toHaveBeenCalled()

    frameDelay = 16
    vi.advanceTimersByTime(3000)
    expect(upper.position.z).toBe(0)
    expect(settled).not.toHaveBeenCalled()
    vi.advanceTimersByTime(560)
    const opening = upper.position.z
    expect(opening).toBeGreaterThan(0)
    expect(settled).not.toHaveBeenCalled()

    room.setTarget(null)
    expect(upper.position.z).toBe(opening)
    vi.advanceTimersByTime(320)
    const closing = upper.position.z
    expect(closing).toBeGreaterThan(0)
    expect(closing).toBeLessThan(opening)

    room.setTarget('drawer')
    vi.advanceTimersByTime(400)
    expect(upper.position.z).toBeGreaterThan(closing)
    expect(settled).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1000)
    const fullyOpen = upper.position.z
    expect(fullyOpen).toBeGreaterThan(opening)
    expect(settled.mock.calls).toEqual([['drawer']])

    room.setTarget(null)
    vi.advanceTimersByTime(240)
    expect(upper.position.z).toBeGreaterThan(0)
    expect(upper.position.z).toBeLessThan(fullyOpen)
    media.matches = true
    vi.advanceTimersByTime(16)
    expect(upper.position.z).toBe(0)
    expect(settled).toHaveBeenLastCalledWith(null)
    room.setTarget('drawer')
    vi.advanceTimersByTime(16)
    expect(upper.position.z).toBe(fullyOpen)
    expect(settled).toHaveBeenLastCalledWith('drawer')
  } finally { room.dispose() }
})
