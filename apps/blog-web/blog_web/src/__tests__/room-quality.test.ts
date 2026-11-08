import { describe, expect, it } from 'vitest'
import { RoomFrameBudget, roomPixelRatio } from '@/components/study/room-quality'

describe('持续性能预算', () => {
  it('稳定 30 FPS 不触发性能提示', () => {
    const fallback = new RoomFrameBudget()
    let disableAnimation = false
    for (let i = 0; i < 130; i++) {
      disableAnimation ||= fallback.sample(1000/30, true)
    }
    expect(disableAnimation).toBe(false)
  })
  it('短暂卡顿不提示，连续三个低帧率窗口才提示', () => {
    const budget = new RoomFrameBudget()
    for (let i = 0; i < 600; i++) expect(budget.sample(16.7, true)).toBe(false)
    for (let i = 0; i < 119; i++) expect(budget.sample(50, true)).toBe(false)
    expect(budget.sample(50, true)).toBe(true)
  })
  it('正常帧率、空闲走钟和无效采样打断低帧计数', () => {
    for (const [delta, animated] of [[16.7, true], [1000, false], [NaN, true]] as const) {
      const budget = new RoomFrameBudget()
      for (let i = 0; i < 40; i++) budget.sample(50, true)
      if (delta === 16.7) for (let i = 0; i < 120; i++) budget.sample(delta, animated)
      else budget.sample(delta, animated)
      for (let i = 0; i < 40; i++) expect(budget.sample(50, true)).toBe(false)
    }
  })
  it('持续的整秒长帧也计入提示阈值', () => {
    const budget = new RoomFrameBudget()
    for (let i = 0; i < 5; i++) expect(budget.sample(1000, true)).toBe(false)
    expect(budget.sample(1000, true)).toBe(true)
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
