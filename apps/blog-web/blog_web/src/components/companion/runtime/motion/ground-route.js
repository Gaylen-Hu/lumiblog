// Round a floor corner only when all chords remain in the navigation clearance.
// Otherwise retain a planted-foot pivot at that corner.
export function groundSections(start,points,room){
 const sections=[],current=[];let previous=start.clone();
 const add=p=>{if(!current.length||current.at(-1).distanceTo(p)>.00001)current.push(p.clone())};
 for(let i=0;i<points.length;i++){
  const corner=points[i],next=points[i+1];
  if(!next){add(corner);break;}
  const incoming=corner.clone().sub(previous),outgoing=next.clone().sub(corner);
  if(incoming.length()<.001||outgoing.length()<.001){previous=corner;continue;}
  const dot=incoming.clone().normalize().dot(outgoing.clone().normalize());let rounded=false;
  for(const radius of [.16,.12,.08,.045]){
   const distance=Math.min(radius,incoming.length()*.38,outgoing.length()*.38),a=corner.clone().addScaledVector(incoming.clone().normalize(),-distance),b=corner.clone().addScaledVector(outgoing.clone().normalize(),distance),curve=[];
   for(let n=0;n<=10;n++){const t=n/10;curve.push(a.clone().multiplyScalar((1-t)**2).addScaledVector(corner,2*t*(1-t)).addScaledVector(b,t*t));}
   if(dot>-.85&&(!room||curve.every((p,n)=>!n||room.segmentClear(curve[n-1],p)))){add(a);curve.slice(1).forEach(add);rounded=true;break;}
  }
  if(!rounded){add(corner);sections.push(current.splice(0));}
  previous=corner;
 }
 if(current.length)sections.push(current);return sections;
}
