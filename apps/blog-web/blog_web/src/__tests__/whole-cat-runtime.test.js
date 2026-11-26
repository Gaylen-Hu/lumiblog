// @vitest-environment node
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { createWholeCatRuntime } from '../components/companion/runtime/whole-cat-runtime.mjs';
import { applyRoomCoat } from '../components/companion/runtime/website-cat-model.js';

function makeCatFixture() {
  const scene = new THREE.Group();
  const root = new THREE.Bone(); root.name = 'Root'; scene.add(root);
  const chest = new THREE.Bone(); chest.name = 'Chest'; root.add(chest);
  const head = new THREE.Bone(); head.name = 'Head'; chest.add(head);
  const eyeL = new THREE.Bone(); eyeL.name = 'Eye_L'; eyeL.position.set(.1, .2, .3); head.add(eyeL);
  const eyeR = new THREE.Bone(); eyeR.name = 'Eye_R'; eyeR.position.set(-.1, .2, .3); head.add(eyeR);
  const earL = new THREE.Bone(); earL.name = 'Ear_L'; head.add(earL);
  const earR = new THREE.Bone(); earR.name = 'Ear_R'; head.add(earR);

  const geometry = new THREE.BoxGeometry(1, 2, 1);
  const morphNames = ['blinkLeft', 'blinkRight', 'mouthOpen', 'smile'];
  geometry.morphAttributes.position = morphNames.map(name => {
    const attr = geometry.attributes.position.clone();
    attr.name = name;
    return attr;
  });

  const sharedTexture = new THREE.Texture();
  const coatMat = new THREE.MeshStandardMaterial({ name: 'XiaohuiSkin_SoftCoat', map: sharedTexture });
  const tailMat = new THREE.MeshStandardMaterial({ name: 'Tail_SoftCoat', map: sharedTexture });
  const bellMat = new THREE.MeshStandardMaterial({ name: 'GoldBell', metalness: .82, roughness: .38 });

  const bodyMesh = new THREE.Mesh(geometry, coatMat); bodyMesh.name = 'XiaohuiSkin'; head.add(bodyMesh);
  const tailMesh = new THREE.Mesh(geometry, tailMat); tailMesh.name = 'Tail'; root.add(tailMesh);
  const bellMesh = new THREE.Mesh(geometry, bellMat); bellMesh.name = 'Bell'; chest.add(bellMesh);

  const animations = [
    new THREE.AnimationClip('idle', 4, [new THREE.NumberKeyframeTrack('Head.position[x]', [0, 4], [0, 0])]),
    new THREE.AnimationClip('walk', 1.1, [new THREE.NumberKeyframeTrack('Head.position[x]', [0, 1.1], [0, .4])]),
    new THREE.AnimationClip('sit', 1.2, [new THREE.NumberKeyframeTrack('Head.position[x]', [0, 1.2], [0, .2])]),
    new THREE.AnimationClip('sleep', 4, [new THREE.NumberKeyframeTrack('Head.position[x]', [0, 4], [0, 0])]),
  ];

  return { gltf: { scene, animations }, scene, root, chest, head, eyeL, eyeR, earL, earR, bodyMesh, tailMesh, bellMesh, coatMat, tailMat, bellMat, sharedTexture };
}

describe('V2 whole-cat coat material upgrade and runtime overlays', () => {
  it('upgrades XiaohuiSkin_SoftCoat and Tail_SoftCoat to MeshPhysicalMaterial sheen without disposing shared textures', () => {
    const f = makeCatFixture();
    let coatDisposed = 0, tailDisposed = 0, bellDisposed = 0, texDisposed = 0;
    f.coatMat.addEventListener('dispose', () => { coatDisposed++; });
    f.tailMat.addEventListener('dispose', () => { tailDisposed++; });
    f.bellMat.addEventListener('dispose', () => { bellDisposed++; });
    f.sharedTexture.addEventListener('dispose', () => { texDisposed++; });

    const replaced = applyRoomCoat(f.scene, 'medium');
    expect(replaced).toBe(2);
    expect(f.bodyMesh.material.isMeshPhysicalMaterial).toBe(true);
    expect(f.tailMesh.material.isMeshPhysicalMaterial).toBe(true);
    expect(f.bodyMesh.material.sheen).toBeCloseTo(.16, 6);
    expect(f.bodyMesh.material.sheenRoughness).toBeCloseTo(.88, 6);
    expect(f.bodyMesh.material.sheenColor.getHexString()).toBe('f5ede2');
    expect(f.bodyMesh.material.map).toBe(f.sharedTexture);
    expect(f.sharedTexture.anisotropy).toBe(4);
    expect(f.bellMesh.material).toBe(f.bellMat);
    expect(coatDisposed).toBe(1);
    expect(tailDisposed).toBe(1);
    expect(bellDisposed).toBe(0);
    expect(texDisposed).toBe(0);

    // Calling applyRoomCoat a second time is idempotent.
    expect(applyRoomCoat(f.scene, 'medium')).toBe(0);
  });

  it('keeps StandardMaterial without sheen on low quality while lowering anisotropy', () => {
    const f = makeCatFixture();
    expect(applyRoomCoat(f.scene, 'low')).toBe(0);
    expect(f.bodyMesh.material).toBe(f.coatMat);
    expect(f.sharedTexture.anisotropy).toBe(2);
  });

  it('applies safe eye retreat gaze, chest breathing, and ear twitches without accumulating drift', () => {
    const f = makeCatFixture();
    const r = createWholeCatRuntime(THREE, f.gltf);
    const restEyePos = f.eyeL.position.clone();

    // Engaged gaze rotates head/eyes and recesses eye position slightly.
    for (let i = 0; i < 12; i++) {
      r.animator.update({ motion: 'idle', phase: 0, visible: true, paused: false }, 1 / 30, { active: true, x: 1, y: .5 });
    }
    expect(f.eyeL.position.z).toBeLessThan(restEyePos.z);
    expect(f.chest.scale.x).toBeGreaterThanOrEqual(1);

    // Turning gaze off + resetting restores exact rest transforms with zero drift.
    r.animator.reset();
    expect(f.eyeL.position.distanceTo(restEyePos)).toBeLessThan(1e-6);
    expect(f.chest.scale.x).toBeCloseTo(1, 6);

    // Repeated frames in reading/sleep keep chest breathing bounded and never drift.
    for (let i = 0; i < 30; i++) {
      r.animator.update({ motion: 'sleep', mode: 'reading', phase: 0, visible: true, paused: false }, 1 / 30, { active: false });
    }
    expect(f.chest.scale.x).toBeGreaterThanOrEqual(1);
    expect(f.chest.scale.x).toBeLessThanOrEqual(1.02);
    expect(f.bodyMesh.morphTargetInfluences[0]).toBe(1);
    expect(f.bodyMesh.morphTargetInfluences[1]).toBe(1);

    r.cat.dispose();
    expect(r.cat.isDisposed).toBe(true);
  });
});
