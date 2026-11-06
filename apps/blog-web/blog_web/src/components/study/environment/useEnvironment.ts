'use client'
import { useEffect, useState } from 'react'
import { CITY, cityTime, presets, resolveEnvironment, type Preset, type WeatherEnvelope } from './state'

export function useEnvironment() {
  const [preset, setPreset] = useState<Preset>('auto')
  const [now, setNow] = useState(() => Date.now())
  const [correction, setCorrection] = useState(0)
  const [snapshot, setSnapshot] = useState<WeatherEnvelope | null>(null)
  useEffect(() => {
    let identity: string | null = null
    try {
      const saved = sessionStorage.getItem('study-environment')
      if (presets.includes(saved as Preset)) setPreset(saved as Preset)
      identity = sessionStorage.getItem('study-environment-city')
    } catch { /* optional */ }
    let offset = 0, disposed = false
    let pending: AbortController | null = null
    async function refresh() {
      if (document.hidden || pending) return
      const request = new AbortController(); pending = request
      const timeout = window.setTimeout(() => request.abort(), 5000)
      const start = Date.now()
      try {
        const base = process.env.NEXT_PUBLIC_ENVIRONMENT_API_URL || process.env.NEXT_PUBLIC_API_URL || '/api/v1/public'
        const response = await fetch(`${base}/environment`, { signal: request.signal, cache: 'no-store' })
        if (!response.ok) throw new Error('environment unavailable')
        const data = await response.json() as WeatherEnvelope
        if (data.config) {
          const c = data.config
          if (!c.city || !presets.includes(c.preset) || !Number.isFinite(c.revision) || !Number.isFinite(c.latitude) || Math.abs(c.latitude)>90 || !Number.isFinite(c.longitude) || Math.abs(c.longitude)>180) throw new Error('invalid city')
          cityTime(data.serverNow, c.timezone)
        }
        if (!Number.isFinite(data.serverNow) || data.weather && (!['fresh', 'stale'].includes(data.weather.freshness) || !['clear','cloudy','overcast','rain','snow','fog','thunderstorm'].includes(data.weather.condition) || !Number.isFinite(data.weather.fetchedAt))) throw new Error('invalid environment')
        if (!disposed) {
          const nextIdentity = data.config ? `${data.config.timezone}:${data.config.latitude}:${data.config.longitude}` : 'default'
          if (identity && identity !== nextIdentity) { setPreset('auto'); try { sessionStorage.removeItem('study-environment') } catch { /* optional */ } }
          identity = nextIdentity
          try { sessionStorage.setItem('study-environment-city', nextIdentity) } catch { /* optional */ }
          offset = data.serverNow - (start + Date.now()) / 2; setCorrection(offset); setSnapshot(data); setNow(Date.now() + offset) }
      } catch { /* Preserve only a bounded last successful snapshot. */ }
      finally { window.clearTimeout(timeout); if (pending === request) pending = null }
    }
    const tick = window.setInterval(() => { if (!document.hidden) setNow(Date.now() + offset) }, 1000)
    const poll = window.setInterval(refresh, 60_000)
    const visible = () => { if (!document.hidden) { setNow(Date.now() + offset); void refresh() } }
    document.addEventListener('visibilitychange', visible)
    void refresh()
    return () => { disposed = true; pending?.abort(); clearInterval(tick); clearInterval(poll); document.removeEventListener('visibilitychange', visible) }
  }, [])
  const weather = snapshot?.weather && snapshot.weather.fetchedAt <= now + 5000 && now - snapshot.weather.fetchedAt < 2 * 3600_000 && (snapshot.weather.validAt == null || Number.isFinite(snapshot.weather.validAt) && snapshot.weather.validAt <= now + 10*60_000 && now-snapshot.weather.validAt < 2*3600_000) ? snapshot.weather : null
  const config = snapshot?.config
  const city = config ? { name: config.city, timezone: config.timezone, latitude: config.latitude, longitude: config.longitude } : CITY
  const state = resolveEnvironment(now, preset === 'auto' ? config?.preset ?? 'auto' : preset, weather?.condition, city)
  if (state.preset === 'auto' && weather?.precipitationMmPerHour != null && Number.isFinite(weather.precipitationMmPerHour)) state.intensity = Math.min(1, Math.max(.15, Math.sqrt(Math.max(0, weather.precipitationMmPerHour) / 10)))
  if (state.preset === 'auto') {
    state.windSpeedMps = Math.max(0, Math.min(30, weather?.windSpeedMps ?? 0))
    state.cloudCover = Math.max(0, Math.min(1, weather?.cloudCover ?? state.cloudCover))
  }
  state.clockOffsetMs = correction
  const select = (value: Preset) => { setPreset(value); try { sessionStorage.setItem('study-environment', value) } catch { /* optional */ } }
  return { state, select, selection: preset, city, time: cityTime(now, city.timezone), weather, freshness: weather ? now - weather.fetchedAt >= 15 * 60_000 ? 'stale' : weather.freshness : 'unavailable' }
}
