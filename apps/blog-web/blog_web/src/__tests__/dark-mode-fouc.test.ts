/**
 * Tests for FOUC prevention script in layout.tsx
 * 验证暗色模式防闪烁内联脚本的逻辑正确性
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

const FOUC_SCRIPT = `(function(){try{var t=localStorage.getItem('theme');var prefersDark=window.matchMedia('(prefers-color-scheme: dark)').matches;if(t==='dark'||((t==='system'||!t)&&prefersDark)){document.documentElement.classList.add('dark');}}catch(e){}})()`

function mockMatchMedia(prefersDark: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: prefersDark,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
}

describe('FOUC_Script', () => {
  beforeEach(() => {
    document.documentElement.classList.remove('dark')
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('localStorage.theme = "dark" → 应添加 dark class', () => {
    localStorage.setItem('theme', 'dark')
    mockMatchMedia(false)
    eval(FOUC_SCRIPT)
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('localStorage.theme = "light" → 不应添加 dark class', () => {
    localStorage.setItem('theme', 'light')
    mockMatchMedia(true)
    eval(FOUC_SCRIPT)
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('localStorage.theme = "system" + 系统深色 → 应添加 dark class', () => {
    localStorage.setItem('theme', 'system')
    mockMatchMedia(true)
    eval(FOUC_SCRIPT)
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('localStorage.theme = "system" + 系统浅色 → 不应添加 dark class', () => {
    localStorage.setItem('theme', 'system')
    mockMatchMedia(false)
    eval(FOUC_SCRIPT)
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('localStorage 为空 + 系统深色 → 应添加 dark class', () => {
    mockMatchMedia(true)
    eval(FOUC_SCRIPT)
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('localStorage 为空 + 系统浅色 → 不应添加 dark class', () => {
    mockMatchMedia(false)
    eval(FOUC_SCRIPT)
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('localStorage 抛出异常 → 静默处理，不添加 dark class', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError: access denied')
    })
    mockMatchMedia(true)
    eval(FOUC_SCRIPT)
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })
})
