import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {fetchGlbBytes} from './glb-asset.js';
import {createWholeCatRuntime,disposeWholeCatAsset} from './whole-cat-runtime.mjs';

export const V2_CAT_MODEL_URL = '/companion/v2/xiaohui.d8883406b6aa.glb';
const coatNames = new Set(['XiaohuiSkin_SoftCoat','Tail_SoftCoat']);
const tunedMaterials = new WeakSet();

/**
 * Upgrade the GLB's authored coat StandardMaterials to MeshPhysicalMaterial so
 * the studio's grazing fur sheen renders in both the 3D study room and the
 * reading overlay, without duplicating or disposing shared textures.
 */
export function applyRoomCoat(model, quality = 'medium') {
  const anisotropy = quality === 'low' ? 2 : 4;
  const enableSheen = quality !== 'low';
  const replacements = new Map();
  const styled = new Set();

  const upgrade = (source) => {
    if (!source) return source;
    if (replacements.has(source)) return replacements.get(source);

    let material = source;
    if (enableSheen && source.isMeshStandardMaterial && coatNames.has(source.name) && !tunedMaterials.has(source)) {
      if (source.isMeshPhysicalMaterial) {
        material = source;
      } else {
        material = new THREE.MeshPhysicalMaterial();
        // Physical.copy expects physical-only fields; Standard.copy preserves all shared maps.
        THREE.MeshStandardMaterial.prototype.copy.call(material, source);
        material.defines = {...source.defines, STANDARD: '', PHYSICAL: ''};
        material.onBeforeCompile = source.onBeforeCompile;
        material.customProgramCacheKey = source.customProgramCacheKey;
        material.onBeforeRender = source.onBeforeRender;
        replacements.set(source, material);
      }
      material.sheen = .16;
      material.sheenRoughness = .88;
      material.sheenColor.set('#f5ede2');
      tunedMaterials.add(material);
    }

    if (!styled.has(material)) {
      styled.add(material);
      for (const map of [material.map, material.normalMap, material.roughnessMap]) {
        if (map) map.anisotropy = anisotropy;
      }
    }
    return material;
  };

  model.traverse(object => {
    if (!object.isMesh) return;
    object.material = Array.isArray(object.material)
      ? object.material.map(upgrade)
      : upgrade(object.material);
  });
  // Every replaced StandardMaterial reference is now swapped; textures stay shared.
  for (const source of replacements.keys()) source.dispose();
  return replacements.size;
}

async function loadLegacyCat({headUrl, quality, signal}) {
  const [{createToonCat},{attachNativeHead,fetchNativeHeadAsset},{createCatAnimator},{prepareBodyCoat},{prepareKittenFur}]=await Promise.all([
    import('./cat-model.js'),import('./native-head.js'),import('./cat-animation.js'),
    import('./cat-coat.js'),import('./kitten-fur.js'),
  ]);
  const nativeHeadOnly=quality!=='high';
  const [headAsset]=await Promise.all([
    fetchNativeHeadAsset({url:headUrl,signal}),prepareBodyCoat(signal),prepareKittenFur(signal,{nativeHeadOnly}),
  ]);
  signal?.throwIfAborted();
  const cat=createToonCat({legacyHeadFur:false,detailedFur:quality==='high',nativeHeadOnly});
  try {
    await attachNativeHead(cat,{asset:headAsset,signal});
    signal?.throwIfAborted();
    cat.fur?.setDetail(quality==='high');
    cat.getSpeechAnchor=point=>cat.bones.head.localToWorld(point.set(0,.029,.069));
    return {cat,animator:createCatAnimator(cat),supports:()=>true,walkSpeed:1,
      gaits:{walk:{stride:.19,duration:.72},trot:{stride:.265,duration:.46},gallop:{stride:.44,duration:.36}}};
  } catch (error) {
    cat.dispose();
    throw error;
  }
}

export async function loadWebsiteCatModel({headUrl,quality,signal}) {
  if (headUrl) return loadLegacyCat({headUrl,quality,signal});
  const url=typeof DecompressionStream==='function'?V2_CAT_MODEL_URL+'.gz':V2_CAT_MODEL_URL;
  const bytes=await fetchGlbBytes(url,{signal,immutable:true});
  signal?.throwIfAborted();
  const gltf=await new GLTFLoader().parseAsync(bytes,new URL('.',new URL(url,document.baseURI)).href);
  let runtime;
  try {
    signal?.throwIfAborted();
    applyRoomCoat(gltf.scene,quality);
    runtime=createWholeCatRuntime(THREE,gltf);
    if (!runtime.gaits || runtime.readiness.missingPublicActions.length) {
      throw new Error('The companion model is missing a room animation');
    }
    // A shorter stride retains the ground contact and uses a brisk cadence
    // in the study. RoomDirector advances phase from distance, not wall time.
    return {...runtime,walkSpeed:1.6};
  } catch (error) {
    if (runtime) runtime.cat.dispose();
    else disposeWholeCatAsset(gltf.scene);
    throw error;
  }
}
