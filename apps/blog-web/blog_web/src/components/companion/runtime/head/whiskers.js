import * as T from 'three';

// Each whisker is rooted on a triangle of the real muzzle. Morph targets
// carry the root with the cheek so opening the mouth cannot leave it behind.
export function createWhiskers(head,{xScale=1,yOffset=0,lengthScale=1}={}){
  const source=head.geometry,position=source.attributes.position;
  const proxy=new T.Mesh(source,new T.MeshBasicMaterial({side:T.DoubleSide}));proxy.updateMatrixWorld(true);
  const ray=new T.Raycaster(),positions=[],normals=[],morphs=(source.morphAttributes.position||[]).map(()=>[]);
  const a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3(),weights=new T.Vector3(),delta=new T.Vector3(),vertex=new T.Vector3();
  for(const side of [-1,1])for(let row=0;row<4;row++){
    ray.set(new T.Vector3(side*(.0125+row*.0008)*xScale,-.012-row*.0011+yOffset,.14),new T.Vector3(0,0,-1));
    const hit=ray.intersectObject(proxy,false)[0];if(!hit)continue;
    const root=hit.point.clone().add(new T.Vector3(0,0,.00015)),length=(.028+row*.002)*lengthScale;
    const bend=(1.25-row)*.0033;
    const curve=new T.CubicBezierCurve3(root,root.clone().add(new T.Vector3(side*length*.3,bend*.8,.002)),root.clone().add(new T.Vector3(side*length*.7,bend*1.4,.001)),root.clone().add(new T.Vector3(side*length,bend*1.6,-.005)));
    const tube=new T.TubeGeometry(curve,18,.000041,3,false).toNonIndexed(),p=tube.attributes.position,n=tube.attributes.normal;
    a.fromBufferAttribute(position,hit.face.a);b.fromBufferAttribute(position,hit.face.b);c.fromBufferAttribute(position,hit.face.c);T.Triangle.getBarycoord(hit.point,a,b,c,weights);
    const ids=[hit.face.a,hit.face.b,hit.face.c],w=weights.toArray();
    for(let i=0;i<p.count;i++){
      vertex.fromBufferAttribute(p,i);const t=tube.attributes.uv.getX(i);
      const center=curve.getPointAt(t);vertex.sub(center).multiplyScalar(1-.85*t*t).add(center);
      positions.push(vertex.x,vertex.y,vertex.z);normals.push(n.getX(i),n.getY(i),n.getZ(i));
    }
    for(let m=0;m<morphs.length;m++){
      delta.set(0,0,0);for(let j=0;j<3;j++)delta.addScaledVector(vertex.fromBufferAttribute(source.morphAttributes.position[m],ids[j]),w[j]);
      if(!source.morphTargetsRelative)delta.sub(hit.point);
      for(let i=0;i<p.count;i++)morphs[m].push(delta.x,delta.y,delta.z);
    }
    tube.dispose();
  }
  proxy.material.dispose();
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('normal',new T.Float32BufferAttribute(normals,3));
  geometry.morphTargetsRelative=true;geometry.morphAttributes.position=morphs.map(m=>new T.Float32BufferAttribute(m,3));geometry.computeBoundingBox();geometry.computeBoundingSphere();
  const material=new T.MeshBasicMaterial({color:'#e0ded4',transparent:true,opacity:.8,depthWrite:false});
  const mesh=new T.Mesh(geometry,material);mesh.name='MuzzleWhiskers';mesh.morphTargetDictionary={...head.morphTargetDictionary};mesh.morphTargetInfluences=head.morphTargetInfluences;head.add(mesh);return mesh;
}
