import * as T from 'three';
import {createToonPalette} from './cat-toon-material.js';
import {fitNativeCollar} from './native-collar.js';

const clamp=T.MathUtils.clamp, smooth=T.MathUtils.smoothstep;
const key=p=>[p.x,p.y,p.z].map(v=>Math.round(v*1e7)).join(',');
const luminance=c=>.2126*c.r+.7152*c.g+.0722*c.b;
// Rear planar projection has no cylindrical pole at the crown. Both skull
// and connector use this bind-space field, so the short fur keeps its scale.
const coatUV=p=>new T.Vector2(clamp(.5+p.x*4.5,.02,.98),clamp(.18+(p.y-.18)*4.3,.05,.96));
const projectionGLSL=`
  vec2 neckCoatUV(vec3 p){
    return vec2(clamp(.5+p.x*4.5,.02,.98),clamp(.18+(p.y-.18)*4.3,.05,.96));
  }
`;
function pigment(t){
  return new T.Color().setRGB(.045,.044,.043)
    .lerp(new T.Color().setRGB(.46,.465,.47),clamp((t-.025)/.405,0,1))
    .lerp(new T.Color().setRGB(.83,.815,.79),clamp((t-.43)/.42,0,1));
}
function textureSampler(map){
  const canvas=document.createElement('canvas'),image=map.image;
  canvas.width=image.width;canvas.height=image.height;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0);
  const data=ctx.getImageData(0,0,canvas.width,canvas.height).data;
  const uv=new T.Vector2();map.updateMatrix();
  return (u,v)=>{
    uv.set(u,v);map.transformUv(uv);
    const x=clamp(Math.round(uv.x*(canvas.width-1)),0,canvas.width-1);
    const y=clamp(Math.round(uv.y*(canvas.height-1)),0,canvas.height-1);
    const i=(y*canvas.width+x)*4;
    return new T.Color().setRGB(data[i]/255,data[i+1]/255,data[i+2]/255,T.SRGBColorSpace);
  };
}

// Replace the standalone display closure with a neck whose top vertices
// exactly coincide with the retained skull loop. Nothing on the face changes.
export function connectNativeNeck(cat,model,mount){
  let skin;
  model.traverse(o=>{if(o.isMesh&&o.userData.surfaceRole==='Silver mackerel tabby')skin=o;});
  const body=cat.root.getObjectByName('SilverBodyCoat');
  const oldThroat=cat.root.getObjectByName('SilverThroatCoat');
  if(!skin||!body?.isSkinnedMesh)return null;
  const geo=skin.geometry,{position,normal,uv}=geo.attributes,idx=geo.index;
  const cap=[],kept=[],edges=new Map(),points=new Map(),retained=new Map();
  const p=new T.Vector3();
  const point=i=>new T.Vector3().fromBufferAttribute(position,i);
  const capVertex=i=>Math.abs(uv.getX(i)-.495)<.00501&&uv.getY(i)>=.01499&&uv.getY(i)<=.03001&&position.getZ(i)<-.009;
  for(let i=0;i<idx.count;i+=3){
    const tri=[idx.getX(i),idx.getX(i+1),idx.getX(i+2)];
    if(tri.every(capVertex)){
      cap.push(...tri);
      for(let j=0;j<3;j++){
        const a=key(point(tri[j])),b=key(point(tri[(j+1)%3]));
        points.set(a,point(tri[j]));const id=[a,b].sort().join('|');
        const edge=edges.get(id)||{a,b,count:0};edge.count++;edges.set(id,edge);
      }
    }else{
      kept.push(...tri);
      for(const index of tri)retained.set(key(point(index)),index);
    }
  }
  if(!cap.length)return null;
  const boundary=[...edges.values()].filter(e=>e.count===1),adj=new Map();
  for(const {a,b}of boundary){if(!adj.has(a))adj.set(a,[]);if(!adj.has(b))adj.set(b,[]);adj.get(a).push(b);adj.get(b).push(a);}
  if(boundary.length!==70||[...adj.values()].some(v=>v.length!==2))throw new Error('Native neck perimeter is not the expected closed loop');
  const loop=[];let current=boundary[0].a,previous=null;
  do{loop.push(current);const next=adj.get(current).find(k=>k!==previous);previous=current;current=next;}while(current!==loop[0]&&loop.length<=70);
  if(loop.length!==70||loop.some(k=>!retained.has(k)))throw new Error('Native neck perimeter does not match retained skull');
  cat.root.updateMatrixWorld(true);
  const skeleton=body.skeleton,headId=skeleton.bones.indexOf(cat.bones.head),neckId=skeleton.bones.indexOf(cat.bones.neck),chestId=skeleton.bones.indexOf(cat.bones.chest);
  if(Math.min(headId,neckId,chestId)<0)throw new Error('Neck bridge bones missing');
  // Build in skeleton bind space even if a placement edit happens mid-pose.
  // Using the currently animated head world matrix would skin the pose twice.
  const relative=new T.Matrix4().copy(cat.bones.head.matrixWorld).invert().multiply(skin.matrixWorld);
  const toRoot=new T.Matrix4().copy(body.bindMatrix).invert()
    .multiply(new T.Matrix4().copy(skeleton.boneInverses[headId]).invert()).multiply(relative);
  const normalToRoot=new T.Matrix3().getNormalMatrix(toRoot);
  const centre=new T.Vector3();for(const k of loop)centre.add(points.get(k));centre.divideScalar(loop.length);
  const headSample=textureSampler(skin.material.map);
  const nodes=loop.map(k=>{
    const i=retained.get(k),local=point(i),top=local.clone().applyMatrix4(toRoot);
    const n=new T.Vector3().fromBufferAttribute(normal,i).applyMatrix3(normalToRoot).normalize();
    const angle=Math.atan2((local.x-centre.x)/.023,(local.y-centre.y)/.021);
    // All of this ring lies below/behind the slanted skull cut, buried in
    // the chest. A forward high ring folds the lower half back into the head.
    const bottom=new T.Vector3(.052*Math.sin(angle),.180+.006*Math.cos(angle),.117-.040*Math.cos(angle));
    const grey=luminance(headSample(uv.getX(i),uv.getY(i)));
    const headTone=T.MathUtils.lerp(.045,.43,clamp((grey-.025)/.120,0,1))+.40*clamp((grey-.145)/.095,0,1);
    const topColor=pigment(headTone).lerp(pigment(.22+.60*smooth(grey,.015,.24)),
      (1-smooth(local.z,-.018,-.002))*(1-smooth(local.y,.022,.040))*.90);
    const projectedWeight=(1-smooth(local.z,-.016,.002))*(1-smooth(local.y,.024,.038));
    const travel=bottom.clone().sub(top),start=travel.clone().addScaledVector(n,-travel.dot(n));
    if(start.lengthSq()<1e-8)start.copy(travel);
    start.normalize().multiplyScalar(travel.length()*.8);
    return {top,bottom,n,start,end:travel.clone().multiplyScalar(.8),topColor,projectedWeight};
  });
  // Follow the retained surface across its cut, using one consistent winding
  // for the whole loop. Projecting each target vector independently can point
  // back into the skull on half of this oblique perimeter.
  let outwardScore=0;
  for(let i=0;i<nodes.length;i++){
    const node=nodes[i],tangent=nodes[(i+1)%nodes.length].top.clone().sub(nodes[(i+nodes.length-1)%nodes.length].top);
    node.start.crossVectors(tangent,node.n).normalize();
    outwardScore+=node.start.dot(node.bottom.clone().sub(node.top));
  }
  for(const node of nodes)node.start.multiplyScalar((outwardScore<0?-1:1)*node.top.distanceTo(node.bottom)*.55);
  const rows=16,cols=nodes.length,xyz=[],colors=[],uvs=[],seamWeights=[],boneIds=[],weights=[],triangles=[];
  for(let row=0;row<=rows;row++){
    const t=row/rows,t2=t*t,t3=t2*t;
    for(const [column,node]of nodes.entries()){
      p.copy(node.top).multiplyScalar(2*t3-3*t2+1).addScaledVector(node.start,t3-2*t2+t)
        .addScaledVector(node.bottom,-2*t3+3*t2).addScaledVector(node.end,t3-t2);
      xyz.push(p.x,p.y,p.z);
      const tex=coatUV(p);uvs.push(tex.x,tex.y);
      colors.push(node.topColor.r,node.topColor.g,node.topColor.b);
      seamWeights.push((1-node.projectedWeight)*(1-smooth(t,0,.30)));
      // Anchor the actual seam entirely to Head, then distribute neck bending
      // over the full length rather than exposing a second rigid throat shell.
      const h=1-smooth(t,.10,.83),c=.35*smooth(t,.73,1),n=1-h-c;
      boneIds.push(headId,neckId,chestId,0);weights.push(h,n,c,0);
      if(row<rows){const a=row*cols+column,b=row*cols+(column+1)%cols;
        triangles.push(a,b,a+cols,b,b+cols,a+cols);}
    }
  }
  const bridgeGeo=new T.BufferGeometry();
  bridgeGeo.setAttribute('position',new T.Float32BufferAttribute(xyz,3));
  bridgeGeo.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));
  bridgeGeo.setAttribute('neckSeamPigment',new T.Float32BufferAttribute(colors,3));
  bridgeGeo.setAttribute('neckSeamWeight',new T.Float32BufferAttribute(seamWeights,1));
  bridgeGeo.setAttribute('skinIndex',new T.Uint16BufferAttribute(boneIds,4));
  bridgeGeo.setAttribute('skinWeight',new T.Float32BufferAttribute(weights,4));
  bridgeGeo.setIndex(triangles);bridgeGeo.computeVertexNormals();
  // Orient the tube outwards (the source loop winding may be either way).
  const at=cols*7,norm=bridgeGeo.attributes.normal;
  const rowCentre=new T.Vector3();for(let i=0;i<cols;i++)rowCentre.add(p.fromBufferAttribute(bridgeGeo.attributes.position,at+i));rowCentre.divideScalar(cols);
  const radial=point=>point.clone().sub(rowCentre);let facing=0;
  for(let i=0;i<cols;i++)facing+=radial(new T.Vector3().fromBufferAttribute(bridgeGeo.attributes.position,at+i)).dot(new T.Vector3().fromBufferAttribute(norm,at+i));
  if(facing<0){for(let i=0;i<triangles.length;i+=3)[triangles[i+1],triangles[i+2]]=[triangles[i+2],triangles[i+1]];bridgeGeo.setIndex(triangles);bridgeGeo.computeVertexNormals();}
  for(let i=0;i<cols;i++)bridgeGeo.attributes.normal.setXYZ(i,nodes[i].n.x,nodes[i].n.y,nodes[i].n.z);
  bridgeGeo.computeBoundingSphere();
  const palette=createToonPalette(),source=new T.MeshStandardMaterial({color:'white',map:body.material.map,roughness:.94});
  const material=palette.coat(source);source.dispose();
  const coatCompile=material.onBeforeCompile;
  material.onBeforeCompile=shader=>{
    coatCompile(shader);
    shader.vertexShader=shader.vertexShader.replace('#include <common>',`#include <common>
      attribute vec3 neckSeamPigment;attribute float neckSeamWeight;
      varying vec3 vNeckSeamPigment;varying float vNeckSeamWeight;`)
      .replace('#include <begin_vertex>',`#include <begin_vertex>
      vNeckSeamPigment=neckSeamPigment;vNeckSeamWeight=neckSeamWeight;`);
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
      varying vec3 vNeckSeamPigment;varying float vNeckSeamWeight;`)
      .replace('#include <color_fragment>',`#include <color_fragment>
      diffuseColor.rgb=mix(diffuseColor.rgb,vNeckSeamPigment,vNeckSeamWeight);`);
  };
  material.customProgramCacheKey=()=> 'silver-continuous-neck-v1';
  material.name='Continuous silver neck';
  const bridge=new T.SkinnedMesh(bridgeGeo,material);bridge.name='NativeNeckBridge';
  bridge.castShadow=true;bridge.receiveShadow=true;bridge.frustumCulled=false;
  cat.root.add(bridge);bridge.bind(skeleton,body.bindMatrix);
  let fittedCollar;
  try{fittedCollar=fitNativeCollar(cat,bridge);}catch(error){
    bridge.removeFromParent();bridgeGeo.dispose();material.dispose();palette.dispose();throw error;
  }
  // Only the cap's triangle list changes. Share the unchanged vertex and
  // expression buffers instead of copying the complete authored skull.
  const openSkull=new T.BufferGeometry();openSkull.name=geo.name;
  for(const [name,attribute]of Object.entries(geo.attributes))openSkull.setAttribute(name,attribute);
  for(const [name,attributes]of Object.entries(geo.morphAttributes))openSkull.morphAttributes[name]=attributes.slice();
  openSkull.morphTargetsRelative=geo.morphTargetsRelative;
  for(const group of geo.groups)openSkull.addGroup(group.start,group.count,group.materialIndex);
  openSkull.setDrawRange(geo.drawRange.start,geo.drawRange.count);
  openSkull.boundingBox=geo.boundingBox?.clone()??null;openSkull.boundingSphere=geo.boundingSphere?.clone()??null;
  openSkull.userData={...geo.userData};openSkull.setIndex(kept);skin.geometry=openSkull;
  const originalCompile=skin.material.onBeforeCompile,originalKey=skin.material.customProgramCacheKey;
  skin.material.onBeforeCompile=shader=>{
    originalCompile(shader);
    shader.uniforms.neckPigmentMap={value:body.material.map};
    shader.uniforms.neckRestMatrix={value:toRoot};
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
      uniform sampler2D neckPigmentMap;uniform mat4 neckRestMatrix;${projectionGLSL}`);
    shader.fragmentShader=shader.fragmentShader.replace('diffuseColor.rgb*=coat;',`
      vec3 neckRest=(neckRestMatrix*vec4(vCoatRest,1.0)).xyz;
      vec3 neckPigment=texture2D(neckPigmentMap,neckCoatUV(neckRest)).rgb;
      float neckTone=dot(neckPigment,vec3(.2126,.7152,.0722));
      float neckBlend=(1.0-smoothstep(-.016,.002,vCoatRest.z))
        *(1.0-smoothstep(.024,.038,vCoatRest.y));
      coat=mix(coat,silverCoatPigment(neckTone),neckBlend);
      diffuseColor.rgb*=coat;`);
  };
  skin.material.customProgramCacheKey=()=>originalKey()+'-continuous-nape-v1';skin.material.needsUpdate=true;
  if(oldThroat)oldThroat.visible=false;
  bridge.userData.junction={removedCapTriangles:cap.length/3,seamVertices:cols,rows,headId,neckId,chestId};
  let disposed=false;
  return {bridge,openSkull,collar:fittedCollar?.collar,dispose(){
    if(disposed)return;disposed=true;
    fittedCollar?.dispose();
    bridge.removeFromParent();bridgeGeo.dispose();material.dispose();palette.dispose();
    if(skin.geometry===openSkull)skin.geometry=geo;openSkull.dispose();
    skin.material.onBeforeCompile=originalCompile;skin.material.customProgramCacheKey=originalKey;skin.material.needsUpdate=true;
    if(oldThroat)oldThroat.visible=true;
  }};
}
