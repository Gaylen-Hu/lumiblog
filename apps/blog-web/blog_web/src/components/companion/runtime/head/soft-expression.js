import * as T from 'three';

// Retain the approved neutral face. Only the opening expression is reshaped:
// the old full-width slit read as a grin even during a quiet mew.
export function softenMouthExpression(mesh){
  const index=mesh.morphTargetDictionary?.mouthOpen;
  if(index===undefined||/^(Teeth_|Tongue)/.test(mesh.name))return;
  const original=mesh.geometry,target=original.morphAttributes.position?.[index];
  if(!target)return;
  const geometry=original.clone(),base=geometry.attributes.position,delta=target.clone();
  const relative=geometry.morphTargetsRelative;
  for(let i=0;i<base.count;i++){
    const weight=1-T.MathUtils.smoothstep(Math.abs(base.getX(i)),.0015,.0065);
    for(let axis=0;axis<3;axis++){
      const rest=base.getComponent(i,axis),change=target.getComponent(i,axis)-(relative?0:rest);
      delta.setComponent(i,axis,(relative?0:rest)+change*weight);
    }
  }
  geometry.morphAttributes.position[index]=delta;
  // Rebuild this expression's normals; retaining the wide-jaw normals makes
  // a narrowed mouth look pinched even when its silhouette is correct.
  if(geometry.morphAttributes.normal?.[index]){
    const shape=geometry.clone(),positions=base.clone();
    for(let i=0;i<base.count;i++)for(let axis=0;axis<3;axis++)positions.setComponent(i,axis,
      delta.getComponent(i,axis)+(relative?base.getComponent(i,axis):0));
    shape.setAttribute('position',positions);shape.computeVertexNormals();
    const normals=shape.attributes.normal.clone();
    if(relative)for(let i=0;i<base.count;i++)for(let axis=0;axis<3;axis++)normals.setComponent(i,axis,
      normals.getComponent(i,axis)-geometry.attributes.normal.getComponent(i,axis));
    geometry.morphAttributes.normal[index]=normals;shape.dispose();
  }
  mesh.geometry=geometry;
}
