import { act, renderHook, waitFor } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { useEnvironment } from '@/components/study/environment/useEnvironment'

it('uses city weather by default and keeps a local override across updates and reloads', async () => {
  sessionStorage.clear()
  let condition = 'rain'
  vi.stubGlobal('fetch', vi.fn(async () => Response.json({
    serverNow: Date.now(),
    config: { city: '杭州', timezone: 'Asia/Shanghai', latitude: 30, longitude: 120, preset: 'sunny', revision: 1 },
    weather: { condition, fetchedAt: Date.now(), freshness: 'fresh', windSpeedMps: 9 },
  })))
  let hook = renderHook(useEnvironment)
  try {
    await waitFor(() => expect(hook.result.current.state.weather).toBe('rain'))
    const phase = hook.result.current.state.phase
    act(() => hook.result.current.selectWeather('fog'))
    condition = 'snow'
    act(() => { document.dispatchEvent(new Event('visibilitychange')) })
    await waitFor(() => expect(hook.result.current.weather?.condition).toBe('snow'))
    expect(hook.result.current.state).toMatchObject({ phase, weather: 'fog', windSpeedMps: 0 })
    hook.unmount()
    hook = renderHook(useEnvironment)
    await waitFor(() => expect(hook.result.current.weather?.condition).toBe('snow'))
    expect(hook.result.current.state.weather).toBe('fog')
    act(() => hook.result.current.selectWeather('city'))
    expect(hook.result.current.state).toMatchObject({ phase, weather: 'snow', windSpeedMps: 9 })
  } finally {
    hook.unmount()
    sessionStorage.clear()
    vi.unstubAllGlobals()
  }
})
