import * as T from 'three';
import {RoomDirector} from './room-director.js';
import {createToonCat} from './cat-model.js';
import {attachNativeHead,fetchNativeHeadAsset} from './native-head.js';
import {createCatAnimator} from './cat-animation.js';
import {createCompanionAgent} from './agent/index.js';
import {createActionBridge} from './agent/action-bridge.js';
import {createCatPress} from './cat-press.js';
import {matchSiteCommand,runSiteCommand} from './agent/site-commands.js';
import {prepareBodyCoat} from './cat-coat.js';
import {prepareKittenFur} from './kitten-fur.js';
import {createStudyNavigation,STUDY_SPAWN,STUDY_USER_POINT,STUDY_WANDER_POINTS} from './motion/study-navigation.js';

const ACTIONS=Object.freeze(['idle','look','sniff','tail','sit','lie','sleep','stretch','paw','groom','knead','meow','yawn','nuzzle','shake','alert','sitUp','lieUp','wink']);
const ROOM_ACTIONS=Object.freeze([...ACTIONS,'walk','trot','gallop','jump','turn']);
const GAITS={walk:{stride:.19,duration:.72},trot:{stride:.265,duration:.46},gallop:{stride:.44,duration:.36}};

// One cat and one conversation can move between a host's shared room scene
// and the transparent reading companion, without reloading model resources.
export async function mountWebsiteCat({container=document.body,apiBase='/api/companion',transport,position='right',headUrl,quality='medium',
  initialHidden=false,mobile=false,signal,locale='zh',bottomOffset=12,wanderInterval=[40,70],website,onVisibilityChange=()=>{},onChatOpenChange=()=>{}}={}){
  const cancelled=()=>new DOMException('Companion mount cancelled','AbortError');
  if(signal?.aborted)throw cancelled();
  const en=locale.startsWith('en'),labels=en?{loading:'Xiaohui is coming…',hide:'Hide cat',show:'Bring cat back',canvas:'Xiaohui: tap to pet, hold to chat. Enter chats; Space pets.'}
    :{loading:'小灰正在过来…',hide:'收起小灰',show:'唤回小灰',canvas:'小灰，轻点抚摸，长按聊天；键盘 Enter 聊天，空格抚摸'};
  const notify=(callback,value)=>{try{callback(value);}catch{/* Host callbacks cannot break lifecycle cleanup. */}};
  const host=document.createElement('div');host.dataset.websiteCat='';
  host.dataset.mobile=String(mobile);
  host.dataset.compact=String(Boolean(initialHidden));
  const bottom=Math.max(0,Number.isFinite(bottomOffset)?bottomOffset:12);
  for(const [key,value] of Object.entries({all:'initial',display:'block',position:'fixed',bottom:`calc(${bottom}px + env(safe-area-inset-bottom))`,[position==='left'?'left':'right']:'18px',width:'240px',height:'270px','z-index':'1100','pointer-events':'none'}))host.style.setProperty(key,value,'important');
  const shadow=host.attachShadow({mode:'open'}),style=document.createElement('style');
  style.textContent=':host{color-scheme:light}*{box-sizing:border-box}[hidden]{display:none!important}.pet{position:absolute;inset:0;pointer-events:none}canvas{display:block;width:100%;height:100%;pointer-events:none}.note{position:absolute;bottom:8px;left:10px;right:10px;font:12px/1.5 system-ui;color:#5c634f;background:#fffdf6;border-radius:12px;padding:8px;text-align:center;pointer-events:auto}.tools{position:absolute;right:3px;top:10px;display:flex;gap:4px;pointer-events:auto}button{font:12px/1.3 system-ui;padding:5px 8px;background:#fffdf6;border:1px solid #d3d6c5;color:#5e6a51;border-radius:15px;cursor:pointer}button:focus-visible{outline:2px solid #617752;outline-offset:3px}@media(max-width:600px){:host{width:168px!important;height:200px!important}.tools{top:2px}}:host([data-compact=true]){height:42px!important;width:110px!important}';
  style.textContent+=`.tools{opacity:0;pointer-events:none;transition:opacity .16s}.pet:focus-within .tools,:host([data-hover=true]) .tools,:host([data-compact=true]) .tools{opacity:1;pointer-events:auto}canvas:focus-visible{outline:2px solid #617752;outline-offset:-3px;border-radius:30px}:host([data-mobile=true]){width:168px!important;height:200px!important}:host([data-mobile=true]) .tools{top:2px}:host([data-compact=true]){width:125px!important}@media(prefers-reduced-motion:reduce){.tools{transition:none}}`;
  const pet=document.createElement('div');pet.className='pet';
  const note=document.createElement('div');note.className='note';note.textContent=labels.loading;note.hidden=Boolean(initialHidden);
  const tools=document.createElement('div');tools.className='tools';
  const hide=document.createElement('button');hide.type='button';hide.textContent=initialHidden?labels.show:labels.hide;
  tools.append(hide);
  pet.append(note,tools);shadow.append(style,pet);container.append(host);
  let cat=null,renderer=null,agent=null,director=null,disposed=false,raf=null,last=0,engaged=false,hidden=Boolean(initialHidden),suspended=false,reducedMotion=false;
  let roomStage=null,detachStage=null,savedRoom=null,roomTime=0,nextWander=0,roomFrameTime=0,roomQuiet=null;
  const wanderMin=Number.isFinite(wanderInterval?.[0])?Math.max(15,Math.min(300,wanderInterval[0])):40;
  const wanderMax=Number.isFinite(wanderInterval?.[1])?Math.max(wanderMin,Math.min(600,wanderInterval[1])):70;
  const postponeWander=()=>{nextWander=roomTime+wanderMin+Math.random()*(wanderMax-wanderMin);};
  const loadController=new AbortController();
  const cleanups=[];let observer;
  const listen=(node,event,fn,options)=>{node.addEventListener(event,fn,options);cleanups.push(()=>node.removeEventListener(event,fn,options));};
  function stopFrames(){if(raf!==null)cancelAnimationFrame(raf);raf=null;last=0;}
  function destroy(){if(disposed)return;disposed=true;loadController.abort();stopFrames();detachStage?.();detachStage=null;roomStage=null;agent?.destroy();director?.destroy();observer?.disconnect();cleanups.splice(0).forEach(fn=>fn());renderer?.dispose();renderer?.forceContextLoss();cat?.dispose();host.remove();notify(onChatOpenChange,false);}
  if(signal)listen(signal,'abort',destroy,{once:true});
  try{
    // The high-detail fibre generator uses the full rest-pose surface order.
    // At ordinary website quality the imported head supplies all face meshes.
    const nativeHeadOnly=quality!=='high';
    const [headAsset]=await Promise.all([
      fetchNativeHeadAsset({url:headUrl,signal:loadController.signal}),
      prepareBodyCoat(loadController.signal),
      prepareKittenFur(loadController.signal,{nativeHeadOnly})
    ]);
    if(disposed||signal?.aborted)throw cancelled();
    cat=createToonCat({legacyHeadFur:false,detailedFur:quality==='high',nativeHeadOnly});
    await attachNativeHead(cat,{asset:headAsset,signal:loadController.signal});
    if(disposed||signal?.aborted)throw cancelled();
    cat.fur?.setDetail(quality==='high');
    const animator=createCatAnimator(cat);let interactionUntil=0;
    const interactiveAnimator={...animator,wink(){interactionUntil=performance.now()+1200;animator.wink();roomStage?.requestRender();}};
    // Keep the original skeleton/gait and inject the website's real routes.
    // Reading mode still advertises no furniture or floor movement.
    director=new RoomDirector({settings:{autonomous:false,furQuality:quality},navigation:createStudyNavigation(),gaits:GAITS,onInteract:event=>{
      postponeWander();
      interactionUntil=performance.now()+1500;
      if(event.type==='rest-touch'){animator.touch();return;}
      if(event.type!=='pet')return;
      animator.touch();
      if(event.count===2)animator.wink();
      agent?.reactToTouch({count:event.count});
    }});director.position.set(0,0,0);
    const blocked=()=>Promise.resolve({status:'blocked',reason:'这个页面没有可前往的桌椅或地面路线。'});
    const actor={get state(){return director.state;},get destroyed(){return director.destroyed;},
      readingPose:()=>director.readingPose(),requestPose:(id,options)=>{roomStage?.requestRender();return director.requestPose(id,options);},
      play(id){
        postponeWander();roomStage?.requestRender();
        if(roomStage&&['walk','trot','gallop'].includes(id))return director.move(id,wanderPoint());
        if(roomStage&&id==='jump')return director.jumpTo(director.state.surface==='ground'?'chair':'ground');
        return (roomStage?ROOM_ACTIONS:ACTIONS).includes(id)?director.play(id):Promise.resolve({status:'blocked',reason:'这个页面尚未开放这个动作。'});
      },
      setMode(value){postponeWander();roomStage?.requestRender();return director.setMode(value);},
      jumpTo(value){postponeWander();roomStage?.requestRender();return roomStage?director.jumpTo(value):blocked();},
      walkTo(value){postponeWander();roomStage?.requestRender();return roomStage?director.walkTo(value):blocked();},
      approachUser(){return actor.walkTo(STUDY_USER_POINT);}};
    function wanderPoint(){
      const available=STUDY_WANDER_POINTS.filter(p=>Math.hypot(p.x-director.position.x,p.z-director.position.z)>.35);
      return available[Math.floor(Math.random()*available.length)]||STUDY_USER_POINT;
    }
    const scene=new T.Scene(),camera=new T.PerspectiveCamera(30,240/270,.01,8);
    scene.add(cat.root);camera.position.set(.04,.245,1.02);camera.lookAt(0,.225,.03);
    renderer=new T.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});renderer.setClearColor(0x000000,0);
    renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
    const hemi=new T.HemisphereLight('#f6f5f0','#d2c3b8',1.04),sun=new T.DirectionalLight('#fff1db',2.18),fill=new T.DirectionalLight('#dce8ee',.34);
    sun.position.set(-2,3.9,1.8);fill.position.set(1.7,1.6,-.6);scene.add(hemi,sun,fill);
    const canvas=renderer.domElement;canvas.setAttribute('aria-label',labels.canvas);canvas.setAttribute('aria-keyshortcuts','Enter Space');canvas.tabIndex=0;pet.prepend(canvas);
    const gaze={x:0,y:0,active:false},head=cat.bones.head,point=new T.Vector3(),anchor={x:120,y:80,faceRadius:40,width:240,height:270,visible:true,moving:false};
    let width=0,height=0,lastPointer=-Infinity,press=null,blockClick=null;
    const contacts=new Set();
    const ray=new T.Raycaster(),pointer=new T.Vector2();
    function size(){if(roomStage||hidden||suspended||disposed)return;const w=host.clientWidth,h=host.clientHeight;if(!w||!h||(w===width&&h===height))return;width=w;height=h;
      renderer.setDrawingBufferSize(w,h,Math.min(devicePixelRatio||1,quality==='high'?2:1.5));camera.aspect=w/h;camera.updateProjectionMatrix();}
    observer=new ResizeObserver(size);observer.observe(host);size();
    function localCommand(text,{probe=false}={}){
      const site=matchSiteCommand(text);
      if(site)return probe?true:runSiteCommand(website,site);
      const normalized=text.replace(/^(小灰[，,、\s]*)/,'').replace(/[。！!\s]+$/,'');
      const match=[[/^(伸个?懒腰|伸懒腰吧)$/,'stretch'],[/^(坐下|坐好)$/,'sit'],[/^(趴下|趴着)$/,'lie'],[/^(睡觉|打盹)$/,'sleep'],[/^(握爪|挥手)$/,'paw'],[/^(走走|散步|走一走)$/,'walk'],[/^(跑跑|小跑)$/,'trot']].find(([rx])=>rx.test(normalized));
      const surface=[[/^(上桌子?|到桌子上)$/,'table'],[/^(上椅子?|到椅子上)$/,'chair'],[/^(回地面|下来|下去)$/,'ground']].find(([rx])=>rx.test(normalized));
      const approach=/^(来这里|过来|到我这来)$/.test(normalized);
      if(probe)return Boolean(match||surface||approach);
      if(match)return actor.play(match[1]);
      if(surface)return actor.jumpTo(surface[1]);
      if(approach)return actor.approachUser();
      return {status:'blocked',reason:'试试「坐下」「伸懒腰」；在房间还可以说「走走」「上桌子」。'};
    }
    agent=createCompanionAgent({anchorElement:canvas,uiRoot:container,apiBase,transport,preferenceKey:'companion:website:chat-enabled',
      website,
      bridgeFactory:()=>{const bridge=createActionBridge({getDirector:()=>actor,getAnimator:()=>interactiveAnimator,website});bridge.getCapabilities=()=>({actions:[...(roomStage?ROOM_ACTIONS:ACTIONS)],moves:roomStage?['ground','chair','table','user']:[],modes:['room','reading'],repeat:true,...(website?.getCapabilities?.()||{})});return bridge;},
      onEngagementChange:value=>{engaged=value;postponeWander();if(!value)gaze.active=false;roomStage?.requestRender();},onChatOpenChange:value=>notify(onChatOpenChange,value),onLocalCommand:localCommand});
    function start(){if(!roomStage&&!disposed&&raf===null&&!document.hidden&&!hidden&&!suspended)raf=requestAnimationFrame(tick);}
    function tick(now){raf=null;if(roomStage||disposed||document.hidden||hidden||suspended)return;
      if(last&&now-last<(reducedMotion?1000/15:1000/(mobile?24:30))-.5){start();return;}
      const dt=last?Math.min(.1,(now-last)/1000):0;last=now;
      const before=director.state;
      const advance=!reducedMotion||before.currentCommand||before.stage!=='holding'||now<interactionUntil?dt:0;
      const s=director.update(advance);if(!engaged&&now-lastPointer>2200)gaze.active=false;
      if(engaged&&s.stage==='holding'&&s.mode!=='reading'){gaze.active=true;gaze.x=0;gaze.y=.08;}
      animator.update(s,advance,gaze);scene.updateMatrixWorld();renderer.render(scene,camera);
      head.localToWorld(point.set(0,.029,.069));point.project(camera);
      anchor.viewport=false;anchor.x=(point.x+1)*width/2;anchor.y=(1-point.y)*height/2;anchor.faceRadius=width*.29;anchor.width=width;anchor.height=height;anchor.visible=s.visible;anchor.moving=s.moving;
      agent.updateScene(anchor,dt);start();
    }
    function petCat(){
      const state=director.state;
      if(!state.visible||state.paused)return;
      interactionUntil=performance.now()+1500;postponeWander();roomStage?.requestRender();
      if(state.mode==='room'&&state.motion==='sleep'&&!state.currentCommand&&!agent.executing){animator.touch();return;}
      if(agent.executing)agent.interruptManual();director.pet();
    }
    function canInteract(){return !disposed&&!hidden&&!suspended&&!document.hidden&&(!roomStage||roomStage.active)&&director.state.visible&&!director.state.paused;}
    function openChat(){if(canInteract()){agent.clearSpeech();agent.openChat();}}
    const catPress=createCatPress({onTap:petCat,onHold:event=>{if(canInteract()&&hitsCat(event))openChat();}});cleanups.push(()=>catPress.destroy());
    function cancelPress(){catPress.cancel();press=null;contacts.clear();blockClick=null;}
    listen(canvas,'keydown',event=>{if(event.repeat||event.altKey||event.ctrlKey||event.metaKey||!canInteract())return;if(event.key==='Enter'||event.key===' '){event.preventDefault();event.stopPropagation();if(event.key==='Enter')openChat();else petCat();}});
    function hitsCat(event){
      if(!canInteract()||event.composedPath().some(node=>node===host||node?.hasAttribute?.('data-cat-chat-widget')||
        node?.matches?.('a,button,input,textarea,select,[contenteditable="true"]')||
        node?.matches?.('dialog,[role="dialog"],[aria-modal="true"]')&&!node?.matches?.('.study-magazine')&&!node?.querySelector?.('[data-article-scroll]')))return false;
      if(roomStage)return roomStage.hitCat(event.clientX,event.clientY);
      const r=canvas.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)return false;
      pointer.set((event.clientX-r.left)/r.width*2-1,1-(event.clientY-r.top)/r.height*2);ray.setFromCamera(pointer,camera);
      return ray.intersectObject(cat.root,true).some(hit=>{let node=hit.object;while(node){if(!node.visible)return false;node=node.parent;}return hit.object.isMesh;});
    }
    // The canvas itself is transparent to input. Only an actual mesh hit takes
    // the click; links, selection and wheel scrolling in its blank area work.
    listen(document,'pointerdown',event=>{
      contacts.add(event.pointerId);blockClick=null;
      if(contacts.size>1){catPress.cancel();press=null;return;}
      catPress.cancel();press=null;
      if(event.button===0&&event.isPrimary!==false&&canInteract()&&hitsCat(event)){
        press={id:event.pointerId,x:event.clientX,y:event.clientY};host.dataset.hover='true';catPress.begin(event);event.preventDefault();event.stopPropagation();
      }
    },{capture:true});
    listen(document,'pointerup',event=>{
      contacts.delete(event.pointerId);if(press?.id!==event.pointerId)return;
      const start=press;press=null;blockClick={x:event.clientX,y:event.clientY,at:performance.now()};
      if(Math.hypot(event.clientX-start.x,event.clientY-start.y)<=8&&canInteract()&&hitsCat(event))catPress.end(event);else catPress.cancel();
    },{capture:true});
    listen(document,'click',event=>{const hit=blockClick;blockClick=null;if(hit&&performance.now()-hit.at<700&&Math.hypot(event.clientX-hit.x,event.clientY-hit.y)<=8){event.preventDefault();event.stopPropagation();}},{capture:true});
    listen(document,'pointercancel',event=>{contacts.delete(event.pointerId);catPress.cancel();press=null;blockClick=null;},{capture:true});
    listen(document,'contextmenu',event=>{if(press&&hitsCat(event)){event.preventDefault();event.stopPropagation();}},{capture:true});
    listen(document,'pointermove',event=>{catPress.move(event);if(hidden||suspended||document.hidden)return;const r=(roomStage?host:canvas).getBoundingClientRect();
      const nearTools=event.clientX>=r.left&&event.clientX<=r.right&&event.clientY>=r.top&&event.clientY<=r.bottom;
      const hovered=roomStage?(nearTools||hitsCat(event)):nearTools;
      if(host.dataset.hover!==String(hovered))host.dataset.hover=String(hovered);
      if(engaged||reducedMotion||roomStage?.reducedMotion)return;gaze.active=hovered;
      if(gaze.active){
        gaze.x=roomStage?Math.max(-1,Math.min(1,(event.clientX-anchor.x)/Math.max(30,anchor.faceRadius))):(event.clientX-r.left)/r.width*2-1;
        gaze.y=roomStage?Math.max(-1,Math.min(1,(anchor.y-event.clientY)/Math.max(30,anchor.faceRadius))):1-(event.clientY-r.top)/r.height*2;
        lastPointer=performance.now();roomStage?.requestRender();
      }},{passive:true});

    function overlayPlacement(){
      host.dataset.room='false';
      for(const key of ['top','left','right'])host.style.removeProperty(key);
      host.style.setProperty(position==='left'?'left':'right','18px','important');
      host.style.setProperty('bottom',`calc(${bottom}px + env(safe-area-inset-bottom))`,'important');
    }
    function roomPlacement(){
      host.dataset.room='true';
      const x=Math.max(12,Math.min(innerWidth-162,anchor.x-75));
      const y=Math.max(12,Math.min(innerHeight-54,anchor.y+anchor.faceRadius+6));
      host.style.setProperty('left',`${x}px`,'important');host.style.setProperty('top',`${y}px`,'important');
      host.style.setProperty('right','auto','important');host.style.setProperty('bottom','auto','important');
    }
    style.textContent+=':host([data-room=true]){width:150px!important;height:42px!important}.tools{white-space:nowrap}';
    function applyLocation(state){cat.root.position.fromArray(state.position);cat.root.rotation.y=state.yaw;}
    function settleRoom(){
      if(!roomStage)return;
      savedRoom=director.safeLocation();director.restoreLocation(savedRoom);animator.reset();applyLocation(director.state);
    }
    function roomUpdate(seconds){
      if(!canInteract()||!roomStage)return false;
      const quietMotion=reducedMotion||roomStage.reducedMotion;
      if(quietMotion!==roomQuiet){
        roomQuiet=quietMotion;gaze.active=false;cat.fur?.setDetail(!quietMotion&&quality==='high');
        if(quietMotion&&!director.state.currentCommand&&director.state.stage==='holding'){
          animator.reset();animator.update(director.state,0,gaze);
        }
      }
      roomFrameTime+=Math.max(0,Math.min(.1,seconds));
      if(roomFrameTime<1/(quietMotion?15:mobile?24:30))return true;
      const dt=Math.min(.1,roomFrameTime);roomFrameTime=0;roomTime+=dt;
      const now=performance.now(),before=director.state;
      if(!quietMotion&&!engaged&&before.mode==='room'&&before.stage==='holding'&&!before.currentCommand&&roomTime>=nextWander){
        postponeWander();director.walkTo(wanderPoint());
      }
      const advance=!quietMotion||director.state.currentCommand||director.state.stage!=='holding'||now<interactionUntil?dt:0;
      const state=director.update(advance);applyLocation(state);
      if(!engaged&&now-lastPointer>2200)gaze.active=false;
      // Gaze stays limited; locomotion owns the body and head while moving.
      if(quietMotion)gaze.active=false;
      else if(engaged&&state.stage==='holding'&&state.mode!=='reading'){gaze.active=true;gaze.x=0;gaze.y=.08;}
      animator.update(state,advance,gaze);cat.root.updateWorldMatrix(true,true);
      head.localToWorld(point.set(0,.029,.069));point.project(roomStage.camera);
      const rect=roomStage.canvas.getBoundingClientRect();
      anchor.viewport=true;anchor.x=rect.left+(point.x+1)*rect.width/2;anchor.y=rect.top+(1-point.y)*rect.height/2;
      anchor.faceRadius=Math.max(12,Math.min(60,rect.height*.025));anchor.width=innerWidth;anchor.height=innerHeight;
      anchor.visible=state.visible&&point.z>=-1&&point.z<=1&&Math.abs(point.x)<=1&&Math.abs(point.y)<=1;anchor.moving=state.moving;
      roomPlacement();host.style.visibility=anchor.visible?'':'hidden';
      agent.updateScene(anchor,dt);
      return !quietMotion||Boolean(state.currentCommand)||state.stage!=='holding'||now<interactionUntil||agent.needsFrame;
    }
    function roomTap(event){
      if(!canInteract()||!roomStage)return false;
      const target=roomStage.pickDestination(event.clientX,event.clientY);if(!target)return false;
      agent.interruptManual();postponeWander();
      if(target.kind==='surface')actor.jumpTo(target.surface);else actor.walkTo(target.point);
      roomStage.requestRender();return true;
    }
    function setRoomStage(next){
      if(disposed||roomStage===next)return;
      cancelPress();stopFrames();
      if(roomStage)savedRoom=director.safeLocation();
      agent.interruptLifecycle();agent.clearSpeech();gaze.active=false;host.dataset.hover='false';
      const previousDetach=detachStage;detachStage=null;roomStage=null;previousDetach?.();
      if(next){
        roomStage=next;next.root.add(cat.root);
        director.restoreLocation(savedRoom||{position:[STUDY_SPAWN.x,0,STUDY_SPAWN.z],yaw:0,surface:'ground',posture:'standing'});
        agent.setAnchorElement(next.canvas);postponeWander();roomFrameTime=1;roomQuiet=null;applyLocation(director.state);
        animator.reset();animator.update(director.state,1/60,gaze);
        detachStage=next.setDriver({update:roomUpdate,onTap:roomTap,setActive(active){
          if(roomStage!==next||disposed)return;
          if(!active){agent.interruptLifecycle();settleRoom();}
          syncVisibility();
        }});
      }else{
        scene.add(cat.root);director.restoreLocation({position:[0,0,0],yaw:0,surface:'ground',posture:director.state.posture});
        applyLocation(director.state);animator.reset();animator.update(director.state,1/60,gaze);
        anchor.viewport=false;agent.setAnchorElement(canvas);overlayPlacement();width=height=0;cat.fur?.setDetail(!reducedMotion&&quality==='high');
      }
      syncVisibility();
    }
    function syncVisibility(){
      const unavailable=suspended||document.hidden||Boolean(roomStage&&!roomStage.active);
      host.dataset.compact=String(hidden);host.style.visibility=unavailable?'hidden':'';
      canvas.hidden=hidden||Boolean(roomStage);hide.textContent=hidden?labels.show:labels.hide;
      cat.root.visible=!hidden&&!unavailable;director.setVisible(cat.root.visible);director.setPaused(unavailable);
      if(hidden||unavailable){
        cancelPress();agent.interruptLifecycle();settleRoom();agent.closeChat();agent.clearSpeech();anchor.visible=false;agent.updateScene(anchor,0);stopFrames();
      }
      if(hidden||!roomStage)overlayPlacement();
      if(roomStage){roomStage.requestRender();}
      else if(!hidden&&!unavailable){size();start();}
    }
    function setHidden(value){if(disposed||hidden===Boolean(value))return;hidden=Boolean(value);syncVisibility();notify(onVisibilityChange,!hidden);}
    function setSuspended(value){if(disposed||suspended===Boolean(value))return;suspended=Boolean(value);syncVisibility();}
    function setReading(value){if(disposed||director.state.mode===(value?'reading':'room'))return;agent.interruptManual();postponeWander();roomStage?.requestRender();return director.setMode(value?'reading':'room');}
    function setReducedMotion(value){
      if(disposed||reducedMotion===Boolean(value))return;
      reducedMotion=Boolean(value);gaze.active=false;cat.fur?.setDetail(!reducedMotion&&quality==='high');
      if(reducedMotion&&!director.state.currentCommand){animator.reset();animator.update(director.state,0,gaze);}
      postponeWander();roomStage?.requestRender();
    }
    listen(hide,'click',()=>setHidden(!hidden));
    listen(document,'visibilitychange',syncVisibility);
    note.hidden=true;syncVisibility();
    return {openChat,setReading,setHidden,setSuspended,setReducedMotion,setRoomStage,destroy,
      get state(){return director.state;}};
  }catch(error){destroy();throw error;}
}
