import { expect, it } from 'vitest'
import { CurtainMotion } from '@/components/study/curtain'

it('keeps momentum on reversal, lets the hem follow and stops updating at rest', () => {
  const cloth = new CurtainMotion()
  cloth.drawn = true
  for (let i = 0; i < 12; i++) cloth.step(16, false)
  expect(cloth.hem.position).toBeLessThan(cloth.heading.position)
  const before = cloth.heading.position
  cloth.drawn = false
  cloth.step(8, false)
  expect(cloth.heading.position).toBeGreaterThan(before)
  for (let i = 0; i < 180; i++) cloth.step(16, false)
  expect(cloth.hem.position).toBe(0)
  expect(cloth.step(16, false)).toBe(false)

  cloth.drawn = true
  cloth.step(16, true)
  expect(cloth.hem.position).toBe(1)
  expect(cloth.step(16, true)).toBe(false)
})
