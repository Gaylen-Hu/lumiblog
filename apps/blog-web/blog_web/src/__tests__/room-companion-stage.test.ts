import { afterEach, describe, expect, it, vi } from 'vitest'
import { getRoomStage, registerRoomStage, subscribeRoomStage, type RoomStage } from '@/components/companion/room-stage'

const cleanups: Array<() => void> = []
afterEach(() => { cleanups.splice(0).reverse().forEach(cleanup => cleanup()) })

describe('room companion registration', () => {
  it('keeps the replacement room when a stale scene finishes disposing', () => {
    const first = {} as RoomStage, replacement = {} as RoomStage
    const listener = vi.fn()
    cleanups.push(subscribeRoomStage(listener))
    const removeFirst = registerRoomStage(first)
    cleanups.push(removeFirst)
    const removeReplacement = registerRoomStage(replacement)
    cleanups.push(removeReplacement)
    expect(getRoomStage()).toBe(replacement)
    removeFirst()
    expect(getRoomStage()).toBe(replacement)
    expect(listener).toHaveBeenCalledTimes(2)
    removeReplacement()
    expect(getRoomStage()).toBeNull()
    expect(listener).toHaveBeenLastCalledWith(null)
  })

  it('releases subscriptions without retaining an unmounted companion', () => {
    const listener = vi.fn()
    const unsubscribe = subscribeRoomStage(listener)
    unsubscribe()
    cleanups.push(registerRoomStage({} as RoomStage))
    expect(listener).not.toHaveBeenCalled()
  })
})
