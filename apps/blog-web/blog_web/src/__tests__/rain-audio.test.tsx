import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useRainAudio } from '@/components/study/environment/useRainAudio'

function audioStub() {
  const gain = { gain: { value: 0, setTargetAtTime: vi.fn(), setValueAtTime: vi.fn(), cancelScheduledValues: vi.fn() }, connect: vi.fn(), disconnect: vi.fn() }
  const source = { buffer: null, loop: false, connect: vi.fn(), start: vi.fn(), stop: vi.fn(), disconnect: vi.fn() }
  const context = { currentTime: 0, sampleRate: 64, destination: {}, createGain: () => gain, createBuffer: () => ({ getChannelData: () => new Float32Array(256) }), createBufferSource: () => source, resume: vi.fn().mockResolvedValue(undefined), suspend: vi.fn().mockResolvedValue(undefined), close: vi.fn().mockResolvedValue(undefined) }
  const Constructor = vi.fn(function () { return context })
  vi.stubGlobal('AudioContext', Constructor)
  return { context, gain, source, Constructor }
}

describe('rain audio preferences and lifetime', () => {
  afterEach(() => { vi.unstubAllGlobals(); localStorage.clear() })
  it('requires a gesture, preserves volume, and mutes immediately with the master switch', async () => {
    localStorage.setItem('study-rain-volume', '.2')
    const audio = audioStub()
    const hook = renderHook(({ master }) => useRainAudio('rain', master), { initialProps: { master: true } })
    expect(audio.Constructor).not.toHaveBeenCalled()
    expect(hook.result.current.volume).toBe(.2)
    await act(async () => { await hook.result.current.toggle() })
    expect(hook.result.current.enabled).toBe(true)
    expect(audio.gain.gain.setTargetAtTime).toHaveBeenLastCalledWith(.2 * .2, 0, .4)
    act(() => hook.result.current.changeVolume(.6))
    expect(localStorage.getItem('study-rain-volume')).toBe('0.6')
    hook.rerender({ master: false })
    expect(audio.gain.gain.setValueAtTime).toHaveBeenLastCalledWith(0, 0)
    hook.unmount()
    expect(audio.source.stop).toHaveBeenCalledOnce()
    expect(audio.context.close).toHaveBeenCalledOnce()
  })
  it('reports failed permission and can retry without creating a second audio engine', async () => {
    const audio = audioStub(); audio.context.resume.mockRejectedValueOnce(new Error('not allowed'))
    const hook = renderHook(() => useRainAudio('rain', true))
    await act(async () => { await hook.result.current.toggle() })
    expect(hook.result.current.failed).toBe(true)
    expect(hook.result.current.enabled).toBe(false)
    await act(async () => { await hook.result.current.toggle() })
    expect(hook.result.current.enabled).toBe(true)
    expect(audio.Constructor).toHaveBeenCalledOnce()
    hook.unmount()
  })
  it('closes an engine even while its initial resume is pending', async () => {
    const audio = audioStub(); let release!: () => void
    audio.context.resume.mockImplementation(() => new Promise<void>(resolve => { release = resolve }))
    const hook = renderHook(() => useRainAudio('rain', true))
    let playing!: Promise<void>
    act(() => { playing = hook.result.current.toggle() })
    hook.unmount(); release(); await playing
    expect(audio.context.close).toHaveBeenCalledOnce()
    expect(audio.source.stop).toHaveBeenCalledOnce()
  })
})
