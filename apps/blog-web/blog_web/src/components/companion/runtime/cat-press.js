// Shared tap/hold recognition. Hosts retain ownership of mesh hit-testing,
// camera gestures and page input, so this helper never captures a pointer.
export function createCatPress({onTap=()=>{},onHold=()=>{},holdMs=550,slop=8}={}){
  let press=null,timer=null,disposed=false;
  function clearTimer(){if(timer!==null){clearTimeout(timer);timer=null;}}
  function cancel(){clearTimer();press=null;}
  function begin(event){
    if(disposed)return;
    if(press){cancel();return;}
    if(event.button!==0||event.isPrimary===false)return;
    press={id:event.pointerId,x:event.clientX,y:event.clientY,held:false,cancelled:false,event};
    const candidate=press;
    timer=setTimeout(()=>{
      timer=null;if(disposed||press!==candidate||candidate.cancelled)return;
      candidate.held=true;onHold(candidate.event);
    },holdMs);
  }
  function move(event){
    if(!press||event.pointerId!==press.id)return;
    if(Math.hypot(event.clientX-press.x,event.clientY-press.y)>slop){press.cancelled=true;clearTimer();}
  }
  function end(event){
    if(!press||event.pointerId!==press.id)return;
    move(event);const candidate=press;cancel();
    if(!candidate.held&&!candidate.cancelled&&!disposed)onTap(event);
  }
  return {begin,move,end,cancel,destroy(){cancel();disposed=true;}};
}
