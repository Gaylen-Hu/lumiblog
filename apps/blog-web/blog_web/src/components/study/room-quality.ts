export type RoomQuality = 'auto' | 'light'

export function roomPixelRatio(ratio: number, narrow: boolean, light: boolean) {
  return Math.min(Number.isFinite(ratio) && ratio > 0 ? ratio : 1, light ? 1 : narrow ? 1.5 : 2)
}

// Count consecutive slow *animated* windows, never idle clock ticks or time hidden.
// These conservative defaults are safeguards; device acceptance still calibrates them.
export class RoomFrameBudget {
  private elapsed = 0
  private frames = 0
  private slowWindows = 0

  reset() { this.elapsed = 0; this.frames = 0; this.slowWindows = 0 }

  sample(delta: number, animated: boolean) {
    if (!animated || !Number.isFinite(delta) || delta <= 0 || delta > 250) {
      this.reset()
      return false
    }
    this.elapsed += delta
    this.frames++
    if (this.elapsed < 2000) return false
    const fps = this.frames * 1000 / this.elapsed
    this.slowWindows = fps < 24 ? this.slowWindows + 1 : 0
    this.elapsed = 0; this.frames = 0
    return this.slowWindows >= 2
  }
}
