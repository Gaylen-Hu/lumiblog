import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'

// Cloning a procedural geometry runs its constructor again before copying its
// attributes. A batch only needs independent vertex data to transform.
export function copyForBatch(geometry: THREE.BufferGeometry) {
  return geometry.index ? geometry.toNonIndexed() : new THREE.BufferGeometry().copy(geometry)
}

// Bake only immutable surfaces. Interactive/animated subtrees retain their
// original objects and transforms; shared materials still receive texture loads.
type FlatPalette = { members: ReadonlySet<THREE.MeshStandardMaterial>; material: THREE.MeshStandardMaterial }

export function batchStaticScene(scene: THREE.Scene, protectedRoots: ReadonlySet<THREE.Object3D>, owned: Set<THREE.BufferGeometry>, palette?: FlatPalette) {
  scene.updateMatrixWorld(true)
  const groups = new Map<string, THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>[]>()
  scene.traverse(object => {
    if (!(object instanceof THREE.Mesh) || object.children.length || !(object.material instanceof THREE.MeshStandardMaterial) || object.material.transparent) return
    for (let parent: THREE.Object3D | null = object; parent; parent = parent.parent) if (!parent.visible || protectedRoots.has(parent)) return
    const material = palette?.members.has(object.material) ? palette.material : object.material
    const attributes = Object.keys(object.geometry.attributes).sort().join(',')
    const key = `${material.uuid}:${object.castShadow}:${object.receiveShadow}:${object.renderOrder}:${attributes}`
    const group = groups.get(key) ?? []; group.push(object); groups.set(key, group)
  })
  for (const group of groups.values()) {
    if (group.length < 2) continue
    const colored = palette?.members.has(group[0].material)
    const copies = group.map(object => {
      const geometry = copyForBatch(object.geometry).applyMatrix4(object.matrixWorld)
      if (colored) {
        const colors = new Float32Array(geometry.getAttribute('position').count * 3)
        for (let i = 0; i < colors.length; i += 3) object.material.color.toArray(colors, i)
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
      }
      return geometry
    })
    // Mixed attribute layouts must stay separate rather than corrupt the surface.
    const attributes = copies.map(geometry => Object.keys(geometry.attributes).sort().join(','))
    const geometry = attributes.every(value => value === attributes[0]) ? mergeGeometries(copies) : null
    copies.forEach(copy => copy.dispose())
    if (!geometry) continue
    owned.add(geometry)
    const batch = new THREE.Mesh(geometry, colored ? palette!.material : group[0].material)
    batch.castShadow = group[0].castShadow; batch.receiveShadow = group[0].receiveShadow; batch.renderOrder = group[0].renderOrder
    scene.add(batch)
    group.forEach(object => object.removeFromParent())
  }
}
