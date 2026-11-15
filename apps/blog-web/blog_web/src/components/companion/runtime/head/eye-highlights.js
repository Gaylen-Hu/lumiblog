import * as T from 'three';

// Small cel-style highlights lie on the actual corneal surface. They rotate
// with the existing eye pivot and the real eyelids occlude them during a blink.
export function createEyeHighlights(model){
  const ray=new T.Raycaster(),direction=new T.Vector3(0,0,-1),forward=new T.Vector3(0,0,1);
  const material=new T.MeshBasicMaterial({color:'#fffaf0',toneMapped:false,transparent:true,opacity:.94,depthWrite:false});
  let count=0;
  for(const name of ['Pupil_L','Pupil_R']){
    const eye=model.getObjectByName(name);if(!eye?.isMesh)continue;
    eye.geometry.computeBoundingBox();const bounds=eye.geometry.boundingBox,center=bounds.getCenter(new T.Vector3()),size=bounds.getSize(new T.Vector3());
    const proxy=new T.Mesh(eye.geometry,new T.MeshBasicMaterial({side:T.DoubleSide}));proxy.updateMatrixWorld(true);
    // A single graphic glint complements the weaker physical studio reflection.
    for(const [x,y,r] of [[-.18,.20,.00062]]){
      ray.set(new T.Vector3(center.x+size.x*x,center.y+size.y*y,bounds.max.z+.005),direction);
      const hit=ray.intersectObject(proxy,false)[0];if(!hit)continue;
      const normal=hit.normal||hit.face.normal;
      const mesh=new T.Mesh(new T.SphereGeometry(1,16,8),material);
      mesh.name=`CorneaHighlight_${name}_${count++}`;mesh.scale.set(r,r*.92,.000026);
      mesh.position.copy(hit.point).addScaledVector(normal,.000023);mesh.quaternion.setFromUnitVectors(forward,normal);mesh.renderOrder=3;
      eye.add(mesh);
    }
    proxy.material.dispose();
  }
  return count;
}
