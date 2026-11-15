import {createChatPanel} from './chat-panel.js';
import {createSpeechBubble} from './speech-bubble.js';

// Owns all conversation DOM and styles. The host only supplies a cat anchor;
// it does not provide a footer, sidebar, transcript or page-specific selectors.
export function createChatWidget({anchorElement=null,root=document.body,zIndex=1200,...callbacks}={}){
  const host=document.createElement('div');host.dataset.catChatWidget='';
  for(const [key,value] of Object.entries({all:'initial',position:'fixed',inset:'0',width:'100%',height:'100%',display:'block','pointer-events':'none','z-index':String(zIndex),contain:'layout style'}))host.style.setProperty(key,value,'important');
  const shadow=host.attachShadow({mode:'open'}),style=document.createElement('style'),link=document.createElement('link');
  link.rel='stylesheet';link.href='/companion/v1/chat-panel.css';
  style.textContent=`
    :host{color-scheme:light}*{box-sizing:border-box}button,input,textarea{font:inherit}button{cursor:pointer}button:focus-visible{outline:2px solid #617752;outline-offset:3px}
    [hidden]{display:none!important}.surface{position:absolute;inset:0;pointer-events:none;font:14px/1.5 "Microsoft YaHei UI","PingFang SC",system-ui,sans-serif;color:#3e3b33;--ink:#3e3b33;--line:#ded8c9}
    .window{position:absolute;width:420px;max-width:calc(100vw - 24px);max-height:calc(100dvh - 24px);overflow:auto;overscroll-behavior:contain;pointer-events:none;background:none;border:0;border-radius:24px;scrollbar-width:thin}
    .speech-layer{position:absolute;inset:0;pointer-events:none}.speech-dock{position:absolute;right:16px;bottom:16px;pointer-events:none}
    .cat-speech{position:absolute;pointer-events:auto;width:250px;max-width:calc(100vw - 28px);z-index:1;padding:14px 28px 14px 16px;background:#fffdf5f2;border:1px solid #ded9c5a0;border-radius:19px 19px 19px 6px;box-shadow:0 5px 22px #423d2412;color:#454939;line-height:1.7;font-size:14px;overflow-wrap:anywhere;backdrop-filter:blur(10px)}
    .cat-speech__header{position:absolute;right:6px;top:5px;color:#7b806d;font-size:11px;line-height:1.2}.cat-speech__header span{display:none}.cat-speech button{background:none;border:0;color:inherit}.cat-speech__header button{font:17px/1 sans-serif;padding:0;min-width:24px;min-height:24px}.cat-speech__text{margin:0;white-space:pre-wrap}.cat-speech__more{padding:6px 0 0;color:#536b4d!important;font-size:12px;text-decoration:underline;text-underline-offset:3px}
    .cat-speech[data-kind=touch]{width:150px;text-align:center;font-size:15px;padding:12px 26px 12px 14px}
    .cat-speech[data-mode=dock]{position:relative;left:auto!important;top:auto!important}.cat-speech[data-streaming=true] .cat-speech__header span:after{content:' ···'}
    @media(prefers-reduced-motion:reduce){*{animation:none!important;scroll-behavior:auto!important}}
  `;
  const surface=document.createElement('div');surface.className='surface';
  const windowNode=document.createElement('section');windowNode.className='window';windowNode.hidden=true;windowNode.setAttribute('role','dialog');windowNode.setAttribute('aria-label','和小灰聊天');
  const speechLayer=document.createElement('div');speechLayer.className='speech-layer';
  const dock=document.createElement('div');dock.className='speech-dock';dock.hidden=true;
  surface.append(speechLayer,dock,windowNode);shadow.append(link,style,surface);root.append(host);
  let disposed=false,opened=false,rect=null,local=null,dt=0;
  const anchor={x:innerWidth-120,y:innerHeight-140,faceRadius:50,visible:true,moving:false,width:innerWidth,height:innerHeight};
  const composerRect={left:0,right:0,top:0,bottom:0},avoidance=[composerRect],noAvoidance=[];
  const cleanups=[],clamp=(v,min,max)=>Math.max(min,Math.min(v,Math.max(min,max)));
  const listen=(node,event,fn,options)=>{node.addEventListener(event,fn,options);cleanups.push(()=>node.removeEventListener(event,fn,options));};
  function bounds(){const v=window.visualViewport;return {left:v?.offsetLeft||0,top:v?.offsetTop||0,width:v?.width||innerWidth,height:v?.height||innerHeight};}
  function placeWindow(){
    if(!opened)return;const b=bounds(),w=windowNode.offsetWidth,h=windowNode.offsetHeight;
    // A stable viewport composer keeps typing independent of the cat's motion
    // and the embedding page's layout. History expands upwards from this edge.
    windowNode.style.maxHeight=Math.max(100,b.height-32)+'px';
    composerRect.left=b.left+(b.width-w)*.5;composerRect.top=Math.max(b.top+12,b.top+b.height-h-20);
    composerRect.right=composerRect.left+w;composerRect.bottom=composerRect.top+h;
    windowNode.style.left=composerRect.left+'px';windowNode.style.top=composerRect.top+'px';
  }
  const panel=createChatPanel({container:windowNode,...callbacks,onLayoutChange:layout=>{
    const wasOpen=opened;opened=layout.open;windowNode.hidden=!opened;
    placeWindow();if(wasOpen&&!opened&&anchor.visible)anchorElement?.focus({preventScroll:true});callbacks.onLayoutChange?.(layout);
  }});
  const speech=createSpeechBubble({container:speechLayer,dock,onRead:()=>panel.openHistory()});
  function placeDock(){
    const b=bounds();
    dock.style.left=clamp(anchor.x-125,b.left+12,b.left+b.width-262)+'px';dock.style.right='auto';
    dock.style.bottom='auto';dock.style.top=clamp(anchor.y-anchor.faceRadius-150,b.top+12,b.top+b.height-160)+'px';
  }
  function project(){
    // A host can reflow without resizing the canvas (e.g. an article image
    // loads above it). Read the anchor before our own position writes.
    if(anchorElement)rect=anchorElement.getBoundingClientRect();
    const b=bounds();anchor.width=b.left+b.width;anchor.height=b.top+b.height;
    if(local){anchor.x=(local.viewport?0:rect?.left||0)+local.x;anchor.y=(local.viewport?0:rect?.top||0)+local.y;anchor.faceRadius=local.faceRadius||35;anchor.moving=!!local.moving;
      anchor.visible=local.visible!==false&&anchor.x>=b.left&&anchor.x<=b.left+b.width&&anchor.y>=b.top&&anchor.y<=b.top+b.height;
    }
    placeDock();anchor.avoidRects=opened?avoidance:noAvoidance;speech.update(anchor,dt);
  }
  function geometryChanged(){if(disposed)return;rect=anchorElement?.getBoundingClientRect()||null;project();placeWindow();}
  const observer=new ResizeObserver(geometryChanged);if(anchorElement)observer.observe(anchorElement);
  const windowObserver=new ResizeObserver(placeWindow);windowObserver.observe(windowNode);
  const resized=()=>{geometryChanged();placeWindow();};
  listen(window,'resize',resized);listen(window,'scroll',geometryChanged,{capture:true,passive:true});
  if(window.visualViewport){listen(window.visualViewport,'resize',resized);listen(window.visualViewport,'scroll',geometryChanged);}
  geometryChanged();
  return {...panel,speech,host,get expanded(){return panel.expanded;},get inputFocused(){return panel.inputFocused;},get historyOpened(){return panel.historyOpened;},
    setAnchorElement(element){if(disposed||element===anchorElement)return;if(anchorElement)observer.unobserve(anchorElement);anchorElement=element;if(element)observer.observe(element);geometryChanged();},
    updateAnchor(value,seconds=0){if(disposed)return;local=value;dt=seconds;project();},
    destroy(){if(disposed)return;disposed=true;panel.destroy();speech.destroy();observer.disconnect();windowObserver.disconnect();cleanups.forEach(fn=>fn());host.remove();}};
}
