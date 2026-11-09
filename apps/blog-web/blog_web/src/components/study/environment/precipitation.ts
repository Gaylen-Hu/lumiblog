import * as THREE from 'three'
import type { Environment } from './state'

export function createPrecipitation(scene: THREE.Scene) {
  const count = 320
  const centers = new Float32Array(count * 3)
  const endpoints = new Float32Array(count * 6)
  for (let i = 0; i < count; i++) {
    const x = 3.3 + (i % 13) * .12
    const y = (i * .237) % 5
    const z = -3.6 + (i * .413) % 4.85
    centers.set([x, y, z], i * 3)
    endpoints.set([x, y, z, x, y, z], i * 6)
  }
  const rainGeometry = new THREE.BufferGeometry()
  const snowGeometry = new THREE.BufferGeometry()
  rainGeometry.setAttribute('position', new THREE.BufferAttribute(endpoints, 3))
  snowGeometry.setAttribute('position', new THREE.BufferAttribute(centers, 3))
  // Vertices slide within this volume, including the longest wind-blown tip.
  const bounds = new THREE.Box3(new THREE.Vector3(3.25, -.04, -3.65), new THREE.Vector3(4.8, 5.25, 1.3))
  const sphere = bounds.getBoundingSphere(new THREE.Sphere())
  rainGeometry.boundingSphere = sphere
  snowGeometry.boundingSphere = sphere.clone()

  const rainMaterial = new THREE.LineBasicMaterial({ color: '#c7dce9', transparent: true, opacity: .3, depthWrite: false })
  const snowMaterial = new THREE.PointsMaterial({ color: '#e4eff5', size: .035, transparent: true, opacity: .5, depthWrite: false })
  const offset = { value: new THREE.Vector2() } // Vertical fall and horizontal wind travel.
  const tip = { value: new THREE.Vector2() }
  const phase = { value: 0 }
  // Keep Three's point sizing, fog, color and depth handling. Only vertex placement changes.
  const move = `
    transformed.y = mod(position.y - travel.x, 5.0);
    transformed.z = mod(position.z + 3.6 + travel.y + sway, 4.85) - 3.6;
  `
  rainMaterial.onBeforeCompile = shader => {
    shader.uniforms.travel = offset
    shader.uniforms.streakTip = tip
    shader.vertexShader = 'uniform vec2 travel, streakTip;\n' + shader.vertexShader.replace('#include <begin_vertex>', `
      #include <begin_vertex>
      float sway = 0.0;
      ${move}
      transformed.yz += float(gl_VertexID % 2) * streakTip;
    `)
  }
  snowMaterial.onBeforeCompile = shader => {
    shader.uniforms.travel = offset
    shader.uniforms.snowPhase = phase
    shader.vertexShader = 'uniform vec2 travel; uniform float snowPhase;\n' + shader.vertexShader.replace('#include <begin_vertex>', `
      #include <begin_vertex>
      float seed = float(gl_VertexID);
      float sway = .1 * (cos(seed) - cos(seed + snowPhase));
      ${move}
    `)
  }
  const rain = new THREE.LineSegments(rainGeometry, rainMaterial)
  const flakes = new THREE.Points(snowGeometry, snowMaterial)
  rain.visible = flakes.visible = false
  scene.add(rain, flakes)
  let wet = false, snow = false, speed = 0, wind = 0
  return {
    set(state: Environment) {
      snow = state.weather === 'snow'
      wet = snow || state.weather === 'rain' || state.weather === 'thunderstorm'
      const intensity = THREE.MathUtils.clamp(state.intensity, 0, 1)
      wind = THREE.MathUtils.clamp(state.windSpeedMps, 0, 15) * .035
      speed = snow ? .24 : 2.8 + intensity * 2.4
      tip.value.set(.09 + intensity * .13, -wind * .04)
      const visible = Math.round(count * intensity)
      rainGeometry.setDrawRange(0, visible * 2)
      snowGeometry.setDrawRange(0, visible)
      rainMaterial.opacity = .16 + intensity * .22
    },
    update(delta: number, animate: boolean, light: boolean) {
      rain.visible = wet && !snow && animate && !light
      flakes.visible = wet && snow && animate && !light
      if (!rain.visible && !flakes.visible) return false
      const dt = Math.min(.05, Math.max(0, delta / 1000))
      offset.value.x = (offset.value.x + dt * speed) % 5
      offset.value.y = (offset.value.y + dt * wind) % 4.85
      if (snow) phase.value = (phase.value + dt * .6) % (2 * Math.PI)
      return true
    },
    dispose() {
      scene.remove(rain, flakes)
      rainGeometry.dispose(); snowGeometry.dispose()
      rainMaterial.dispose(); snowMaterial.dispose()
    },
  }
}
