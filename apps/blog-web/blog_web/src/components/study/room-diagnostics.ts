import type { WebGLRenderer } from 'three'

// Explicit, localhost-only acceptance instrumentation. No work or UI for visitors.
export function roomDiagnostics(host: HTMLElement, renderer: WebGLRenderer) {
  if (!['localhost', '127.0.0.1'].includes(location.hostname) || new URLSearchParams(location.search).get('roomDiagnostics') !== '1') return null
  const created = performance.now()
  let started = created, draws = 0, frames = 0, elapsed = 0, slow = 0, cpu = 0, first = 0
  let mode = 'starting', disposed = false
  const histogram = new Uint32Array(1001)
  const gl = renderer.getContext(), extension = gl.getExtension('WEBGL_debug_renderer_info')
  const device = extension ? gl.getParameter(extension.UNMASKED_RENDERER_WEBGL) as string : gl.getParameter(gl.RENDERER) as string
  const panel = document.createElement('details')
  panel.style.cssText = 'position:fixed;bottom:8px;left:8px;z-index:9999;background:#fff;color:#111;padding:8px;font:11px monospace;max-width:460px;max-height:45vh;overflow:auto;pointer-events:auto'
  const summary = document.createElement('summary'); summary.textContent = 'PC 性能记录'
  const reset = document.createElement('button'); reset.textContent = '重新计时'
  const output = document.createElement('output'); output.id = 'study-performance'; output.style.whiteSpace = 'pre-wrap'
  panel.append(summary, reset, document.createElement('br'), output); host.parentElement?.appendChild(panel)
  const percentile = (q: number) => {
    let count = 0
    for (let i = 0; i < histogram.length; i++) { count += histogram[i]; if (count >= frames*q) return i }
    return 0
  }
  function publish() {
    output.textContent = JSON.stringify({
      seconds: +( (performance.now()-started)/1000 ).toFixed(1), draws, animatedFrames: frames,
      animatedFps: elapsed ? +(frames*1000/elapsed).toFixed(1) : null,
      frameP50Ms: frames ? percentile(.5) : null, frameP95Ms: frames ? percentile(.95) : null,
      framesOver50Ms: slow, renderCpuMeanMs: draws ? +(cpu/draws).toFixed(2) : null,
      firstFrameMs: +first.toFixed(1), mode, hidden: document.hidden, focused: document.hasFocus(), disposed,
      memory: { ...renderer.info.memory }, programs: renderer.info.programs?.length ?? 0,
      calls: renderer.info.render.calls, triangles: renderer.info.render.triangles,
      pixelRatio: renderer.getPixelRatio(), viewport: [innerWidth, innerHeight], device,
    }, null, 2)
  }
  reset.onclick = () => { started = performance.now(); draws = frames = elapsed = slow = cpu = 0; histogram.fill(0); publish() }
  const timer = window.setInterval(publish, 1000)
  return {
    frame(delta: number, continuous: boolean) {
      if (!continuous || !Number.isFinite(delta) || delta <= 0) return
      frames++; elapsed += delta; if (delta > 50) slow++
      histogram[Math.min(1000, Math.round(delta))]++
    },
    draw(milliseconds: number) { draws++; cpu += milliseconds; if (!first) first = performance.now()-created },
    mode(value: string) { mode = value },
    dispose() { disposed = true; window.clearInterval(timer); publish(); panel.remove() },
  }
}
