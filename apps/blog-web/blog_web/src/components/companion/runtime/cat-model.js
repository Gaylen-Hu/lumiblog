import * as T from 'three';
import {HEAD,headPoint,headNormal,headSurface,headUv,uvToParam,halfFaceWidth,jawOffset,createHeadGeometry,eyeBoundary} from './cat-face-surface.js';
import {createToonPalette,toonifyCat} from './cat-toon-material.js';
import {addKittenFur,silverBibTexture,silverEarTexture,silverFaceTexture,silverIrisTexture} from './kitten-fur.js';
import {drawBodyCoat,drawLegCoat,drawTailCoat,matchLegToTorso} from './cat-coat.js';

const vec=(x=0,y=0,z=0)=>new T.Vector3(x,y,z);
const tau=2*Math.PI;
const clamp=T.MathUtils.clamp;
const mix=T.MathUtils.lerp;

function painted(draw,w=1024,h=512){
  const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
  const c=canvas.getContext('2d');c.scale(w,h);draw(c);
  const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=4;return texture;
}
function oval(c,x,y,rx,ry,color,angle=0){
  c.beginPath();c.ellipse(x,y,rx,ry,angle,0,tau);c.fillStyle=color;c.fill();
}
function ribbonGeometry(rows,columns,sample,weights){
  const pos=[],uv=[],ids=[],ws=[],tri=[];
  for(let j=0;j<=rows;j++)for(let i=0;i<=columns;i++){
    const u=i/columns,v=j/rows,p=sample(u,v);pos.push(p.x,p.y,p.z);uv.push(u,v);
    if(weights){const [a,b,t]=weights(u,v,p);ids.push(a,b,0,0);ws.push(1-t,t,0,0);}
    if(i<columns&&j<rows){const a=j*(columns+1)+i,b=a+1,c=a+columns+1,d=c+1;tri.push(a,b,c,b,d,c);}
  }
  const g=new T.BufferGeometry();
  g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(tri);g.computeVertexNormals();
  if(weights){g.setAttribute('skinIndex',new T.Uint16BufferAttribute(ids,4));g.setAttribute('skinWeight',new T.Float32BufferAttribute(ws,4));}
  return g;
}
function smoothValue(table,t,index){
  const p=clamp(t,0,1)*(table.length-1),i=Math.min(table.length-2,Math.floor(p)),u=p-i;
  const a=table[Math.max(i-1,0)][index],b=table[i][index],c=table[i+1][index],d=table[Math.min(i+2,table.length-1)][index];
  return .5*((2*b)+(-a+c)*u+(2*a-5*b+4*c-d)*u*u+(-a+3*b-3*c+d)*u*u*u);
}
export function createToonCat({legacyHeadFur=true}={}){
  const root=new T.Group();root.name='Tabby';
  const allBones=[],restLocation=new Map();
  function bone(name,parent,xyz){
    const b=new T.Bone();b.name=name;
    const world=vec(...xyz);b.position.copy(world);
    if(parent!==root)b.position.sub(restLocation.get(parent));
    restLocation.set(b,world);parent.add(b);allBones.push(b);return b;
  }
  const hips=bone('Hips',root,[0,.160,-.052]),spine=bone('Spine',hips,[0,.167,.011]),
    chest=bone('Chest',spine,[0,.176,.086]),neck=bone('Neck',chest,[0,.209,.125]),head=bone('Head',neck,[0,.242,.157]);
  const bones={hips,spine,chest,neck,head};
  const legs={};
  const foreX={shoulder:.043,elbow:.035,paw:.032};
  for(const [id,front,s] of [['FL',true,1],['FR',true,-1],['HL',false,1],['HR',false,-1]]){
    const upper=bone(id+'Upper',front?chest:hips,front?[s*foreX.shoulder,.148,.096]:[s*.060,.146,-.071]);
    const lower=bone(id+'Lower',upper,front?[s*foreX.elbow,.073,.086]:[s*.059,.074,-.044]);
    const paw=bone(id+'Paw',lower,front?[s*foreX.paw,.019,.101]:[s*.058,.019,-.071]);
    const chain={upper,lower,paw};const entries=Object.entries(chain);
    legs[id]={...chain,rest:Object.fromEntries(entries.map(([k,b])=>[k,b.position.clone()])),restWorld:Object.fromEntries(entries.map(([k,b])=>[k,restLocation.get(b).clone()]))};
  }
  const tailPath=[
    [0,.162,-.124],[-.003,.174,-.150],[-.009,.189,-.175],[-.015,.208,-.195],
    [-.018,.232,-.209],[-.016,.255,-.213],[-.010,.276,-.205],[-.003,.290,-.192]
  ];
  const tail=[];for(const [i,p] of tailPath.slice(0,-1).entries())tail.push(bone('Tail'+i,tail.at(-1)||hips,p));
  const ears=[1,-1].map(s=>bone(s===1?'EarL':'EarR',head,[s*.050,.321,.162]));
  root.updateMatrixWorld(true);
  const skeleton=new T.Skeleton(allBones);
  const index=b=>allBones.indexOf(b),geoms=new Set(),mats=new Set(),maps=new Set();
  const material=(color,map=null)=>{
    const m=new T.MeshStandardMaterial({color,map,roughness:.9,metalness:0});mats.add(m);if(map)maps.add(map);return m;
  };
  // A small bounce in pearl fur preserves soft shadows beneath the chest.
  function whiteFurMaterial(map,region,torsoBounce=null){
    const m=material('white',map),size=256;
    const mask=document.createElement('canvas');mask.width=mask.height=size;
    const c=mask.getContext('2d');c.drawImage(map.image,0,0,size,size);
    const image=c.getImageData(0,0,size,size),a=image.data;
    for(let row=0;row<size;row++){
      const v=(row+.5)/size;
      const sock=T.MathUtils.smoothstep(v,.57,.75);
      const area=region==='bib'?1-T.MathUtils.smoothstep(v,.265,.39):
        region==='fore'?Math.max(sock,1-T.MathUtils.smoothstep(v,.10,.39)):sock;
      for(let col=0;col<size;col++){
        const j=(row*size+col)*4,lightness=(a[j]+2*a[j+1]+a[j+2])/4;
        const white=T.MathUtils.smoothstep(lightness,180,246);
        // Keep the sock's existing bounce while using one radiance scale at
        // the joined shoulder. The leg UV's top row is not the chest UV.
        const gain=region==='bib'?1:.20/.24;
        a[j]=a[j+1]=a[j+2]=Math.round(255*white*area*gain);
      }
    }
    c.putImageData(image,0,0);
    if(torsoBounce)matchLegToTorso(c,torsoBounce.pixels,torsoBounce.grid,60,48);
    m.emissiveMap=new T.CanvasTexture(mask);maps.add(m.emissiveMap);
    m.emissiveMap.anisotropy=4;
    m.emissive.set('#f2eee8');m.emissiveIntensity=.24;
    return m;
  }
  const outline=new T.MeshBasicMaterial({color:'#5f5551',side:T.BackSide});mats.add(outline);
  function add(parent,g,m,skin=false,edge=0){
    geoms.add(g);
    function mesh(geo,mat){
      const o=skin?new T.SkinnedMesh(geo,mat):new T.Mesh(geo,mat);
      parent.add(o);if(skin){o.bind(skeleton);o.frustumCulled=false;}return o;
    }
    const o=mesh(g,m);o.castShadow=true;
    if(edge>0){
      const shell=g.clone(),p=shell.attributes.position,n=shell.attributes.normal;
      for(let j=0;j<p.count;j++)p.setXYZ(j,p.getX(j)+edge*n.getX(j),p.getY(j)+edge*n.getY(j),p.getZ(j)+edge*n.getZ(j));
      geoms.add(shell);mesh(shell,outline);
    }
    return o;
  }
  function solid(parent,geo,m){return add(parent,geo,m);}
  function blend(list,stops,value){
    if(value<=stops[0])return [index(list[0]),index(list[0]),0];
    let i=1;while(i<stops.length-1&&value>stops[i])i++;
    const t=clamp((value-stops[i-1])/(stops[i]-stops[i-1]),0,1);
    return [index(list[i-1]),index(list[i]),t*t*(3-2*t)];
  }
  // Tapered ribcage, waist, rounded haunch and chest share one continuous skin.
  const bodyRows=[
    [-.143,.141,.002,.003],[-.137,.141,.029,.029],[-.124,.143,.052,.054],
    [-.101,.144,.071,.074],[-.065,.148,.084,.087],[-.020,.151,.082,.086],
    [.025,.153,.080,.086],[.064,.159,.084,.088],[.094,.169,.081,.084],
    [.126,.176,.072,.078],[.152,.185,.058,.063],[.178,.196,.037,.040],[.199,.201,.002,.003]
  ];
  function bodyPoint(u,v){
    const a=(u-.5)*tau,z=smoothValue(bodyRows,v,0),y=smoothValue(bodyRows,v,1);
    const tuck=(.008+.008*Math.exp(-(((z+.017)/.072)**2)))*Math.max(0,-Math.cos(a))**2;
    return vec(Math.sin(a)*smoothValue(bodyRows,v,2),y+Math.cos(a)*smoothValue(bodyRows,v,3)+tuck,z);
  }
  const bodySkin=z=>blend([hips,spine,chest,neck],[-.070,.010,.084,.143],z);
  function bodyRowAt(z){
    let lo=0,hi=1;
    for(let n=0;n<13;n++){const mid=(lo+hi)/2;if(smoothValue(bodyRows,mid,0)<z)lo=mid;else hi=mid;}
    return (lo+hi)/2;
  }
  const bodyGeom=ribbonGeometry(54,72,bodyPoint,(u,v,p)=>bodySkin(p.z));
  // Open two sockets in the lower ribcage. The 60 boundary vertices on each
  // side are shared in position, skin weights and normals with the arm below.
  const sockets=new Map(),socketStart=29,socketEnd=47,indices=[];
  const pos=Array.from(bodyGeom.attributes.position.array),uvs=Array.from(bodyGeom.attributes.uv.array);
  const skinIds=Array.from(bodyGeom.attributes.skinIndex.array),skinWeights=Array.from(bodyGeom.attributes.skinWeight.array);
  for(const [side,lo] of [[1,59],[-1,1]]){
    const hi=lo+12,mid=lo+6,boundary=[];
    for(let c=mid;c<hi;c++)boundary.push([c,socketStart]);
    for(let row=socketStart;row<socketEnd;row++)boundary.push([hi,row]);
    for(let c=hi;c>lo;c--)boundary.push([c,socketEnd]);
    for(let row=socketEnd;row>socketStart;row--)boundary.push([lo,row]);
    for(let c=lo;c<mid;c++)boundary.push([c,socketStart]);
    const ring=boundary.map(([col,row],i)=>{
      const a=(i/60-.5)*tau,x=side*.039+.026*Math.sin(a),z=.083+.028*Math.cos(a);
      const v=bodyRowAt(z),r=smoothValue(bodyRows,v,2),u=(x>0?1:0)-Math.asin(clamp(x/r,-.995,.995))/tau;
      const p=bodyPoint(u,v),[b0,b1,t]=bodySkin(p.z);
      const inward=bodyPoint(mix(u,side>0?.918:.082,.24),mix(v,bodyRowAt(.083),.24));
      return {p,k:0,u,v,b0,b1,t,inward};
    });
    let previous=boundary.map(([col,row])=>row*73+col);
    // Keep the original curvature between the UV grid and the oval sockets.
    // A single fan across this area would turn the breast into flat facets.
    for(let step=1;step<=5;step++){
      const current=[];
      for(let i=0;i<60;i++){
        const [col,row]=boundary[i],to=ring[i];
        const u=mix(col/72,to.u,step/5),v=mix(row/54,to.v,step/5);
        const p=bodyPoint(u,v),[b0,b1,t]=bodySkin(p.z),k=pos.length/3;
        pos.push(p.x,p.y,p.z);uvs.push(u,v);skinIds.push(b0,b1,0,0);skinWeights.push(1-t,t,0,0);
        current.push(k);if(step===5)to.k=k;
      }
      for(let i=0;i<60;i++){
        const j=(i+1)%60;indices.push(previous[i],current[i],previous[j],previous[j],current[i],current[j]);
      }
      previous=current;
    }
    sockets.set(side,ring);
  }
  for(let row=0;row<54;row++)for(let col=0;col<72;col++){
    if(row>=socketStart&&row<socketEnd&&(col>=1&&col<13||col>=59&&col<71))continue;
    const a=row*73+col;indices.push(a,a+73,a+1,a+1,a+73,a+74);
  }
  bodyGeom.setAttribute('position',new T.Float32BufferAttribute(pos,3));bodyGeom.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));
  bodyGeom.setAttribute('normal',new T.Float32BufferAttribute(new Float32Array(pos.length),3));
  bodyGeom.setAttribute('skinIndex',new T.Uint16BufferAttribute(skinIds,4));bodyGeom.setAttribute('skinWeight',new T.Float32BufferAttribute(skinWeights,4));
  bodyGeom.setIndex(indices);
  bodyGeom.computeVertexNormals();
  const bodyMap=painted(ctx=>drawBodyCoat(ctx,bodyPoint),1024,1024);
  const bodyPixels=bodyMap.image.getContext('2d').getImageData(0,0,bodyMap.image.width,bodyMap.image.height);
  const bodyMat=whiteFurMaterial(bodyMap,'bib'),bounceImage=bodyMat.emissiveMap.image;
  const bodyBounce=bounceImage.getContext('2d').getImageData(0,0,bounceImage.width,bounceImage.height);
  add(root,bodyGeom,bodyMat,true).name='SilverBodyCoat';
  const kneeFolds=[];
  function updateCoatPose(){
    for(const {mesh,knee} of kneeFolds){
      const bend=2*Math.acos(clamp(Math.abs(knee.quaternion.w),0,1));
      mesh.morphTargetInfluences[0]=T.MathUtils.smoothstep(bend,.46,1.10);
    }
  }
  for(const [id,leg] of Object.entries(legs)){
    const front=id.startsWith('F'),s=id.endsWith('L')?1:-1;
    // Rows travel from toes to shoulder; the heel curves backwards below the hind knee.
    const rows=front?[
      [.0003,.110,.014,.017],[.005,.112,.022,.027],[.013,.113,.027,.032],[.024,.108,.027,.031],
      [.035,.102,.025,.026],[.052,.103,.0235,.024],[.079,.101,.025,.027],[.106,.092,.028,.031],
      [.133,.090,.030,.032],[.158,.087,.022,.026],[.180,.084,.002,.004]
    ]:[
      [.0003,-.064,.014,.017],[.005,-.063,.022,.027],[.013,-.062,.028,.032],[.024,-.066,.028,.030],
      [.035,-.077,.024,.024],[.051,-.080,.022,.023],[.072,-.071,.024,.026],[.095,-.063,.030,.034],
      [.122,-.074,.037,.042],[.150,-.081,.038,.047],[.173,-.079,.025,.032],[.189,-.076,.003,.005]
    ];
    // Lift the fur slightly between the three toe lobes at the floor line.
    // The same grooves curve down the front instead of ending on the paw.
    const toeCleft=a=>Math.exp(-((a/.125)**2))+.84*Math.exp(-(((Math.abs(a)-.64)/.145)**2));
    const limbPoint=(u,v)=>{
      const a=(u-.5)*tau,y=smoothValue(rows,v,0),z=smoothValue(rows,v,1);
      const tuck=T.MathUtils.smoothstep(y,.061,.146);
      // The upper arm dives under the ribcage. Keeping this ring inside the
      // chest prevents its round end reappearing above the arm in a sit.
      const x=s*(front?mix(foreX.paw,foreX.elbow,T.MathUtils.smoothstep(y,.022,.073))-.010*tuck:.058-.029*tuck);
      const shoulderInset=front?.028*tuck:0;
      const cleft=toeCleft(a),toeGroove=.0030*cleft*Math.exp(-(((v-.145)/.095)**2));
      const ridge=.0014*Math.max(0,Math.cos(a))*(1-cleft)*Math.exp(-(((v-.19)/.088)**2));
      const toesY=y+ridge+.0011*cleft*Math.exp(-((v/.068)**2));
      return vec(x+Math.sin(a)*smoothValue(rows,v,2)*(1-tuck*.16),toesY,z-shoulderInset+Math.cos(a)*smoothValue(rows,v,3)-toeGroove);
    };
    const join=.50,ring=sockets.get(s);
    const legGeom=ribbonGeometry(48,60,(u,v)=>{
      if(!front||v<=join)return limbPoint(u,v);
      const top=ring[Math.round(u*60)%60],t=(v-join)/(1-join),f=1-t;
      const base=limbPoint(u,join),tangent=limbPoint(u,join+.001).sub(base).normalize();
      const lift=top.p.distanceTo(base);
      const lower=base.clone().addScaledVector(tangent,lift*.30);
      // The last control point approaches along the torso's own tangent.
      const upper=top.inward.clone();upper.y-=lift*.075;
      return base.multiplyScalar(f**3).addScaledVector(lower,3*f*f*t)
        .addScaledVector(upper,3*f*t*t).addScaledVector(top.p,t**3);
    },(u,v,p)=>blend(
      [leg.paw,leg.lower,leg.upper,leg.upper,leg.upper.parent],
      front?[.026,.046,.088,.103,.145]:[.024,.042,.097,.111,.157],
      p.y
    ));
    const {position,normal}=legGeom.attributes,legJoint=new Float32Array(position.count*3);
    const pt=vec(),n=vec();
    for(let i=0;i<position.count;i++){
      pt.fromBufferAttribute(position,i);
      const legV=Math.floor(i/61)/48,along=(legV-join)/(1-join);
      if(front&&along>=0){
        const top=ring[(i%61)%60],f=T.MathUtils.smoothstep(along,0,1),att=legGeom.attributes;
        const b0=att.skinIndex.getX(i),b1=att.skinIndex.getY(i),w0=att.skinWeight.getX(i),w1=att.skinWeight.getY(i);
        att.skinIndex.setXYZW(i,b0,b1,top.b0,top.b1);
        att.skinWeight.setXYZW(i,w0*(1-f),w1*(1-f),(1-top.t)*f,top.t*f);
        // Match pigment and normals before the join, including both copies
        // of the UV seam. A bare material line would still read as a cuff.
        const fade=T.MathUtils.smoothstep(along,.08,.98);
        const normalAtTop=vec().fromBufferAttribute(bodyGeom.attributes.normal,top.k);
        const smoothNormal=n.fromBufferAttribute(normal,i).lerp(normalAtTop,fade).normalize();
        normal.setXYZ(i,smoothNormal.x,smoothNormal.y,smoothNormal.z);
        const row=bodyRowAt(pt.z),rx=smoothValue(bodyRows,row,2),ry=smoothValue(bodyRows,row,3);
        const u=Math.atan2(pt.x/rx,(pt.y-smoothValue(bodyRows,row,1))/ry)/tau+.5;
        legJoint.set([mix(u,top.u,fade),1-mix(row,top.v,fade),fade],i*3);
        continue;
      }
      if(pt.y<.055)continue;
      const v=bodyRowAt(pt.z),cx=pt.x/smoothValue(bodyRows,v,2),cy=(pt.y-smoothValue(bodyRows,v,1))/smoothValue(bodyRows,v,3);
      const u=Math.atan2(cx,cy)/tau+.5,skin=bodyPoint(u,v);
      const distance=pt.distanceTo(skin)*Math.sign(Math.hypot(cx,cy)-1);
      const strength=1-T.MathUtils.smoothstep(distance,-.002,.035);
      legJoint.set([u,1-v,strength],i*3);
      if(strength>0){
        const tangent=bodyPoint(u+.0005,v).sub(skin),axial=bodyPoint(u,v+.0005).sub(skin);
        const smoothNormal=n.fromBufferAttribute(normal,i).lerp(axial.cross(tangent).normalize(),strength*.94).normalize();
        normal.setXYZ(i,smoothNormal.x,smoothNormal.y,smoothNormal.z);
      }
    }
    const legMap=painted(c=>{
      drawLegCoat(c,!front,s);matchLegToTorso(c,bodyPixels,legJoint,60,48);
    },512,512);
    const legMat=whiteFurMaterial(legMap,front?'fore':'sock',{pixels:bodyBounce,grid:legJoint});
    if(!front){
      // At a deep fold, draw the coat over the stifle into the haunch. The
      // lower shin and planted pads retain their uncorrected skinning.
      const delta=new Float32Array(position.count*3);
      for(let i=0;i<position.count;i++){
        const y=position.getY(i),w=T.MathUtils.smoothstep(y,.046,.078)*(1-T.MathUtils.smoothstep(y,.100,.139));
        delta[i*3]=-s*.025*w;delta[i*3+2]=-.007*w;
      }
      legGeom.morphTargetsRelative=true;
      legGeom.morphAttributes.position=[new T.Float32BufferAttribute(delta,3)];
    }
    const coat=add(root,legGeom,legMat,true);coat.name='SilverLegCoat_'+id;
    if(!front)kneeFolds.push({mesh:coat,knee:leg.lower});
    const padMat=material('#e5a8a3');
    // Close the underside with the same white coat, exactly at the last hair
    // ring. A flat overlay would show its entire oval when the kitten waves.
    const pawOrigin=restLocation.get(leg.paw);
    const underside=ribbonGeometry(9,60,(u,t)=>{
      const theta=(u-.5)*tau,cleft=toeCleft(theta),r=Math.max(.00005,t);
      const ridge=.0014*Math.max(0,Math.cos(theta))*(1-cleft)*Math.exp(-((.19/.088)**2));
      const rimY=rows[0][0]+ridge+.0011*cleft,rimZ=rows[0][1]-.0030*cleft*Math.exp(-((.145/.095)**2));
      return vec(s*(front?foreX.paw:.058)+Math.sin(theta)*rows[0][2]*r,
        mix(.0034,rimY,t*t),mix(rows[0][1],rimZ+Math.cos(theta)*rows[0][3],t)).sub(pawOrigin);
    });
    const floorUV=underside.attributes.uv;
    for(let i=0;i<floorUV.count;i++)floorUV.setY(i,.0009);
    solid(leg.paw,underside,legMat).name='PawSole_'+id;
    const beanGeometry=new T.SphereGeometry(1,14,8);
    const bean=(x,z,rx,rz,name)=>{
      const m=solid(leg.paw,beanGeometry,padMat);m.name=name+'_'+id;m.position.set(x,-.0174,z);m.scale.set(rx,.00155,rz);m.rotation.y=-x*14;m.castShadow=false;
    };
    bean(0,.004,.0116,.0087,'PawPad');
    for(const [j,x] of [-.0117,-.0042,.0042,.0117].entries())bean(x,.0200-.46*Math.abs(x),.00365,.0043,'ToePad'+j);
  }
  const tc=new T.CatmullRomCurve3(tailPath.map(p=>vec(...p)));
  const tailGeom=ribbonGeometry(56,32,(u,v)=>{
    const p=tc.getPoint(v),t=tc.getTangent(v).normalize(),a=(u-.5)*tau;
    const side=vec(1,0,0).addScaledVector(t,-t.x).normalize(),up=t.clone().cross(side);
    const end=v<.904?1:Math.sqrt(Math.max(.000001,1-((v-.904)/.096)**2));
    const r=(.025-.0050*v+.0029*Math.sin(v*Math.PI))*end;
    return p.addScaledVector(side,r*Math.cos(a)).addScaledVector(up,r*Math.sin(a));
  },(u,v)=>blend(tail,tail.map((_,i)=>i/(tailPath.length-1)),v));
  add(root,tailGeom,material('white',painted(drawTailCoat,512,512)),true).name='SilverTailCoat';
  const hg=createHeadGeometry();
  const jawShape=new Float32Array(hg.attributes.position.count*3);
  for(let i=0;i<hg.attributes.uv.count;i++){
    const param=uvToParam(hg.attributes.uv.getX(i),hg.attributes.uv.getY(i));
    const weight=jawOffset(param.theta,param.v);
    jawShape[i*3+1]=-.009*weight;jawShape[i*3+2]=-.002*weight;
  }
  hg.morphTargetsRelative=true;hg.morphAttributes.position=[new T.Float32BufferAttribute(jawShape,3)];
  const faceCoat=material('white',silverFaceTexture());
  faceCoat.roughness=.97;
  let facialMesh=add(head,hg,faceCoat);facialMesh.name='SilverHeadCoat';
  const lineMat=material('#8c786b');
  function line(parent,points,width,mat){
    const curve=new T.CatmullRomCurve3(points);const geometry=new T.TubeGeometry(curve,Math.max(8,points.length*3),width,7,false);
    return solid(parent,geometry,mat);
  }
  // Rounded pinnae with a recessed rose inner ear and a raised buff conchal fold.
  for(const [i,ear] of ears.entries()){
    const s=i===0?1:-1,loop=new T.Shape();
    loop.moveTo(-.032,-.007);loop.bezierCurveTo(-.034,.006,-.008,.039,.016,.058);
    loop.bezierCurveTo(.024,.065,.032,.061,.034,.052);loop.bezierCurveTo(.038,.031,.033,.002,.020,-.011);
    loop.bezierCurveTo(.009,-.019,-.014,-.018,-.027,-.007);
    const outline2=loop.getSpacedPoints(64).slice(0,-1);
    const center=new T.Vector2(.006,.012),verts=[],colors=[],faces=[],earUV=[];
    const earColors=['#ada79e','#aca69d','#d3cabe','#e5d9c8','#c6ac9e','#cc9d8d','#d8ab9c','#b78579'];
    // The back swells at the root but the rim collapses to a thin, soft tip.
    const rings=[
      [.003,-1],[.63,-.88],[.955,-.44],[1,-.04],[.974,.32],[.90,.51],[.86,.43],[.68,.13],[.30,-.10],[.002,-.16]
    ];
    const palette=[0,0,1,1,2,3,4,5,6,7].map(k=>new T.Color(earColors[k]));
    for(let j=0;j<rings.length;j++)for(let i2=0;i2<outline2.length;i2++){
      const p=outline2[i2].clone().lerp(center,1-rings[j][0]);
      const h=clamp((p.y+.014)/.078,0,1),spread=1-.68*h;
      const thick=.019*spread;
      const z=.006-.009*h*h-.43*p.x+thick*rings[j][1];
      verts.push(s*(p.x*1.14-.15*Math.max(0,p.y)),p.y*.72,z);const col=palette[j].clone();
      earUV.push(clamp((p.x+.036)/.076,.004,.996),clamp((p.y+.020)/.085,.004,.996));
      if(j<4)col.lerp(new T.Color('#d7cbbc'),.65*T.MathUtils.smoothstep(h,.69,.99));
      colors.push(col.r,col.g,col.b);
      if(j<rings.length-1){const n=outline2.length,k=j*n+i2,l=j*n+(i2+1)%n;
        if(s>0)faces.push(k,l,k+n,l,l+n,k+n);else faces.push(k,k+n,l,l,k+n,l+n);}
    }
    const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(verts,3));geo.setAttribute('color',new T.Float32BufferAttribute(colors,3));geo.setIndex(faces);geo.computeVertexNormals();
    geo.setAttribute('uv',new T.Float32BufferAttribute(earUV,2));
    const partition=3*outline2.length*6;
    geo.addGroup(0,partition,0);geo.addGroup(partition,faces.length-partition,1);
    const pinnaMaterials=[true,false].map(back=>{
      const tex=silverEarTexture(back),m=material('white',tex);
      m.side=T.DoubleSide;m.vertexColors=!tex;m.roughness=.92;return m;
    });
    const shell=solid(ear,geo,pinnaMaterials);
    shell.name=s>0?'LeftPinna':'RightPinna';
    // Flush, short pencil-like folds at the base leave the pink pinna readable.
    const probe=new T.Raycaster(),towardsBack=vec(0,0,-1);
    const worldToLocal=ear.matrixWorld.clone().invert();
    function earPoint(x,y,offset){
      probe.set(vec(s*(x*1.14-.15*Math.max(0,y/.85)),y*.847,.07).applyMatrix4(ear.matrixWorld),towardsBack);
      const hit=probe.intersectObject(shell,false)[0];
      return hit?hit.point.applyMatrix4(worldToLocal).add(vec(0,0,offset)):vec(s*(x*1.14-.15*Math.max(0,y/.85)),y*.847,0);
    }
    shell.updateWorldMatrix(true,false);
    const hairVertices=[],hairColors=[],hairIndices=[];
    const shades=[new T.Color('#bc9b88'),new T.Color('#deccba')];
    const roots=[[-.012,.013],[-.010,.016],[-.008,.018],[-.006,.020]];
    const ends=[[.010,.017],[.010,.021],[.008,.025],[.006,.028]];
    const widths=[.0018,.0015,.0011,.0008];
    for(let k=0;k<roots.length;k++){
      const [rx,ry]=roots[k],[ex,ey]=ends[k],width=widths[k];
      for(let layer=0;layer<2;layer++){
        const base=hairVertices.length/3;
        for(let row=0;row<=9;row++)for(let col=0;col<=2;col++){
          const u=col/2,v=row/9;
          const spread=width*(1-v)**.74;
          const x=mix(rx,ex,v),y=mix(ry,ey,v)+.003*Math.sin(v*Math.PI)+(u-.5)*spread;
          hairVertices.push(...earPoint(x,y+.00045*layer,.00055+layer*.00026).toArray());
          hairColors.push(...shades[layer].toArray());
          if(col<2&&row<9){const n=base+row*3+col;hairIndices.push(n,n+1,n+3,n+1,n+4,n+3);}
        }
      }
    }
    const hairGeo=new T.BufferGeometry();
    hairGeo.setAttribute('position',new T.Float32BufferAttribute(hairVertices,3));
    hairGeo.setAttribute('color',new T.Float32BufferAttribute(hairColors,3));
    hairGeo.setIndex(hairIndices);hairGeo.computeVertexNormals();
    const hairMat=material('white');hairMat.vertexColors=true;hairMat.side=T.DoubleSide;
    solid(ear,hairGeo,hairMat).castShadow=false;
  }
  const leatherMap=painted(c=>{
    const dye=c.createLinearGradient(0,0,0,1);
    for(const [t,color] of [[0,'#353230'],[.13,'#514e4b'],[.40,'#444140'],[.82,'#302e2f'],[1,'#242325']])dye.addColorStop(t,color);
    c.fillStyle=dye;c.fillRect(0,0,1,1);
    for(let i=0;i<530;i++){
      c.strokeStyle=i%2?'rgba(211,198,186,.18)':'rgba(21,20,20,.28)';c.lineWidth=.0012;
      c.beginPath();c.moveTo(i/530,-.01);c.lineTo((i+2.6)/530,1.01);c.stroke();
    }
  },512,64);
  const leather=material('white',leatherMap);leather.side=T.DoubleSide;leather.roughness=.79;
  const burnish=material('#363434');burnish.side=T.DoubleSide;
  const neckOrigin=restLocation.get(neck);
  // The band lies diagonally across the nape and under the jaw.
  function collarPoint(angle,height,lift=0){
    const cs=Math.cos(angle),sn=Math.sin(angle);
    // The imported head has a lower jaw than the old procedural face.
    // Lower only the front arc so both its fixed bail and hanging ring clear it.
    const jawClearance=.006*Math.max(0,cs)**3;
    return vec((.067-.0012*height+lift)*sn,.215-.010*cs+.0094*height-.22*lift*cs-jawClearance,
      .149+.055*cs+.0024*height+.98*lift*cs).sub(neckOrigin);
  }
  // The pivot needs a continuous throat under the ring when the head dips.
  const neckCoat=silverBibTexture()||painted(c=>{
    const shades=c.createLinearGradient(0,0,1,0);
    for(const [x,col] of [[0,'#999597'],[.25,'#bcb8b5'],[.39,'#ddd9d0'],[.47,'#efeae0'],[.53,'#efeae0'],[.61,'#ddd9d0'],[.75,'#bcb8b5'],[1,'#999597']])shades.addColorStop(x,col);
    c.fillStyle=shades;c.fillRect(0,0,1,1);
    let seed=303;
    const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
    for(let i=0;i<7400;i++){
      const x=random(),y=random(),length=.005+.029*random();
      c.strokeStyle=i%3?'rgba(91,85,83,.095)':'rgba(255,251,243,.27)';c.lineWidth=.0007;
      c.beginPath();c.moveTo(x,y);c.lineTo(x+Math.sin((x-.5)*6)*length*.24,y+length);c.stroke();
    }
  },512,256);
  // The lower throat extends under the breast. The upper neck widens
  // into the skull so looking up never reveals a separate ring of skin.
  const throatProfile=[
    [.166,.086,.040,.040,.006],[.180,.105,.051,.042,.009],
    [.192,.120,.056,.047,.011],[.203,.135,.061,.052,.012],
    [.210,.148,.066,.054,.010],[.215,.149,.067,.055,.010],
    [.227,.150,.061,.051,.010],[.242,.160,.058,.046,.009],[.256,.166,.049,.037,.008]
  ];
  const throat=ribbonGeometry(38,72,(u,v)=>{
    const a=(u-.5)*tau,cs=Math.cos(a),row=Math.min(1,v/.92);
    // Close the nape inside the skull; its upper rim can otherwise be seen
    // through when the kitten inclines its head to one side.
    const radius=1-T.MathUtils.smoothstep(v,.92,1);
    return vec(Math.sin(a)*smoothValue(throatProfile,row,2)*radius,
      smoothValue(throatProfile,row,0)-smoothValue(throatProfile,row,4)*cs*radius+.005*(1-radius),
      smoothValue(throatProfile,row,1)+smoothValue(throatProfile,row,3)*cs*radius);
  },(u,v)=>v<=.78?blend([chest,neck],[.06,.50],v):blend([neck,head],[.78,.98],v));
  const breast=material('white',neckCoat);
  breast.emissive.set(0xfff9ef);breast.emissiveMap=neckCoat;breast.emissiveIntensity=.18;
  const neckBlend=painted(c=>{
    const weight=c.createLinearGradient(0,0,0,1);
    for(const [p,color] of [[0,'white'],[.61,'white'],[.83,'#444'],[1,'black']])weight.addColorStop(p,color);
    c.fillStyle=weight;c.fillRect(0,0,1,1);
  },8,96);
  maps.add(neckBlend);breast.alphaMap=neckBlend;breast.transparent=true;breast.depthWrite=false;breast.side=T.DoubleSide;
  const throatMesh=add(root,throat,breast,true);throatMesh.name='SilverThroatCoat';throatMesh.castShadow=false;
  const strapPoint=(angle,h,lift=0)=>collarPoint(angle,h*.55,.0020+lift);
  add(neck,ribbonGeometry(5,84,(u,v)=>strapPoint((u-.5)*tau,v*2-1)),leather).name='CharcoalCollar';
  for(const h of [-1,1]){
    add(neck,ribbonGeometry(2,84,(u,v)=>strapPoint((u-.5)*tau,h,(v-1)*.0014)),burnish).name=h<0?'CollarLowerRim':'CollarUpperRim';
  }
  // A pair of studio reflections makes the two rounded halves of the bell legible at pet size.
  const reflection=painted(c=>{
    const sky=c.createLinearGradient(0,0,0,1);
    for(const [y,colour] of [[0,'#eee9dd'],[.36,'#fcfaf2'],[.50,'#a1968a'],[.55,'#3f3836'],[.83,'#a59a8a'],[1,'#544d49']])sky.addColorStop(y,colour);
    c.fillStyle=sky;c.fillRect(0,0,1,1);
    c.fillStyle='#fffef1';c.fillRect(.04,.17,.17,.30);c.fillRect(.67,.30,.08,.20);
    c.fillStyle='#363336';c.fillRect(.38,.34,.09,.24);
  },128,64);
  reflection.mapping=T.EquirectangularReflectionMapping;maps.add(reflection);
  const brass=material('#edbd64');brass.metalness=.80;brass.roughness=.21;brass.envMap=reflection;
  const inside=material('#40332e');inside.roughness=.82;
  const bellPivot=new T.Group();bellPivot.name='BellPivot';neck.add(bellPivot);
  // Hang from the lower front edge, clear of the jaw when the cat curls up.
  bellPivot.position.copy(strapPoint(0,-1,.0025));
  bellPivot.position.y-=.0030;bellPivot.position.z+=.0035;
  // Fixed collar bail meets the swinging link even with the jaw clearance.
  line(neck,[strapPoint(0,-.88,.0003),bellPivot.position.clone().add(vec(0,.0020,.0002)),
    bellPivot.position.clone().add(vec(0,.0006,.0011))],.00062,brass).name='BellCollarBail';
  const link=solid(bellPivot,new T.TorusGeometry(.0032,.00070,8,32),brass);
  // A longer oval link keeps the bell crown below the moving jaw. The top
  // still touches the collar anchor; the bell does not float away from it.
  link.position.set(0,-.0049,.0013);link.scale.set(.80,1.80,1);
  const bell=new T.Group();bellPivot.add(bell);bell.name='GoldenBell';
  bell.position.set(0,-.0200,.0035);bell.rotation.x=-.14;
  function bellShell(profile){
    return solid(bell,new T.LatheGeometry(profile.map(([x,y])=>new T.Vector2(x,y)),42),brass);
  }
  bellShell([[.0001,-.0092],[.0035,-.0089],[.0064,-.0069],[.0086,-.0034],[.0091,-.0008]]);
  bellShell([[.00915,.00005],[.0090,.0028],[.0076,.0059],[.0045,.0083],[.0012,.0091],[0,.0092]]);
  const core=solid(bell,new T.SphereGeometry(.0088,32,20),inside);core.scale.y=.94;
  for(const sign of [-1,1]){
    line(bell,[vec(sign*.0027,-.0088,.0011),vec(sign*.0019,-.0067,.0056),vec(sign*.0017,-.0045,.0078),vec(sign*.0025,-.0032,.0083)],.00036,inside);
  }
  const eyes=[];
  const lidFur=material('white',faceCoat.map);
  lidFur.roughness=.96;lidFur.vertexColors=true;lidFur.side=T.DoubleSide;
  const eyeGlobe=material('#30231f');eyeGlobe.roughness=.35;
  const lashShade=material('#433932');lashShade.side=T.DoubleSide;lashShade.roughness=1;
  const eyeRadius=vec(...HEAD.eye.radius);
  function createEye(side){
    const settings=HEAD.eye,centerTheta=side*settings.theta;
    const anchor=headPoint(centerTheta,settings.v);
    const normal=headNormal(centerTheta,settings.v).lerp(vec(0,.03,1),.51).normalize();
    const horizontal=vec(0,1,0).cross(normal).normalize(),vertical=normal.clone().cross(horizontal);
    const frame=new T.Group();
    frame.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(horizontal,vertical,normal));
    frame.position.copy(anchor).addScaledVector(normal,-settings.inset);head.add(frame);
    const globe=solid(frame,new T.SphereGeometry(1,40,28),eyeGlobe);
    globe.scale.copy(eyeRadius);globe.name=side>0?'LeftEyeGlobe':'RightEyeGlobe';globe.castShadow=false;
    const texture=silverIrisTexture();
    const irisMaterial=new T.MeshPhysicalMaterial({map:texture,roughness:.38,clearcoat:.42,clearcoatRoughness:.18,specularIntensity:.18,ior:1.38});
    mats.add(irisMaterial);maps.add(texture);
    const irisGeo=ribbonGeometry(14,64,(u,r)=>{
      const a=-tau*u;
      return vec(eyeRadius.x*r*Math.cos(a),eyeRadius.y*r*Math.sin(a),eyeRadius.z*Math.sqrt(Math.max(0,1-r*r))+.00021);
    });
    for(let n=0;n<irisGeo.attributes.uv.count;n++)irisGeo.attributes.uv.setXY(n,
      .5+irisGeo.attributes.position.getX(n)/eyeRadius.x*.5,
      .5+irisGeo.attributes.position.getY(n)/eyeRadius.y*.5);
    const optical=solid(frame,irisGeo,irisMaterial);optical.name='IrisAndCornea';optical.castShadow=false;

    // The outer loop exactly reuses the vertices of the cut scalp boundary.
    // UVs are evaluated once in the open bind pose and are never animated.
    const boundary=eyeBoundary(side),count=boundary.length,bands=12;
    const positions=[],uvs=[],colors=[],triangles=[],samples=[];
    for(let row=0;row<=bands;row++)for(let k=0;k<count;k++){
      const t=row/bands,outer=boundary[k];
      const a=Math.atan2((outer.v-settings.v)/settings.cutV,(outer.theta-centerTheta)/settings.cutTheta);
      const xx=Math.cos(a),yy=Math.sin(a),inner=Math.max(0,-side*xx)**5;
      const thetaInner=centerTheta+settings.halfTheta*xx;
      const vOpen=settings.v+settings.halfV*yy*(1-.075*xx*xx)+side*.012*xx-.014*inner;
      const theta=mix(thetaInner,outer.theta,t),v=mix(vOpen,outer.v,t);
      const uv=headUv(theta,v);
      positions.push(0,0,0);uvs.push(uv.x,uv.y);
      const shade=mix(yy>0?.32:.52,1,T.MathUtils.smoothstep(t,0,.20));
      colors.push(shade,shade,shade);
      samples.push({t,theta,outerV:outer.v,openV:vOpen,seamV:settings.v-.012+.032*(1-xx*xx)-.014*inner});
      if(row<bands){
        const n=row*count+k,next=row*count+(k+1)%count;
        triangles.push(n,next,n+count,next,next+count,n+count);
      }
    }
    const lidGeo=new T.BufferGeometry();
    lidGeo.setAttribute('position',new T.Float32BufferAttribute(positions,3));
    lidGeo.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));
    lidGeo.setAttribute('color',new T.Float32BufferAttribute(colors,3));lidGeo.setIndex(triangles);
    const lids=solid(head,lidGeo,lidFur);lids.name='FurredEyelids';lids.castShadow=false;
    const lidPos=lidGeo.attributes.position,point=vec(),offset=vec(),norm=vec();
    const currentV=new Float32Array(samples.length);
    const edgeGeo=ribbonGeometry(2,48,()=>vec()),edgePos=edgeGeo.attributes.position;
    const edge=solid(head,edgeGeo,lashShade);edge.name='ClosedLidMargin';edge.castShadow=false;
    function coverSphere(theta,v,depth,target){
      target.copy(headPoint(theta,v));offset.copy(target).sub(frame.position);
      const x=offset.dot(horizontal)/eyeRadius.x,y=offset.dot(vertical)/eyeRadius.y;
      const r2=x*x+y*y;
      if(r2<1){
        const sphereDepth=depth*eyeRadius.z*Math.sqrt(1-r2)+.00068;
        target.addScaledVector(normal,Math.max(0,sphereDepth-offset.dot(normal)));
      }
      return target;
    }
    function closeEye(blink){
      const depth=1-.12*T.MathUtils.smoothstep(blink,.18,.98);
      globe.scale.z=eyeRadius.z*depth;optical.scale.z=depth;
      for(const [n,sample] of samples.entries()){
        const v=mix(mix(sample.openV,sample.seamV,blink),sample.outerV,sample.t);
        currentV[n]=v;
        if(sample.t===1)point.copy(headPoint(sample.theta,v));
        else coverSphere(sample.theta,v,depth,point);
        lidPos.setXYZ(n,point.x,point.y,point.z);
      }
      lidPos.needsUpdate=true;lidGeo.computeVertexNormals();
      const normals=lidGeo.attributes.normal;
      for(let n=0;n<samples.length;n++){
        const blend=T.MathUtils.smoothstep(samples[n].t,.52,1);
        if(!blend)continue;
        headNormal(samples[n].theta,currentV[n],norm);
        point.fromBufferAttribute(normals,n).lerp(norm,blend).normalize();
        normals.setXYZ(n,point.x,point.y,point.z);
      }
      normals.needsUpdate=true;lidGeo.computeBoundingSphere();
      edge.visible=true;
      {
        const thickness=.00038+.00012*T.MathUtils.smoothstep(blink,.52,.94);
        for(let row=0;row<=2;row++)for(let col=0;col<=48;col++){
          const a=Math.PI*(1-col/48),xx=Math.cos(a),yy=Math.sin(a),inner=Math.max(0,-side*xx)**5;
          const theta=centerTheta+settings.halfTheta*xx;
          const vOpen=settings.v+settings.halfV*yy*(1-.075*xx*xx)+side*.012*xx-.014*inner;
          const seamV=settings.v-.012+.032*(1-xx*xx)-.014*inner;
          coverSphere(theta,mix(vOpen,seamV,blink),depth,point);
          point.addScaledVector(normal,.00022).addScaledVector(vertical,(row-1)*thickness*Math.sin(a)**.6);
          edgePos.setXYZ(row*49+col,point.x,point.y,point.z);
        }
        edgePos.needsUpdate=true;edgeGeo.computeVertexNormals();edgeGeo.computeBoundingSphere();
      }
    }
    return {side,texture,globe,optical,lids,closeEye,lastBlink:-1};
  }
  eyes.push(createEye(1),createEye(-1));
  // Rounded, fine-grained nasal leather set into the bridge.
  const noseShape=new T.Shape();noseShape.moveTo(-.0082,.0019);
  noseShape.bezierCurveTo(-.0088,.0048,-.0046,.0054,0,.0046);
  noseShape.bezierCurveTo(.0046,.0054,.0088,.0048,.0082,.0019);
  noseShape.bezierCurveTo(.0077,-.0002,.0034,-.0019,.0022,-.0042);
  noseShape.quadraticCurveTo(0,-.0064,-.0022,-.0042);noseShape.bezierCurveTo(-.0034,-.0019,-.0077,-.0002,-.0082,.0019);
  const noseV=HEAD.nose.v,noseUV=[];
  const noseMap=painted(c=>{
    const color=c.createLinearGradient(.34,.04,.55,1);
    color.addColorStop(0,'#ebc2af');color.addColorStop(.46,'#dba498');color.addColorStop(1,'#bb8580');
    c.fillStyle=color;c.fillRect(0,0,1,1);
    for(const side of [-1,1]){
      c.save();c.translate(.5+side*.30,.475);c.rotate(-side*.41);c.scale(.082,.029);
      const naris=c.createRadialGradient(0,0,0,0,0,1);naris.addColorStop(0,'rgba(101,62,63,.81)');naris.addColorStop(.58,'rgba(131,82,77,.60)');naris.addColorStop(1,'rgba(152,98,88,0)');
      c.fillStyle=naris;c.fillRect(-1,-1,2,2);c.restore();
    }
    for(let i=1;i<750;i++){
      const x=(i*.6180339887)%1,y=(i*.75487766)%1;
      oval(c,x,y,.0018,.0027,i%3?'rgba(104,68,65,.13)':'rgba(250,222,203,.22)');
    }
  },256,192);
  const noseMat=material('white',noseMap);noseMat.roughness=.68;noseMat.side=T.DoubleSide;
  const noseGeo=ribbonGeometry(15,64,(u,r)=>{
    const contour=noseShape.getPointAt(u),x=contour.x*r,y=contour.y*r;
    const v=noseV+y/HEAD.halfHeight,theta=Math.asin(clamp(x/halfFaceWidth(v),-1,1));
    const qx=x/.017+.5,qy=y/.0125+.5;
    const pit=.00051*Math.exp(-((Math.abs(qx-.5)-.30)**2)/.007-((qy-.525)**2)/.002);
    noseUV.push([qx,qy]);return headSurface(theta,v,.00195*Math.max(0,1-r*r)**.65-pit+.00012);
  });
  for(const [i,[u,v]] of noseUV.entries())noseGeo.attributes.uv.setXY(i,u,v);
  solid(head,noseGeo,noseMat).name='NoseLeather';
  const septum=headSurface(0,noseV-.063,.00043);
  line(head,[septum,headSurface(0,-.186,.00048),headSurface(0,HEAD.mouth.v,.00040)],.00043,lineMat);
  for(const s of [-1,1]){
    const crease=ribbonGeometry(4,32,(u,t)=>{
      const angle=s*HEAD.mouth.halfTheta*u,v=HEAD.mouth.v-.084*Math.sin(u*Math.PI*.76);
      return headSurface(angle,v+(t-.5)*.011*Math.sin(Math.PI*u)**.55,.00038);
    });
    const seam=solid(head,crease,lineMat);seam.material.side=T.DoubleSide;seam.castShadow=false;
  }
  // Conforming mouth and tongue patches share the jaw's motion. Sampling
  // the chin directly keeps the corners attached as a small mew opens wide.
  const mouthMap=painted(c=>{
    const color=c.createLinearGradient(0,0,.10,1);
    for(const [t,col] of [[0,'#57342d'],[.20,'#3a2022'],[.60,'#4b242c'],[.83,'#75434a'],[1,'#a46867']])color.addColorStop(t,col);
    c.fillStyle=color;c.fillRect(0,0,1,1);
  },128,128);
  const tongueMap=painted(c=>{
    const color=c.createLinearGradient(.1,0,.55,1);
    color.addColorStop(0,'#da9a9a');color.addColorStop(.44,'#c98589');color.addColorStop(1,'#994f58');
    c.fillStyle=color;c.fillRect(0,0,1,1);
    c.strokeStyle='rgba(125,64,72,.37)';c.lineWidth=.025;c.beginPath();c.moveTo(.5,.04);c.quadraticCurveTo(.47,.19,.50,.51);c.stroke();
  },128,128);
  function mouthPatch(isTongue){
    const locations=[];
    const g=ribbonGeometry(8,42,(u,v)=>{
      const a=-u*tau,xx=v*Math.cos(a),yy=v*Math.sin(a);
      locations.push([xx,yy,v]);return vec(xx,yy,0);
    });
    const uv=g.attributes.uv;
    for(const [i,[xx,yy]] of locations.entries())uv.setXY(i,.5+.5*xx,.5+.5*yy);
    const mat=material('white',isTongue?tongueMap:mouthMap);mat.roughness=isTongue?.56:.86;mat.side=T.DoubleSide;
    const mesh=solid(head,g,mat);mesh.castShadow=false;mesh.name=isTongue?'Tongue':'Mouth';
    function update(open){
      mesh.visible=open>(isTongue?.22:.025);
      if(!mesh.visible)return;
      const p=g.attributes.position,w=.005+.0078*Math.sqrt(open),h=.0009+.021*open;
      for(const [i,[a,b,r]] of locations.entries()){
        const xx=isTongue?a*.62:a,yy=isTongue?-.64+.23*b:b;
        const v=HEAD.mouth.v-.004-(1-yy)*h/(2*HEAD.halfHeight)-.040*xx*xx;
        const theta=Math.asin(clamp(xx*w/halfFaceWidth(v),-1,1));
        const pt=headSurface(theta,v,.00096+.0008*(1-xx*xx-yy*yy)+(isTongue?.0007+.00065*(1-r*r):0));
        const jaw=jawOffset(theta,v)*open;pt.y-=.009*jaw;pt.z-=.002*jaw;p.setXYZ(i,pt.x,pt.y,pt.z);
      }
      p.needsUpdate=true;g.computeVertexNormals();g.computeBoundingSphere();
    }
    return update;
  }
  let openLips=mouthPatch(false),liftTongue=mouthPatch(true);
  const whiskers=[];
  // Each row starts on a different follicle. The whisker is stiff near the
  // pad and bends downward in its outer third under its own weight.
  const follicleRows=[
    [.21,-.246,.068,.006,'#e5ded1'],
    [.31,-.232,.073,.016,'#d4cbbd'],
    [.27,-.293,.068,.027,'#eee6d8'],
    [.38,-.275,.056,.024,'#ccbfad'],
  ];
  for(const s of [1,-1]){
    for(let j=0;j<6;j++){
      const brow=j>=4;
      let curve,whiskerTone;
      if(brow){
        const start=headSurface(s*(.67+.08*(j-4)),.43+.02*(j-4),.0016);
        curve=new T.CatmullRomCurve3([start,start.clone().add(vec(s*.005,.010,.007)),
          start.clone().add(vec(s*(.016+(j-4)*.006),.023-(j-4)*.007,.005))]);
        whiskerTone='#d9cdbb';
      }else{
        const [angle,v,reach,drop,tone]=follicleRows[j],offset=s*Math.cos(j*2.1)*.0018;
        const start=headSurface(s*angle,v,.0007);
        curve=new T.CubicBezierCurve3(start,
          start.clone().add(vec(s*.017,.0035-j*.0008,.006)),
          start.clone().add(vec(s*reach*.70,.001-j*.0018+offset,.009)),
          start.clone().add(vec(s*(reach+offset),-drop+offset,-.005-j*.0012)));
        whiskerTone=tone;
      }
      const geo=new T.TubeGeometry(curve,12,brow?.00028:.00050,5,false);
      const p=geo.attributes.position;
      for(let k=0;k<p.count;k++){const t=Math.floor(k/6)/12;const origin=curve.getPointAt(t),point=vec().fromBufferAttribute(p,k);point.lerp(origin,t*.9);p.setXYZ(k,point.x,point.y,point.z);}
      const w=solid(head,geo,material(whiskerTone));w.castShadow=false;whiskers.push(w);
    }
  }
  let previousOpen=-1,headController=null,legacyHeadRemoved=false,disposed=false;
  function setFace(values={}){
    if(disposed)return;
    if(headController)return headController.setFace(values);
    const {blink=0,wink=0,gazeX=0,gazeY=0,mouth:open=0,pupil=.5}=values;
    for(const eye of eyes){
      const b=clamp(eye.side<0?Math.max(blink,wink):blink,0,1);
      if(Math.abs(b-eye.lastBlink)>.015||((b===1||b===0)&&b!==eye.lastBlink)){
        eye.closeEye(b);eye.lastBlink=b;
      }
      const repeat=1.06-.12*clamp(pupil,0,1);
      eye.texture.repeat.set(repeat,repeat);eye.texture.offset.set((1-repeat)*.5,(1-repeat)*.5);
      eye.optical.rotation.set(-.105*clamp(gazeY,-1,1),.14*clamp(gazeX,-1,1),0);
    }
    const gap=clamp(open,0,1);
    if(Math.abs(gap-previousOpen)>.014||((gap===0||gap===1)&&gap!==previousOpen)){
      facialMesh.morphTargetInfluences[0]=gap;
      openLips(gap);liftTongue(gap);previousOpen=gap;
    }
  }
  setFace();
  const rig={...bones,pelvis:hips,ears,tail,eyes,legs:Object.fromEntries(Object.entries(legs).map(([id,leg])=>[id.toLowerCase(),leg])),setFace};
  const toonPalette=createToonPalette();
  for(const m of toonifyCat(root,toonPalette))mats.add(m);
  const fur=addKittenFur(root,toonPalette,{legacyHead:legacyHeadFur});
  function removeLegacyHead(){
    if(legacyHeadRemoved)return;
    legacyHeadRemoved=true;
    // Keep the two ear control bones in the existing skeleton. Their
    // rotations still come from the animator and drive the asset morphs.
    // Head/ear nap layers are siblings of their old source meshes, so
    // remove the complete visual subtrees rather than hiding one skin.
    for(const child of [...head.children]){
      if(ears.includes(child))for(const visual of [...child.children])visual.removeFromParent();
      else child.removeFromParent();
    }
    fur.removeLegacyHead();
    // Materials and pigment maps can be shared by multiple meshes. Keep
    // everything used by the remaining body, bell, collar and fur layers.
    const activeGeometries=new Set(),activeMaterials=new Set(),activeMaps=new Set();
    root.traverse(object=>{
      if(object.geometry)activeGeometries.add(object.geometry);
      for(const m of Array.isArray(object.material)?object.material:[object.material])if(m){
        activeMaterials.add(m);
        for(const value of Object.values(m))if(value?.isTexture)activeMaps.add(value);
      }
    });
    for(const [owned,active]of [[geoms,activeGeometries],[mats,activeMaterials],[maps,activeMaps]]){
      for(const resource of owned)if(!active.has(resource)){resource.dispose();owned.delete(resource);}
    }
  }
  function installHeadController(controller){
    if(disposed){controller.dispose();return false;}
    if(headController)throw new Error('A native head is already attached');
    removeLegacyHead();headController=controller;
    eyes.splice(0,eyes.length,...controller.eyes);
    whiskers.splice(0,whiskers.length,...controller.whiskers);
    facialMesh=null;openLips=null;liftTongue=null;
    return true;
  }
  function dispose(){
    if(disposed)return;disposed=true;headController?.dispose();
    fur.dispose();toonPalette.dispose();geoms.forEach(g=>g.dispose());mats.forEach(m=>m.dispose());maps.forEach(t=>t.dispose());skeleton.dispose();root.removeFromParent();
  }
  return {root,bones,legs,tail,ears,eyes,whiskers,bellPivot,setFace,rig,fur,updateCoatPose,dispose,
    removeLegacyHead,installHeadController,get isDisposed(){return disposed;}};
}
export const createCatModel=createToonCat;
