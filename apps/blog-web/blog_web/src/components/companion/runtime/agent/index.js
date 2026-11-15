import {createActionBridge} from './action-bridge.js';
import {createAgentTransport,sceneSnapshot} from './transport.js';
import {createChatWidget} from './chat-widget.js';

const preference='storybook-tabby:v1:agent-enabled';
const labels={idle:'站好',look:'看看你',sniff:'嗅闻',tail:'摆尾巴',sit:'坐下',lie:'趴下',sleep:'打盹',stretch:'伸懒腰',paw:'伸爪',groom:'洗脸',knead:'踩奶',meow:'喵一声',yawn:'打哈欠',nuzzle:'蹭蹭',shake:'抖抖脑袋',alert:'竖尾',walk:'走一走',trot:'小跑',gallop:'奔跑',jump:'跳跃',sitUp:'起身',lieUp:'起身',turn:'转身',wink:'眨眼',chair:'上椅子',table:'上桌',ground:'回地面',user:'走近你',reading:'安静陪读',room:'恢复自由陪伴',last:'再来一次',all:'停下'};
const stopCommand=/^(?:小灰[，,、\s]*)?(?:停|停下|停一下|停止|停止动作|别动了|stop)[。！!\s]*$/i;
Object.assign(labels,{ceiling_on:'打开顶灯',ceiling_off:'关闭顶灯',lamp_on:'打开台灯',lamp_off:'关闭台灯',lamp_auto:'台灯自动',curtains_open:'拉开窗帘',curtains_close:'合上窗帘',letter:'准备留言草稿',comment:'准备评论草稿'});

export function createCompanionAgent({anchorElement,uiRoot,apiBase='/api/agent',transport=createAgentTransport({apiBase}),bridgeFactory,website,
  preferenceKey=preference,getDirector,getAnimator,onDiscovery=()=>{},onBeforeAction=()=>{},onEngagementChange=()=>{},onChatOpenChange=()=>{},onLocalCommand=()=>{}}){
  const agentRequest=transport.request,streamChat=transport.streamChat;
  let enabled=true;try{enabled=localStorage.getItem(preferenceKey)!=='false';}catch{}
  let disposed=false,sessionId=null,sessionPromise=null,sessionEpoch=0,active=null,serial=0,connection=null;
  const makeBridge=()=>bridgeFactory?bridgeFactory():createActionBridge({getDirector,getAnimator,website,onDiscovery,onManualState:onBeforeAction});
  let bridge=makeBridge();
  let inputFocused=false,speech=null;
  const panel=createChatWidget({anchorElement,root:uiRoot,onSend:send,onStopReply:stopReply,onStopActions:stopActions,onClear:clear,onToggle:toggle,onLayoutChange:layout=>onChatOpenChange(Boolean(layout.open)),
    onEngagementChange:value=>{inputFocused=value;engagement();}});
  speech=panel.speech;
  panel.setEnabled(enabled);
  const contextKey=context=>context?.article?`${context.article.locale}/${context.article.slug}`:'';
  let articleKey=contextKey(website?.getContext?.());
  const unsubscribeContext=website?.subscribeContext?.(()=>{
    const next=contextKey(website.getContext());
    if(next===articleKey)return;
    articleKey=next;
    // A late answer or draft must not attach itself to a different article.
    if(active)cancelActive({stopMovement:active.phase==='executing',message:'文章已切换，这次请求先停在这里。'});
  });
  function engagement(){const value=inputFocused||!!active;speech?.setEngaged(value);onEngagementChange(value);}

  async function refreshConnection(){
    try{
      const value=await agentRequest('status');if(disposed)return;
      connection=value;panel.setConnection(value);return value;
    }catch{
      const value={configured:false,message:'聊天暂未连接，仍可摸摸小灰或发送动作口令。'};
      if(!disposed){connection=value;panel.setConnection(value);}return value;
    }
  }
  const ready=refreshConnection();
  function isCurrent(turn){return !disposed&&active===turn&&!turn.controller.signal.aborted;}
  function fireRequest(path,body){agentRequest(path,body).catch(()=>{});}
  function cancelServer(turn){if(turn?.sessionId)fireRequest('cancel',{sessionId:turn.sessionId,turnId:turn.id});}
  function invalidateSession(turn){
    // A late error from an older turn must not discard a newer session.
    if(!turn.sessionId||turn.sessionId!==sessionId||turn.sessionEpoch!==sessionEpoch)return;
    sessionId=null;sessionPromise=null;sessionEpoch++;
  }
  async function ensureSession(){
    if(sessionId)return sessionId;
    if(!sessionPromise){
      const epoch=sessionEpoch;
      sessionPromise=agentRequest('sessions',{}).then(result=>{
        if(disposed||epoch!==sessionEpoch){fireRequest('clear',{sessionId:result.sessionId});throw new Error('会话已关闭');}
        sessionId=result.sessionId;return sessionId;
      }).finally(()=>{if(epoch===sessionEpoch)sessionPromise=null;});
    }
    return sessionPromise;
  }
  function cancelActive({stopMovement=false,message='已停止这次请求。'}={}){
    const turn=active;active=null;serial++;
    if(stopMovement&&turn?.phase==='executing')bridge.stop();else bridge.interruptManual();
    if(turn){
      turn.controller.abort();cancelServer(turn);
      if(!turn.text)panel.setMessage(turn.messageId,message);
    }
    panel.setBusy(false);panel.setPhase('idle');panel.showRetry(null);speech?.clear();engagement();
    return turn;
  }
  function interruptManual(){
    if(disposed)return;
    if(active){cancelActive({message:'你直接操作了小灰，已取消这次请求。'});panel.setStatus('已交给你直接控制');}
    else {serial++;bridge.interruptManual();}
  }
  function interruptLifecycle(){
    if(disposed)return;
    speech?.clear();
    if(active){const moving=active.phase==='executing';cancelActive({stopMovement:moving,message:'活动暂时暂停，已取消后续安排。'});panel.setStatus('活动暂时暂停');}
    else {serial++;bridge.interruptManual();}
  }
  async function stopActions(){
    if(disposed)return;
    const state=bridge.getState();cancelActive({message:'已取消后续动作。'});
    const token=serial;
    panel.setStatus(state?.paused||!state?.visible?'后续动作已取消，恢复活动后会安全停稳':state?.stage==='flight'?'会先安全落地，再停下':'正在停下');
    try{
      const pending=bridge.stop();
      if(state?.paused||!state?.visible)return;
      const result=await pending;
      if(!disposed&&token===serial){panel.setStatus(result?.status==='succeeded'?'动作已停止':'后续动作已取消');speech?.show(result?.status==='succeeded'?'好，停下啦。':'后面的动作先不做了。');}
    }catch{if(!disposed&&token===serial)panel.setStatus('后续动作已取消');}
  }
  function stopReply(){
    if(disposed||!active)return;
    if(active.phase==='executing'){
      active.suppressReply=true;speech?.clear();panel.setStatus('文字已停止，动作继续；可点“停一下”');return;
    }
    cancelActive({message:'已停止回复。'});panel.setStatus('回复已停止');
  }
  async function send(raw,{retry=false}={}){
    const text=String(raw||'').trim();if(disposed||!text)return;
    panel.setOpen(true,{focus:false});
    if(text.length>2000){panel.setStatus('这条消息有点长，请分成几段。','error');return;}
    if(stopCommand.test(text)){
      panel.addMessage('user',text);await stopActions();return;
    }
    if(!enabled||onLocalCommand(text,{probe:true})===true){
      if(active)cancelActive({stopMovement:active.phase==='executing',message:'已换成你的新口令。'});
      panel.addMessage('user',text);
      try{
        const token=++serial,pending=onLocalCommand(text);
        panel.setStatus('口令已交给小灰');
        const result=await pending;if(disposed||token!==serial)return;
        const message=result?.status==='blocked'?result.reason:result?.status==='succeeded'?(result.message||'口令动作已完成。'):result?.status==='cancelled'?'这次口令已取消。':(result?.reason||'结果暂时无法确认。');
        panel.addMessage('system',message);panel.setStatus(message);speech?.show(message);engagement();
      }
      catch{panel.setStatus('这条口令暂时无法执行，可以轻点摸摸小灰。','error');}
      return;
    }
    if(active)cancelActive({stopMovement:active.phase==='executing',message:'已换成你的新指令。'});
    if(!retry)panel.addMessage('user',text);
    panel.showRetry(null);
    const turn={id:crypto.randomUUID(),controller:new AbortController(),messageId:panel.addMessage('assistant',''),text:'',phase:'thinking',sessionId:null,sessionEpoch:null,recovered:false,plan:null,suppressReply:false,context:website?.getContext?.()};
    active=turn;serial++;panel.setBusy(true);panel.setPhase('thinking');panel.setStatus('小灰正在听…');speech?.show('',{pending:true});engagement();
    try{
      await ready;if(!isCurrent(turn))return;
      if(!connection?.configured){await refreshConnection();if(!isCurrent(turn))return;}
      if(!connection?.configured)throw new Error(connection?.message||'聊天暂未连接，仍可摸摸小灰或发送动作口令。');
      for(;;){
        turn.sessionEpoch=sessionEpoch;
        turn.sessionId=await ensureSession();if(!isCurrent(turn))return;
        try{
          await streamChat({sessionId:turn.sessionId,turnId:turn.id,message:text,state:sceneSnapshot(bridge.getState()),lastAction:bridge.lastAction||null,
            ...(bridge.getCapabilities?{capabilities:bridge.getCapabilities()}: {}),...(turn.context?{context:turn.context}:{})},event=>{
            if(!isCurrent(turn))return;
            if((event.type==='text'||event.type==='plan')&&!connection.connected){connection={...connection,connected:true,message:''};panel.setConnection(connection);}
            if(event.type==='text'&&typeof event.delta==='string'){
              turn.text+=event.delta;panel.appendText(turn.messageId,event.delta);speech?.updateText(turn.text);panel.setStatus('小灰在回应你');
            }else if(event.type==='context'&&event.article){
              panel.setSource?.(turn.messageId,event.article);
            }else if(event.type==='plan'){
              if(turn.plan)throw new Error('这次动作安排不明确，请重新说一下。');
              turn.plan={planId:event.planId,steps:event.steps};
            }
          },{signal:turn.controller.signal});
          break;
        }catch(error){
          if(error?.code!=='SESSION_EXPIRED')throw error;
          invalidateSession(turn);
          if(!isCurrent(turn))return;
          // Only the pre-action chat can restart, once, under the same UI turn.
          if(turn.recovered||turn.plan||turn.phase!=='thinking')throw error;
          turn.recovered=true;turn.sessionId=null;turn.text='';
          panel.setMessage(turn.messageId,'');
          panel.addMessage('system','对话已过期，上下文已重置。');
          panel.setStatus('正在重新连接…');speech?.clear();speech?.show('',{pending:true});
        }
      }
      if(!isCurrent(turn))return;
      speech?.finish();
      if(turn.plan){
        turn.phase='executing';panel.setPhase('executing');onBeforeAction();
        if(!turn.text){turn.text='我来试试。';panel.setMessage(turn.messageId,turn.text);speech?.show(turn.text);}
        const results=await bridge.execute(turn.plan,{signal:turn.controller.signal,onProgress:event=>{
          if(isCurrent(turn))panel.setStatus(`第 ${event.index+1}/${turn.plan.steps.length} 步：${labels[event.step.value]||'动作'}${event.status==='succeeded'?' · 已完成':''}`);
        }});
        if(!isCurrent(turn))return;
        turn.phase='reporting';panel.setPhase('reporting');
        const result=await agentRequest('result',{sessionId:turn.sessionId,turnId:turn.id,planId:turn.plan.planId,results,state:sceneSnapshot(bridge.getState())},{signal:turn.controller.signal});
        if(!isCurrent(turn))return;
        if(result.reply&&!turn.suppressReply){panel.addMessage('assistant',result.reply);speech?.show(result.reply);}
        panel.setStatus(results.every(r=>r.status==='succeeded')?'安排已完成':'这次安排未全部完成');
      }else{
        if(!turn.text){const message='这次没有收到完整回复，请再说一次。';panel.setMessage(turn.messageId,message);speech?.show(message);}
        else bridge.expression();
        panel.setStatus('小灰在这里');
      }
    }catch(error){
      if(error?.code==='SESSION_EXPIRED')invalidateSession(turn);
      if(!isCurrent(turn))return;
      speech?.clear();
      cancelServer(turn);
      const message=error?.code==='SESSION_EXPIRED'?'对话已过期，上下文已重置，请发送新消息。':error?.name==='TypeError'?'聊天连接暂时中断，请稍后重试。':error?.message||'连接暂时中断，请稍后重试。';
      if(!turn.plan){connection={...connection,connected:false,message};panel.setConnection(connection);}
      if(!turn.text)panel.setMessage(turn.messageId,message);else panel.addMessage('assistant',message);
      panel.setStatus(turn.plan?'动作结果未确认，请查看小灰当前状态。':'这次回复没有完成','error');
      // A received plan may already have moved the cat. Never replay it on retry.
      panel.showRetry(turn.plan?null:()=>send(text,{retry:true}));
    }finally{
      if(active===turn){active=null;panel.setBusy(false);panel.setPhase('idle');engagement();}
    }
  }
  function clear(){
    if(disposed)return;
    cancelActive({stopMovement:true});
    if(sessionId)fireRequest('clear',{sessionId});
    sessionId=null;sessionPromise=null;sessionEpoch++;bridge.dispose();bridge=makeBridge();
    panel.setStatus(enabled?'新对话开始了':'聊天已关闭');
  }
  function toggle(value){
    if(disposed)return;enabled=Boolean(value);
    try{localStorage.setItem(preferenceKey,String(enabled));}catch{}
    if(!enabled)cancelActive({stopMovement:true,message:'聊天已关闭。'});
    panel.setEnabled(enabled);panel.setStatus(enabled?'小灰在这里':'聊天已关闭，仍然可以摸摸小灰。');
  }
  function destroy(){
    if(disposed)return;
    cancelActive();disposed=true;sessionEpoch++;
    if(sessionId)fireRequest('clear',{sessionId});
    sessionId=null;sessionPromise=null;
    unsubscribeContext?.();bridge.dispose();panel.destroy();onEngagementChange(false);onChatOpenChange(false);
  }
  let lastTouch=-Infinity;
  function reactToTouch({count=1,quiet=false}={}){
    if(disposed||active||quiet)return;
    const state=bridge.getState(),now=performance.now();
    if(state?.mode==='reading'||state?.motion==='sleep'||state?.paused||state?.visible===false||now-lastTouch<1100)return;
    if(speech?.visible&&speech.kind!=='touch')return;
    lastTouch=now;
    const lines=['嗯～','呼噜……','再摸一下嘛。','借你一只爪。'];
    speech?.show(lines[Math.max(0,Math.min(lines.length-1,count-1))],{kind:'touch',durationMs:2800});
  }
  return {send,stopActions,stopReply,interruptManual,interruptLifecycle,destroy,reactToTouch,
    setAnchorElement(element){panel.setAnchorElement(element);},
    updateScene(anchor,dt){panel.updateAnchor(anchor,dt);},clearSpeech(){speech?.clear();},
    openChat(){panel.setOpen(true,{focus:true});},closeChat(){panel.close();},
    get enabled(){return enabled;},get busy(){return !!active;},get executing(){return active?.phase==='executing';},get needsFrame(){return !!active||!!speech?.visible;}};
}
