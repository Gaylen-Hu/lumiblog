import * as THREE from 'three';
import { createContactCorrective } from './contact-correctives.js';
import { platformClips, platformPose, platformProfile } from './platform-motion.js';
import { gaitTiming, sampleLeg } from './gait-profile.js';
import { GALLOP, gallopBody, gallopPaw } from './gallop-profile.js';

export const MOTIONS = Object.freeze([
  { id: 'idle', label: '自在呼吸', duration: 12, loop: true, category: '日常' },
  { id: 'look', label: '歪头看看你', duration: 4, category: '日常' },
  { id: 'sniff', label: '低头嗅闻', duration: 3.6, category: '日常' },
  { id: 'tail', label: '轻摆尾巴', duration: 4, category: '日常' },
  { id: 'sit', label: '乖乖坐好', duration: 2.6, category: '休息' },
  { id: 'lie', label: '伏地休息', duration: 3.2, category: '休息' },
  { id: 'sleep', label: '安心打盹', duration: 12, loop: true, category: '休息' },
  { id: 'stretch', label: '伸个懒腰', duration: 5, category: '休息' },
  { id: 'paw', label: '伸爪招呼', duration: 3.4, category: '互动' },
  { id: 'groom', label: '舔爪洗脸', duration: 6, category: '互动' },
  { id: 'knead', label: '轻轻踩奶', duration: 6, category: '互动' },
  { id: 'meow', label: '向你喵喵', duration: 2.8, category: '互动' },
  { id: 'yawn', label: '困困哈欠', duration: 4.5, category: '互动' },
  { id: 'nuzzle', label: '蹭蹭你的手', duration: 4, category: '互动' },
  { id: 'shake', label: '抖抖脑袋', duration: 2.5, category: '互动' },
  { id: 'alert', label: '警觉竖尾', duration: 4, category: '互动' },
  { id: 'walk', label: '慢慢走来', duration: .94, strideLength: .17, swing: gaitTiming('walk').swing, loop: true, category: '活动' },
  { id: 'trot', label: '轻快小跑', duration: .68, strideLength: .23, swing: gaitTiming('trot').swing, loop: true, category: '活动' },
  { id: 'jump', label: '轻盈跃起', duration: 2.2, category: '活动' },
  { id: 'sitUp', label: '坐姿起身', duration: 2.4, category: '休息' },
  { id: 'lieUp', label: '趴卧起身', duration: 3.0, category: '休息' },
  { id: 'turn', label: '迈步转身', duration: 1.2, stride: .035, swing: .4, loop: true, category: '活动' },
]);

export const HOLD_MOTIONS = [
  {id:'sitHold',duration:12,loop:true},
  {id:'lieHold',duration:12,loop:true},
];
export const COMPANION_MOTIONS = Object.freeze([...MOTIONS, GALLOP]);
export const TRANSITION_MOTIONS=[{id:'platformLeap',duration:1.1},...platformClips];

const axis = { x: new THREE.Vector3(1,0,0), y: new THREE.Vector3(0,1,0), z: new THREE.Vector3(0,0,1) };
const smooth = x => { x = THREE.MathUtils.clamp(x,0,1); return x*x*(3-2*x); };
const envelope = t => smooth(t / .18) * smooth((1-t) / .18);
const pulse = (t, center, width) => smooth(1-Math.abs(t-center)/width);

export function gaitSpeed(id) {
  const gait = COMPANION_MOTIONS.find(motion => motion.id === id);
  if (!gait?.strideLength) throw new Error('动作不属于移动步态');
  return gait.strideLength / gait.duration;
}

// Author local quaternion tracks on the adapted skin. Limb endpoints
// are solved in model space so changes to torso posture keep paws grounded.
export function authorMotions(model, definitions = [...MOTIONS, ...HOLD_MOTIONS, ...TRANSITION_MOTIONS]) {
  model.updateMatrixWorld(true);
  const bones = [];
  model.traverse(n => { if (n.isBone) bones.push(n); });
  const find = fragment => bones.find(b => b.name.includes(fragment));
  const root = find('Wolf_ROOT');
  if (!root) throw new Error('模型骨骼与动作配置不兼容');
  const base = new Map(bones.map(b => [b, { p:b.position.clone(), q:b.quaternion.clone(), scale:b.scale.clone(), world:b.getWorldPosition(new THREE.Vector3()), worldQ:b.getWorldQuaternion(new THREE.Quaternion()) }]));
  const neck = find('Neck_01'), head = find('Neck_Top'), jaw = find('Head_Jaw');
  const neckTop=find('Neck_02');
  const chest=find('Spine_04');
  const ears=[find('Ear_Left'),find('Ear_Right')];
  const deformation=bones.filter(b=>b.name.startsWith('Def_')).map(bone=>({bone,driver:find(`${bone.name.endsWith('_L')?'l':'r'}_${bone.name.includes('Shoulder')?'Front':'Hind'}Leg_Hip`)}));
  const contactMeshes=model.getObjectsByProperty('isSkinnedMesh',true).filter(mesh=>mesh.geometry.attributes.position.count>1000);
  const tails = bones.filter(b => b.name.includes('Wolf_Tail'));
  const legs = ['l_Front','r_Front','l_Hind','r_Hind'].map((name,index) => {
    const hip = find(`${name}Leg_Hip`);
    const knees = bones.filter(b => b.name.includes(`${name}Leg_Knee`));
    const ankle = find(`${name}Leg_Ankle`);
    const ball=find(`${name}Leg_Ball`),toe=find(`${name}Leg_Toe`);
    return {index,hip,knees,ankle,ball,toe, chain:[hip,...knees], target:base.get(ankle).world.clone()};
  });
  function reset() { for (const b of bones) { b.position.copy(base.get(b).p); b.quaternion.copy(base.get(b).q);b.scale.copy(base.get(b).scale); } model.updateMatrixWorld(true); }
  function rotate(b, coordinate, angle) {
    if (!b || Math.abs(angle)<1e-7) return;
    const parentQ = b.parent.getWorldQuaternion(new THREE.Quaternion());
    const delta = new THREE.Quaternion().setFromAxisAngle(axis[coordinate],angle);
    const local = parentQ.clone().invert().multiply(delta).multiply(parentQ);
    b.quaternion.premultiply(local); b.updateWorldMatrix(false,true);
  }
  function moveRoot(y,z=0,x=0) {
    const p = base.get(root).world.clone(); p.y += y;p.z+=z;p.x+=x;
    root.position.copy(root.parent.worldToLocal(p)); root.updateWorldMatrix(false,true);
  }
  function aim(joint,end,target) {
    const origin=joint.getWorldPosition(new THREE.Vector3());
    const from=end.getWorldPosition(new THREE.Vector3()).sub(origin);
    const to=target.clone().sub(origin);
    const parent=joint.parent.getWorldQuaternion(new THREE.Quaternion());
    const delta=new THREE.Quaternion().setFromUnitVectors(from.normalize(),to.normalize());
    joint.quaternion.premultiply(parent.clone().invert().multiply(delta).multiply(parent));
    joint.updateWorldMatrix(false,true);
  }
  function solveTwoBone(hipBone,knee,end,target,bendSign) {
      const hip=hipBone.getWorldPosition(new THREE.Vector3());
      const kneePoint=knee.getWorldPosition(new THREE.Vector3());
      const ankle=end.getWorldPosition(new THREE.Vector3());
      const upper=hip.distanceTo(kneePoint),lower=kneePoint.distanceTo(ankle);
      const delta=target.clone().sub(hip);
      const distance=THREE.MathUtils.clamp(delta.length(),Math.abs(upper-lower)+.001,upper+lower-.001);
      const direction=delta.normalize();
      const along=(upper*upper-lower*lower+distance*distance)/(2*distance);
      const height=Math.sqrt(Math.max(0,upper*upper-along*along));
      const bend=new THREE.Vector3(0,-direction.z,direction.y).normalize().multiplyScalar(bendSign);
      const desiredKnee=hip.clone().addScaledVector(direction,along).addScaledVector(bend,height);
      aim(hipBone,knee,desiredKnee);
      aim(knee,end,target);
  }
  function solve(leg,target,folded,seated=0,foot=null) {
    if(leg.index<2){
      solveTwoBone(leg.hip,leg.knees[0],leg.ankle,target,1);
    }else{
      // Keep the hock behind and above the paw. Solve the thigh/shin on the
      // anatomical forward-bending branch rather than free CCD hyperextension.
      const hock=leg.knees[1];
      const offset=base.get(hock).world.clone().sub(base.get(leg.ankle).world);
      if(foot)offset.applyAxisAngle(axis.x,foot.hockPitch);
      const foldedAmount=Math.max(folded,seated);
      const foldedOffset=new THREE.Vector3(offset.x,.018,-.074).normalize().multiplyScalar(offset.length());
      offset.lerp(foldedOffset,foldedAmount);
      const hockTarget=target.clone().add(offset);
      solveTwoBone(leg.hip,leg.knees[0],hock,hockTarget,-1);
      aim(hock,leg.ankle,target);
    }
    const parent=leg.ankle.parent.getWorldQuaternion(new THREE.Quaternion());
    leg.ankle.quaternion.copy(parent.invert().multiply(foot?.ankleQ||base.get(leg.ankle).worldQ));
    leg.ankle.updateWorldMatrix(false,true);
    if(foot){
      leg.ball.quaternion.copy(leg.ball.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(foot.ballQ));
      leg.ball.updateWorldMatrix(false,true);
    }
  }
  function pose(id,seconds,duration) {
    reset();
    const t=seconds/duration, e=envelope(t);
    const leapPose=platformPose(id,t);
    const running=id===GALLOP.id?gallopBody(t):null;
    const locomotion=['walk','trot','turn'].includes(id),walking=id==='walk'||id==='trot';
    const gait=walking?MOTIONS.find(m=>m.id===id):null;
    const samples=walking?legs.map(leg=>sampleLeg(seconds/duration,leg.index,id)):null;
    const cyclic=['idle','sleep','walk','trot','turn','sitHold','lieHold','gallop'].includes(id);
    const cycle=t*Math.PI*2;
    const s=Math.sin(cyclic?cycle*Math.max(1,Math.round(duration/3)):seconds*2.1);
    let lower=.0005*s, pitch=0;
    if(id==='idle')lower-=.008;
    const settle=smooth((t-.06)/.77);
    let rest=0,lying=0;
    if(id==='sit')rest=settle;
    if(id==='sitUp')rest=1-settle;
    if(id==='sitHold'||id==='groom')rest=1;
    if(id==='lie')lying=settle;
    if(id==='lieUp')lying=1-settle;
    if(['sleep','lieHold','knead'].includes(id))lying=1;
    lower-=rest*.175+lying*.145;
    pitch-=rest*.52;
    if(id==='stretch') { lower+=.008*e; pitch+=.3*e; }
    if(id==='jump') { const p=THREE.MathUtils.clamp((t-.22)/.55,0,1); lower+=Math.sin(p*Math.PI)*.17-.025*e*(t<.22?1:0); }
    if(id==='platformLeap'){
      if(t<.26)lower-=.032*Math.sin(Math.PI*t/.26);
      if(t>.76)lower-=.026*Math.sin(Math.PI*(t-.76)/.24);
    }
    if(leapPose){lower+=leapPose.lower;pitch+=leapPose.pitch;}
    if(running){lower=running.lower;pitch=running.pelvis;}
    if(walking)lower+=(id==='walk'?-.009:-.014)+(samples[0].shoulderHeight+samples[1].shoulderHeight)*.32;
    else if(locomotion)lower+=-.016+.0018*Math.sin(cycle*2);
    chest.scale.x*=1+.004*s;chest.scale.z*=1+.007*s;
    model.updateMatrixWorld(true);
    const foreSupport=walking?(samples[0].load-samples[1].load)/.58:0;
    const hindSupport=walking?samples[2].load-samples[3].load:0;
    const support=.58*foreSupport+.42*hindSupport;
    moveRoot(lower,-rest*.02,.0032*support); rotate(root,'x',pitch);
    if(running){
      rotate(find('Spine_01'),'x',running.lumbar*.52);
      rotate(find('Spine_02'),'x',running.lumbar*.48);
      rotate(find('Spine_03'),'x',running.thoracic*.58);
      rotate(chest,'x',running.thoracic*.42);
      rotate(neck,'x',running.neck);
      for(const leg of legs.slice(0,2)){
        const sample=gallopPaw(t,leg.index),shoulder=leg.hip.parent;
        rotate(shoulder,'x',-.95*sample.forward);
      }
    }
    if(walking){
      rotate(root,'z',-.013*hindSupport);
      const hindReach=samples.slice(2).map(s=>s.air?s.flight:1-s.progress);
      const pelvisYaw=(hindReach[1]-hindReach[0])*(id==='walk'?.047:.026);
      rotate(root,'y',pelvisYaw);
      rotate(chest,'y',-.64*pelvisYaw+.013*Math.sin(cycle+.35));
      for(const leg of legs.slice(0,2)){
        const shoulder=leg.hip.parent,sample=samples[leg.index];
        const leading=sample.air?sample.flight:1-sample.progress;
        const glide=shoulder.getWorldPosition(new THREE.Vector3());
        glide.z+=(leading-.5)*.011;
        glide.y+=.0018*(sample.load/.58-.5);
        shoulder.position.copy(shoulder.parent.worldToLocal(glide));
        shoulder.updateWorldMatrix(false,true);
        rotate(shoulder,'x',-sample.scapula);
      }
      rotate(neck,'x',-.012*Math.sin(cycle*2+.3));
    }
    for(const leg of legs) {
      const target=leg.target.clone();
      let foot=null;
      if(lying) { target.z+=leg.index<2?.10*lying:0; }
      if(id==='stretch'&&leg.index<2) target.z+=.065*e;
      if((id==='paw'||id==='groom'||id==='nuzzle')&&leg.index===0) {
        target.y+=(id==='groom'?.18:.10)*e;
        target.z+=(id==='groom'?.10:.06)*e;
        if(id==='paw') target.x+=.018*Math.sin(seconds*5)*e;
      }
      if(id==='knead'&&leg.index<2) target.y+=Math.max(0,Math.sin(seconds*6+leg.index*Math.PI))*.014*e;
      if(walking){
        const sample=samples[leg.index],stanceDistance=gait.strideLength*(1-sample.swing);
        const longitudinal=sample.air?-.5*stanceDistance+gait.strideLength*(sample.flight-sample.swing*sample.progress):(.5-sample.progress)*stanceDistance;
        const tip=base.get(leg.toe).world.clone();tip.z=base.get(leg.hip).world.z+(leg.index<2?.025:.040)+longitudinal;tip.y+=sample.lift;
        const ankleTurn=new THREE.Quaternion().setFromAxisAngle(axis.x,sample.carpalPitch);
        const ballTurn=new THREE.Quaternion().setFromAxisAngle(axis.x,sample.toePitch);
        const offset=base.get(leg.ball).world.clone().sub(base.get(leg.ankle).world).applyQuaternion(ankleTurn)
          .add(base.get(leg.toe).world.clone().sub(base.get(leg.ball).world).applyQuaternion(ballTurn));
        target.copy(tip.sub(offset));
        foot={ankleQ:ankleTurn.multiply(base.get(leg.ankle).worldQ),ballQ:ballTurn.multiply(base.get(leg.ball).worldQ),hockPitch:sample.hockPitch};
      }else if(locomotion) {
        const gait=MOTIONS.find(m=>m.id===id);
        const phase=(id==='trot'?[0,.5,.5,0]:[0,.5,.25,.75])[leg.index];
        const p=(t+phase)%1, swing=p<gait.swing;
        const progress=swing?smooth(p/gait.swing):1-(p-gait.swing)/(1-gait.swing);
        target.z+=leg.index<2?base.get(leg.hip).world.z-base.get(leg.ankle).world.z:.025;
        target.z+=(progress-.5)*gait.stride;
        target.y+=swing?Math.sin(p/gait.swing*Math.PI)*(id==='trot'?.04:id==='turn'?.012:.025):0;
      }
      if(id==='jump') target.y+=Math.max(0,lower)*.72;
      if(id==='platformLeap'&&t>=.26&&t<=.76){
        const flight=(t-.26)/.50,tuck=Math.sin(Math.PI*flight);
        target.y+=(leg.index<2?.045:.065)*tuck;
        if(leg.index<2)target.z+=.035*tuck;
      }
      if(leapPose){
        const guide=leapPose.legs[leg.index];
        target.y+=guide.lift;target.z+=guide.forward;
        foot={hockPitch:guide.hock,ankleQ:base.get(leg.ankle).worldQ,ballQ:base.get(leg.ball).worldQ};
      }
      if(running){
        const step=gallopPaw(t,leg.index),hind=leg.index>=2;
        const anklePitch=new THREE.Quaternion().setFromAxisAngle(axis.x,step.wrist);
        const ballPitch=new THREE.Quaternion().setFromAxisAngle(axis.x,step.wrist*.64);
        const tip=base.get(leg.toe).world.clone();
        tip.z=base.get(leg.hip).world.z+(hind?.062:.042)+step.forward;
        tip.y+=step.lift;
        target.copy(tip).sub(base.get(leg.ball).world.clone().sub(base.get(leg.ankle).world).applyQuaternion(anklePitch))
          .sub(base.get(leg.toe).world.clone().sub(base.get(leg.ball).world).applyQuaternion(ballPitch));
        foot={hockPitch:step.hock,ankleQ:anklePitch.multiply(base.get(leg.ankle).worldQ),ballQ:ballPitch.multiply(base.get(leg.ball).worldQ)};
      }
      solve(leg,target,lying,rest,foot);
    }
    rotate(neck,'x',lying*.8);
    if(leapPose)rotate(neck,'x',leapPose.neck);
    rotate(neckTop,'x',lying*.35);
    rotate(head,'x',-lying*.95);
    rotate(head,'x',rest*.52);
    rotate(neck,'x',id==='sniff'?.42*e:0);
    rotate(neck,'x',id==='groom'?.65*e+.025*Math.sin(seconds*5)*e:0);
    rotate(neckTop,'x',id==='groom'?.15*e:0);
    rotate(head,'x',id==='groom'?-.35*e:0);
    rotate(neck,'x',id==='stretch'?.22*e:0);
    rotate(head,'y',id==='look'?.48*Math.sin(t*Math.PI*2)*e:0);
    rotate(head,'z',id==='look'?.11*Math.sin(t*Math.PI)**2:0);
    rotate(head,'z',id==='nuzzle'?.18*Math.sin(t*Math.PI*2)*e:0);
    rotate(head,'y',id==='shake'?.20*Math.sin(seconds*19)*e:0);
    rotate(head,'x',id==='yawn'?-.16*e:0);
    if(['paw','groom','nuzzle'].includes(id))rotate(legs[0].ankle,'x',-.75*e);
    rotate(jaw,'x',id==='meow'?.32*Math.max(0,Math.sin(t*Math.PI*3))*e:0);
    rotate(jaw,'x',id==='yawn'?.42*e:0);
    rotate(jaw,'x',id==='groom'?.045*Math.max(0,Math.sin(seconds*5))*e:0);
    for(let i=0;i<tails.length;i++) {
      if(leapPose)rotate(tails[i],'x',leapPose.tail/(1+i*.6));
      if(running)rotate(tails[i],'x',running.tail/(1+i*.7));
      rotate(tails[i],'y',.045*Math.sin((cyclic?cycle:seconds*2)-i*.6));
      if(id==='tail') rotate(tails[i],'y',.19*Math.sin(seconds*3-i*.5)*e);
      if(id==='alert') rotate(tails[i],'x',.30*e);
      if(lying) rotate(tails[i],'y',.18*lying);
    }
    const grounded=Math.max(rest,lying);
    if(grounded>0){
      for(let i=0;i<tails.length;i++){
        const bone=tails[i],origin=bone.getWorldPosition(new THREE.Vector3());
        const length=i<tails.length-1?base.get(bone).world.distanceTo(base.get(tails[i+1]).world):.042;
        // Travel above the floor while settling, then lower into the rest curl.
        const groundHeight=.022+Math.min(.06,(i+1)*.02)+.04*Math.sin(Math.PI*grounded);
        const vertical=THREE.MathUtils.clamp((groundHeight-origin.y)/length,-.8,.8);
        const yaw=.15+i*.48;
        const direction=new THREE.Vector3(Math.sin(yaw),vertical,-Math.cos(yaw)).normalize();
        const world=bone.getWorldQuaternion(new THREE.Quaternion());
        const current=i<tails.length-1?tails[i+1].getWorldPosition(new THREE.Vector3()).sub(origin).normalize():origin.clone().sub(tails[i-1].getWorldPosition(new THREE.Vector3())).normalize();
        const delta=new THREE.Quaternion().setFromUnitVectors(current,direction);
        const parent=bone.parent.getWorldQuaternion(new THREE.Quaternion());
        const desired=parent.clone().invert().multiply(delta).multiply(parent).multiply(bone.quaternion);
        bone.quaternion.slerp(desired,grounded);bone.updateWorldMatrix(false,true);
      }
    }
    if(id==='idle'||id==='sitHold'||id==='lieHold'){
      rotate(head,'y',.025*Math.sin(cycle)*Math.sin(cycle));
      rotate(head,'z',(id==='sitHold'?.045:.025)*Math.sin(cycle)*Math.sin(cycle));
    }
    for(let i=0;i<ears.length;i++){
      const twitch=cyclic?pulse(t,i===0?.32:.71,.045):0;
      rotate(ears[i],'z',(i===0?1:-1)*(.08*twitch+.025*s));
      rotate(ears[i],'y',(i===0?-1:1)*.10*twitch);
      if(id==='alert')rotate(ears[i],'x',-.14*e);
      if(id==='nuzzle')rotate(ears[i],'z',(i===0?1:-1)*.12*e);
    }
    for(const {bone,driver} of deformation){
      const rest=base.get(bone);
      bone.quaternion.copy(rest.q).slerp(driver.quaternion,.4);
      const flex=THREE.MathUtils.clamp(base.get(driver).q.angleTo(driver.quaternion)/.9,0,1);
      const bulge=1+.014*flex;
      bone.scale.copy(rest.scale);bone.scale.x*=bulge;bone.scale.z*=bulge;bone.scale.y/=bulge*bulge;
      bone.updateWorldMatrix(false,true);
    }
    model.updateMatrixWorld(true);
    for(const mesh of contactMeshes)if(mesh.morphTargetInfluences){mesh.morphTargetInfluences[0]=1-(1-rest)**2;mesh.morphTargetInfluences[1]=1-(1-lying)**2;}
  }
  const targets=new Map(contactMeshes.map(mesh=>[mesh,[]]));
  for(const id of contactMeshes.length?['sitHold','lieHold']:[]){
    pose(id,0,12);
    for(const mesh of contactMeshes)targets.get(mesh).push(createContactCorrective(mesh));
  }
  for(const mesh of contactMeshes){
    mesh.geometry.morphAttributes.position=targets.get(mesh);mesh.geometry.morphAttributes.position[0].name='SitContact';mesh.geometry.morphAttributes.position[1].name='LieContact';mesh.geometry.morphTargetsRelative=true;mesh.updateMorphTargets();
  }
  const clips=definitions.map(def=>{
    const frames=def.id===GALLOP.id?64:Math.ceil(def.duration*(['walk','trot'].includes(def.id)||platformProfile(def.id)?60:24)), times=[];
    const rotations=new Map(bones.map(b=>[b,[]]));
    const positions=[];
    const shoulderPositions=new Map(legs.slice(0,2).map(leg=>[leg.hip.parent,[]]));
    const chestScale=[];
    const deformationScales=new Map(deformation.map(({bone})=>[bone,[]]));
    const contactWeights=new Map(contactMeshes.map(mesh=>[mesh,[]]));
    for(let i=0;i<=frames;i++) {
      const seconds=i*def.duration/frames; times.push(seconds); pose(def.id,seconds,def.duration);
      for(const b of bones) rotations.get(b).push(...b.quaternion.toArray());
      positions.push(...root.position.toArray());
      for(const [bone,values] of shoulderPositions)values.push(...bone.position.toArray());
      chestScale.push(...chest.scale.toArray());
      for(const {bone} of deformation)deformationScales.get(bone).push(...bone.scale.toArray());
      for(const mesh of contactMeshes)contactWeights.get(mesh).push(...mesh.morphTargetInfluences);
    }
    const tracks=bones.map(b=>new THREE.QuaternionKeyframeTrack(`${b.name}.quaternion`,times,rotations.get(b)));
    tracks.push(new THREE.VectorKeyframeTrack(`${root.name}.position`,times,positions));
    for(const [bone,values] of shoulderPositions)tracks.push(new THREE.VectorKeyframeTrack(`${bone.name}.position`,times,values));
    tracks.push(new THREE.VectorKeyframeTrack(`${chest.name}.scale`,times,chestScale));
    for(const {bone} of deformation)tracks.push(new THREE.VectorKeyframeTrack(`${bone.name}.scale`,times,deformationScales.get(bone)));
    for(const mesh of contactMeshes)tracks.push(new THREE.NumberKeyframeTrack(`${mesh.name}.morphTargetInfluences`,times,contactWeights.get(mesh)));
    return new THREE.AnimationClip(def.id,def.duration,tracks);
  });
  reset();
  for(const mesh of contactMeshes)mesh.morphTargetInfluences.fill(0);
  return { clips, boneCount:bones.length };
}
