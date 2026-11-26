import * as T from 'three';

const TAU=2*Math.PI;
const clamp=T.MathUtils.clamp;

export const HEAD={
  halfWidth:.0875,
  halfHeight:.075,
  centerY:.026,
  frontUvHalf:.31,
  eye:{theta:.405,v:.19,halfTheta:.183,halfV:.132,cutTheta:.298,cutV:.282,
    radius:[.0168,.0161,.0167],inset:.0119},
  nose:{v:-.045},
  muzzle:{theta:.20,v:-.20,halfTheta:.235,halfV:.215,depth:.0090},
  mouth:{v:-.26,halfTheta:.185},
};

// Vertical sagittal stations, from the underside of the chin to the crown.
// The short nasal bridge leads into two rounded whisker cushions.
const FRONT=[.041,.053,.068,.082,.094,.103,.107,.108,.108,.092,.087,.083,.079,.070,.060,.044,.009];
function station(values,v){
  const x=clamp((v+1)*.5,0,1)*(values.length-1),i=Math.min(values.length-2,Math.floor(x)),t=x-i;
  const a=values[Math.max(0,i-1)],b=values[i],c=values[i+1],d=values[Math.min(values.length-1,i+2)];
  return .5*(2*b+(-a+c)*t+(2*a-5*b+4*c-d)*t*t+(-a+3*b-3*c+d)*t*t*t);
}
export function halfFaceWidth(v){
  const circle=Math.pow(Math.max(0,1-v*v),.48);
  const jawTaper=1-.07*T.MathUtils.smoothstep(-v,.39,.95);
  return HEAD.halfWidth*circle*(1+.047*Math.exp(-((v+.34)**2)/.18))*jawTaper;
}
export function padRelief(theta,v){
  const p=HEAD.muzzle,x=(Math.abs(theta)-p.theta)/p.halfTheta,y=(v-p.v)/p.halfV;
  return p.depth*Math.max(0,1-x*x-y*y)**1.72*(1-.70*Math.exp(-theta*theta/.006));
}
export function headPoint(theta,v){
  const round=Math.sqrt(Math.max(0,1-v*v)),axis=.017-.008*v+.016*Math.max(0,-v)**2;
  const depth=.068*round,front=axis+depth;
  const faceWeight=Math.exp(-theta*theta/.17)*T.MathUtils.smoothstep(1-Math.abs(v),0,.075);
  const muzzle=padRelief(theta,v);
  const nose=.0050*Math.exp(-theta*theta/.028-((v-HEAD.nose.v)**2)/.029);
  const cheek=.0028*Math.exp(-((Math.abs(theta)-.68)**2)/.16-((v+.23)**2)/.22);
  const philtrum=.0012*Math.exp(-theta*theta/.007-((v+.22)**2)/.024);
  return new T.Vector3(
    (halfFaceWidth(v)+muzzle*.33)*Math.sin(theta),
    HEAD.centerY+HEAD.halfHeight*v+.007*T.MathUtils.smoothstep(-v,.32,1),
    axis+depth*Math.cos(theta)+(station(FRONT,v)-front)*faceWeight+muzzle+nose+cheek-philtrum
  );
}
export function headNormal(theta,v,target=new T.Vector3()){
  const epsilon=.0002,lower=Math.max(-.99999,v-epsilon),upper=Math.min(.99999,v+epsilon);
  const across=headPoint(theta+epsilon,v).sub(headPoint(theta-epsilon,v));
  const up=headPoint(theta,upper).sub(headPoint(theta,lower));
  return target.copy(across).cross(up).normalize();
}
export function headSurface(theta,v,offset=0){
  return headPoint(theta,v).addScaledVector(headNormal(theta,v),offset);
}
export function jawOffset(theta,v){
  return Math.exp(-theta*theta/.19)*T.MathUtils.smoothstep(-v,.47,.80);
}

// On the front hemisphere equal horizontal distances on the face have equal
// atlas distances. The remaining space wraps continuously behind each ear.
// The only longitudinal seam is at the back of the skull.
export function headUv(theta,v,target=new T.Vector2()){
  const frontSpan=HEAD.frontUvHalf*halfFaceWidth(v)/HEAD.halfWidth;
  const side=Math.sign(theta)||1,a=Math.abs(theta);
  const u=a<=Math.PI/2
    ? .5+frontSpan*Math.sin(theta)
    : .5+side*(frontSpan+(a-Math.PI/2)/(Math.PI/2)*(.5-frontSpan));
  return target.set(u,(v+1)*.5);
}
export function uvToParam(u,imageV){
  const v=clamp(imageV*2-1,-1,1),frontSpan=HEAD.frontUvHalf*halfFaceWidth(v)/HEAD.halfWidth;
  const x=u-.5,side=Math.sign(x)||1;
  const theta=Math.abs(x)<=frontSpan&&frontSpan>.000001
    ? Math.asin(clamp(x/frontSpan,-1,1))
    : side*(Math.PI/2+(Math.abs(x)-frontSpan)/Math.max(.000001,.5-frontSpan)*Math.PI/2);
  return {theta,v};
}

function uniqueSorted(values){
  return [...new Set(values.map(n=>Number(n.toFixed(9))))].sort((a,b)=>a-b);
}
const eye=HEAD.eye;
const THETAS=uniqueSorted([
  ...Array.from({length:161},(_,i)=>-Math.PI+i*TAU/160),
  ...[-1,1].flatMap(side=>Array.from({length:25},(_,i)=>side*eye.theta-eye.cutTheta+i*2*eye.cutTheta/24)),
]);
const HEIGHTS=uniqueSorted([
  ...Array.from({length:97},(_,i)=>-1+i/48),
  ...Array.from({length:25},(_,i)=>eye.v-eye.cutV+i*2*eye.cutV/24),
]);

export function eyeBoundary(side){
  const minX=side*eye.theta-eye.cutTheta,maxX=side*eye.theta+eye.cutTheta;
  const minV=eye.v-eye.cutV,maxV=eye.v+eye.cutV,tolerance=.00000001;
  const xs=THETAS.filter(x=>x>=minX-tolerance&&x<=maxX+tolerance);
  const ys=HEIGHTS.filter(v=>v>=minV-tolerance&&v<=maxV+tolerance);
  return [
    ...xs.map(theta=>({theta,v:maxV})),
    ...ys.slice(0,-1).reverse().map(v=>({theta:maxX,v})),
    ...xs.slice(0,-1).reverse().map(theta=>({theta,v:minV})),
    ...ys.slice(1,-1).map(v=>({theta:minX,v})),
  ];
}

export function createHeadGeometry(){
  const positions=[],normals=[],uvs=[],indices=[],uv=new T.Vector2(),normal=new T.Vector3();
  const columns=THETAS.length;
  for(const v of HEIGHTS)for(const theta of THETAS){
    positions.push(...headPoint(theta,v).toArray());
    headNormal(theta,clamp(v,-.9999,.9999),normal);normals.push(...normal.toArray());
    headUv(theta,v,uv);uvs.push(uv.x,uv.y);
  }
  for(let j=0;j<HEIGHTS.length-1;j++)for(let i=0;i<columns-1;i++){
    const theta=(THETAS[i]+THETAS[i+1])*.5,v=(HEIGHTS[j]+HEIGHTS[j+1])*.5;
    const inHole=Math.abs(Math.abs(theta)-eye.theta)<eye.cutTheta&&Math.abs(v-eye.v)<eye.cutV;
    if(inHole)continue;
    const a=j*columns+i,b=a+1,c=a+columns,d=c+1;
    indices.push(a,b,c,b,d,c);
  }
  const g=new T.BufferGeometry();
  g.setAttribute('position',new T.Float32BufferAttribute(positions,3));
  g.setAttribute('normal',new T.Float32BufferAttribute(normals,3));
  g.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));g.setIndex(indices);
  return g;
}
