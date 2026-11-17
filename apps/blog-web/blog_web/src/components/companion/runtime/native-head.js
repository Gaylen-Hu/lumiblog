import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {createToonCoat,createToonEyeMargin,createToonMouth,createKittenNose} from './head/toon-coat.js';
import {createEyeHighlights} from './head/eye-highlights.js';
import {createWhiskers} from './head/whiskers.js';
import {connectNativeNeck} from './native-neck.js';
import {softenMouthExpression} from './head/soft-expression.js';

// Uniform placement preserves the reviewed neutral head and UVs. The mouth
// expression is calibrated separately for a small, friendly companion.
export const NATIVE_HEAD_PLACEMENT=Object.freeze({scale:1.90,offset:Object.freeze([0,.020,.016])});
const clamp=T.MathUtils.clamp;

function createHeadLoader(){
  // These two coat materials are replaced below by a cel shader that only
  // uses pigment. Skip decoding their discarded PBR maps; eye maps retain
  // their authored normal/roughness response. The source GLB stays intact.
  return new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).register(parser=>({
    name:'CompanionToonCoat',
    beforeRoot(){
      for(const material of parser.json.materials||[]){
        if(!['Silver mackerel tabby','MuzzleIvory'].includes(material.name))continue;
        delete material.normalTexture;
        delete material.occlusionTexture;
        if(material.pbrMetallicRoughness)delete material.pbrMetallicRoughness.metallicRoughnessTexture;
      }
    }
  }));
}

function resourceOwner(){
  const geometry=new Set(),materials=new Set(),textures=new Set();
  function material(m){
    if(!m)return;materials.add(m);
    for(const value of Object.values(m))if(value?.isTexture&&value.name!=='Soft cel light bands')textures.add(value);
  }
  return {
    capture(root){root.traverse(o=>{if(o.geometry)geometry.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])material(m);});},
    dispose(){
      geometry.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());
      const images=new Set();textures.forEach(t=>{const image=t.source?.data;if(image?.close)images.add(image);t.dispose();});
      images.forEach(image=>image.close());geometry.clear();materials.clear();textures.clear();
    }
  };
}

const compatibilityHead='/companion/v1/kitten-head.85cc0fd38665.glb.gz';
const compactHead='/companion/v1/kitten-head.cbaac6dba636.glb.gz';

export async function fetchNativeHeadAsset({url,signal}={}){
  let path=url;
  if(!path){
    let decoded=false;
    if(MeshoptDecoder.supported){
      try { await MeshoptDecoder.ready; decoded=true; } catch { /* The host may restrict WebAssembly. */ }
    }
    path=decoded?compactHead:compatibilityHead;
  }
  const response=await fetch(path,{signal,credentials:'same-origin',cache:url?'default':'force-cache'});
  if(!response.ok)throw new Error('Cat head asset could not be loaded');
  let bytes=await response.arrayBuffer();
  signal?.throwIfAborted();
  // Some hosts serve .gz with Content-Encoding and the browser has already
  // decoded it. Inspect the payload so both static hosting setups work.
  const signature=new Uint8Array(bytes,0,Math.min(2,bytes.byteLength));
  if(signature[0]===0x1f&&signature[1]===0x8b){
    if(typeof DecompressionStream==='function'){
      const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'),{signal});
      bytes=await new Response(stream).arrayBuffer();
    }else{
      const {gunzipSync}=await import('three/addons/libs/fflate.module.js');
      bytes=gunzipSync(new Uint8Array(bytes)).buffer;
    }
    signal?.throwIfAborted();
  }
  return {bytes,url:path};
}

export async function attachNativeHead(cat,{url,asset,
  scale=NATIVE_HEAD_PLACEMENT.scale,offset=NATIVE_HEAD_PLACEMENT.offset,signal}={}){
  if(cat.isDisposed)return null;
  if(cat.nativeHead)return cat.nativeHead;
  if(cat.nativeHeadLoad)return cat.nativeHeadLoad;
  if(!cat.bones?.head||!cat.installHeadController)throw new Error('Cat model does not support a native head');
  cat.nativeHeadLoad=(async()=>{
    const owned=resourceOwner();let model,mount,neck;
    try{
      const headAsset=asset||await fetchNativeHeadAsset({url,signal});
      signal?.throwIfAborted();
      const gltf=await createHeadLoader().parseAsync(headAsset.bytes,new URL('.',new URL(headAsset.url,document.baseURI)).href);model=gltf.scene;owned.capture(model);
      const authoredFace=model.getObjectByName('KittenHead')?.userData.expressionPolicy==='baked-friendly-mouth-v2';
      if(cat.isDisposed){owned.dispose();return null;}
      model.name='NativeKittenHeadAsset';
      const skins=[];
      model.traverse(o=>{if(o.isMesh&&['Silver mackerel tabby','MuzzleIvory'].includes(o.material?.name))skins.push(o);});
      const whiskerSkin=skins.find(o=>o.material.name==='MuzzleIvory')||skins[0];
      const whisker=whiskerSkin?createWhiskers(whiskerSkin,authoredFace?{xScale:.82,yOffset:.0024,lengthScale:.9}:undefined):null;
      createEyeHighlights(model);
      const meshes=[],corneas=new Set();
      model.traverse(mesh=>{
        if(!mesh.isMesh)return;meshes.push(mesh);
        if(!authoredFace)softenMouthExpression(mesh);
        const source=mesh.material,role=source.name;mesh.userData.surfaceRole=role;
        if(role==='Clear cornea' && source.transmission>0)corneas.add(source);
        mesh.castShadow=!/Pupil|Whisker|Fur|Highlight/i.test(mesh.name);
        mesh.receiveShadow=!/Highlight/i.test(mesh.name);mesh.frustumCulled=false;
        if(role==='Silver mackerel tabby'||role==='MuzzleIvory')mesh.material=createToonCoat(source,{separateNose:true,vertexPigment:role==='MuzzleIvory',artistCoordinates:mesh.geometry.hasAttribute('_coat_rest')&&mesh.geometry.hasAttribute('_coat_normal')});
        else if(/^(Eyelid_|Lacrimal)/.test(mesh.name))mesh.material=createToonEyeMargin(source,mesh.name.startsWith('Lacrimal'));
        else if(/^(Teeth_|Tongue|OralCavity)/.test(mesh.name)||role==='MouthInterior')mesh.material=createToonMouth(source,role==='MouthInterior'?'OralCavity':mesh.name);
        else if(mesh.name==='NoseSurface'||role==='KittenNose')mesh.material=createKittenNose(source);
        // The companion uses soft mews, not the asset's exposed hunting teeth.
        if(mesh.name.startsWith('Teeth_'))mesh.visible=false;
        mesh.userData.colorMaterial=mesh.material;
        for(const m of Array.isArray(mesh.material)?mesh.material:[mesh.material])if(m.map)m.map.anisotropy=4;
      });
      owned.capture(model);
      const eyePivots=['EyePivot_L','EyePivot_R'].map(name=>model.getObjectByName(name));
      const neutral=eyePivots.map(p=>p?.quaternion.clone());
      const tongue=model.getObjectByName('Tongue'),tongueRest=tongue?.position.clone();
      if(tongue&&!authoredFace){tongue.scale.x*=.55;tongue.scale.z*=.28;}
      const gazeRotation=new T.Quaternion(),gazeEuler=new T.Euler();
      const values={blink:0,wink:0,mouth:0,gazeX:0,gazeY:0,pupil:.5,earL:0,earR:0};
      // Resolve channels once. Whiskers can share their parent's influences,
      // so register each influence array only once as well.
      const channels={blink_L:[],blink_R:[],mouthOpen:[],ear_L:[],ear_R:[]},seenInfluences=new Set();
      for(const mesh of meshes){
        const weights=mesh.morphTargetInfluences,dictionary=mesh.morphTargetDictionary;
        if(!weights||!dictionary||seenInfluences.has(weights))continue;
        seenInfluences.add(weights);
        for(const name in channels){const index=dictionary[name];if(index!==undefined)channels[name].push({weights,index});}
      }
      function writeChannel(entries,value){for(const entry of entries)if(entry.weights[entry.index]!==value)entry.weights[entry.index]=value;}
      const earValues=new Float64Array(2);
      let disposed=false;
      function setFace({blink=0,wink=0,mouth=0,gazeX=0,gazeY=0,pupil=.5}={}){
        if(disposed)return;
        blink=clamp(blink,0,1);wink=clamp(wink,0,1);mouth=(authoredFace?1:.62)*clamp(mouth,0,1);
        gazeX=clamp(gazeX,-1,1);gazeY=clamp(gazeY,-1,1);
        // Preserve the companion's right-eye wink (screen left). Source
        // native L is at +X and R at -X, opposite from a viewer's left/right.
        const closedRight=Math.max(blink,wink);
        for(let i=0;i<cat.ears.length;i++){
          const ear=cat.ears[i];
          const r=ear.rotation,back=Math.max(0,r.x)/.35;
          const smallMotion=(Math.abs(r.y-.20*gazeX)+Math.abs(r.z))/.50;
          earValues[i]=clamp(back+.55*smallMotion,0,1);
        }
        values.blink=blink;values.wink=wink;values.mouth=mouth;
        values.gazeX=gazeX;values.gazeY=gazeY;values.pupil=pupil;
        values.earL=earValues[0];values.earR=earValues[1];
        if(tongue&&!authoredFace){
          const reveal=T.MathUtils.smoothstep(mouth,.05,.25);
          const centreDepth=.028-.0033*mouth;
          tongue.position.copy(tongueRest);tongue.position.y+=.0045*reveal;
          // Keep a shallow rounded tip inside the lip. Translating the full
          // long source tongue forward made it stick out in profile.
          tongue.position.z+=centreDepth*.72+(.0432-centreDepth)*reveal;
        }
        writeChannel(channels.blink_L,blink);writeChannel(channels.blink_R,closedRight);
        writeChannel(channels.mouthOpen,mouth);
        writeChannel(channels.ear_L,earValues[0]);writeChannel(channels.ear_R,earValues[1]);
        for(let i=0;i<eyePivots.length;i++){
          const pivot=eyePivots[i];if(!pivot)continue;
          const open=1-T.MathUtils.smoothstep(i===0?blink:closedRight,.60,1);
          // These limits were validated against the real closed-lid skin;
          // the old procedural eye's much larger angles are not reused.
          gazeEuler.set(-.035*gazeY*open,.055*gazeX*open,0);
          gazeRotation.setFromEuler(gazeEuler);pivot.quaternion.copy(neutral[i]).multiply(gazeRotation);
        }
      }
      mount=new T.Group();mount.name='NativeHeadMount';mount.scale.setScalar(scale);mount.position.fromArray(offset);mount.add(model);
      const controller={model,mount,meshes,values,authoredFace,
        // At room scale the painted irises and separate catchlights carry the
        // eyes. The microscopic refracting shell would render the whole room twice.
        setRoomScale(inRoom){for(const material of corneas)material.visible=!inRoom;},
        eyes:eyePivots.map((pivot,i)=>({side:i===0?1:-1,pivot,globe:model.getObjectByName(i===0?'Sclera_L':'ScleraR'),optical:pivot})),
        whiskers:whisker?[whisker]:[],setFace,
        setPlacement(nextScale=scale,nextOffset=offset){
          if(disposed)return;neck?.dispose();mount.scale.setScalar(nextScale);mount.position.fromArray(nextOffset);
          neck=connectNativeNeck(cat,model,mount);controller.neck=neck;
        },
        dispose(){if(disposed)return;disposed=true;neck?.dispose();mount.removeFromParent();owned.dispose();}
      };
      if(!cat.installHeadController(controller))return null;
      cat.bones.head.add(mount);neck=connectNativeNeck(cat,model,mount);
      controller.neck=neck;cat.nativeHead=controller;setFace();return controller;
    }catch(error){neck?.dispose();mount?.removeFromParent();owned.dispose();if(cat.isDisposed)return null;throw error;}
  })();
  try{return await cat.nativeHeadLoad;}finally{cat.nativeHeadLoad=null;}
}
