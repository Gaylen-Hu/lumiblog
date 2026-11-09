import { describe, it, expect, vi } from 'vitest'
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { batchStaticScene } from '@/components/study/batch-static-scene'

describe('static room batching', () => {
  it('bakes world transforms while preserving moving furniture, its children and picking targets', () => {
    const scene = new THREE.Scene(), material = new THREE.MeshStandardMaterial()
    const staticGroup = new THREE.Group(); staticGroup.position.x = 10; scene.add(staticGroup)
    const a = new THREE.Mesh(new THREE.BoxGeometry(), material), b = a.clone()
    b.position.x = 2; staticGroup.add(a, b)
    const drawer = new THREE.Group(), handle = a.clone(), hit = a.clone()
    drawer.add(handle); scene.add(drawer, hit)
    const owned = new Set<THREE.BufferGeometry>()
    batchStaticScene(scene, new Set([drawer, hit]), owned)
    expect(handle.parent).toBe(drawer); expect(hit.parent).toBe(scene)
    expect(staticGroup.children).toHaveLength(0); expect(owned.size).toBe(1)
    const geometry = [...owned][0]; geometry.computeBoundingBox()
    expect(geometry.boundingBox?.min.x).toBe(9.5); expect(geometry.boundingBox?.max.x).toBe(12.5)
    const batch = scene.children.find(object => object instanceof THREE.Mesh && object !== hit) as THREE.Mesh
    expect(batch.material).toBe(material)
  })
  it('leaves hidden surfaces available for later toggling', () => {
    const scene = new THREE.Scene(), group = new THREE.Group(); group.visible = false; scene.add(group)
    const a = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial()); group.add(a, a.clone())
    batchStaticScene(scene, new Set(), new Set())
    expect(group.children).toHaveLength(2)
  })
  it('batches shared rounded geometry without rebuilding its shape or moving the source vertices', () => {
    const source = new RoundedBoxGeometry(1, 2, 3)
    const original = source.getAttribute('position').array.slice()
    const clone = vi.spyOn(source, 'clone')
    const first = new THREE.Mesh(source, new THREE.MeshStandardMaterial()), second = first.clone()
    second.position.x = 5
    const scene = new THREE.Scene(); scene.add(first, second)
    const batches = new Set<THREE.BufferGeometry>()
    batchStaticScene(scene, new Set(), batches)
    expect(clone).not.toHaveBeenCalled()
    expect(source.getAttribute('position').array).toEqual(original)
    expect(batches.size).toBe(1)
    const [batch] = batches
    batch.computeBoundingBox()
    expect(batch.boundingBox?.max.x).toBeCloseTo(5.5)
  })
})
