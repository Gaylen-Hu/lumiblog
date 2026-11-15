import * as T from 'three';
import {HEAD,uvToParam} from './cat-face-surface.js';
import {createSilverFaceAtlas,createAmberEyeAtlas} from './cat-face-texture.js';
import {loadCompanionImage} from './asset-images.js';

// This UV atlas contains only fur pigment. Lids, pupils, muzzle, ears and
// whiskers have their own geometry and are animated separately.
let faceImage=null,earImage=null,bibImage=null;
export async function prepareKittenFur(signal){
  if(faceImage&&earImage&&bibImage)return;
  const images=await Promise.all(['kitten-face-silver.webp','kitten-pinna.webp','kitten-bib.webp']
    .map(file=>loadCompanionImage('/companion/v1/'+file,signal)));
  signal?.throwIfAborted();[faceImage,earImage,bibImage]=images;
}
export function silverBibTexture(){
  if(!bibImage)return null;
  const texture=new T.Texture(bibImage);texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=4;texture.needsUpdate=true;
  return texture;
}
export function silverIrisTexture(){
  return createAmberEyeAtlas();
}
export function silverFaceTexture(){
  return createSilverFaceAtlas(faceImage);
}
export function silverEarTexture(back){
  if(!earImage)return null;
  const map=new T.Texture(earImage);map.colorSpace=T.SRGBColorSpace;map.anisotropy=4;
  map.repeat.x=.5;map.offset.x=back?.5:0;map.needsUpdate=true;
  return map;
}

// Sample the actual coat triangles in bind space. The little tapered ribbons
// inherit both the colour and the bone weights of the skin beneath their roots.
const regions={
  head:{count:18000,length:.0032,width:.00024},
  body:{count:14000,length:.0040,width:.00029},
  leg:{count:2100,length:.0024,width:.00027},
  tail:{count:5200,length:.0048,width:.00032},
  ear:{count:1800,length:.0017,width:.00018}
};

function randomSource(seed){
  return ()=>{
    seed=(Math.imul(1664525,seed)+1013904223)>>>0;
    return (seed+.5)/4294967296;
  };
}
function direction(region,x,y,n,out){
  if(region==='head')out.set(1.5*n.x,-.28-.84*Math.max(0,-n.y),-.58+.43*Math.max(0,n.y));
  else if(region==='leg')out.set(n.x*.16,-1,-.19);
  else if(region==='tail')out.set(.03,.35,-1);
  else if(region==='ear')out.set(.18*n.x,1,.12);
  else out.set(.36*n.x,-.18-.75*(1-Math.max(0,n.y)),-1);
  return out.addScaledVector(n,-out.dot(n)).normalize();
}
function facialLength(u,v){
  const param=uvToParam(u,v),a=Math.abs(param.theta),h=param.v;
  const eye=Math.hypot((a-HEAD.eye.theta)/.24,(h-HEAD.eye.v)/.21);
  const nose=Math.hypot(a/.15,(h-HEAD.nose.v)/.12);
  const lips=Math.hypot(a/.24,(h-HEAD.mouth.v)/.095);
  return T.MathUtils.smoothstep(Math.min(eye,nose,lips),.83,1.22)*
    (.43+.57*T.MathUtils.smoothstep(a,.32,1.05));
}
function castWeights(indices,weights,verts,bary){
  const merged=new Map();
  for(let k=0;k<3;k++)for(let j=0;j<4;j++){
    const w=weights.array[verts[k]*4+j]*bary[k];
    if(w<=0)continue;
    const id=indices.array[verts[k]*4+j];
    merged.set(id,(merged.get(id)||0)+w);
  }
  const selected=Array.from(merged).sort((a,b)=>b[1]-a[1]).slice(0,4);
  const total=selected.reduce((s,entry)=>s+entry[1],0);
  while(selected.length<4)selected.push([0,0]);
  return [selected.map(pair=>pair[0]),selected.map(pair=>pair[1]/total)];
}
function tuftGeometry(mesh,region,seed){
  const {count,length,width}=regions[region],g=mesh.geometry;
  const {position,normal,uv,skinIndex,skinWeight}=g.attributes,index=g.index;
  // Ear hairs grow on the rear shell and the narrow outer rim; leave the
  // pink concha exposed. Its first material group is the rear surface.
  const triCount=region==='ear'?Math.min(index.count/3,g.groups[0].count/3+128):index.count/3;
  const cdf=new Float64Array(triCount);
  const a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3(),root=new T.Vector3(),n=new T.Vector3();
  const groom=new T.Vector3(),side=new T.Vector3(),travel=new T.Vector3(),p=new T.Vector3(),middle=new T.Vector3();
  let area=0;
  for(let i=0;i<triCount;i++){
    a.fromBufferAttribute(position,index.getX(i*3));
    b.fromBufferAttribute(position,index.getX(i*3+1)).sub(a);
    c.fromBufferAttribute(position,index.getX(i*3+2)).sub(a);
    cdf[i]=area+=b.cross(c).length()*.5;
  }
  if(!area)return null;
  const xyz=[],normals=[],uvs=[],colours=[],boneIds=[],boneWeights=[],tri=[];
  const morphs=(g.morphAttributes.position||[]).map(()=>[]);
  const rand=randomSource(seed);
  for(let i=0;i<count;i++){
    const sample=area*rand();let lo=0,hi=triCount-1;
    while(lo<hi){const mid=(lo+hi)>>>1;if(cdf[mid]<sample)lo=mid+1;else hi=mid;}
    const verts=[index.getX(lo*3),index.getX(lo*3+1),index.getX(lo*3+2)];
    const s=Math.sqrt(rand()),t=rand(),bary=[1-s,s*(1-t),s*t];
    root.set(0,0,0);n.set(0,0,0);let u=0,v=0;
    for(let k=0;k<3;k++){
      root.addScaledVector(p.fromBufferAttribute(position,verts[k]),bary[k]);
      n.addScaledVector(p.fromBufferAttribute(normal,verts[k]),bary[k]);
      u+=uv.getX(verts[k])*bary[k];v+=uv.getY(verts[k])*bary[k];
    }
    const mask=region==='head'?facialLength(u,v):region==='leg'?T.MathUtils.smoothstep(root.y,.006,.031):1;
    if(mask<.12||n.lengthSq()<.001)continue;
    n.normalize();direction(region,root.x,root.y,n,groom);
    if(region==='tail'){
      // Each longitudinal UV row points from the tail root towards the tip.
      const baseV=uv.getY(verts[0]);
      for(let k=1;k<3;k++){
        const dv=uv.getY(verts[k])-baseV;
        if(Math.abs(dv)<.00001)continue;
        groom.fromBufferAttribute(position,verts[k]).sub(p.fromBufferAttribute(position,verts[0])).multiplyScalar(Math.sign(dv));
        groom.addScaledVector(n,-groom.dot(n)).normalize();break;
      }
    }
    if(groom.lengthSq()<.2)groom.set(1,0,0).addScaledVector(n,-n.x).normalize();
    side.crossVectors(n,groom).normalize();
    const flowNoise=.15*Math.sin(17*u+9*v)+.40*(rand()-.5);
    travel.copy(groom).addScaledVector(side,flowNoise).addScaledVector(n,.19+.34*rand()).normalize();
    const len=length*(.60+.82*rand())*mask;
    const wide=width*(.72+.70*rand())*Math.sqrt(mask);
    root.addScaledVector(n,-.00015);
    middle.copy(root).addScaledVector(travel,len*.52).addScaledVector(n,.08*len);
    const tone=.87+.33*rand(),start=xyz.length/3;
    const bind=skinIndex?castWeights(skinIndex,skinWeight,verts,bary):null;
    const morphOffsets=morphs.map((_,m)=>{
      const offset=new T.Vector3();
      for(let k=0;k<3;k++)offset.addScaledVector(p.fromBufferAttribute(g.morphAttributes.position[m],verts[k]),bary[k]);
      return offset;
    });
    function vertex(center,lateral,brightness){
      p.copy(center).addScaledVector(side,lateral);
      xyz.push(p.x,p.y,p.z);normals.push(n.x,n.y,n.z);uvs.push(u,v);
      colours.push(brightness,brightness,brightness);
      if(bind){boneIds.push(...bind[0]);boneWeights.push(...bind[1]);}
      for(let m=0;m<morphOffsets.length;m++){
        const d=morphOffsets[m];morphs[m].push(d.x,d.y,d.z);
      }
    }
    vertex(root,-wide*.48,tone*.93);vertex(root,wide*.48,tone*.93);
    vertex(middle,-wide*.31,tone);vertex(middle,wide*.31,tone);
    middle.copy(root).addScaledVector(travel,len);
    vertex(middle,0,tone*1.13);
    tri.push(start,start+1,start+2,start+2,start+1,start+3,start+2,start+3,start+4);
  }
  const out=new T.BufferGeometry();
  out.setAttribute('position',new T.Float32BufferAttribute(xyz,3));
  out.setAttribute('normal',new T.Float32BufferAttribute(normals,3));
  out.setAttribute('color',new T.Float32BufferAttribute(colours,3));
  out.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));
  if(skinIndex){
    out.setAttribute('skinIndex',new T.Uint16BufferAttribute(boneIds,4));
    out.setAttribute('skinWeight',new T.Float32BufferAttribute(boneWeights,4));
  }
  if(morphs.length){
    out.morphTargetsRelative=g.morphTargetsRelative;
    out.morphAttributes.position=morphs.map(values=>new T.Float32BufferAttribute(values,3));
  }
  out.setIndex(tri);out.computeBoundingSphere();return out;
}

export function addKittenFur(root,palette,{legacyHead=true}={}){
  const layers=[];
  const surfaces=[];
  root.traverse(o=>{
    const region=o.name==='SilverHeadCoat'?'head':o.name==='SilverBodyCoat'?'body':
      o.name==='SilverTailCoat'?'tail':o.name.startsWith('SilverLegCoat_')?'leg':
      o.name==='LeftPinna'||o.name==='RightPinna'?'ear':null;
    const surface=Array.isArray(o.material)?o.material[0]:o.material;
    if(regions[region]&&o.isMesh&&surface.map)surfaces.push([o,region,surface]);
  });
  for(const [i,[mesh,region,surface]] of surfaces.entries()){
    // Keep the original surface index: body fibres must keep their exact
    // random seed even when the native head skips the old head and ears.
    if(!legacyHead&&(region==='head'||region==='ear'))continue;
    const g=tuftGeometry(mesh,region,49157+i*1217);
    if(!g)continue;
    const sourceMaterial=new T.MeshStandardMaterial({
      map:surface.map,vertexColors:true,roughness:.96,metalness:0,side:T.DoubleSide,
      emissive:surface.emissive,emissiveIntensity:surface.emissiveIntensity,emissiveMap:surface.emissiveMap
    });
    const m=palette?palette.coat(sourceMaterial,{fibre:true}):sourceMaterial;
    if(palette)sourceMaterial.dispose();
    // Treat the two sides as a single lit fibre. Flipped normals would
    // pepper the pale fur with black dashes as the camera orbits.
    if(!palette)m.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_begin>',
      '#include <normal_fragment_begin>\nnormal *= faceDirection;');};
    const coat=mesh.isSkinnedMesh?new T.SkinnedMesh(g,m):new T.Mesh(g,m);
    coat.name=mesh.name+'Nap';coat.raycast=()=>{};coat.frustumCulled=false;mesh.parent.add(coat);
    if(mesh.isSkinnedMesh)coat.bind(mesh.skeleton,mesh.bindMatrix);
    if(mesh.morphTargetInfluences)coat.morphTargetInfluences=mesh.morphTargetInfluences;
    layers.push(coat);
  }
  function removeLayers(predicate){
    for(let i=layers.length-1;i>=0;i--){
      const coat=layers[i];if(!predicate(coat))continue;
      coat.removeFromParent();coat.geometry.dispose();coat.material.dispose();layers.splice(i,1);
    }
  }
  return {
    setDetail(enabled){for(const coat of layers)coat.visible=enabled;},
    removeLegacyHead(){removeLayers(coat=>['SilverHeadCoatNap','LeftPinnaNap','RightPinnaNap'].includes(coat.name));},
    dispose(){removeLayers(()=>true);}
  };
}
