import { describe, expect, it } from 'vitest'
import { RoomFrameBudget, roomPixelRatio } from '@/components/study/room-quality'

describe('持续性能预算', () => {
  it('短暂卡顿不切档，运行一段时间后连续低帧率仍可触发降级', () => {
    const budget = new RoomFrameBudget()
    for (let i = 0; i < 600; i++) expect(budget.sample(16.7, true)).toBe(false)
    for (let i = 0; i < 79; i++) expect(budget.sample(50, true)).toBe(false)
    expect(budget.sample(50, true)).toBe(true)
  })
  it('正常帧率、暂停、空闲走钟和异常大步长打断低帧率计数', () => {
    for (const [delta, animated] of [[16.7, true], [1000, false], [1000, true], [NaN, true]] as const) {
      const budget = new RoomFrameBudget()
      for (let i = 0; i < 40; i++) budget.sample(50, true)
      if (delta === 16.7) for (let i = 0; i < 120; i++) budget.sample(delta, animated)
      else budget.sample(delta, animated)
      for (let i = 0; i < 40; i++) expect(budget.sample(50, true)).toBe(false)
    }
  })
  it('暂停恢复会清空上一段采样，不累计后台时间', () => {
    const budget = new RoomFrameBudget()
    for (let i = 0; i < 70; i++) budget.sample(50, true)
    budget.reset()
    for (let i = 0; i < 40; i++) expect(budget.sample(50, true)).toBe(false)
  })
  it('手机与手动轻量限制像素比，处理异常设备值', () => {
    expect(roomPixelRatio(3, true, false)).toBe(1.5)
    expect(roomPixelRatio(3, false, false)).toBe(2)
    expect(roomPixelRatio(3, false, true)).toBe(1)
    expect(roomPixelRatio(.8, false, true)).toBe(.8)
    expect(roomPixelRatio(NaN, false, false)).toBe(1)
  })
})
