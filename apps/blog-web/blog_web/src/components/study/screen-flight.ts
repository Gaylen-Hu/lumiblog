import { MathUtils, Quaternion, Vector3, type Object3D, type PerspectiveCamera } from 'three'

/** A reversible track from the observed room pose into the actual display plane. */
export class ScreenFlight {
  private eye = new Vector3()
  private rotation = new Quaternion()
  private center = new Vector3()
  private facing = new Quaternion()
  private normal = new Vector3()
  private lateral = new Vector3()
  private size = new Vector3()
  private originDepth = 0
  constructor(private screen: Object3D, private width: number, private height: number) {}

  capture(camera: PerspectiveCamera) {
    this.eye.copy(camera.position); this.rotation.copy(camera.quaternion)
    this.screen.getWorldPosition(this.center); this.screen.getWorldQuaternion(this.facing)
    this.screen.getWorldScale(this.size)
    this.normal.set(0,0,1).applyQuaternion(this.facing)
    this.lateral.subVectors(this.eye,this.center)
    this.originDepth = this.lateral.dot(this.normal)
    this.lateral.addScaledVector(this.normal,-this.originDepth)
  }

  sample(camera: PerspectiveCamera, u: number, frame: (ink: number, scale: number) => void) {
    const halfFov = Math.tan(MathUtils.degToRad(camera.getEffectiveFOV())/2)
    // Both dimensions must cover the viewport, including portrait and ultrawide crops.
    const cover = .99 * Math.min(this.height*this.size.y, this.width*this.size.x/camera.aspect) / (2*halfFov)
    const depth = MathUtils.lerp(this.originDepth, cover, MathUtils.smootherstep(u,0,1))
    const lock = MathUtils.smootherstep(u,0,.69)
    camera.quaternion.slerpQuaternions(this.rotation,this.facing,lock)
    camera.position.copy(this.center).addScaledVector(this.normal,depth).addScaledVector(this.lateral,1-lock)
    // Once square to the glass, the HTML page has the same optical scale as
    // the display. It is already visible and moving before the camera stops.
    frame(MathUtils.smoothstep(u,.70,.88), Math.min(1,cover/Math.max(cover,depth)))
  }
}
