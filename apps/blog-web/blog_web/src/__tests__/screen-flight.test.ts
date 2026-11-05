import { describe, expect, it } from 'vitest'
import { Group, Object3D, PerspectiveCamera, Vector3 } from 'three'
import { ScreenFlight } from '@/components/study/screen-flight'

describe('从房间推入笔记本', () => {
  it.each([390/844,16/9,32/9])('在宽高比 %f 下屏幕正对相机并完整覆盖视口', aspect => {
    const desk = new Group(), glass = new Object3D()
    desk.position.set(.8,1.1,-2); desk.rotation.y = -.32
    desk.add(glass); glass.position.set(.3,.25,0); glass.rotation.x = -.24
    const camera = new PerspectiveCamera(54,aspect,.05,45)
    camera.position.set(-.43,1.8,2.65); camera.lookAt(.22,1.5,-2.5)
    const eye = camera.position.clone(), rotation = camera.quaternion.clone()
    const path = new ScreenFlight(glass,.79,.435)
    path.capture(camera)
    const sample = (u:number) => {
      let ink=0, scale=0
      path.sample(camera,u,(i,s)=>{ink=i;scale=s})
      camera.updateMatrixWorld()
      return {ink,scale}
    }
    const mid = sample(.8), midEye = camera.position.clone()
    expect(mid.ink).toBeGreaterThan(0); expect(mid.ink).toBeLessThan(1)
    expect(mid.scale).toBeLessThan(1)
    expect(sample(1)).toEqual({ink:1,scale:1})
    const center = glass.getWorldPosition(new Vector3()).project(camera)
    expect(Math.abs(center.x)+Math.abs(center.y)).toBeLessThan(1e-9)
    const corner = glass.localToWorld(new Vector3(.79/2,.435/2,0)).project(camera)
    expect(corner.x).toBeGreaterThan(1); expect(corner.y).toBeGreaterThan(1)
    expect(sample(.8)).toEqual(mid); expect(camera.position.distanceTo(midEye)).toBeLessThan(1e-9)
    expect(sample(0).ink).toBe(0); expect(camera.position.distanceTo(eye)).toBeLessThan(1e-9)
    expect(camera.quaternion.angleTo(rotation)).toBeLessThan(1e-6)
  })
})
