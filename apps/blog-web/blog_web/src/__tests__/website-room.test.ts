import { afterEach, describe, expect, it, vi } from 'vitest'
import { executeRoomAction, getRoomActions, getWebsiteRoomState, registerWebsiteRoom, type RoomActionResult } from '@/components/companion/website-room'

const cleanups: Array<() => void> = []
afterEach(() => { cleanups.splice(0).reverse().forEach(cleanup => cleanup()) })

describe('website room capabilities', () => {
  it('advertises only live actions, rejects arbitrary instructions, and returns independent snapshots', async () => {
    const state = { ceilingOn: false, lampOn: true, curtainsClosed: false }
    let available = true
    const execute = vi.fn((): RoomActionResult => ({ status: 'succeeded' }))
    cleanups.push(registerWebsiteRoom({ getState: () => available ? state : null, execute }))
    expect(getRoomActions()).toContain('lamp_auto')
    const snapshot = getWebsiteRoomState()!
    snapshot.lampOn = false
    expect(getWebsiteRoomState()?.lampOn).toBe(true)
    expect((await executeRoomAction('document.querySelector("button").click()')).status).toBe('blocked')
    expect(execute).not.toHaveBeenCalled()
    available = false
    expect(getRoomActions()).toEqual([])
    expect(getWebsiteRoomState()).toBeNull()
    expect((await executeRoomAction('lamp_on')).status).toBe('blocked')
    expect(execute).not.toHaveBeenCalled()
  })

  it('does not let a stale room remove its replacement or claim delayed success', async () => {
    const state = { ceilingOn: false, lampOn: false, curtainsClosed: false }
    let finish!: (result: RoomActionResult) => void
    const removeFirst = registerWebsiteRoom({ getState: () => state,
      execute: () => new Promise(resolve => { finish = resolve }) })
    cleanups.push(removeFirst)
    const pending = executeRoomAction('lamp_on')
    cleanups.push(registerWebsiteRoom({ getState: () => ({ ...state, lampOn: true }), execute: () => ({ status: 'succeeded' }) }))
    removeFirst()
    expect(getWebsiteRoomState()?.lampOn).toBe(true)
    finish({ status: 'succeeded' })
    expect((await pending).status).toBe('cancelled')
    expect((await executeRoomAction('lamp_on')).status).toBe('succeeded')
  })

  it('reports an unconfirmed operation without inventing success', async () => {
    cleanups.push(registerWebsiteRoom({
      getState: () => ({ ceilingOn: false, lampOn: false, curtainsClosed: false }),
      execute() { throw new Error('renderer failed') },
    }))
    expect((await executeRoomAction('curtains_close')).status).toBe('unknown')
  })
})
