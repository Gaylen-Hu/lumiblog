// Silver mackerel tabby. The torso atlas opens on the belly, with the spine
// at u=.5 and the throat at v=0. The shipped atlas includes shoulder blends.
import {loadCompanionImage} from './asset-images.js';
const TAU=2*Math.PI;
const clamp=t=>Math.max(0,Math.min(1,t));
const smooth=t=>{const v=clamp(t);return v*v*(3-2*v);};
let dorsal=null;
let dorsalReady=false;
let coatAtlas=null;
const coatTiles={body:[0,0,2],FL:[2,0,1],FR:[2,1,1],HL:[0,2,1],HR:[1,2,1],tail:[2,2,1]};

export async function prepareBodyCoat(signal){
  if(coatAtlas||dorsalReady)return;
  try {
    const image=await loadCompanionImage('/companion/v1/kitten-coat.46565a951fb1.webp',signal);
    signal?.throwIfAborted();
    coatAtlas=image;
    return;
  } catch {
    // The original brush recipe also supports installations missing the atlas.
    signal?.throwIfAborted();
  }
  const image=await loadCompanionImage('/companion/v1/kitten-body-silver.webp',signal);
  signal?.throwIfAborted();dorsal=image;dorsalReady=true;
}

// Copy each tile at native resolution so GPU mipmaps never bleed between limbs.
export function drawBakedCoat(c,region){
  if(!coatAtlas)return false;
  const [x,y,size]=coatTiles[region];
  c.drawImage(coatAtlas,x*512,y*512,size*512,size*512,0,0,1,1);
  return true;
}

function randomFrom(seed){
  let state=seed;
  return ()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
}

function gradient(c,from,to,stops){
  const g=c.createLinearGradient(...from,...to);
  for(const [t,color] of stops)g.addColorStop(t,color);
  return g;
}

// Multi-scale hairs break up both the silver ground and the edges of the
// stripes. Neighboring hairs subtly share a fall, as in brushed short fur.
function hairs(c,n,seed,lay){
  const rnd=randomFrom(seed);
  c.save();c.lineCap='round';
  const size=c.canvas.width,colors=c.getImageData(0,0,size,c.canvas.height).data;
  // Carry real pigment out of each marking with fine tapered clusters. This
  // breaks a stripe into coloured fibres at its edge as well as inside it.
  const groups=Array.from({length:32},()=>new Path2D());
  for(let i=0;i<n*3;i++){
    const x=rnd(),y=rnd(),l=.003+.013*rnd(),[dx,dy]=lay(x,y);
    const j=(Math.floor(y*c.canvas.height)*size+Math.floor(x*size))*4;
    const tone=(colors[j]+2*colors[j+1]+colors[j+2])*.25+(rnd()-.50)*16;
    const bin=Math.max(0,Math.min(31,Math.floor(tone/8)));
    const p=groups[bin],curl=(rnd()-.5)*.32;
    p.moveTo(x,y);p.quadraticCurveTo(x+dx*l*.46+dy*l*curl,y+dy*l*.46-dx*l*curl,x+dx*l,y+dy*l);
  }
  c.lineWidth=.00125;
  for(const [i,p] of groups.entries()){
    c.strokeStyle='rgba('+(i*8+4)+','+(i*8+3)+','+(i*8+5)+',.54)';c.stroke(p);
  }
  const layers=[
    ['rgba(35,31,35,.11)',.00075,.009,.010],
    ['rgba(255,250,241,.24)',.0010,.005,.010],
    ['rgba(70,63,65,.11)',.00055,.003,.007],
    ['rgba(255,255,251,.23)',.00065,.002,.005]
  ];
  for(const [color,width,minLength,variation] of layers){
    c.strokeStyle=color;c.lineWidth=width;c.beginPath();
    for(let i=0;i<n;i++){
      const x=rnd(),y=rnd(),l=minLength+variation*rnd();
      const [dx,dy]=lay(x,y),tw=(rnd()-.5)*.35+.16*Math.sin(41*x+31*y);
      const ex=l*(dx+tw*dy),ey=l*(dy-tw*dx);
      c.moveTo(x,y);c.quadraticCurveTo(x+ex*.43+l*.075*dy,y+ey*.43-l*.075*dx,x+ex,y+ey);
    }
    c.stroke();
  }
  c.restore();
}

// A blurred undercoat, a broken middle edge and a softer central pigment
// band supply volume without a black ink contour.
function softBand(c,sample,pigment,feather=3){
  const count=69;
  for(const [gain,blur,alpha] of [[1.33,feather*1.5,.42],[1.04,feather,.89],[.78,feather*.65,.42]]){
    c.save();c.filter='blur('+blur+'px)';c.fillStyle=pigment;c.globalAlpha=alpha;
    c.beginPath();
    for(let i=0;i<=count;i++){
      const [x,y,wx,wy]=sample(i/count);
      if(i)c.lineTo(x+wx*gain,y+wy*gain);else c.moveTo(x+wx*gain,y+wy*gain);
    }
    for(let i=count;i>=0;i--){
      const [x,y,wx,wy]=sample(i/count);c.lineTo(x-wx*gain,y-wy*gain);
    }
    c.closePath();c.fill();c.restore();
  }
}

function breast(c,bodyPoint){
  const w=320,stamp=document.createElement('canvas');stamp.width=stamp.height=w;
  const p=stamp.getContext('2d');p.scale(w,w);
  const bib=p.createRadialGradient(.49,.51,.08,.50,.49,.66);
  for(const [t,k] of [[0,'#f9f4e9'],[.59,'#ebe7de'],[.80,'#d7d7d4'],[1,'#b3b4b7']])bib.addColorStop(t,k);
  p.fillStyle=bib;p.fillRect(0,0,1,1);
  for(const side of [-1,1]){
    for(const [top,length,weight,ink] of [[.23,.265,.036,'#585456'],[.436,.157,.024,'#716c6c']]){
      softBand(p,t=>{
        const x=.50+side*(.424-(.424-.12)*t),y=top+length*(.27*t+.73*Math.sin(t*Math.PI/2))+.012*Math.sin(2.7*t);
        return [x,y,0,weight*Math.sin(t*Math.PI)**.60*(.95+.06*Math.sin(13*t))];
      },ink,2.0);
    }
  }
  const size=c.canvas.width,n=Math.ceil(.42*size);
  const atlas=c.getImageData(0,0,size,n),a=atlas.data,s=p.getImageData(0,0,w,w).data;
  const cosine=[],sine=[];
  for(let j=0;j<size;j++){const ang=((j+.5)/size-.5)*TAU;cosine.push(Math.cos(ang));sine.push(Math.sin(ang));}
  for(let row=0;row<n;row++){
    const v=1-(row+.5)/size,side=bodyPoint(.75,v),top=bodyPoint(.5,v),bottom=bodyPoint(0,v);
    const ry=top.y-side.y,tuck=bottom.y-side.y+ry,axial=smooth((side.z-.059)/.066);
    if(!axial)continue;
    for(let col=0;col<size;col++){
      const co=cosine[col],x=side.x*sine[col],y=side.y+ry*co+tuck*Math.min(0,co)**2;
      const wrap=1-.91*smooth((Math.abs(x)-.031)/.052);
      const weight=axial*wrap*(1-.95*smooth((co-.13)/.80));
      const xx=Math.round(clamp(.5+x/.183)*(w-1)),yy=Math.round(clamp((.228-y)/.153)*(w-1));
      const src=(yy*w+xx)*4,dst=(row*size+col)*4;
      for(let ch=0;ch<3;ch++)a[dst+ch]+=(s[src+ch]-a[dst+ch])*weight;
    }
  }
  c.putImageData(atlas,0,0);
}

export function drawBodyCoat(c,bodyPoint){
  c.fillStyle=gradient(c,[0,0],[1,0],[[0,'#f2eae0'],[.12,'#e9e6e0'],[.23,'#d2d2d4'],[.37,'#acadb1'],[.50,'#99999e'],[.63,'#acadb1'],[.77,'#d2d2d4'],[.88,'#e9e6e0'],[1,'#f2eae0']]);
  c.fillRect(0,0,1,1);
  // The center stripe is narrow. Paired bands sweep down away from the spine;
  // the central flank is silver between them rather than one solid bullseye.
  softBand(c,t=>[.50+.003*Math.sin(12*t),t,(.004+.011*Math.sin(Math.PI*t)**.45),0],'#666367',4);
  const bands=[[.070,.27,.013,.055],[.158,.30,.016,.073],[.258,.34,.014,.083],[.375,.59,.016,.085],[.481,.71,.017,.111],[.588,.66,.015,.106],[.699,.73,.017,.097],[.807,.64,.015,.074],[.910,.54,.012,.070]];
  for(const side of [-1,1])for(const [i,[base,length,width,bow]] of bands.entries()){
    const ink=gradient(c,[.5,0],[.5+side*.44,0],[[0,'#5f5b60'],[.40,'#504d51'],[.72,'#626064'],[1,'#8f8c8d']]);
    softBand(c,t=>{
      const x=.5+side*(.008+.5*length*t);
      const y=base+bow*Math.sin(t*Math.PI*.86)+.011*t*Math.sin(7*t+i*.8)+side*.003;
      const w=width*(.23+.77*Math.sin(t*Math.PI)**.69)*(1-smooth((t-.86)/.14))*(1+.12*Math.sin(31*t+2*i)+.085*Math.sin(69*t-i));
      return [x,y,0,w];
    },ink,4.7);
  }
  // On an upper foreleg the stripes run round the arm rather than down from
  // the back. Continue these broken bands over the rounded shoulder skin.
  for(const side of [-1,1])for(const [i,offset] of [.150,.207,.267].entries()){
    softBand(c,t=>{
      const y=.055+.294*t+.012*Math.sin(7*t+i);
      const x=.5+side*(offset+.035*(1-t)+.018*Math.sin(Math.PI*t));
      const w=(.0090-.0008*i)*Math.sin(t*Math.PI)**.68*(1+.13*Math.sin(26*t+i));
      return [x,y,w,0];
    },i===0?'#575357':i===1?'#6c676a':'#777273',3.0);
  }
  if(dorsalReady)c.drawImage(dorsal,0,0,1,1);
  if(bodyPoint)breast(c,bodyPoint);
  hairs(c,9600,1138,(u,v)=>[(u<.5?-1:1)*(.38+.16*Math.cos(v*8)),.79]);
}

export function drawLegCoat(c,hind,side){
  c.fillStyle=gradient(c,[0,0],[0,1],[[0,'#aaa9ae'],[.26,'#b8b8bc'],[.53,'#c3c3c6'],[.71,'#d5d5d5'],[.84,'#e8e5df'],[1,'#f6f0e5']]);
  c.fillRect(0,0,1,1);
  const rings=hind?[[.20,.049],[.36,.047],[.52,.040],[.66,.032]]:[[.225,.053],[.40,.052],[.575,.045],[.695,.025]];
  for(const [i,[y,w]] of rings.entries()){
    softBand(c,t=>{
      const ang=TAU*t,outer=.5+.5*side*Math.sin(ang-Math.PI);
      const bend=.042*Math.cos(ang-.09*side)+side*(hind?.034:.062)*Math.sin(ang+i*.21);
      const width=hind?.55+.45*outer:.12+.88*smooth((outer-.04)/.83);
      return [t,y+bend,0,w*width*(1+.09*Math.sin(ang*3+.72*i))];
    },i===3?'#888589':i===2?'#6d696c':i===0&&!hind?'#726d70':'#514d52',3.1);
  }
  c.fillStyle=gradient(c,[0,.68],[0,.83],[[0,'rgba(246,242,234,0)'],[.80,'rgba(244,240,232,.93)'],[1,'#f7f2e9']]);c.fillRect(0,.68,1,.32);
  for(const [i,u] of [.399,.500,.601].entries()){
    softBand(c,t=>[u+(i-1)*.012*t,.78+.16*t,.0044*Math.sin(Math.PI*t)**.72,0],'rgba(142,132,121,.45)',1.5);
  }
  hairs(c,2700,hind?178:146,(u,v)=>[side*.20*Math.cos(TAU*u+v),1]);
}

export function drawTailCoat(c){
  c.fillStyle=gradient(c,[0,0],[1,0],[[0,'#a2a1a5'],[.50,'#cac9c8'],[1,'#a2a1a5']]);c.fillRect(0,0,1,1);
  c.fillStyle=gradient(c,[0,.05],[0,.20],[[0,'#544f56'],[.63,'#5e585e'],[1,'rgba(99,94,101,0)']]);c.fillRect(0,0,1,.20);
  for(const [i,y] of [.260,.477,.690,.897].entries()){
    softBand(c,t=>[t,y+.015*Math.cos(t*TAU+i)+.009*Math.sin(t*TAU*2+i),0,.054*(1+.10*Math.sin(TAU*t+i))],'#565258',3.0);
  }
  hairs(c,2700,244,(u,v)=>[.20*Math.sin(TAU*u+v),-.96]);
}

export function matchLegToTorso(ctx,torso,grid,cols,rows){
  const size=ctx.canvas.width,leg=ctx.getImageData(0,0,size,size);
  const source=torso.data,dest=leg.data;
  for(let y=0;y<size;y++){
    const gy=(1-(y+.5)/size)*rows,row=Math.floor(gy),fy=gy-row;
    for(let x=0;x<size;x++){
      const gx=(x+.5)/size*cols,col=Math.floor(gx),fx=gx-col;
      const i=(row*(cols+1)+col)*3,k=i+(cols+1)*3;
      const a=(1-fx)*(1-fy),b=fx*(1-fy),c=(1-fx)*fy,d=fx*fy;
      const weight=grid[i+2]*a+grid[i+5]*b+grid[k+2]*c+grid[k+5]*d;
      if(weight<.002)continue;
      const u=grid[i]*a+grid[i+3]*b+grid[k]*c+grid[k+3]*d;
      const v=grid[i+1]*a+grid[i+4]*b+grid[k+1]*c+grid[k+4]*d;
      const src=(Math.floor(v*(torso.height-1))*torso.width+Math.floor(u*(torso.width-1)))*4;
      const dst=(y*size+x)*4;
      for(let channel=0;channel<3;channel++)dest[dst+channel]+=(source[src+channel]-dest[dst+channel])*weight;
    }
  }
  ctx.putImageData(leg,0,0);
}
