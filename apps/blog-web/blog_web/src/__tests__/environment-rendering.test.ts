import { describe, expect, it, vi } from 'vitest'
import * as THREE from 'three'
import { solarDirection } from '@/components/study/environment/solar'
import { resolveEnvironment } from '@/components/study/environment/state'
import { createPrecipitation } from '@/components/study/environment/precipitation'
import { createRainGlass } from '@/components/study/environment/glass'

describe('V2 solar lighting and resource lifetime', () => {
  it('allows east-window direct light in the morning, not the afternoon or night', () => {
    const morning = solarDirection(Date.parse('2026-06-21T00:00Z'),30.2741,120.1551)
    const afternoon = solarDirection(Date.parse('2026-06-21T07:00Z'),30.2741,120.1551)
    const night = solarDirection(Date.parse('2026-06-21T16:00Z'),30.2741,120.1551)
    expect(morning.east).toBeGreaterThan(0); expect(morning.up).toBeGreaterThan(0)
    expect(afternoon.east).toBeLessThan(0); expect(afternoon.up).toBeGreaterThan(0)
    expect(night.daylight).toBe(0)
    for (const p of [morning,afternoon,night]) expect(Math.hypot(p.east,p.up,p.north)).toBeCloseTo(1)
  })
  it('keeps visual presets independent of real solar time and finite at the poles', () => {
    const epoch=Date.parse('2026-12-21T16:00Z')
    expect(resolveEnvironment(epoch,'sunny').solar.daylight).toBe(1)
    expect(resolveEnvironment(epoch,'auto').solar.daylight).toBe(0)
    expect(Number.isFinite(solarDirection(epoch,90,0).up)).toBe(true)
  })
  it('bounds rain outside the room, disables particles for light/reduced modes, and frees resources', () => {
    const scene=new THREE.Scene(), rain=createPrecipitation(scene)
    const state={...resolveEnvironment(Date.now(),'rainy-night'),windSpeedMps:30}
    rain.set(state)
    for(let i=0;i<400;i++) rain.update(50,true,false)
    const lines=scene.children[0] as THREE.LineSegments
    const positions=lines.geometry.getAttribute('position')
    for(let i=0;i<positions.count;i++) expect(positions.getX(i)).toBeGreaterThan(3.18)
    expect(lines.visible).toBe(true)
    rain.update(16,true,true); expect(lines.visible).toBe(false)
    rain.update(16,false,false); expect(lines.visible).toBe(false)
    const release=vi.spyOn(lines.geometry,'dispose')
    rain.dispose(); expect(scene.children).toHaveLength(0); expect(release).toHaveBeenCalledOnce()
  })
  it('reuses the room texture, dries gradually, and stops animation under reduced motion', () => {
    const scene=new THREE.Scene(), texture=new THREE.Texture(), release=vi.spyOn(texture,'dispose')
    const glass=createRainGlass(scene,{gardenBreeze:{value:new THREE.Vector2()},gardenWeather:{value:new THREE.Vector3()},nightBlend:{value:0},tint:new THREE.Color('white')})
    glass.set(true); glass.update(16,true)
    expect(scene.children[0].visible).toBe(false)
    glass.setTexture(texture); glass.update(16,false)
    const pane=scene.children[0] as THREE.Mesh<THREE.PlaneGeometry,THREE.ShaderMaterial>
    expect(pane.visible).toBe(true)
    const time=pane.material.uniforms.time.value
    glass.update(1000,false); expect(pane.material.uniforms.time.value).toBe(time)
    glass.set(false); glass.update(50,true); expect(pane.visible).toBe(true)
    for(let i=0;i<200;i++) glass.update(50,true)
    expect(pane.visible).toBe(false)
    glass.dispose(); expect(scene.children).toHaveLength(0); expect(release).not.toHaveBeenCalled()
  })
})
