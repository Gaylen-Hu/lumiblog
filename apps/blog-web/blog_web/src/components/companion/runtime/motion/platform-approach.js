import {Vector3} from 'three';

const circle = 2*Math.PI;
const positive = a => (a%circle+circle)%circle;
const halfPlane = (p,h,r) => new Vector3(p.x+r*Math.cos(h),p.y,p.z-r*Math.sin(h));

// Two tangent arcs joined by a line. Constraining the *arrival* direction
// lets the last strides lead into a jump instead of making the cat pivot.
export function approachPath(start,startHeading,end,endHeading,room) {
  let best=null;
  for(const radius of [.15,.20,.115]) for(const a of [-1,1]) for(const b of [-1,1]){
    const first=halfPlane(start,startHeading,a*radius),last=halfPlane(end,endHeading,b*radius);
    const dx=last.x-first.x,dz=last.z-first.z,length=Math.hypot(dx,dz);
    if(length<1e-6||Math.abs((b-a)*radius)>=length)continue;
    const tangent=Math.atan2(dx,dz)-Math.asin((b-a)*radius/length);
    const firstArc=positive(a*(tangent-startHeading)),lastArc=positive(b*(endHeading-tangent));
    if(firstArc+lastArc>Math.PI*1.90)continue;
    const path=[];
    const add=p=>{if((path.at(-1)||start).distanceToSquared(p)>1e-12)path.push(p);};
    const arc=(center,head,angle,side)=>{
      const count=Math.ceil(angle/.075);
      for(let i=1;i<=count;i++)add(halfPlane(center,head+side*angle*i/count,-side*radius));
    };
    arc(first,startHeading,firstArc,a);
    add(halfPlane(last,tangent,-b*radius));
    arc(last,tangent,lastArc,b);
    add(end.clone());
    let distance=0,prior=start,valid=true;
    for(const p of path){
      if(!room.segmentClear(prior,p)){valid=false;break;}
      distance+=prior.distanceTo(p);prior=p;
    }
    if(valid&&path.length&&(!best||distance<best.distance))best={path,distance};
  }
  return best?.path||null;
}
