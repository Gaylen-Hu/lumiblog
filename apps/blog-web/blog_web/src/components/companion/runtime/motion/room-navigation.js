import {Vector3,MathUtils} from 'three';
import {platformProfile} from './platform-motion.js';

export const ROOM_SURFACES=Object.freeze([
 {id:'ground',label:'地毯',height:0,center:{x:0,z:.55},bounds:{minX:-1.4,maxX:1.4,minZ:-1.3,maxZ:1.25}},
 {id:'chair',label:'椅子',height:.31,center:{x:-.49,z:-.27},bounds:{minX:-.86,maxX:-.12,minZ:-.68,maxZ:.08}},
 {id:'table',label:'桌子',height:.62,center:{x:.52,z:-.40},bounds:{minX:.02,maxX:1.10,minZ:-.90,maxZ:-.05}},
]);
const inside=(p,b,r=0)=>p.x>b.minX-r&&p.x<b.maxX+r&&p.z>b.minZ-r&&p.z<b.maxZ+r;
const point=surface=>new Vector3(surface.center.x,surface.height,surface.center.z);

export class RoomNavigation{
 constructor(){this.surfaces=ROOM_SURFACES;this.launch=new Vector3(-.49,0,.46);}
 surface(id){const found=this.surfaces.find(s=>s.id===id);if(!found)throw new Error('未知落脚区域');return found;}
 floorValid(p){const b=this.surface('ground').bounds;return p.x>=b.minX+.08&&p.x<=b.maxX-.08&&p.z>=b.minZ+.08&&p.z<=b.maxZ-.08&&!this.surfaces.slice(1).some(s=>inside(p,s.bounds,.28));}
 segmentClear(a,b){const distance=a.distanceTo(b),steps=Math.ceil(distance/.025);for(let i=0;i<=steps;i++)if(!this.floorValid(a.clone().lerp(b,i/(steps||1))))return false;return true;}
 floorPath(start,target){
  const bounds=this.surface('ground').bounds,step=.08;
  const width=Math.round((bounds.maxX-bounds.minX)/step),depth=Math.round((bounds.maxZ-bounds.minZ)/step);
  const nodes=[];for(let x=0;x<=width;x++)for(let z=0;z<=depth;z++){
   const p=new Vector3(bounds.minX+x*step,0,bounds.minZ+z*step);if(this.floorValid(p))nodes.push({key:x+':'+z,x,z,p});
  }
  const nearest=p=>nodes.reduce((best,node)=>!best||node.p.distanceToSquared(p)<best.p.distanceToSquared(p)?node:best,null);
  const from=nearest(start),goal=nearest(target);if(!from||!goal)throw new Error('没有可行走的地面');
  const destination=this.floorValid(target)?target.clone().setY(0):goal.p.clone();
  if(this.segmentClear(start,destination))return [destination];
  const map=new Map(nodes.map(n=>[n.key,n])),open=new Set([from.key]),cost=new Map([[from.key,0]]),came=new Map();
  let found=false;
  while(open.size){
   let key;for(const candidate of open)if(key===undefined||(cost.get(candidate)+map.get(candidate).p.distanceTo(goal.p))<(cost.get(key)+map.get(key).p.distanceTo(goal.p)))key=candidate;
   if(key===goal.key){found=true;break;}open.delete(key);const current=map.get(key);
   for(const dx of [-1,0,1])for(const dz of [-1,0,1]){
    if(!dx&&!dz)continue;const next=map.get((current.x+dx)+':'+(current.z+dz));if(!next||!this.segmentClear(current.p,next.p))continue;
    const nextCost=cost.get(key)+current.p.distanceTo(next.p);if(nextCost<(cost.get(next.key)??Infinity)){cost.set(next.key,nextCost);came.set(next.key,key);open.add(next.key);}
   }
  }
  if(!found)throw new Error('该位置暂时无法绕行到达');
  const raw=[destination];let key=goal.key;while(came.has(key)){key=came.get(key);raw.unshift(map.get(key).p.clone());}
  const simplified=[];let anchor=start.clone();while(raw.length){let last=0;for(let i=raw.length-1;i>=0;i--)if(this.segmentClear(anchor,raw[i])){last=i;break;}anchor=raw[last].clone();simplified.push(anchor);raw.splice(0,last+1);}
  return simplified;
 }
 route(startSurface,targetSurface){
  const ids=['ground','chair','table'],from=ids.indexOf(startSurface),to=ids.indexOf(targetSurface);
  if(from<0||to<0)throw new Error('落脚区域无效');const path=[];for(let i=from;i!==to;){i+=Math.sign(to-from);path.push(ids[i]);}return path;
 }
 landing(id){return point(this.surface(id));}
 jumpSites(from,sourceId,targetId){
  const target=this.surface(targetId),chair=this.surface('chair');
  // Approach the open front of the seat. Its rear edge carries a backrest.
  if(sourceId==='ground'){
   const x=MathUtils.clamp(from.x,chair.center.x-.09,chair.center.x+.09);
   const takeoff=new Vector3(x,0,chair.bounds.maxZ+.39);
   return {takeoff,landing:new Vector3(x,target.height,chair.center.z+.035)};
  }
  if(targetId==='ground'){
   const x=MathUtils.clamp(from.x,chair.center.x-.10,chair.center.x+.10);
   return {takeoff:from.clone(),landing:new Vector3(x,0,chair.bounds.maxZ+.60)};
  }
  // Keep every pad inside the landing surface with room for the recovery step.
  const margin=.24, b=target.bounds;
  // The trailing tail still clears the departing board after the hind paws.
  // Reserve a deeper horizontal landing for a cross-platform trajectory.
  const landedX=targetId==='chair'?target.center.x-.075:MathUtils.clamp(from.x,b.minX+.39,b.maxX-.39);
  return {takeoff:from.clone(),landing:new Vector3(
   landedX,target.height,
   targetId==='chair'?b.maxZ-.225:MathUtils.clamp(from.z,b.minZ+margin+.08,b.maxZ-margin),
  )};
 }
 leap(from,to,id){
  const clip=to.y<from.y?'platformDrop':id==='table'?'tableBound':'chairAscent';
  const profile=platformProfile(clip),gravity=9.8;
  const apex=Math.max(from.y,to.y)+profile.clearance;
  const riseTime=Math.sqrt(2*(apex-from.y)/gravity),fallTime=Math.sqrt(2*(apex-to.y)/gravity);
  const sighting=clip==='platformDrop'?.17:clip==='tableBound'?.16:.12;
  return {id:'jump',clip,kind:'leap',from:from.clone(),point:to.clone(),surface:id,sighting,
   heading:Math.atan2(to.x-from.x,to.z-from.z),
   preparation:profile.preparation+sighting,flight:riseTime+fallTime,landing:profile.landing,
   verticalVelocity:gravity*riseTime,gravity};
 }
 leapPoint(step,u){
  const t=u*step.flight,p=step.from.clone().lerp(step.point,u);
  p.y=step.from.y+step.verticalVelocity*t-step.gravity*t*t*.5;
  return p;
 }
 clampFloor(p){const b=this.surface('ground').bounds;return new Vector3(MathUtils.clamp(p.x,b.minX+.1,b.maxX-.1),0,MathUtils.clamp(p.z,b.minZ+.1,b.maxZ-.1));}
}
