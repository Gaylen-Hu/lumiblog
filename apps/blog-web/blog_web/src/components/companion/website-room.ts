export const roomActions = [
  'ceiling_on', 'ceiling_off', 'lamp_on', 'lamp_off', 'lamp_auto', 'curtains_open', 'curtains_close',
] as const
export type RoomAction = typeof roomActions[number]
export type WebsiteRoomState = { ceilingOn: boolean; lampOn: boolean; curtainsClosed: boolean }
export type RoomActionResult = { status: 'succeeded' | 'blocked' | 'cancelled' | 'unknown'; reason?: string }
type RoomProvider = {
  getState(): WebsiteRoomState | null
  execute(action: RoomAction): RoomActionResult | Promise<RoomActionResult>
}

let current: RoomProvider | null = null

/** Owned by StudyRoom, independently of where the companion is displayed. */
export function registerWebsiteRoom(provider: RoomProvider): () => void {
  current = provider
  return () => { if (current === provider) current = null }
}

export function getWebsiteRoomState(): WebsiteRoomState | null {
  const state = current?.getState()
  return state ? { ...state } : null
}

export function getRoomActions(): string[] {
  return getWebsiteRoomState() ? [...roomActions] : []
}

export async function executeRoomAction(value: string): Promise<RoomActionResult> {
  if (!(roomActions as readonly string[]).includes(value)) return { status: 'blocked', reason: '这个房间操作尚未开放。' }
  const provider = current
  if (!provider?.getState()) return { status: 'blocked', reason: '3D 书房暂未就绪，当前无法调整灯光或窗帘。' }
  try {
    const result = await provider.execute(value as RoomAction)
    if (current !== provider || !provider.getState()) return { status: 'cancelled', reason: '房间已关闭，这次操作已停止。' }
    return result
  } catch {
    return { status: 'unknown', reason: '暂时无法确认房间操作的结果。' }
  }
}
