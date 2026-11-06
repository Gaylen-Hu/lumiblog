import { describe, expect, it } from 'vitest'
import { cityTime, resolveEnvironment, solarTimes } from '@/components/study/environment/state'

describe('Hangzhou environment', () => {
  it('derives the Hangzhou date across UTC midnight boundaries independently of host timezone', () => {
    expect(cityTime(Date.parse('2026-12-31T16:00:00Z'))).toMatchObject({ year: 2027, month: 1, day: 1, hour: 0 })
    expect(cityTime(Date.parse('2026-11-05T07:30:00Z'))).toMatchObject({ hour: 15, minute: 30 })
  })
  it('uses half-open solar boundaries rather than host clock hours', () => {
    const { sunrise, sunset } = solarTimes(Date.parse('2026-11-05T07:00:00Z'))
    for (const [time, phase] of [[sunrise-1800001,'night'],[sunrise-1800000,'morning'],[sunrise+5400000,'day'],[sunset-3600000,'dusk'],[sunset+1800000,'night']] as const) {
      expect(resolveEnvironment(time, 'auto').phase).toBe(phase)
    }
    expect(sunrise).toBeLessThan(sunset)
    expect(cityTime(sunrise).hour).toBeGreaterThanOrEqual(5)
    expect(cityTime(sunset).hour).toBeLessThanOrEqual(18)
  })
  it('keeps weather and season independent and presets local to resolved output', () => {
    const epoch = Date.parse('2026-07-05T07:00:00Z')
    expect(resolveEnvironment(epoch, 'auto', 'rain')).toMatchObject({ weather: 'rain', season: 'summer' })
    expect(resolveEnvironment(epoch, 'snow', 'clear')).toMatchObject({ weather: 'snow', season: 'winter' })
    expect(resolveEnvironment(epoch, 'auto', 'clear')).toMatchObject({ weather: 'clear', season: 'summer' })
  })
})
