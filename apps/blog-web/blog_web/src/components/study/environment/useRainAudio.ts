'use client'
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import type { Weather } from './state'

let memoryVolume = .35
function readVolume() {
  try { const value = localStorage.getItem('study-rain-volume'); if (value !== null && Number.isFinite(Number(value))) return Math.max(0, Math.min(1, Number(value))) } catch { /* optional */ }
  return memoryVolume
}
function subscribeVolume(callback: () => void) {
  window.addEventListener('storage', callback); window.addEventListener('study-rain-volume', callback)
  return () => { window.removeEventListener('storage', callback); window.removeEventListener('study-rain-volume', callback) }
}

// Original filtered-noise prototype, requiring no third-party audio assets.
export function useRainAudio(weather: Weather, master: boolean) {
  const [enabled, setEnabled] = useState(false)
  const [failed, setFailed] = useState(false)
  const volume = useSyncExternalStore(subscribeVolume, readVolume, () => .35)
  const generation = useRef(0)
  const engine = useRef<{ context: AudioContext; gain: GainNode; source: AudioBufferSourceNode } | null>(null)
  const wanted = enabled && master && (weather === 'rain' || weather === 'thunderstorm')
  useEffect(() => {
    const sync = () => {
      const audio = engine.current
      if (!audio) return
      if (document.hidden) { void audio.context.suspend().catch(() => {}); return }
      audio.gain.gain.cancelScheduledValues(audio.context.currentTime)
      if (!master || !enabled) audio.gain.gain.setValueAtTime(0, audio.context.currentTime)
      else audio.gain.gain.setTargetAtTime(wanted ? volume * .2 : 0, audio.context.currentTime, .4)
      if (wanted) void audio.context.resume().catch(() => setFailed(true))
    }
    sync(); document.addEventListener('visibilitychange', sync)
    return () => document.removeEventListener('visibilitychange', sync)
  }, [wanted, volume, master, enabled])
  useEffect(() => () => {
    const audio = engine.current; engine.current = null
    generation.current++
    if (audio) { audio.source.stop(); audio.source.disconnect(); audio.gain.disconnect(); void audio.context.close().catch(() => {}) }
  }, [])
  async function toggle() {
    const attempt = ++generation.current
    if (enabled) { setEnabled(false); return }
    try {
      if (!engine.current) {
        const context = new AudioContext()
        const gain = context.createGain(); gain.gain.value = 0
        const buffer = context.createBuffer(1, context.sampleRate * 4, context.sampleRate)
        const data = buffer.getChannelData(0)
        // Circular buffer with a smoothed boundary; never download audio on first paint.
        let last = 0
        for (let i=0; i<data.length; i++) { last = .75 * last + .25 * (Math.random()*2-1); data[i] = last }
        const edge = Math.min(2048, data.length / 2)
        for (let i=0; i<edge; i++) { const t = i/edge; data[i] = data[data.length-edge+i]*(1-t) + data[i]*t }
        const source = context.createBufferSource(); source.buffer = buffer; source.loop = true
        source.connect(gain); gain.connect(context.destination); source.start()
        engine.current = { context, gain, source }
      }
      await engine.current.context.resume()
      if (attempt !== generation.current) return
      setFailed(false); setEnabled(true)
    } catch { if (attempt === generation.current) { setFailed(true); setEnabled(false) } }
  }
  const changeVolume = (value: number) => {
    if (!Number.isFinite(value)) return
    const next = Math.max(0, Math.min(1, value)); memoryVolume = next
    try { localStorage.setItem('study-rain-volume', String(next)) } catch { /* optional preference */ }
    window.dispatchEvent(new Event('study-rain-volume'))
  }
  return { enabled, failed, toggle, volume, changeVolume }
}
