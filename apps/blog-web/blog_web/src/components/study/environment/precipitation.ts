import * as THREE from 'three'
import type { Environment } from './state'

export function createPrecipitation(scene: THREE.Scene) {
  const count = 320, centers = new Float32Array(count * 3), lines = new Float32Array(count * 6)
  for (let i = 0; i < count; i++) { centers[i*3] = 3.3 + (i % 13) * .12; centers[i*3+1] = (i * .237) % 5; centers[i*3+2] = -3.6 + (i * .413) % 4.85 }
  const rainGeometry = new THREE.BufferGeometry(), snowGeometry = new THREE.BufferGeometry()
  rainGeometry.setAttribute('position', new THREE.BufferAttribute(lines, 3))
  snowGeometry.setAttribute('position', new THREE.BufferAttribute(centers, 3))
  const rainMaterial = new THREE.LineBasicMaterial({ color: '#c7dce9', transparent: true, opacity: .3, depthWrite: false })
  const snowMaterial = new THREE.PointsMaterial({ color: '#e4eff5', size: .035, transparent: true, opacity: .5, depthWrite: false })
  const rain = new THREE.LineSegments(rainGeometry, rainMaterial), flakes = new THREE.Points(snowGeometry, snowMaterial)
  rain.frustumCulled = flakes.frustumCulled = false
  rain.visible = flakes.visible = false
  scene.add(rain, flakes)
  let wet = false, snow = false, intensity = .55, wind = 0, elapsed = 0
  return {
    set(state: Environment) {
      snow = state.weather === 'snow'; wet = snow || state.weather === 'rain' || state.weather === 'thunderstorm'
      intensity = THREE.MathUtils.clamp(state.intensity, 0, 1); wind = THREE.MathUtils.clamp(state.windSpeedMps, 0, 15) * .035
      const visible = Math.round(count * intensity)
      rainGeometry.setDrawRange(0, visible * 2); snowGeometry.setDrawRange(0, visible)
      rainMaterial.opacity = .16 + intensity * .22
    },
    update(delta: number, animate: boolean, light: boolean) {
      rain.visible = wet && !snow && animate && !light
      flakes.visible = wet && snow && animate && !light
      if (!rain.visible && !flakes.visible) return false
      const dt = Math.min(.05, Math.max(0, delta / 1000)); elapsed += dt
      const speed = snow ? .24 : 2.8 + intensity * 2.4
      for (let i=0; i<count; i++) {
        const p = i*3, l = i*6
        centers[p+1] -= dt*speed
        centers[p+2] += dt*(wind + (snow ? Math.sin(elapsed*.6+i)*.06 : 0))
        if (centers[p+1] < 0) centers[p+1] += 5
        if (centers[p+2] > 1.25) centers[p+2] -= 4.85
        if (centers[p+2] < -3.6) centers[p+2] += 4.85
        lines[l]=lines[l+3]=centers[p]
        lines[l+1]=centers[p+1]; lines[l+4]=centers[p+1]+.09+intensity*.13
        lines[l+2]=centers[p+2]; lines[l+5]=centers[p+2]-wind*.04
      }
      rainGeometry.attributes.position.needsUpdate = true
      snowGeometry.attributes.position.needsUpdate = true
      return true
    },
    dispose() { scene.remove(rain, flakes); rainGeometry.dispose(); snowGeometry.dispose(); rainMaterial.dispose(); snowMaterial.dispose() },
  }
}
