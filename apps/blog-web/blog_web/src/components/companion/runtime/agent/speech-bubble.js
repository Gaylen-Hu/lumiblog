// Text lives in the conversation log. This is only its short, spatial preview.
// Reuses the room's animation clock; no second render loop or network request.
export function createSpeechBubble({container,dock,onRead=()=>{},lifetimeMs=8000}){
  const root=document.createElement('div');root.className='cat-speech';root.hidden=true;
  const header=document.createElement('div');header.className='cat-speech__header';
  const name=document.createElement('span');name.textContent='小灰';
  const close=document.createElement('button');close.type='button';close.textContent='×';close.setAttribute('aria-label','收起这条气泡');
  header.append(name,close);
  const text=document.createElement('p');text.className='cat-speech__text';
  const more=document.createElement('button');more.type='button';more.className='cat-speech__more';more.textContent='查看全文';more.hidden=true;
  root.append(header,text,more);container.append(root);
  // The fixed transcript is the live region; do not announce every stream twice.
  root.setAttribute('aria-label','小灰的回复');
  let value='',streaming=false,dismissed=false,destroyed=false,hovered=false,focused=false,engaged=false,kind='reply';
  let timer=null,deadline=0,remaining=lifetimeMs,dirty=true,w=240,h=100,settled=0,previewLimit=68;
  let px=NaN,py=NaN,side='',lastX='',lastY='';
  const cleanups=[];
  const listen=(node,event,fn)=>{node.addEventListener(event,fn);cleanups.push(()=>node.removeEventListener(event,fn));};
  const observer=new ResizeObserver(()=>{dirty=true;});observer.observe(root);
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const clamp=(v,a,b)=>Math.max(a,Math.min(v,Math.max(a,b)));
  function stopTimer(){if(timer!==null){remaining=Math.max(0,deadline-performance.now());clearTimeout(timer);timer=null;}}
  function schedule(){
    stopTimer();if(destroyed||dismissed||root.hidden||streaming||hovered||focused||(engaged&&kind==='reply')||document.hidden)return;
    deadline=performance.now()+remaining;timer=setTimeout(()=>{timer=null;root.hidden=true;dock.hidden=true;},remaining);
  }
  function refresh(){
    const chars=Array.from(value.trim());
    text.textContent=chars.length?chars.slice(0,previewLimit).join('')+(chars.length>previewLimit?'…':''):'嗯，我在听。';
    more.hidden=chars.length<=previewLimit;root.dataset.streaming=String(streaming);dirty=true;
  }
  function show(next,{pending=false,kind:nextKind='reply',durationMs=lifetimeMs}={}){
    if(destroyed)return;stopTimer();value=String(next||'');streaming=pending;dismissed=false;kind=nextKind;remaining=durationMs;
    root.dataset.kind=kind;
    root.hidden=false;refresh();schedule();
  }
  function updateText(next){if(destroyed||dismissed)return;value=String(next||'');refresh();}
  function finish(){if(destroyed)return;streaming=false;remaining=lifetimeMs;refresh();schedule();}
  function clear(){stopTimer();value='';dismissed=true;root.hidden=true;dock.hidden=true;}
  function setEngaged(next){engaged=Boolean(next);schedule();}
  function mount(mode){
    dock.hidden=mode!=='dock';
    if(root.dataset.mode===mode)return;
    const destination=mode==='dock'?dock:container;destination.append(root);root.dataset.mode=mode;
    px=py=NaN;lastX=lastY='';dirty=true;
  }
  function update(anchor,dt=0){
    if(destroyed||!anchor)return;
    settled=anchor.moving?0:Math.min(1,settled+Math.max(0,dt));
    if(root.hidden)return;
    const width=anchor.width||container.clientWidth,height=anchor.height||container.clientHeight;
    if(!width||!height)return;
    const limit=width<=480?40:68;if(previewLimit!==limit){previewLimit=limit;refresh();}
    const maxWidth=Math.max(140,Math.min(250,width-28));
    if(root.style.maxWidth!==maxWidth+'px'){root.style.maxWidth=maxWidth+'px';dirty=true;}
    if(dirty){w=root.offsetWidth||maxWidth;h=root.offsetHeight||100;dirty=false;}
    const radius=Math.max(22,anchor.faceRadius||55),gap=18,pad=14,top=58;
    const right=anchor.x+radius+gap,left=anchor.x-radius-gap-w;
    const desiredY=clamp(anchor.y-h*.75,top,height-h-pad);
    const candidates=[
      {id:'right',x:right,y:desiredY},{id:'left',x:left,y:desiredY},
      {id:'above',x:clamp(anchor.x-w*.5,pad,width-w-pad),y:anchor.y-radius-gap-h},
      {id:'below',x:clamp(anchor.x-w*.5,pad,width-w-pad),y:anchor.y+radius+gap},
      {id:'upper-left',x:pad,y:top},{id:'upper-right',x:width-w-pad,y:top}
    ];
    const avoidsComposer=c=>(anchor.avoidRects||[]).every(r=>c.x+w+12<=r.left||c.x>=r.right+12||c.y+h+12<=r.top||c.y>=r.bottom+12);
    const safe=c=>c.x>=pad&&c.x+w<=width-pad&&c.y>=top&&c.y+h<=height-pad&&avoidsComposer(c)&&
      (c.x+w<=anchor.x-radius-gap||c.x>=anchor.x+radius+gap||c.y+h<=anchor.y-radius-gap||c.y>=anchor.y+radius+gap);
    const valid=candidates.filter(safe);
    const candidate=valid.find(c=>c.id===side)||valid[0];
    // During movement prefer a safe viewport corner, then a nearby clear space.
    if(!anchor.visible||anchor.moving||settled<.55||!candidate){mount('dock');
      const rail=anchor.visible?(valid.find(c=>c.id==='upper-left'||c.id==='upper-right')||candidate):null;
      if(rail){dock.style.left=rail.x+'px';dock.style.top=rail.y+'px';}
      else{const limit=Math.min(height,...(anchor.avoidRects||[]).map(r=>r.top-12));
        dock.style.left=clamp(anchor.x-w*.5,pad,width-w-pad)+'px';
        dock.style.top=clamp(anchor.y-radius-h-gap,top,Math.max(top,limit-h-pad))+'px';}
      return;}
    mount('floating');
    const changed=side!==candidate.id;side=candidate.id;
    const blend=reduced.matches?1:1-Math.exp(-Math.max(dt,.016)*12);
    px=!Number.isFinite(px)||changed?candidate.x:px+(candidate.x-px)*blend;
    py=!Number.isFinite(py)||changed?candidate.y:py+(candidate.y-py)*blend;
    // Moving across the face is worse than a small placement correction.
    if(!safe({x:px,y:py})){px=candidate.x;py=candidate.y;}
    const x=px.toFixed(1)+'px',y=py.toFixed(1)+'px';
    if(x!==lastX){root.style.left=x;lastX=x;}if(y!==lastY){root.style.top=y;lastY=y;}
  }
  listen(close,'click',clear);listen(more,'click',()=>{onRead();});
  listen(root,'pointerenter',()=>{hovered=true;schedule();});listen(root,'pointerleave',()=>{hovered=false;schedule();});
  listen(root,'focusin',()=>{focused=true;schedule();});listen(root,'focusout',event=>{focused=root.contains(event.relatedTarget);schedule();});
  listen(document,'visibilitychange',schedule);
  for(const event of ['pointerdown','pointerup','click','dblclick','wheel'])listen(root,event,e=>e.stopPropagation());
  return {show,updateText,finish,clear,setEngaged,update,get visible(){return !root.hidden;},get kind(){return kind;},
    destroy(){if(destroyed)return;destroyed=true;stopTimer();observer.disconnect();cleanups.forEach(fn=>fn());root.remove();dock.hidden=true;}};
}
