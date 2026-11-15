// The agent selects semantic actions; RoomDirector remains the only owner of
// routes, poses, landing safety and animation timing. No render loop lives here.
const ACTIONS=new Set(['idle','look','sniff','tail','sit','lie','sleep','stretch','paw','groom','knead','meow','yawn','nuzzle','shake','alert','walk','trot','gallop','jump','sitUp','lieUp','turn','wink']);
const VALUES={action:ACTIONS,move:new Set(['chair','table','ground','user']),mode:new Set(['reading','room']),repeat:new Set(['last']),stop:new Set(['all']),site:new Set(['ceiling_on','ceiling_off','lamp_on','lamp_off','lamp_auto','curtains_open','curtains_close']),draft:new Set(['letter','comment'])};
const TERMINAL=new Set(['succeeded','blocked','cancelled','unknown']);
const MAX_RECEIPTS=128;

function validatePlan(plan){
  if(!plan||typeof plan!=='object'||typeof plan.planId!=='string'||!/^[\w.:-]{1,120}$/.test(plan.planId))throw new TypeError('动作计划编号无效');
  if(!Array.isArray(plan.steps)||!plan.steps.length||plan.steps.length>3)throw new TypeError('每次需要 1 到 3 个动作');
  const steps=plan.steps.map(step=>{
    if(!step||typeof step!=='object'||Array.isArray(step)||Object.keys(step).some(key=>key!=='kind'&&key!=='value'&&!(step.kind==='draft'&&key==='text'))||!Object.hasOwn(VALUES,step.kind)||!VALUES[step.kind].has(step.value))throw new TypeError('动作计划包含未开放的能力');
    if(step.kind==='draft'&&(typeof step.text!=='string'||!step.text.trim()||step.text.length>3000))throw new TypeError('草稿内容无效');
    return Object.freeze({kind:step.kind,value:step.value,...(step.kind==='draft'?{text:step.text}:{})});
  });
  return {planId:plan.planId,steps:Object.freeze(steps),signature:JSON.stringify(steps)};
}
const receipt=(index,step,status,reason)=>Object.freeze({index,kind:step.kind,value:step.value,status,...(reason?{reason}:{} )});
const notify=(callback,value)=>{try{callback?.(value);}catch{/* UI callbacks cannot replay a completed action. */}};

export function createActionBridge({getDirector,getAnimator,website,onDiscovery=()=>{},onManualState=()=>{},timeoutMs=90000}){
  if(typeof getDirector!=='function'||typeof getAnimator!=='function')throw new TypeError('缺少小猫控制接口');
  if(!Number.isFinite(timeoutMs)||timeoutMs<=0||timeoutMs>90000)throw new RangeError('动作等待上限应在 90 秒以内');
  const receipts=new Map();
  let active=null,lastAction=null,disposed=false;

  function getState(){
    const director=getDirector(),s=director?.state;
    if(!s||director.destroyed)return {available:false,visible:false,paused:true,mode:'room',motion:'idle',position:[0,0,0],surface:'ground',support:null};
    return {available:true,position:Array.from(s.position||[]),yaw:s.yaw,motion:s.motion,stage:s.stage,phase:s.phase,posture:s.posture,
      surface:s.surface,support:s.support,mode:s.mode,visible:s.visible,paused:s.paused,moving:s.moving,currentCommand:s.currentCommand};
  }
  function isCurrent(task){return !disposed&&active===task&&!task.cancelled;}
  function cancelActive(reason){
    const task=active;if(!task)return false;
    active=null;task.cancelled=true;task.reason=reason;task.cancel();return true;
  }
  function safeRest(){
    const director=getDirector();
    if(!director||director.destroyed)return Promise.resolve({status:'blocked',reason:'小灰还没有准备好'});
    // A system pose can replace pending work without unpausing or unhiding.
    // RoomDirector waits for a leap/posture transition to finish before the
    // rest pose begins, so stopping in flight never freezes the cat in midair.
    try{
      const id=director.state.mode==='reading'?director.readingPose():'idle';
      return Promise.resolve(director.requestPose(id,{system:true})).catch(()=>({status:'unknown',reason:'停止结果暂时无法确认'}));
    }catch{return Promise.resolve({status:'unknown',reason:'停止结果暂时无法确认'});}
  }
  function stop(){
    if(disposed)return Promise.resolve({status:'cancelled',reason:'动作连接已关闭'});
    cancelActive('动作已停止');notify(onManualState,{type:'stop'});return safeRest();
  }
  function interruptManual(){cancelActive('已改用手动操作');}
  function expression(){
    if(disposed||active)return false;
    const s=getState();
    if(!s.available||!s.visible||s.paused||s.mode!=='room'||s.currentCommand||!['idle','sitHold','lieHold'].includes(s.motion))return false;
    const animator=getAnimator();if(typeof animator?.wink!=='function')return false;
    animator.wink();return true;
  }
  function resolveStep(step){
    return step.kind==='repeat'?(lastAction?{...lastAction}:null):step;
  }
  function invoke(step,director){
    if(step.kind==='site'||step.kind==='draft'){
      const allowed=website?.getCapabilities?.()?.[step.kind==='site'?'site':'drafts']||[];
      if(!allowed.includes(step.value))return {status:'blocked',reason:'当前页面没有开放这项功能。'};
      return step.kind==='site'?website.execute(step.value):website.prepareDraft(step.value,step.text);
    }
    const s=director.state;
    if(step.kind==='stop'){
      const resting=safeRest();
      // Do not wait on an animation clock which the user has frozen. The
      // safe rest remains queued for resume, without claiming it has landed.
      return !s.visible||s.paused?{status:'blocked',reason:'后续动作已取消；恢复活动后，小灰会安全停稳。'}:resting;
    }
    if(!s.visible||s.paused)return {status:'blocked',reason:!s.visible?'请先唤回小灰，再让我做动作。':'小灰已暂停，请先恢复活动。'};
    if(step.kind==='mode')return director.setMode(step.value)||{status:'succeeded'};
    if(step.kind==='move')return step.value==='user'?(director.approachUser?director.approachUser():director.walkTo({x:.03,z:1.02})):director.jumpTo(step.value);
    if(step.value==='wink'){
      if(s.mode==='reading'||s.motion==='sleep')return {status:'blocked',reason:'小灰正在安静休息，醒着时再眨眼吧。'};
      const animator=getAnimator();
      if(!animator?.wink)return {status:'blocked',reason:'眨眼暂时不可用'};
      animator.wink();return {status:'succeeded'};
    }
    return director.play(step.value);
  }
  function discover(step,before){
    if(step.kind==='action'){
      const egg={groom:'first-groom',sleep:'sleepy-company',jump:'little-leap'}[step.value];if(egg)notify(onDiscovery,egg);
    }else if(step.kind==='move'&&step.value!=='user'&&before.surface!==step.value)notify(onDiscovery,'little-leap');
    else if(step.kind==='mode'&&step.value==='reading'&&before.mode!=='reading')notify(onDiscovery,'sleepy-company');
  }
  async function run(task,onProgress){
    const results=[];
    const deadline=isCurrent(task)?setTimeout(()=>{
      if(!isCurrent(task))return;
      task.timedOut=true;cancelActive('这一步等待过久，结果暂时无法确认；已取消后续动作。');safeRest();
    },timeoutMs):null;
    try{
    for(let index=0;index<task.steps.length;index++){
      const requested=task.steps[index];
      if(!isCurrent(task))break;
      const step=resolveStep(requested),director=getDirector(),before=getState();
      notify(onProgress,{index,step:requested,status:'executing'});
      if(!isCurrent(task))break;
      let result;
      if(!step)result={status:'blocked',reason:'还没有可以重复的成功动作。'};
      else if((!director||director.destroyed)&&step.kind!=='site'&&step.kind!=='draft')result={status:'blocked',reason:'小灰还没有准备好'};
      else{
        try{task.inFlight=index;result=await Promise.race([Promise.resolve(invoke(step,director)),task.cancelledPromise]);}
        catch{result={status:'unknown',reason:'动作结果暂时无法确认，请看看小灰的实际状态。'};}
      }
      // A cancelled request may settle after a newer plan starts. It cannot
      // change lastAction, create discoveries or announce that it completed.
      if(!isCurrent(task))break;
      if(!result||!TERMINAL.has(result.status))result={status:'unknown',reason:'没有收到有效的动作结果'};
      const item=receipt(index,requested,result.status,result.reason);results.push(item);
      if(result.status==='succeeded'){
        if(step.kind==='action'||step.kind==='move')lastAction=Object.freeze({...step});
        discover(step,before);
      }
      notify(onProgress,{index,step:requested,status:item.status,...(item.reason?{reason:item.reason}:{})});
      if(item.status!=='succeeded')break;
    }
    for(let index=results.length;index<task.steps.length;index++){
      const status=task.timedOut&&index===task.inFlight?'unknown':'cancelled';
      const item=receipt(index,task.steps[index],status,task.reason||'前一步未完成，后续动作没有执行');
      results.push(item);
      // Cancellation is returned to the caller, but a superseded plan must
      // not overwrite the progress display owned by a newer/manual action.
      if(isCurrent(task))notify(onProgress,{index,step:task.steps[index],status:item.status,reason:item.reason});
    }
    return Object.freeze(results);
    }finally{
      if(deadline!==null)clearTimeout(deadline);
      if(active===task)active=null;
    }
  }
  function execute(plan,{signal,onProgress}={}){
    let checked;
    try{
      checked=validatePlan(plan);
      const prior=receipts.get(checked.planId);
      if(prior){
        if(prior.signature!==checked.signature)throw new TypeError('同一动作编号不能更改内容');
        return prior.promise;
      }
      if(disposed)throw new Error('动作连接已关闭');
      if(receipts.size>=MAX_RECEIPTS)throw new Error('本次会话动作记录已满，请新建会话后继续。');
    }catch(error){return Promise.reject(error);}
    let cancel;
    const cancelledPromise=new Promise(resolve=>{cancel=resolve;});
    const task={...checked,cancelled:false,reason:'',cancelledPromise,cancel};
    if(signal?.aborted){task.cancelled=true;task.reason='动作已取消';task.cancel();}
    else{
      if(cancelActive('已改为新的动作指令'))safeRest();
      active=task;notify(onManualState,{type:'agent'});
    }
    const abort=()=>{if(active===task)cancelActive('动作已取消');};
    signal?.addEventListener('abort',abort,{once:true});
    // Defer execution until its deduplication record is installed. Two calls
    // within the same event turn must never launch the same motion twice.
    task.promise=Promise.resolve().then(()=>run(task,onProgress)).finally(()=>signal?.removeEventListener('abort',abort));
    receipts.set(task.planId,task);
    return task.promise;
  }
  function dispose(){
    if(disposed)return;
    if(cancelActive('动作连接已关闭'))safeRest();
    disposed=true;lastAction=null;receipts.clear();
  }
  return {getState,getCapabilities:()=>({actions:[...ACTIONS],moves:[...VALUES.move],modes:[...VALUES.mode],repeat:true,...(website?.getCapabilities?.()||{})}),get lastAction(){return lastAction?{...lastAction}:null;},execute,stop,interruptManual,expression,dispose};
}
