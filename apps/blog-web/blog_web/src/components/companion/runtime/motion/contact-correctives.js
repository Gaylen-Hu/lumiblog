import * as THREE from 'three';

// Author a pose-space contact shape. Convert the desired world-space surface
// correction back through each vertex's weighted skin transform, so the morph
// remains a standard portable glTF target rather than a renderer floor clamp.
export function createContactCorrective(mesh,floor=-.0015){
  mesh.updateWorldMatrix(true,false);
  const geometry=mesh.geometry,position=geometry.attributes.position,skinIndex=geometry.attributes.skinIndex,skinWeight=geometry.attributes.skinWeight;
  const output=[],boneMatrix=new THREE.Matrix4(),weighted=new THREE.Matrix4(),transform=new THREE.Matrix4();
  const source=new THREE.Vector3(),point=new THREE.Vector3(),target=new THREE.Vector3();
  for(let vertex=0;vertex<position.count;vertex++){
    source.fromBufferAttribute(position,vertex);
    point.copy(mesh.getVertexPosition(vertex,new THREE.Vector3())).applyMatrix4(mesh.matrixWorld);
    const distance=point.y-floor;
    if(distance>.02){output.push(0,0,0);continue;}
    const corrected=floor+.5*(distance+Math.sqrt(distance*distance+.000004));
    const amount=(corrected-point.y)*(1-THREE.MathUtils.smoothstep(distance,.008,.02));
    if(amount<1e-7){output.push(0,0,0);continue;}
    weighted.elements.fill(0);
    for(let slot=0;slot<4;slot++){
      const index=skinIndex.getComponent(vertex,slot),weight=skinWeight.getComponent(vertex,slot);
      if(!weight)continue;
      boneMatrix.multiplyMatrices(mesh.skeleton.bones[index].matrixWorld,mesh.skeleton.boneInverses[index]);
      for(let component=0;component<16;component++)weighted.elements[component]+=boneMatrix.elements[component]*weight;
    }
    transform.copy(mesh.matrixWorld).multiply(mesh.bindMatrixInverse).multiply(weighted).multiply(mesh.bindMatrix).invert();
    target.copy(point);target.y+=amount;target.applyMatrix4(transform).sub(source);output.push(...target.toArray());
  }
  return new THREE.Float32BufferAttribute(output,3);
}
