import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'

// Bake only immutable surfaces. Interactive/animated subtrees retain their
// original objects and transforms; shared materials still receive texture loads.
export function batchStaticScene(scene: THREE.Scene, protectedRoots: ReadonlySet<THREE.Object3D>, owned: Set<THREE.BufferGeometry>) {
  scene.updateMatrixWorld(true)
  const groups = new Map<string, THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>[]>()
  scene.traverse(object => {
    if (!(object instanceof THREE.Mesh) || object.children.length || !(object.material instanceof THREE.MeshStandardMaterial) || object.material.transparent) return
    for (let parent: THREE.Object3D | null = object; parent; parent = parent.parent) if (!parent.visible || protectedRoots.has(parent)) return
    const key = `${object.material.uuid}:${object.castShadow}:${object.receiveShadow}:${object.renderOrder}`
    const group = groups.get(key) ?? []; group.push(object); groups.set(key, group)
  })
  for (const group of groups.values()) {
    if (group.length < 2) continue
    const copies = group.map(object => {
      const geometry = object.geometry.index ? object.geometry.toNonIndexed() : object.geometry.clone()
      return geometry.applyMatrix4(object.matrixWorld)
    })
    // Mixed attribute layouts must stay separate rather than corrupt the surface.
    const attributes = copies.map(geometry => Object.keys(geometry.attributes).sort().join(','))
    const geometry = attributes.every(value => value === attributes[0]) ? mergeGeometries(copies) : null
    copies.forEach(copy => copy.dispose())
    if (!geometry) continue
    owned.add(geometry)
    const batch = new THREE.Mesh(geometry, group[0].material)
    batch.castShadow = group[0].castShadow; batch.receiveShadow = group[0].receiveShadow; batch.renderOrder = group[0].renderOrder
    scene.add(batch)
    group.forEach(object => object.removeFromParent())
  }
}
