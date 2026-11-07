import * as THREE from 'three'

type Spring = { position: number; velocity: number }

// Exact critically damped step. Reversing keeps the cloth's current velocity.
function advance(spring: Spring, target: number, rate: number, dt: number) {
  const offset = spring.position - target
  const slope = spring.velocity + rate * offset
  const decay = Math.exp(-rate * dt)
  spring.position = target + (offset + slope * dt) * decay
  spring.velocity = (spring.velocity - rate * slope * dt) * decay
  if (Math.abs(spring.position - target) < .001 && Math.abs(spring.velocity) < .008) {
    spring.position = target
    spring.velocity = 0
  }
}

export class CurtainMotion {
  readonly heading = { position: 0, velocity: 0 }
  readonly hem = { position: 0, velocity: 0 }
  drawn = false

  step(deltaMs: number, reduced: boolean) {
    const target = Number(this.drawn)
    if (this.heading.position === target && this.hem.position === target &&
        this.heading.velocity === 0 && this.hem.velocity === 0) return false
    if (reduced) {
      this.heading.position = this.hem.position = target
      this.heading.velocity = this.hem.velocity = 0
    } else {
      const dt = THREE.MathUtils.clamp(deltaMs / 1000, 0, .08)
      advance(this.heading, target, 8, dt)
      advance(this.hem, target, 5.6, dt)
    }
    return true
  }
}

export function createCurtainPanel(side: number, span: number, height: number) {
  const geometry = new THREE.PlaneGeometry(1, 1, 48, 12)
  const positions = geometry.attributes.position as THREE.BufferAttribute
  positions.setUsage(THREE.DynamicDrawUsage)
  const uv = geometry.attributes.uv
  const shading = new THREE.Float32BufferAttribute(new Float32Array(positions.count * 3), 3)
  shading.setUsage(THREE.DynamicDrawUsage)
  geometry.setAttribute('color', shading)
  const folds = 5
  const gathered = .74
  const closed = span + .024
  const headingWidth = (progress: number) => THREE.MathUtils.lerp(gathered, closed, progress)
  geometry.boundingSphere = new THREE.Sphere(
    new THREE.Vector3(-side * closed / 2, -height / 2, 0), Math.hypot(closed, height) / 2 + .25,
  )

  function shape(heading: number, hem: number) {
    for (let i = 0; i < positions.count; i++) {
      const u = uv.getX(i)
      const drop = 1 - uv.getY(i)
      const progress = THREE.MathUtils.lerp(heading, hem, drop * drop)
      const width = headingWidth(progress) + (1 - progress) * .16 * drop
      // Pleats hang from fixed points on the heading and wander towards the hem.
      const phase = u * folds * 2 * Math.PI
      const fan = drop * (.36 * Math.sin(3 * Math.PI * u + side * .5) + (heading - hem) * 1.4)
      const ridge = Math.sin(phase + fan)
      const depth = (.13 - .068 * progress) * (1 + .12 * drop)
      const scallop = .5 - .5 * Math.cos(phase)
      // Soft occlusion in the valleys stays readable in diffuse, overcast light.
      const shade = 1 - (1 - ridge) * (.18 - .045 * progress)
      shading.setXYZ(i, shade, shade, shade)
      positions.setXYZ(i, -side * u * width,
        -.035 - height * drop - .035 * scallop + .018 * ridge * drop,
        depth * ridge + .038 * drop * drop + side * .018 * u ** 4,
      )
    }
    positions.needsUpdate = true
    shading.needsUpdate = true
    geometry.computeVertexNormals()
  }
  shape(0, 0)
  return { geometry, shape, headingWidth, folds }
}
