import type { Group, PerspectiveCamera } from 'three'

export type RoomDestination =
  | { kind: 'ground'; point: { x: number; z: number } }
  | { kind: 'surface'; surface: 'chair' | 'table' }

export interface RoomStageDriver {
  /** Advance the cat, returning true while another room frame is needed. */
  update(dtSeconds: number): boolean
  /** Runs immediately on attachment and when the room becomes unavailable. */
  setActive?(active: boolean): void
  /** Receives a plain tap only after existing room-object picking declines it. */
  onTap?(event: PointerEvent): boolean
}

export interface RoomStage {
  /** World origin (0, .06, 0), uniform scale 1.35; all destinations are local. */
  readonly root: Group
  readonly camera: PerspectiveCamera
  readonly canvas: HTMLCanvasElement
  readonly active: boolean
  /** Includes both the website motion setting and the OS preference. */
  readonly reducedMotion: boolean
  setDriver(driver: RoomStageDriver): () => void
  requestRender(): void
  pickDestination(clientX: number, clientY: number): RoomDestination | null
  /** A cat hit must be closer than the room's visible opaque furniture. */
  hitCat(clientX: number, clientY: number): boolean
}

type Listener = (stage: RoomStage | null) => void
let current: RoomStage | null = null
const listeners = new Set<Listener>()

export function getRoomStage(): RoomStage | null { return current }

export function subscribeRoomStage(listener: Listener): () => void {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

export function registerRoomStage(stage: RoomStage): () => void {
  current = stage
  for (const listener of listeners) listener(current)
  return () => {
    // A late teardown from an older room must not unregister its replacement.
    if (current !== stage) return
    current = null
    for (const listener of listeners) listener(null)
  }
}
