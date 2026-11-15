import * as T from 'three';
import {HEAD,headUv,uvToParam} from './cat-face-surface.js';

const TAU=Math.PI*2;
const smooth=T.MathUtils.smoothstep;
function canvasTexture(canvas){
  const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;
  map.anisotropy=8;map.name='SilverTabbyRestPoseAtlas';return map;
}
function randomFrom(seed){return ()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}

// Paint only pigment into the rest-pose chart. No camera projection, captured
// eyelids, catchlights, baked facial shadows or changing per-frame UVs.
export function createSilverFaceAtlas(source){
  if(source)return rewrapSilverPigment(source);
  const size=1024,canvas=document.createElement('canvas');canvas.width=canvas.height=size;
  const c=canvas.getContext('2d'),pixels=c.createImageData(size,size),data=pixels.data;
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const {theta,v}=uvToParam((x+.5)/size,1-(y+.5)/size),a=Math.abs(theta);
    const chin=(1-smooth(v,-.53,-.12))*(1-smooth(a,.52,1.20));
    const p=HEAD.muzzle;
    const pads=Math.exp(-(((a-p.theta)/.30)**2+((v-p.v)/.245)**2)*1.5);
    const bridge=Math.exp(-((a/.16)**2)-((v+.07)/.34)**2)*.27;
    const orbit=Math.hypot((a-HEAD.eye.theta)/.24,(v-HEAD.eye.v)/.19);
    const eyeRim=Math.exp(-(((orbit-1.04)/.24)**2))*.38;
    const ivory=Math.min(1,Math.max(chin,pads,bridge,eyeRim));
    const rear=smooth(a,1.7,2.5),crown=smooth(v,.48,.95);
    const grey=[184-10*crown-5*rear,184-10*crown-5*rear,181-9*crown-3*rear];
    const k=(y*size+x)*4;
    for(let q=0;q<3;q++)data[k+q]=Math.round(T.MathUtils.lerp(grey[q],[242,238,228][q],ivory));
    data[k+3]=255;
  }
  c.putImageData(pixels,0,0);
  const at=([theta,v])=>{const uv=headUv(theta,v);return new T.Vector2(uv.x*size,(1-uv.y)*size);};
  function stripe(points,breadth,opacity=1){
    const curve=new T.CubicBezierCurve(...points.map(at));
    for(const [spread,alpha,blur] of [[1.18,.25,1.8],[1,.76,.65]]){
      const left=[],right=[];
      for(let i=0;i<=60;i++){
        const t=i/60,p=curve.getPoint(t),tangent=curve.getTangent(t);
        const radius=breadth*spread*(.11+.89*Math.sin(Math.PI*t)**.62)*(1+.07*Math.sin(23*t));
        const n=new T.Vector2(-tangent.y,tangent.x).multiplyScalar(radius);
        left.push(p.clone().add(n));right.push(p.clone().sub(n));
      }
      c.save();c.filter='blur('+blur+'px)';c.fillStyle='rgba(63,61,60,'+alpha*opacity+')';
      c.beginPath();for(const [i,p] of [...left,...right.reverse()].entries()){if(i)c.lineTo(p.x,p.y);else c.moveTo(p.x,p.y);}
      c.closePath();c.fill();c.restore();
    }
  }
  for(const s of [-1,1]){
    const mirror=points=>points.map(([a,v])=>[a*s,v]);
    for(const [points,width] of [
      [[[.045,.97],[.035,.78],[.15,.65],[.075,.47]],8.0],
      [[[.23,.96],[.15,.80],[.31,.69],[.22,.50]],8.4],
      [[[.48,.87],[.35,.76],[.44,.66],[.35,.57]],6.0],
      [[[.65,.18],[.95,.28],[1.32,-.03],[2.02,-.20]],12.2],
      [[[.64,-.08],[1.02,-.03],[1.22,-.28],[2.09,-.39]],9.8],
      [[[.91,-.32],[1.25,-.25],[1.60,-.48],[2.19,-.56]],7.0],
      [[[2.55,.94],[2.45,.71],[2.69,.52],[2.63,.24]],9.2],
      [[[2.94,.96],[2.90,.71],[3.02,.48],[2.96,.18]],10.0],
    ])stripe(mirror(points),width);
    // Small pigment spots sit on the actual whisker cushions.
    c.fillStyle='rgba(99,88,79,.36)';
    for(const [a,v,r] of [[.20,-.31,1.1],[.29,-.29,1.0],[.35,-.35,.9],[.25,-.40,.8]]){
      const p=at([s*a,v]);c.beginPath();c.ellipse(p.x,p.y,r,r*.86,0,0,TAU);c.fill();
    }
  }
  // Fine directional fibres soften marking edges without smearing a photo
  // around an eye socket. The same static UV atlas colours real rim hairs.
  const pigment=c.getImageData(0,0,size,size).data,rnd=randomFrom(143177);
  c.lineCap='round';
  for(let i=0;i<31000;i++){
    const u=rnd(),w=rnd(),{theta,v}=uvToParam(u,1-w),a=Math.abs(theta);
    const x=u*size,y=w*size,k=(Math.floor(y)*size+Math.floor(x))*4;
    const side=Math.sign(theta),sweep=smooth(a,.15,1.15);
    const p=headUv(theta+side*(.006+.014*sweep),T.MathUtils.clamp(v+.009*(1-2*sweep),-.999,.999));
    let dx=p.x*size-x,dy=(1-p.y)*size-y;
    const len=Math.hypot(dx,dy),desired=1.2+2.7*rnd();
    if(len<.01)continue;dx*=desired/len;dy*=desired/len;
    const lift=(rnd()-.48)*24;
    c.strokeStyle='rgba('+[0,1,2].map(q=>Math.round(T.MathUtils.clamp(pigment[k+q]+lift,0,255))).join(',')+',.35)';
    c.lineWidth=.35+.35*rnd();c.beginPath();c.moveTo(x,y);c.lineTo(x+dx,y+dy);c.stroke();
  }
  return canvasTexture(canvas);
}

function rewrapSilverPigment(source){
  const width=1536,height=1024,src=document.createElement('canvas');
  src.width=source.width;src.height=source.height;
  const sc=src.getContext('2d',{willReadFrequently:true});sc.drawImage(source,0,0);
  const original=sc.getImageData(0,0,src.width,src.height).data;
  const blurred=document.createElement('canvas');blurred.width=src.width;blurred.height=src.height;
  const bc=blurred.getContext('2d');bc.filter='blur(16px)';bc.drawImage(source,0,0);
  const broad=bc.getImageData(0,0,src.width,src.height).data;
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
  const c=canvas.getContext('2d'),image=c.createImageData(width,height),rgba=image.data;
  // Retarget pigment landmarks only once in the rest pose. The former atlas
  // was cylindrical; the new front chart has uniform physical X density.
  const from=[-1,-.72,HEAD.mouth.v,HEAD.muzzle.v,HEAD.nose.v,HEAD.eye.v,.55,1];
  const to=[-1,-.72,-.180,-.150,-.038,.173,.55,1];
  const remap=v=>{
    let j=1;while(j<from.length-1&&v>from[j])j++;
    return T.MathUtils.lerp(to[j-1],to[j],T.MathUtils.clamp((v-from[j-1])/(from[j]-from[j-1]),0,1));
  };
  function sample(pixels,u,v,q){
    const x=T.MathUtils.clamp(u,0,1)*(src.width-1),y=T.MathUtils.clamp(v,0,1)*(src.height-1);
    const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy;
    const x1=Math.min(ix+1,src.width-1),y1=Math.min(iy+1,src.height-1);
    return T.MathUtils.lerp(T.MathUtils.lerp(pixels[(iy*src.width+ix)*4+q],pixels[(iy*src.width+x1)*4+q],fx),
      T.MathUtils.lerp(pixels[(y1*src.width+ix)*4+q],pixels[(y1*src.width+x1)*4+q],fx),fy);
  }
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const {theta,v}=uvToParam((x+.5)/width,1-(y+.5)/height),a=Math.abs(theta);
    const oldTheta=theta-Math.sign(theta)*.043*Math.exp(-(((a-HEAD.eye.theta)/.35)**2))*smooth(a,0,.18);
    const u=.5+oldTheta/TAU,w=(1-remap(v))*.5;
    const orbit=Math.hypot((a-HEAD.eye.theta)/.295,(v-HEAD.eye.v)/.285);
    const clean=1-smooth(orbit,.65,1.12);
    const under=smooth(HEAD.eye.v-v,.02,.31);
    const pad=Math.exp(-(((a-HEAD.muzzle.theta)/.26)**2+((v-HEAD.muzzle.v)/.19)**2)*1.5);
    const k=(y*width+x)*4;
    for(let q=0;q<3;q++){
      const pixel=sample(original,u,w,q),low=sample(broad,u,w,q);
      const textureDetail=(pixel-low)*.90;
      // Replace the old, much larger photographed eye footprints with coat
      // pigment. They must not survive as pale goggles around the new lids.
      const orbitalPigment=T.MathUtils.lerp([190,188,183][q],[233,229,219][q],under)+textureDetail;
      let colour=T.MathUtils.lerp(pixel,orbitalPigment,clean*.90);
      colour=T.MathUtils.lerp(colour,[241,236,225][q]+textureDetail,pad*.36);
      rgba[k+q]=Math.round(T.MathUtils.clamp(colour,0,255));
    }
    rgba[k+3]=255;
  }
  c.putImageData(image,0,0);
  return canvasTexture(canvas);
}

export function createAmberEyeAtlas(){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=512;
  const c=canvas.getContext('2d');c.scale(512,512);
  const disc=(x,y,rx,ry,colour,rotation=0)=>{c.fillStyle=colour;c.beginPath();c.ellipse(x,y,rx,ry,rotation,0,TAU);c.fill();};
  c.fillStyle='#493829';c.fillRect(0,0,1,1);
  const glow=c.createLinearGradient(0,0,.12,1);
  for(const [t,colour] of [[0,'#4f3e2c'],[.28,'#85653d'],[.59,'#b48749'],[.85,'#d6ae64'],[1,'#af8a50']])glow.addColorStop(t,colour);
  disc(.5,.5,.473,.478,glow);
  const rnd=randomFrom(10249);
  for(let i=0;i<340;i++){
    const a=i*2.399963,r0=.23+.04*rnd(),r1=.43+.025*rnd();
    c.strokeStyle=i%3?'rgba(94,60,27,.18)':'rgba(255,226,145,.29)';
    c.lineWidth=.001+.002*rnd();c.beginPath();c.moveTo(.5+r0*Math.cos(a),.5+r0*Math.sin(a));
    c.quadraticCurveTo(.5+.35*Math.cos(a+.013),.5+.35*Math.sin(a+.013),.5+r1*Math.cos(a),.5+r1*Math.sin(a));c.stroke();
  }
  const pupil=c.createRadialGradient(.48,.41,.04,.5,.49,.27);
  pupil.addColorStop(0,'#252225');pupil.addColorStop(.82,'#1d1b1c');pupil.addColorStop(1,'#3a2922');
  disc(.5,.49,.235,.285,pupil);
  // Restrained anime catchlights, in addition to the live corneal reflection.
  disc(.355,.275,.058,.073,'#fffaf0',-.32);
  disc(.643,.402,.023,.029,'#fff8e8');
  disc(.615,.798,.050,.013,'rgba(255,233,172,.69)',-.30);
  const texture=canvasTexture(canvas);texture.name='AmberIrisWithSmallPupil';return texture;
}
