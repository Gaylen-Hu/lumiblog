import { CAT_WALK_REFERENCE as R } from './cat-walk-data.js';

export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const wrap=v=>((v%1)+1)%1;
export const smooth=v=>{v=clamp(v,0,1);return v*v*v*(10+v*(-15+v*6));};

// Periodic cubic interpolation. The measured cycle endpoints differ slightly
// because this is an ensemble mean; join them without a one-frame snap.
export function referenceSample(name,phase){
 const a=R[name],n=a.length-1,open=name==='pawX',x=(open?clamp(phase,0,1):wrap(phase))*n,i=Math.floor(x),t=x-i;
 const at=j=>{if(open)return a[clamp(j,0,n)];j=((j%n)+n)%n;return j===0?(a[0]+a[n])*.5:a[j];};
 const p0=at(i-1),p1=at(i),p2=at(i+1),p3=at(i+2);
 return p1+.5*t*(p2-p0+t*(2*p0-5*p1+4*p2-p3+t*(3*(p1-p2)+p3-p0)));
}

const referenceSwing=1-R.duty;
const flightEnd=referenceSample('pawX',referenceSwing),flightStart=referenceSample('pawX',0);
const floorY=Math.min(...R.pawY.slice(40,85)),peakY=Math.max(...R.pawY.slice(0,37))-floorY;
const carpalRest=referenceSample('carpal',.50),toeRest=referenceSample('toe',.50);
const scapMean=R.scapula.slice(0,100).reduce((s,v)=>s+v,0)/100;
const heightMean=R.shoulderHeight.slice(0,100).reduce((s,v)=>s+v,0)/100;

// Hand-keyed profiles of a digitigrade hind limb. Each curve is expressed
// from lift to touch or touch to release, independently of the clock. The
// handle slopes are shape-preserving: flat contact and no below-ground ripple.
// These are animation controls for this rig, not measured hindlimb angles.
function poseCurve(keys){
 const slopes=keys.map(([x,y],i)=>{
  if(!i||i===keys.length-1)return 0;
  const left=(y-keys[i-1][1])/(x-keys[i-1][0]);
  const right=(keys[i+1][1]-y)/(keys[i+1][0]-x);
  return left*right>0 ? 2*left*right/(left+right) : 0;
 });
 return progress=>{
  let i=0;while(i+2<keys.length&&keys[i+1][0]<progress)i++;
  const [x,a]=keys[i],[next,b]=keys[i+1],span=next-x,t=clamp((progress-x)/span,0,1);
  const t2=t*t,t3=t2*t;
  return (2*t3-3*t2+1)*a+(t3-2*t2+t)*span*slopes[i]+
         (-2*t3+3*t2)*b+(t3-t2)*span*slopes[i+1];
 };
}
const hindReach=poseCurve([[0,0],[.13,.035],[.34,.25],[.56,.61],[.82,.92],[1,1]]);
const hindClear=poseCurve([[0,0],[.12,.19],[.35,.90],[.46,1],[.70,.58],[.88,.13],[1,0]]);
const hindFold=poseCurve([[0,.34],[.13,.54],[.38,.69],[.61,.42],[.82,.14],[1,.02]]);
const hindStance=poseCurve([[0,.02],[.17,-.085],[.42,-.035],[.69,.085],[.89,.24],[1,.34]]);
const hindLoad=poseCurve([[0,0],[.18,.77],[.52,.9],[.72,1],[.87,.70],[1,0]]);

export function gaitTiming(id='walk',ratio=1){
 const trot=id==='trot',nominalPeriod=trot?.68:.94;
 ratio=clamp(ratio,.10,2);
 // Within a gait, speed changes stance duration more than swing duration.
 // These bounded retiming gains are engineering choices, not measured constants.
 const period=nominalPeriod/Math.pow(ratio,.42);
 const baseSwing=trot?.50:referenceSwing;
 const swingTime=nominalPeriod*baseSwing/Math.pow(ratio,.08);
 const swing=clamp(swingTime/period,.19,.58);
 return {period,rate:1/period,swing,hindSwing:clamp(swing+(trot?.015:.027),.20,.60),ratio};
}

export function legPhase(phase,index,id='walk',timing=gaitTiming(id)){
 const trot=id==='trot',swing=index<2?timing.swing:timing.hindSwing;
 const offset=trot?[0,.5,.5,0][index]:[0,.5,.206+timing.hindSwing-timing.swing,.706+timing.hindSwing-timing.swing][index];
 const local=wrap(phase+offset),air=local<swing;
 const progress=air?local/swing:(local-swing)/(1-swing);
 // All measured forelimb curves start at swing onset, not at touchdown.
 const source=air?progress*referenceSwing:referenceSwing+progress*R.duty;
 return {phase:local,swing,air,progress,source,offset};
}

export function sampleLeg(phase,index,id='walk',timing=gaitTiming(id)){
 const state=legPhase(phase,index,id,timing),p=state.source;
 const fore=index<2,trot=id==='trot';
 const flight=state.air?(fore?clamp((referenceSample('pawX',p)-flightStart)/(flightEnd-flightStart),0,1):hindReach(state.progress)):1;
 // Keep the measured early clearance peak, with a C2 contact envelope.
 // The published file is forelimb data. Do not copy its early wrist-clearance
 // peak onto a hind limb with a different chain: use a C2 mid-swing envelope.
 const clearance=state.air?(fore?clamp((referenceSample('pawY',p)-floorY)/peakY,0,1)*smooth(state.progress/.13)*smooth((1-state.progress)/.14):hindClear(state.progress)):0;
 const push=state.air?0:smooth((state.progress-.70)/.30);
 const release=state.air?1-smooth(state.progress/.34):push;
 return {...state,flight,clearance,
  // World sagittal rotations relative to the source rig's neutral foot.
  // Small gain limits accommodate this mesh's shorter upper forelimbs.
  carpalPitch:fore?clamp((carpalRest-referenceSample('carpal',p))*.62,-.15,1.10):(.60*clearance+.30*release),
  toePitch:fore?clamp((toeRest-referenceSample('toe',p))*.48,-.10,1.20):(.46*clearance+.16*release),
  scapula:(referenceSample('scapula',p)-scapMean)*.42,
  shoulderHeight:(referenceSample('shoulderHeight',p)-heightMean)*.42,
  load:state.air?0:(fore?Math.max(0,referenceSample('load',p)):hindLoad(state.progress)),
  lift:(trot?.034:.025)*(fore?1:trot?.80:.90)*clearance,
  hockPitch:fore?0:(state.air?hindFold(state.progress):hindStance(state.progress))*(trot?1.08:1),
 };
}

export function clipPhaseForLeg(state,index,id){
 const nominal=gaitTiming(id),local=state.air?state.progress*(index<2?nominal.swing:nominal.hindSwing):(index<2?nominal.swing:nominal.hindSwing)+state.progress*(1-(index<2?nominal.swing:nominal.hindSwing));
 return wrap(local-legPhase(0,index,id,nominal).offset);
}
