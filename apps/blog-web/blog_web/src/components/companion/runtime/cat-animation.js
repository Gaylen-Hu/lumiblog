import { Euler, Matrix4, Quaternion, Vector3 } from 'three';
import { sampleLeg, gaitTiming } from './motion/gait-profile.js';
import { gallopBody, gallopPaw } from './motion/gallop-profile.js';

const TAU = Math.PI * 2;
const clamp = (v, low=0, high=1) => Math.max(low, Math.min(high, v));
const smooth = v => { const t=clamp(v); return t*t*(3-2*t); };
const ramp = (t,a,b) => smooth((t-a)/(b-a));
const envelope = (t,a,b,c,d) => ramp(t,a,b)*(1-ramp(t,c,d));
const deltaAngle = (a,b) => Math.atan2(Math.sin(a-b),Math.cos(a-b));
const lerp = (a,b,t) => a+(b-a)*t;
const damp = (a,b,k,dt) => lerp(a,b,1-Math.exp(-k*dt));
const worldY = new Vector3(0,1,0);
const gaitStride = {walk:.19,trot:.265,gallop:.44};
const gaitTimings = {walk:gaitTiming('walk'),trot:gaitTiming('trot')};
const gallopTouchdown=[.49,.58,0,.1],gallopDuty=[.232,.235,.24,.245];
const bellOutward=[0,.12,.24,.38,.54,.72,.92],bellLateral=[0,-.16,.16,-.32,.32,-.48,.48];
const noAttention=Object.freeze({});
const keys = ['FL','FR','HL','HR'];

function posture(id, t, out) {
  out.sitting=id==='sitHold'?1:id==='sit'?ramp(t,.04,.94):id==='sitUp'?1-ramp(t,.04,.94):
    id==='paw'?.52*envelope(t,0,.22,.75,1):0;
  out.lying=id==='lieHold'||id==='sleep'?1:id==='lie'?ramp(t,.05,.94):id==='lieUp'?1-ramp(t,.04,.94):0;
  return out;
}

function jumpShape(t, out) {
  out.prepare=envelope(t,0,.16,.19,.29);
  out.collect=envelope(t,.25,.40,.46,.69);
  out.reach=envelope(t,.31,.53,.66,.87);
  out.foreLift=envelope(t,.24,.39,.55,.76);
  out.hindLift=envelope(t,.28,.46,.76,.88);
  out.trail=envelope(t,.23,.32,.38,.49);
  out.landFront=envelope(t,.73,.81,.82,.97);
  out.landHind=envelope(t,.78,.87,.90,1);
  return out;
}

// Foot targets are in character space. Aim in the plane of the limb while
// keeping the final pad parallel to its support, even if the back is bent.
function legSolver(root, leg, front, parentFrame, characterRotation) {
  const {upper,lower,paw}=leg;
  const thigh=lower.position.clone(), shin=paw.position.clone();
  const a=thigh.length(), b=shin.length();
  thigh.normalize();shin.normalize();
  const hipToGoal=new Vector3(), knee=new Vector3(), pole=new Vector3(), lowerAxis=new Vector3();
  const inverseUpper=new Quaternion();
  const {inverse:parentInv,rotation:parentRotation}=parentFrame;
  const worldPaw=new Quaternion(), footRotation=new Quaternion(), footEuler=new Euler();
  return (target, pitch, footRoll=0) => {
    hipToGoal.copy(target).applyMatrix4(root.matrixWorld).applyMatrix4(parentInv).sub(upper.position);
    const distance=clamp(hipToGoal.length(),Math.abs(a-b)+.0001,a+b-.00008);
    hipToGoal.normalize();
    const along=(a*a-b*b+distance*distance)/(2*distance);
    const out=Math.sqrt(Math.max(0,a*a-along*along));
    pole.set(0,0,front?-1:1);
    pole.addScaledVector(hipToGoal,-pole.dot(hipToGoal)).normalize();
    knee.copy(hipToGoal).multiplyScalar(along).addScaledVector(pole,out);
    lowerAxis.copy(hipToGoal).multiplyScalar(distance).sub(knee).normalize();
    upper.quaternion.setFromUnitVectors(thigh,knee.normalize());
    inverseUpper.copy(upper.quaternion).invert();
    lower.quaternion.setFromUnitVectors(shin,lowerAxis.applyQuaternion(inverseUpper));
    worldPaw.copy(parentRotation).multiply(upper.quaternion).multiply(lower.quaternion).invert();
    footRotation.setFromEuler(footEuler.set(pitch,0,footRoll));
    paw.quaternion.copy(worldPaw).multiply(characterRotation).multiply(footRotation);
  };
}

function emptyBody() {
  return {
    hipY:-.002,hipZ:0,hipX:0,pelvisPitch:0,pelvisYaw:0,pelvisRoll:0,
    spinePitch:0,spineYaw:0,chestPitch:0,chestYaw:0,chestRoll:0,
    neckPitch:0,neckYaw:0,headPitch:0,headYaw:0,headRoll:0,headClearance:0,sleepClearance:0,
    earTilt:0,earBack:0,tailUp:0,tailSide:0,squint:0,mouth:0,pupil:.50,
  };
}

const bodyDefaults=emptyBody(),bodyKeys=Object.keys(bodyDefaults);
function poseTorso(id,p,clock,lean,sit,lie,jump,face,body) {
  for(const key of bodyKeys)body[key]=bodyDefaults[key];
  const wave=Math.sin(TAU*p),breath=Math.sin(TAU*clock/3.42);
  const act=envelope(p,0,.28,.70,1), gait=Object.hasOwn(gaitStride,id);
  body.hipY+=.00125*breath;
  body.chestPitch=.010*breath;body.neckPitch=-.006*breath;
  if (gait) {
    const quick=id!=='walk';
    body.hipY+= (quick?-.020:-.014) + (quick?.006:.003)*Math.cos(2*TAU*p);
    body.hipX=.003*Math.sin(TAU*p+.55);
    body.pelvisRoll=.023*wave+.043*lean;
    body.chestRoll=-.025*wave+.04*lean;
    body.pelvisYaw=.046*wave-.15*lean;
    body.spineYaw=-.045*Math.sin(TAU*p-.3)+.17*lean;
    body.chestYaw=-.044*Math.sin(TAU*p-.62)+.12*lean;
    body.neckYaw=.18*lean;body.headPitch=.016*Math.sin(2*TAU*p+.4);
    if(id==='gallop'){
      const gallop=gallopBody(p);
      body.hipY+=gallop.lower*.29;
      body.pelvisPitch=gallop.pelvis*.70;body.spinePitch=gallop.lumbar*.88;
      body.chestPitch+=gallop.thoracic*.47;body.neckPitch+=gallop.neck*.73;
      body.tailUp+=gallop.tail*.46;
    }
  }
  if(sit||lie){
    body.hipY-=.060*sit+.060*lie;body.hipZ-=.013*sit+.002*lie;
    body.pelvisPitch-=.40*sit+.04*lie;
    body.spinePitch+=.10*sit+.025*lie;body.chestPitch-=.10*sit;
    body.neckPitch+=.28*sit+.07*lie;body.headPitch+=.14*sit+.14*lie;
    body.squint+=.08*lie;
  }
  if(jump){
    const j=jump;
    body.hipY+=-.062*j.prepare-.036*j.landHind-.019*j.landFront;
    body.hipZ+=-.017*j.prepare+.008*j.reach;
    body.pelvisPitch+=-.08*j.prepare-.18*j.collect+.10*j.reach+.12*j.landFront;
    body.spinePitch+=.06*j.prepare+.32*j.collect-.15*j.reach;
    body.chestPitch+=.04*j.prepare-.12*j.collect-.08*j.reach+.11*j.landFront;
    body.neckPitch+=-.14*j.prepare-.12*j.collect+.09*j.landFront;
    body.tailUp=.30*j.prepare+.39*j.collect-.17*j.reach;
  }
  switch(id){
    case 'look': {
      const lift=envelope(p,.03,.27,.57,.91),tilt=envelope(p,.16,.43,.64,.96);
      body.neckPitch-=.15*lift;body.headPitch-=.095*lift;
      body.headRoll=.19*tilt;body.neckYaw=.13*tilt;body.earTilt=.08*lift;
      body.pupil+=.20*lift;body.tailUp=.13*tilt;break;
    }
    case 'sniff': body.hipY-=.018*act;body.chestPitch+=.12*act;body.neckPitch+=(.44+.055*Math.sin(TAU*2.5*p))*act;break;
    case 'alert': body.neckPitch-=.15*act;body.earTilt=.12*act;body.pupil+=.26*act;body.tailUp=.43*act;break;
    case 'stretch':
      body.hipY-=.012*act;body.pelvisPitch+=.18*act;body.spinePitch+=.16*act;
      body.chestPitch+=.30*act;body.neckPitch-=.33*act;
      body.squint=.58*act;body.tailUp=.27*act;break;
    case 'paw':
      body.hipX-=.014*act;body.headRoll=-.11*act;
      body.neckYaw=.12*act;body.neckPitch-=.14*act;
      body.mouth=.19*act;body.pupil+=.13*act;body.earTilt=.08*act;break;
    case 'knead':
      body.hipY-=.039*act;body.pelvisPitch+=.13*act;body.hipX+=.008*Math.sin(4*TAU*p)*act;
      body.neckPitch+=.13*act;body.squint=.60*act;break;
    case 'groom':{
      const lick=(.5+.5*Math.sin(3*TAU*p))*act;
      body.hipX-=.009*act;body.hipY-=.029*act;
      body.neckPitch+=.42*act+.10*lick;body.neckYaw=.26*act;
      body.headRoll=-.16*act;body.mouth=.45*lick;body.squint=.60*act;break;
    }
    case 'yawn':
      body.mouth=envelope(p,.17,.46,.63,.87);
      body.neckPitch-=.17*envelope(p,.08,.36,.60,.94);body.headPitch-=.12*body.mouth;
      body.squint=.98*envelope(p,.11,.39,.66,.95);
      body.earBack=.12*body.mouth;body.hipY-=.009*envelope(p,.45,.65,.74,.97);break;
    case 'meow':body.mouth=.72*envelope(p,.14,.35,.44,.69);body.headPitch-=.12*body.mouth;break;
    case 'nuzzle':body.neckYaw+=.31*act;body.headRoll+=.34*act;body.headPitch-=.08*act;body.headClearance=.005*act;body.hipX+=.008*act;body.squint=.84*act;break;
    case 'shake':{const r=Math.sin(3.5*TAU*p)*act;body.neckYaw=.33*r;body.headRoll=.17*r;body.earBack=.15*act;body.squint=.52*act;break;}
    case 'tail':body.tailSide=.24*act*Math.sin(TAU*p);break;
    case 'turn':body.neckYaw=.25*act;body.chestYaw=.12*act;body.pelvisYaw=-.10*act;body.hipY-=.013*act;break;
    case 'sleep':
      body.pelvisYaw=-.10;body.spineYaw=.23;body.chestYaw=.24;
      body.chestPitch+=.12;body.neckYaw=.36;body.headYaw=.15;body.headRoll=-.26;
      body.headPitch+=.17;body.neckPitch+=.23;body.squint=1;break;
  }
  // During licking the head attends to its paw; cursor gaze must not rotate
  // the jaw and pendant across an independently authored foreleg trajectory.
  const attentionGain=id==='sleep'?0:id==='groom'?1-act:gait?.38:1;
  body.neckYaw+=face.x*.18*attentionGain;body.headYaw+=face.x*.24*attentionGain;
  body.neckPitch-=face.y*.10*attentionGain;body.headPitch-=face.y*.14*attentionGain;
  body.headRoll+=.035*Math.sin(clock*.89)*attentionGain;
  return body;
}

function gaitFoot(id,p,i,f) {
  f.x=0;f.roll=0;
  if(id==='gallop'){
    const g=gallopPaw(p,i);
    const local=(p-gallopTouchdown[i]+1)%1,duty=gallopDuty[i];
    f.z=g.forward*.44/.56;f.y=g.lift;f.pitch=g.wrist;f.air=local>=duty;f.swing=clamp((local-duty)/(1-duty));
    return f;
  }
  const g=sampleLeg(p,i,id,gaitTimings[id]);
  const duty=1-g.swing,stride=gaitStride[id],range=stride*duty;
  const position=g.air ? g.flight-.5 : .5-g.progress;
  const toePitch=g.air?Math.min(g.carpalPitch*.39,g.lift/.042):0;
  f.z=range*position;f.y=g.lift;f.pitch=toePitch;f.air=g.air;f.swing=g.progress;
  return f;
}

function poseFoot(id,p,i,sit,lie,jump,f) {
  const front=i<2, left=i%2===0,side=left?1:-1,act=envelope(p,0,.28,.70,1);
  if(Object.hasOwn(gaitStride,id))return gaitFoot(id,p,i,f);
  f.z=(front?-.012:.049)*sit+(front?.042:.044)*lie;
  f.x=side*((front?.003:.009)*sit+(front?.007:.014)*lie);f.y=0;f.pitch=0;f.roll=0;f.air=false;f.swing=0;
  if(id==='sleep'&&front){f.x+=.018-.017*side;f.z-=left?.024:.016;}
  if(jump){
    const j=jump;
    f.z+=front?(.081+.008*side)*j.reach:.036*j.collect-.055*j.trail-.025*j.reach;
    f.y+=front?(.068-.006*side)*j.foreLift:.029*j.collect+.040*j.hindLift;
    f.pitch+=front?.24*j.collect-.28*j.foreLift:(.30*j.collect+.12*j.trail)*ramp(p,.28,.34);
  }
  if(id==='stretch'&&front)f.z+=.050*act;
  if(id==='paw'&&i===0){
    const lift=envelope(p,.07,.31,.71,.93);
    const wave=Math.sin(TAU*clamp((p-.28)/.44));
    f.y+=(.155+.004*wave)*lift;f.x+=(.039+.010*wave)*lift;f.z+=.076*lift;
    f.pitch=-1.40*lift;f.roll=(-.10+.22*wave)*lift;
  }
  if(id==='groom'&&i===0){
    f.y+=(.122+.007*Math.sin(3*TAU*p))*act;
    // Bring the paw to the turned cheek, leaving the middle of the throat
    // free for the collar instead of sweeping the wrist through the pendant.
    f.z+=.088*act;f.x+=.010*act;f.pitch+=.63*act;
  }
  if(id==='knead'&&front){
    const press=.5+.5*Math.sin(4*TAU*p+(left?0:Math.PI));
    f.y+=.026*press*act;f.z+=.023*act;f.pitch+=.25*press*act;
  }
  if(id==='turn'){
    const theta=TAU*(2*p+(front?.24:0)+(left?0:.5));
    f.y+=.027*Math.max(0,Math.sin(theta))*act;
    f.x+=.013*Math.cos(theta)*(front?1:-1)*act;
  }
  return f;
}

// Distribute the relaxed curve over the tail. Alertness and greeting lift it
// towards the raised bind pose. In low postures it curls beside the paws.
const relaxedTailBend=[-.30,-.26,-.23,-.20,-.16,-.10,.03];
function createTailPoser(cat,rootQ){
  const {root,tail}=cat;
  const parentQ=new Quaternion(),target=new Vector3(),base=new Vector3(),q=new Quaternion(),origin=new Vector3();
  const rootInv=new Matrix4(),worldPosition=new Vector3(),worldScale=new Vector3();
  return (clock,p,body,sit,lie,lean,id)=>{
  const rest=clamp(sit+lie);
  const greeting=id==='tail'?envelope(p,0,.25,.72,1):0;
  const relaxed=(1-clamp(Math.max(body.tailUp/.43,greeting)))*(1-rest);
  // The torso and ancestors are synchronized once before solving the limbs.
  // Each tail segment then updates only itself, never its entire parent chain.
  let startY=0;
  if(rest>.001){
    rootInv.copy(root.matrixWorld).invert();
    startY=origin.setFromMatrixPosition(tail[0].matrixWorld).applyMatrix4(rootInv).y;
  }
  const moving=Object.hasOwn(gaitStride,id);
  for(let i=0;i<tail.length;i++){
    const bone=tail[i],t=i/(tail.length-1),lag=clock*1.56-i*.48;
    const wag=id==='tail'?.16:.03;
    bone.rotation.set(
      relaxed*relaxedTailBend[i]-.16*body.tailUp+.023*Math.cos(lag)+(moving?.025*Math.sin(TAU*p-.48*i):0),
      wag*Math.sin(lag)+.18*body.tailSide-.10*lean*Math.sin(.9+t),
      .024*Math.sin(lag+.6)-.065*lean
    );
    if(rest>.001&&i<tail.length-1){
      const curve=1.06+t*2.1;
      bone.updateWorldMatrix(false,false);
      const currentY=origin.setFromMatrixPosition(bone.matrixWorld).applyMatrix4(rootInv).y;
      const floor=.028+.004*Math.sin(t*Math.PI)+(lie&&i>3?.001*Math.sin(clock*.8-i*.4):0);
      const nextY=lerp(startY,floor,ramp(i+1,0,4.35));
      const vertical=clamp((nextY-currentY)/tail[i+1].position.length(),-.84,.60);
      const horizontal=Math.sqrt(1-vertical*vertical);
      target.set(horizontal*Math.sin(curve),vertical,-horizontal*Math.cos(curve));
      bone.parent.matrixWorld.decompose(worldPosition,parentQ,worldScale);
      target.applyQuaternion(rootQ).applyQuaternion(parentQ.invert()).normalize();
      base.copy(tail[i+1].position).normalize();
      q.setFromUnitVectors(base,target);
      bone.quaternion.slerp(q,rest);
    }
    bone.updateWorldMatrix(false,false);
  }
  };
}

export function createCatAnimator(cat){
  const {root,bones,ears,legs}=cat,hipsRest=bones.hips.position.clone();
  const neckRest=bones.neck.position.clone(),headRest=bones.head.position.clone();
  const characterRotation=new Quaternion(),worldPosition=new Vector3(),worldScale=new Vector3();
  const parentFrames=new Map();
  const limbs=keys.map((key,i)=>{
    const leg=legs[key];
    const parent=leg.upper.parent;
    if(!parentFrames.has(parent))parentFrames.set(parent,{parent,inverse:new Matrix4(),rotation:new Quaternion()});
    const poseScale=(leg.lower.position.length()+leg.paw.position.length())/(i<2?.151:.150);
    return {solve:legSolver(root,leg,i<2,parentFrames.get(parent),characterRotation),poseScale,pitch:0,roll:0,lastPitch:0,lastRoll:0,rest:leg.restWorld.paw.clone(),target:leg.restWorld.paw.clone(),
      previous:leg.restWorld.paw.clone(),anchor:new Vector3(),release:new Vector3(),planted:false};
  });
  const limbParents=Array.from(parentFrames.values());
  const poseTail=createTailPoser(cat,characterRotation);
  const postureValues={sitting:0,lying:0},jumpValues={},footValues={z:0,x:0,y:0,pitch:0,roll:0,air:false,swing:0};
  const faceValues={wink:0,blink:0,gazeX:0,gazeY:0,pupil:0,mouth:0};
  const worldPoint=new Vector3(),eye={x:0,y:0},center=new Vector3();
  const bellGravity=new Vector3(),bellParentRotation=new Quaternion();
  const bellSpace=new Matrix4(),bellCandidate=new Vector3(),bellEuler=new Euler();
  const forepawBellSpace=[new Vector3(),new Vector3()],elbowBellSpace=[new Vector3(),new Vector3()];
  const armSegments=[new Vector3(),new Vector3()],armLengthSq=[0,0],armPoint=new Vector3();
  const safeAngles=[0,0];
  const bellOffset=cat.root.getObjectByName('GoldenBell')?.position.clone();
  // A small contact envelope around each front paw. Only the pendant swings;
  // its anchor remains on the collar and the cat's grooming pose is retained.
  function clearance(x,z){
      bellEuler.set(x,0,z);
      bellCandidate.copy(bellOffset).applyEuler(bellEuler).add(cat.bellPivot.position);
      let distance=Infinity;
      for(let i=0;i<2;i++){
        const armSegment=armSegments[i];
        const t=clamp(armPoint.subVectors(bellCandidate,elbowBellSpace[i]).dot(armSegment)/armLengthSq[i]);
        armPoint.copy(elbowBellSpace[i]).addScaledVector(armSegment,t);
        distance=Math.min(distance,bellCandidate.distanceToSquared(armPoint));
      }
      return distance;
  }
  function clearForepaws(pitch,roll){
    safeAngles[0]=pitch;safeAngles[1]=roll;
    if(!bellOffset)return safeAngles;
    bellSpace.copy(bones.neck.matrixWorld).invert();
    for(let i=0;i<2;i++){
      const leg=legs[keys[i]];
      // The torso is already current; update each solved chain just once.
      leg.upper.updateWorldMatrix(false,false);leg.lower.updateWorldMatrix(false,false);leg.paw.updateWorldMatrix(false,false);
      forepawBellSpace[i].setFromMatrixPosition(leg.paw.matrixWorld).applyMatrix4(bellSpace);
      elbowBellSpace[i].setFromMatrixPosition(leg.lower.matrixWorld).applyMatrix4(bellSpace);
      armSegments[i].subVectors(forepawBellSpace[i],elbowBellSpace[i]);
      armLengthSq[i]=Math.max(armSegments[i].lengthSq(),1e-9);
    }
    // The padded paw extends ~35 mm from its ankle in the grooming pose;
    // include that skin envelope, the bell radius and a small fur margin.
    const safe=.0475**2,initial=clearance(pitch,roll);
    if(initial>=safe)return safeAngles;
    let bestGap=initial,bestCost=Infinity;
    for(const outward of bellOutward)for(const lateral of bellLateral){
      const x=clamp(pitch-outward,-1.70,.24),z=clamp(roll+lateral,-.70,.70);
      const gap=clearance(x,z),cost=(x-pitch)**2+(z-roll)**2;
      if(gap>=safe&&cost<bestCost){safeAngles[0]=x;safeAngles[1]=z;bestCost=cost;}
      else if(bestCost===Infinity&&gap>bestGap){safeAngles[0]=x;safeAngles[1]=z;bestGap=gap;}
    }
    return safeAngles;
  }
  let clock=0,motionAge=0,idBefore='',hasPose=false,lastYaw=null,lean=0;
  let nextBlink=2.75,blinkStart=-10,petAge=9,winkAge=9,bellSpeed=0,sleepWeight=0,baseBody=emptyBody(),prevBody=emptyBody();

  function reset(){
    clock=motionAge=0;idBefore='';hasPose=false;lastYaw=null;lean=0;eye.x=eye.y=0;
    nextBlink=2.75;blinkStart=-10;petAge=winkAge=9;sleepWeight=0;bellSpeed=0;
    if(cat.bellPivot)cat.bellPivot.rotation.set(0,0,0);
    limbs.forEach(l=>{l.target.copy(l.rest);l.release.set(0,0,0);l.planted=false;l.lastPitch=l.pitch=l.lastRoll=l.roll=0;});
  }
  function update(state,seconds=1/60,attention=noAttention){
    if(hasPose&&(state.paused||!state.visible&&state.visible!==undefined||seconds===0))return;
    const dt=clamp(Number.isFinite(seconds)?seconds:0,0,.1);
    const id=state.motion||'idle',p=clamp(state.phase||0),yaw=state.yaw||0;
    const moving=Object.hasOwn(gaitStride,id),changed=idBefore!==id;
    if(changed){
      Object.assign(prevBody,baseBody);motionAge=0;
      limbs.forEach(l=>{l.previous.copy(l.target);l.release.set(0,0,0);l.planted=false;l.lastPitch=l.pitch;l.lastRoll=l.roll;});
      idBefore=id;
    }
    motionAge+=dt;clock+=dt;petAge+=dt;
    const blend=hasPose?smooth(motionAge/(moving?.13:.19)):1;
    const turnSpeed=lastYaw===null?0:deltaAngle(yaw,lastYaw)/Math.max(.008,dt);
    lean=damp(lean,clamp(turnSpeed*.36,-1,1),8,dt);lastYaw=yaw;
    const quiet=state.mode==='reading'||id==='sleep';
    winkAge=quiet?9:winkAge+dt;
    sleepWeight=damp(sleepWeight,id==='sleep'?1:0,6.5,dt);
    const interested=!quiet&&(attention.active||petAge<.95);
    const goalX=interested?clamp(attention.x||0,-1,1):.17*Math.sin(clock*.67)*Math.sin(clock*.34);
    const goalY=interested?clamp(attention.y||0,-1,1):.09*Math.sin(clock*.73);
    eye.x=damp(eye.x,goalX,6.6,dt);eye.y=damp(eye.y,goalY,7.1,dt);
    if(clock>=nextBlink){blinkStart=clock;nextBlink=clock+3.5+1.45*Math.sin(1.67*clock);}
    const blink=envelope(clock-blinkStart,0,.083,.10,.26);
    const pet=quiet?0:envelope(petAge,0,.16,.38,.87);
    const {sitting:sit,lying:lie}=posture(id,p,postureValues);
    const jump=id==='jump'?jumpShape(p,jumpValues):null;
    const body=poseTorso(id,p,clock,lean,sit,lie,jump,eye,baseBody);
    body.sleepClearance=id==='sleep'?1:0;
    for(const prop in body)body[prop]=lerp(prevBody[prop],body[prop],blend);
    baseBody=body;
    bones.hips.position.copy(hipsRest);bones.hips.position.x+=body.hipX;bones.hips.position.y+=body.hipY;bones.hips.position.z+=body.hipZ;
    bones.hips.rotation.set(body.pelvisPitch,body.pelvisYaw,body.pelvisRoll,'YXZ');
    bones.spine.rotation.set(body.spinePitch,body.spineYaw,0,'YXZ');
    bones.chest.rotation.set(body.chestPitch,body.chestYaw,body.chestRoll,'YXZ');
    bones.neck.position.copy(neckRest);bones.neck.position.y-=.018*sleepWeight;
    bones.neck.rotation.set(body.neckPitch,body.neckYaw,0,'YXZ');
    // Keep the shorter kitten neck clear of the collar when curled up or
    // leaning sideways. Sleep and nuzzle use the existing pose blend weights.
    bones.head.position.copy(headRest);
    if(cat.nativeHead){
      const sleepLift=cat.nativeHead.authoredFace?.012:.008;
      const clearanceWeight=cat.nativeHead.authoredFace?Math.max(sleepWeight,body.sleepClearance):sleepWeight;
      bones.head.position.y+=sleepLift*clearanceWeight+(cat.nativeHead.authoredFace?body.headClearance:0);
    }
    bones.head.rotation.set(body.headPitch,body.headYaw,body.headRoll+.065*pet,'YXZ');
    for(let i=0;i<ears.length;i++){
      const sign=i===0?1:-1,cycle=(clock+i*2.1)%5.7;
      const flick=.13*envelope(cycle,0,.070,.099,.29);
      ears[i].rotation.set(-.065*pet-.07*sleepWeight+body.earBack,
        .20*eye.x+sign*(flick+.35*body.earBack),sign*(.08*pet+flick-body.earTilt+.10*sleepWeight));
    }
    root.updateWorldMatrix(true,true);
    root.matrixWorld.decompose(worldPosition,characterRotation,worldScale);
    for(const frame of limbParents){
      frame.inverse.copy(frame.parent.matrixWorld).invert();
      frame.parent.matrixWorld.decompose(worldPosition,frame.rotation,worldScale);
    }
    if(state.position)center.fromArray(state.position);else center.set(0,0,0);
    for(let i=0;i<limbs.length;i++){
      const l=limbs[i],f=poseFoot(id,p,i,sit,lie,jump,footValues);
      const target=l.target.copy(l.rest);
      target.x+=f.x*l.poseScale;target.y+=f.y*l.poseScale;target.z+=f.z*(moving?1:l.poseScale);
      if(moving){
        const side=i%2===0?1:-1;
        // The outside paws have more ground to cover in the same beat.
        target.z=l.rest.z+f.z*(1-.14*side*lean);
        if(!f.air){
          if(!l.planted){
            l.anchor.copy(target).applyAxisAngle(worldY,yaw).add(center);
            l.planted=true;
          }
          worldPoint.copy(l.anchor).sub(center).applyAxisAngle(worldY,-yaw);
          target.x=clamp(worldPoint.x,l.rest.x-.039,l.rest.x+.039);
          target.z=clamp(worldPoint.z,l.rest.z-.080,l.rest.z+.080);
        }else{
          if(l.planted){
            // On a curve the planted foot may leave the ground to the side of
            // its straight-line swing. Recover that difference over the arc.
            worldPoint.copy(l.anchor).sub(center).applyAxisAngle(worldY,-yaw);
            l.release.set(
              clamp(worldPoint.x,l.rest.x-.039,l.rest.x+.039)-target.x,0,
              clamp(worldPoint.z,l.rest.z-.080,l.rest.z+.080)-target.z
            );
            l.planted=false;
          }
          target.addScaledVector(l.release,1-smooth(f.swing));
        }
      }
      if(blend<1)target.lerpVectors(l.previous,target,blend);
      l.pitch=lerp(l.lastPitch,f.pitch,blend);l.roll=lerp(l.lastRoll,f.roll||0,blend);
      l.solve(target,l.pitch,l.roll);
    }
    cat.updateCoatPose?.();
    poseTail(clock,p,body,sit,lie,lean,id);
    if(cat.bellPivot){
      // Hang in world gravity, not in the tilted neck's local vertical. The
      // small outward rest angle leaves room for the chest below the collar.
      bones.neck.matrixWorld.decompose(worldPosition,bellParentRotation,worldScale);
      bellParentRotation.invert();
      bellGravity.set(0,-1,0).applyQuaternion(bellParentRotation);
      const rest=clamp(Math.atan2(-bellGravity.z,-bellGravity.y)-.24,-1.15,.24);
      const sway=moving?.045*Math.sin(TAU*p):jump?.055*(jump.trail-jump.landFront):0;
      const angle=cat.bellPivot.rotation,goal=rest+sway;
      if(!hasPose){angle.x=goal;bellSpeed=0;}
      // Small substeps keep the hanging bell stable when the render rate dips.
      for(let remaining=dt;remaining>.00001;remaining-=1/60){
        const step=Math.min(remaining,1/60);
        bellSpeed+=((goal-angle.x)*108-9.5*bellSpeed)*step;
        angle.x=clamp(angle.x+bellSpeed*step,-1.70,rest+.06);
      }
      const roll=clamp(Math.atan2(bellGravity.x,-bellGravity.y),-.48,.48)+(quiet?0:.04*lean);
      angle.z=hasPose?damp(angle.z,roll,10,dt):roll;
      const [safePitch,safeRoll]=clearForepaws(angle.x,angle.z);
      if(safePitch!==angle.x||safeRoll!==angle.z){angle.x=safePitch;angle.z=safeRoll;bellSpeed=Math.min(0,bellSpeed);}
    }
    const wink=envelope(winkAge,0,.16,.36,.63);
    const faceAttention=id==='groom'?1-envelope(p,0,.28,.70,1):1;
    faceValues.wink=wink;faceValues.blink=Math.max(body.squint,blink*(1-sleepWeight),pet*(winkAge<.72?.08:.55),sleepWeight);
    faceValues.gazeX=eye.x*(1-sleepWeight)*faceAttention;faceValues.gazeY=eye.y*(1-sleepWeight)*faceAttention;
    faceValues.pupil=body.pupil+.11*pet;faceValues.mouth=body.mouth;
    cat.setFace(faceValues);
    hasPose=true;
  }
  function wink(){winkAge=0;blinkStart=-10;nextBlink=Math.max(nextBlink,clock+1);}
  return {update,touch(){petAge=0;},wink,reset};
}
