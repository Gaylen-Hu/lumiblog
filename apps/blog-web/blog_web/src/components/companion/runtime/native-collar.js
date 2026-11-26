import * as T from 'three';

// Fit a closed leather band to the actual bind-pose skin and copy its weights.
// A rigid ellipse on Neck cannot stay attached to the new blended neck skin.
export function fitNativeCollar(cat,bridge){
  const old=cat.root.getObjectByName('CharcoalCollar');
  if(!old)return null;
  const lower=cat.root.getObjectByName('CollarLowerRim'),upper=cat.root.getObjectByName('CollarUpperRim');
  const body=cat.root.getObjectByName('SilverBodyCoat'),skeleton=body.skeleton;
  const sources=[body,bridge],triangles=[];
  const a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3();
  for(const mesh of sources){
    const g=mesh.geometry,p=g.attributes.position,idx=g.index;
    for(let i=0;i<idx.count;i+=3){
      const ids=[idx.getX(i),idx.getX(i+1),idx.getX(i+2)];
      a.fromBufferAttribute(p,ids[0]);b.fromBufferAttribute(p,ids[1]);c.fromBufferAttribute(p,ids[2]);
      const minY=Math.min(a.y,b.y,c.y),maxY=Math.max(a.y,b.y,c.y);
      if(maxY<.17||minY>.275)continue;
      triangles.push({mesh,ids,a:a.clone(),b:b.clone(),c:c.clone(),minY,maxY});
    }
  }
  const cols=96,rows=6,samples=[],ray=new T.Ray(),point=new T.Vector3(),bary=new T.Vector3();
  const direction=new T.Vector3(),normal=new T.Vector3();
  for(let row=0;row<=rows;row++)for(let col=0;col<=cols;col++){
    const angle=(col/cols-.5)*Math.PI*2,cs=Math.cos(angle);
    const height=.212-.033*cs+.006*cs*cs+(row/rows-.5)*.007;
    direction.set(Math.sin(angle),0,cs);
    // Avoid an exact hit along the body's mirrored centre seam.
    ray.set(new T.Vector3(.000001,height,.15),direction);
    let hit=null,distance=0;
    for(const tri of triangles){
      if(height<tri.minY-1e-7||height>tri.maxY+1e-7)continue;
      if(!ray.intersectTriangle(tri.a,tri.b,tri.c,false,point))continue;
      const d=point.clone().sub(ray.origin).dot(direction);
      if(d>distance&&d<.14){distance=d;hit={tri,point:point.clone()};}
    }
    if(!hit)throw new Error('Collar surface missing at '+row+'/'+col);
    const {tri}=hit,g=tri.mesh.geometry;
    T.Triangle.getBarycoord(hit.point,tri.a,tri.b,tri.c,bary);
    const w=[bary.x,bary.y,bary.z],boneWeights=new Map();normal.set(0,0,0);
    for(let j=0;j<3;j++){
      normal.addScaledVector(a.fromBufferAttribute(g.attributes.normal,tri.ids[j]),w[j]);
      for(let k=0;k<4;k++){
        const id=g.attributes.skinIndex.array[tri.ids[j]*4+k],weight=g.attributes.skinWeight.array[tri.ids[j]*4+k]*w[j];
        boneWeights.set(id,(boneWeights.get(id)||0)+weight);
      }
    }
    normal.normalize();if(normal.dot(direction)<0)normal.negate();
    const bone=[...boneWeights].filter(([,w])=>w>1e-7).sort((x,y)=>y[1]-x[1]).slice(0,4);
    const total=bone.reduce((s,[,w])=>s+w,0);while(bone.length<4)bone.push([0,0]);
    // The two overlapping skins have different normals at their meeting
    // line. A common radial offset keeps the leather edge continuous there.
    samples.push({p:hit.point,n:direction.clone(),surfaceNormal:normal.clone(),ids:bone.map(([id])=>id),weights:bone.map(([,w])=>w/total),source:tri.mesh.name});
  }
  // Leather bridges small hollows instead of copying every fur/skin crease.
  // Smooth outwards only, so the fit never shrinks into the sampled surface.
  for(let pass=0;pass<5;pass++){
    const radii=samples.map(s=>Math.hypot(s.p.x-.000001,s.p.z-.15));
    for(let row=0;row<=rows;row++)for(let col=0;col<=cols;col++){
      const at=row*(cols+1),j=col%cols,r=radii[at+j];
      const smoothed=(radii[at+(j+cols-1)%cols]+2*r+radii[at+(j+1)%cols])/4;
      const s=samples[at+col],radius=Math.max(r,smoothed);
      s.p.x=.000001+s.n.x*radius;s.p.z=.15+s.n.z*radius;
    }
  }
  // A leather strap has one bending field across its width. Copying the
  // upper and lower skin weights independently stretched it into a fan
  // where the bridge and shoulder overlap.
  const middle=samples.slice((rows/2)*(cols+1),(rows/2+1)*(cols+1)).map(s=>({...s,p:s.p.clone(),n:s.n.clone()}));
  for(let col=0;col<=cols;col++){
    const merged=new Map(),outward=new T.Vector3();
    for(let d=-4;d<=4;d++){
      const s=middle[(col+d+cols)%cols],factor=Math.exp(-d*d/5);
      outward.addScaledVector(s.surfaceNormal,factor);
      for(let k=0;k<4;k++)merged.set(s.ids[k],(merged.get(s.ids[k])||0)+s.weights[k]*factor);
    }
    const bones=[...merged].filter(([,w])=>w>1e-7).sort((a,b)=>b[1]-a[1]).slice(0,4);
    const sum=bones.reduce((s,[,w])=>s+w,0);while(bones.length<4)bones.push([0,0]);
    const tangent=middle[(col+1)%cols].p.clone().sub(middle[(col+cols-1)%cols].p).normalize();
    outward.addScaledVector(tangent,-outward.dot(tangent)).normalize();
    const across=new T.Vector3().crossVectors(outward,tangent).normalize();
    if(across.y<0)across.negate();
    for(let row=0;row<=rows;row++){
      const s=samples[row*(cols+1)+col];s.ids=bones.map(([id])=>id);s.weights=bones.map(([,w])=>w/sum);
      // Constant physical width, including the nearly horizontal nape.
      s.p.copy(middle[col].p).addScaledVector(across,(row/rows-.5)*.007);
      s.n.copy(outward);
    }
  }
  const xyz=[],uv=[],ids=[],weights=[],indices=[],groups=[],perLayer=samples.length;
  for(const gap of [.0034,.0020])for(let i=0;i<samples.length;i++){
    const s=samples[i],p=s.p.clone().addScaledVector(s.n,gap);
    xyz.push(p.x,p.y,p.z);uv.push((i%(cols+1))/cols,Math.floor(i/(cols+1))/rows);
    ids.push(...s.ids);weights.push(...s.weights);
  }
  for(let layer=0;layer<2;layer++){
    const start=indices.length,base=layer*perLayer;
    for(let r=0;r<rows;r++)for(let col=0;col<cols;col++){
      const a=base+r*(cols+1)+col,b=a+1,c=a+cols+1,d=c+1;
      if(!layer)indices.push(a,b,c,b,d,c);else indices.push(a,c,b,b,c,d);
    }
    groups.push({start,count:indices.length-start,materialIndex:layer});
  }
  const lipStart=indices.length;
  for(const row of [0,rows])for(let col=0;col<cols;col++){
    const a=row*(cols+1)+col,b=a+1,c=a+perLayer,d=b+perLayer;
    if(!row)indices.push(a,c,b,b,c,d);else indices.push(a,b,c,b,d,c);
  }
  groups.push({start:lipStart,count:indices.length-lipStart,materialIndex:1});
  const geometry=new T.BufferGeometry();
  geometry.setAttribute('position',new T.Float32BufferAttribute(xyz,3));
  geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));
  geometry.setAttribute('skinIndex',new T.Uint16BufferAttribute(ids,4));
  geometry.setAttribute('skinWeight',new T.Float32BufferAttribute(weights,4));
  geometry.setIndex(indices);geometry.computeVertexNormals();geometry.computeBoundingSphere();
  for(const group of groups)geometry.addGroup(group.start,group.count,group.materialIndex);
  const collar=new T.SkinnedMesh(geometry,[old.material,lower?.material||old.material]);
  collar.name='FittedCollar';collar.frustumCulled=false;collar.castShadow=true;collar.receiveShadow=true;
  cat.root.add(collar);collar.bind(skeleton,body.bindMatrix);
  collar.userData.fit={cols,rows,skinGap:.0020,outerGap:.0034,
    samples:samples.map(s=>({p:s.p.toArray(),normal:s.n.toArray(),source:s.source}))};
  const originals=[old,lower,upper].filter(Boolean);for(const mesh of originals)mesh.visible=false;

  // Hang the pendant below the fitted front edge, not from the obsolete
  // wider ellipse. This avoids a long horizontal connector in side view.
  const bail=cat.root.getObjectByName('BellCollarBail'),oldBailGeometry=bail?.geometry;
  const oldPivotPosition=cat.bellPivot.position.clone();
  let bailGeometry;
  if(bail){
    const front=samples[cols/2],neckId=skeleton.bones.indexOf(cat.bones.neck);
    const toNeck=new T.Matrix4().copy(skeleton.boneInverses[neckId]).multiply(body.bindMatrix);
    const start=front.p.clone().addScaledVector(front.n,.0038).applyMatrix4(toNeck);
    cat.bellPivot.position.copy(start).add(new T.Vector3(0,-.0035,.006));
    const end=cat.bellPivot.position.clone().add(new T.Vector3(0,.0006,.0011));
    const middle=start.clone().lerp(end,.58);middle.y-=.001;
    bailGeometry=new T.TubeGeometry(new T.CatmullRomCurve3([start,middle,end]),12,.00062,7,false);
    bail.geometry=bailGeometry;
  }
  let disposed=false;
  return {collar,dispose(){
    if(disposed)return;disposed=true;
    collar.removeFromParent();geometry.dispose();for(const mesh of originals)mesh.visible=true;
    cat.bellPivot.position.copy(oldPivotPosition);
    if(bail&&bail.geometry===bailGeometry)bail.geometry=oldBailGeometry;bailGeometry?.dispose();
  }};
}
