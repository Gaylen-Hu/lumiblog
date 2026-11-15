import {Vector3} from 'three';

const tau=Math.PI*2,angleStep=Math.PI/12;
const wrap=value=>(value%tau+tau)%tau;
const point=(x,z)=>new Vector3(x,0,z);

// A forward circular arc followed by its tangent line. Unlike an arbitrary
// Bezier handle this also handles a goal behind the cat without a cusp or
// backwards sliding at departure.
function directPath(start,heading,goal,radii,room){
 const routes=[];
 for(const radius of radii)for(const sign of [-1,1]){
  const center=point(start.x+sign*Math.cos(heading)*radius,start.z-sign*Math.sin(heading)*radius),dx=goal.x-center.x,dz=goal.z-center.z,d=Math.hypot(dx,dz);
  if(d<radius+1e-7)continue;
  const targetAngle=Math.atan2(dx,dz),offset=Math.acos(radius/d),startAngle=Math.atan2(start.x-center.x,start.z-center.z);
  for(const tangentAngle of [targetAngle-offset,targetAngle+offset]){
   const tangent=point(center.x+radius*Math.sin(tangentAngle),center.z+radius*Math.cos(tangentAngle));
   const line=goal.clone().sub(tangent),length=line.length();
   if(length>1e-7&&(sign*Math.cos(tangentAngle)*line.x-sign*Math.sin(tangentAngle)*line.z)/length<.9999)continue;
   let sweep=wrap(sign*(tangentAngle-startAngle));if(tau-sweep<1e-6)sweep=0;
   const arcLength=radius*sweep,path=[];
   for(let i=1,n=Math.max(1,Math.ceil(Math.max(arcLength/.02,sweep/.09)));i<=n;i++){
    const a=startAngle+sign*sweep*i/n;path.push(point(center.x+radius*Math.sin(a),center.z+radius*Math.cos(a)));
   }
   if(length>1e-7)path.push(goal.clone());else path[path.length-1]=goal.clone();
   let previous=start,clear=true;for(const p of path){if(room&&!room.segmentClear(previous,p)){clear=false;break;}previous=p;}
   // Squared curvature integrated along the arc is sweep/radius. Including
   // it avoids always selecting the tightest possible bend in open space.
   if(clear)routes.push({path:path.filter((p,i)=>p.distanceTo(i?path[i-1]:start)>1e-7),cost:arcLength+length+.010*sweep/radius});
  }
 }
 return routes.sort((a,b)=>a.cost-b.cost)[0]||null;
}

class Heap{
 constructor(){this.items=[];}
 push(node){const a=this.items;let i=a.length;a.push(node);while(i){const p=(i-1)>>1;if(a[p].score<=node.score)break;a[i]=a[p];i=p;}a[i]=node;}
 pop(){const a=this.items,first=a[0],last=a.pop();if(a.length){let i=0;while(i*2+1<a.length){let child=i*2+1;if(child+1<a.length&&a[child+1].score<a[child].score)child++;if(a[child].score>=last.score)break;a[i]=a[child];i=child;}a[i]=last;}return first;}
 get length(){return this.items.length;}
}

function distanceField(room,goal){
 const bounds=room.surface('ground').bounds,resolution=.08,nodes=new Map(),heap=new Heap();let nearest=null;
 const key=(x,z)=>x+':'+z;
 for(let x=0;x<=Math.ceil((bounds.maxX-bounds.minX)/resolution);x++)for(let z=0;z<=Math.ceil((bounds.maxZ-bounds.minZ)/resolution);z++){
  const p=point(bounds.minX+x*resolution,bounds.minZ+z*resolution);if(!room.floorValid(p))continue;
  const node={p,x,z,cost:Infinity,key:key(x,z)};nodes.set(node.key,node);if(!nearest||p.distanceToSquared(goal)<nearest.p.distanceToSquared(goal))nearest=node;
 }
 if(!nearest)return p=>p.distanceTo(goal);nearest.cost=nearest.p.distanceTo(goal);heap.push({...nearest,score:nearest.cost});
 while(heap.length){
  const current=heap.pop();if(current.cost>nodes.get(current.key).cost+1e-7)continue;
  for(const dx of [-1,0,1])for(const dz of [-1,0,1]){
   if(!dx&&!dz)continue;const next=nodes.get(key(current.x+dx,current.z+dz));if(!next||!room.segmentClear(current.p,next.p))continue;
   const cost=current.cost+current.p.distanceTo(next.p);if(cost<next.cost){next.cost=cost;heap.push({...next,score:cost});}
  }
 }
 return p=>{
  const x=Math.round((p.x-bounds.minX)/resolution),z=Math.round((p.z-bounds.minZ)/resolution);let best=null;
  for(const dx of [-1,0,1])for(const dz of [-1,0,1]){const node=nodes.get(key(x+dx,z+dz));if(node&&Number.isFinite(node.cost)&&(!best||node.p.distanceToSquared(p)<best.p.distanceToSquared(p)))best=node;}
  return best?Math.max(p.distanceTo(goal),best.cost+best.p.distanceTo(p)):p.distanceTo(goal)+3;
 };
}

function primitive(node,turn,length,room){
 const points=[];
 for(let i=1,n=Math.max(4,Math.ceil(Math.abs(turn)/.09));i<=n;i++){
  const t=i/n,h=node.heading+turn*t;
  const p=Math.abs(turn)<1e-8?point(node.p.x+Math.sin(h)*length*t,node.p.z+Math.cos(h)*length*t):point(node.p.x+length/turn*(Math.cos(node.heading)-Math.cos(h)),node.p.z+length/turn*(Math.sin(h)-Math.sin(node.heading)));
  if(!room.segmentClear(i===1?node.p:points.at(-1),p))return null;points.push(p);
 }
 return points;
}

// Hybrid A*: heading is part of the state, every edge is a forward arc. Used
// only when a direct arc/tangent route intersects the furniture clearance.
export function steeringPath(start,heading,goal,room,id='walk'){
 if(start.distanceTo(goal)<.002)return {path:[goal.clone()],searched:0};
 const radii=id==='trot'?[.34,.25,.18,.14]:[.27,.20,.15,.11],direct=directPath(start,heading,goal,radii,room);
 if(direct)return {...direct,searched:0};
 if(!room)return null;
 const estimate=distanceField(room,goal),length=.085,heap=new Heap(),costs=new Map(),key=(p,bin)=>Math.round(p.x/.05)+':'+Math.round(p.z/.05)+':'+((bin%24+24)%24);
 const initial={p:start.clone(),heading,bin:0,cost:0,score:estimate(start),parent:null,points:[]};initial.key=key(start,0);heap.push(initial);costs.set(initial.key,0);
 let searched=0;
 while(heap.length&&searched<7000){
  const node=heap.pop();if(node.cost>costs.get(node.key)+1e-7)continue;searched++;
  if(node.p.distanceTo(goal)<.55){
   const end=directPath(node.p,node.heading,goal,radii,room);
   if(end){const segments=[end.path];let at=node;while(at.parent){segments.unshift(at.points);at=at.parent;}return {path:segments.flat(),cost:node.cost+end.cost,searched};}
  }
  for(const step of [0,-1,1,-2,2]){
   const points=primitive(node,step*angleStep,length,room);if(!points)continue;
   const p=points.at(-1),bin=node.bin+step,k=key(p,bin),cost=node.cost+length+Math.abs(step)*.004+Math.abs(step-(node.turn||0))*.002;
   if(cost>=(costs.get(k)??Infinity)-1e-7)continue;costs.set(k,cost);
   heap.push({p,heading:node.heading+step*angleStep,bin,key:k,cost,score:cost+estimate(p)*1.08,parent:node,points,turn:step});
  }
 }
 return null;
}

export function pathHeadings(start,path,heading){
 return [heading,...path.map((p,i)=>{
  const incoming=p.clone().sub(i?path[i-1]:start).normalize(),outgoing=path[i+1]?.clone().sub(p).normalize();
  if(outgoing)incoming.add(outgoing).normalize();return Math.atan2(incoming.x,incoming.z);
 })];
}
