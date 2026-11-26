// The host owns requests, action receipts, speech bubbles and cat attention.
// This module keeps one portable composer with an optional conversation history.
let nextPanelId=0;
export function createChatPanel({container,historyContainer,onLayoutChange=()=>{},onEngagementChange=()=>{},onSend=()=>{},onStopReply=()=>{},onStopActions=()=>{},onClear=()=>{},onToggle=()=>{}}={}){
  if(!container?.append)throw new TypeError('Chat panel needs a container');
  const instance=++nextPanelId,messages=new Map(),cleanups=[];
  let sequence=0,enabled=true,busy=false,opened=false,historyOpen=false,destroyed=false,retryHandler=null;
  let composing=false,lastCompositionEnd=-Infinity,focused=false,unread=0,phase='idle',tone='neutral';
  let connection={configured:false,message:''};
  function element(tag,className,text){const node=document.createElement(tag);if(className)node.className=className;if(text!==undefined)node.textContent=text;return node;}
  function button(text,className){const node=element('button',className,text);node.type='button';return node;}
  function iconButton(label,className,paths){
    const node=button('',className);node.title=label;node.setAttribute('aria-label',label);
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
    for(const [name,value]of Object.entries({viewBox:'0 0 24 24',fill:'none',stroke:'currentColor','stroke-width':'1.6','stroke-linecap':'round','stroke-linejoin':'round','aria-hidden':'true',focusable:'false'}))svg.setAttribute(name,value);
    for(const d of paths){const path=document.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('d',d);svg.append(path);}
    node.append(svg);return node;
  }
  function listen(node,event,fn,options){node.addEventListener(event,fn,options);cleanups.push(()=>node.removeEventListener(event,fn,options));}
  function invoke(callback,...args){
    if(destroyed)return;
    try{const result=callback(...args);if(result&&typeof result.catch==='function')result.catch(()=>{if(!destroyed)setStatus('这次没有连上，可以再试一次。','error');});}
    catch{setStatus('这次没有连上，可以再试一次。','error');}
  }
  const root=element('section','cat-chat');root.setAttribute('aria-label','和小灰说话');root.hidden=true;
  const historyHost=historyContainer||root;
  const bar=element('div','cat-chat__bar'),toolbar=element('div','cat-chat__toolbar');
  const historyButton=iconButton('打开聊天记录','cat-chat__history-toggle',['M8 7h8M8 11h6','M7 19l-4 2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H7']);
  const badge=element('span','cat-chat__unread');badge.hidden=true;badge.setAttribute('aria-hidden','true');
  historyButton.append(badge);historyButton.setAttribute('aria-expanded','false');
  const foldButton=iconButton('收起聊天','cat-chat__fold',['M7 7l10 10M17 7 7 17']);toolbar.append(historyButton,foldButton);bar.append(toolbar);
  const panel=element('div','cat-chat__panel');panel.id=`cat-chat-panel-${instance}`;
  foldButton.setAttribute('aria-controls',panel.id);
  const notice=element('p','cat-chat__notice');notice.hidden=true;notice.setAttribute('role','status');
  const form=element('form','cat-chat__form'),inputLabel=element('label','cat-chat__input-label','对小灰说');
  const input=element('textarea','cat-chat__input');input.id=`cat-chat-input-${instance}`;inputLabel.htmlFor=input.id;
  input.rows=1;input.maxLength=2000;input.autocomplete='off';input.placeholder='和小灰说句话…';
  const sendButton=iconButton('发送','cat-chat__send',['M12 18V6M7 11l5-5 5 5']);sendButton.type='submit';
  const compose=element('div','cat-chat__compose');compose.append(input,sendButton,bar);
  const inputHelp=element('span','cat-chat__input-help cat-chat__sr-only','Enter 发送，Shift + Enter 换行，Escape 收起。');
  inputHelp.id=`cat-chat-help-${instance}`;input.setAttribute('aria-describedby',inputHelp.id);
  form.append(inputLabel,compose,inputHelp);panel.append(notice,form);
  const activity=element('div','cat-chat__activity'),status=element('span','cat-chat__status');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
  const activityControls=element('div','cat-chat__activity-controls'),retryButton=button('再试一次','cat-chat__retry');retryButton.hidden=true;
  const stopReply=button('停止回复','cat-chat__stop');stopReply.dataset.stop='reply';stopReply.title='停止文字回复';
  const stopActions=button('停一下','cat-chat__stop');stopActions.dataset.stop='actions';stopActions.title='取消后续动作；跳跃时会先安全落地';
  const announcement=element('span','cat-chat__announcement cat-chat__sr-only');announcement.setAttribute('role','status');announcement.setAttribute('aria-live','polite');announcement.setAttribute('aria-atomic','true');
  activityControls.append(retryButton,stopReply,stopActions);activity.append(status,activityControls);root.append(activity,panel,announcement);container.append(root);

  const history=element('section','cat-chat-history');history.id=`cat-chat-history-${instance}`;history.hidden=true;
  history.setAttribute('aria-label','聊天记录');historyButton.setAttribute('aria-controls',history.id);
  const historyHeader=element('div','cat-chat__history-header'),historyTitle=element('span','cat-chat__title','聊天记录');
  const historyControls=element('div','cat-chat__history-controls'),clearButton=button('新对话','cat-chat__clear');clearButton.title='清空聊天记录，重新开始';
  const historyClose=button('关闭','cat-chat__history-close');historyClose.setAttribute('aria-label','关闭聊天记录');historyControls.append(clearButton,historyClose);historyHeader.append(historyTitle,historyControls);
  const log=element('div','cat-chat__messages');log.setAttribute('role','log');log.setAttribute('aria-label','与小灰的对话');log.setAttribute('aria-live','polite');log.setAttribute('aria-relevant','additions');log.tabIndex=0;
  const empty=element('div','cat-chat__empty');empty.append(element('p','cat-chat__invitation','还没有聊过天。'),element('p','cat-chat__hint','和小灰聊聊今天，也可以叫它动一动。'));log.append(empty);
  const historyFooter=element('div','cat-chat__history-footer'),toggleLabel=element('label','cat-chat__toggle');
  const toggle=element('input');toggle.type='checkbox';toggle.checked=true;toggle.setAttribute('aria-label','开启聊天');toggleLabel.append(toggle,element('span',null,'开启聊天'));
  historyFooter.append(toggleLabel,element('span','cat-chat__history-note','仅保留本次对话'));history.append(historyHeader,log,historyFooter);
  if(historyContainer)historyHost.append(history);else root.insertBefore(history,activity);

  function fitInput(){input.style.height='auto';input.style.height=Math.min(76,Math.max(32,input.scrollHeight))+'px';}
  function activeElement(){return input.getRootNode().activeElement||document.activeElement;}
  function updateFocus(){
    if(destroyed)return;const value=opened&&form.contains(activeElement());
    if(value!==focused){focused=value;invoke(onEngagementChange,value);}
  }
  function updateUnread(){
    badge.textContent=String(Math.min(99,unread));badge.hidden=unread===0;
    const label=historyOpen?'收起聊天记录':unread?`打开聊天记录，有 ${Math.min(99,unread)} 条新消息`:'打开聊天记录';
    historyButton.setAttribute('aria-label',label);historyButton.title=label;
  }
  function updateControls(){
    root.dataset.phase=phase;root.dataset.busy=String(busy);log.setAttribute('aria-busy',String(busy));
    stopReply.hidden=!busy||!enabled;stopReply.disabled=!busy||!enabled;
    stopActions.hidden=enabled&&phase!=='executing';stopActions.disabled=false;
    retryButton.hidden=!retryHandler;retryButton.disabled=false;
    const actionable=Boolean(status.textContent)&&(tone==='error'||tone==='warning');
    status.classList.toggle('cat-chat__sr-only',!actionable);
    status.setAttribute('aria-live',actionable?'polite':'off');
    activity.hidden=!actionable&&!retryHandler&&stopReply.hidden&&stopActions.hidden;
  }
  function updateConnection(){
    notice.textContent=enabled&&(!connection.configured||connection.connected===false)?String(connection.message||''):'';notice.hidden=!notice.textContent;
    input.placeholder=enabled?'和小灰说句话…':'说个动作口令…';
    inputHelp.textContent=(enabled?'':'聊天已关闭，仍可输入「伸懒腰」「趴下」等动作口令。')+'Enter 发送，Shift + Enter 换行，Escape 收起。';
  }
  function setConnection(value={}){if(destroyed)return;connection={...value,configured:Boolean(value.configured)};updateConnection();}
  function setEnabled(value){
    if(destroyed)return;enabled=Boolean(value);toggle.checked=enabled;root.dataset.enabled=String(enabled);
    // Turning off conversation leaves the host's local command input usable.
    input.disabled=sendButton.disabled=false;updateConnection();updateControls();
  }
  function notifyLayout(){invoke(onLayoutChange,{open:opened,historyOpen});}
  function setOpen(value,{focus=true}={}){
    if(destroyed)return;const next=Boolean(value),changed=opened!==next||(!next&&historyOpen);
    opened=next;root.hidden=!opened;panel.hidden=!opened;root.dataset.open=String(opened);
    if(!opened){
      historyOpen=false;history.hidden=true;delete historyHost.dataset.chatOpen;historyButton.setAttribute('aria-expanded','false');
      const active=activeElement();if(root.contains(active)||history.contains(active))active.blur();
    }
    updateUnread();updateFocus();
    // The wrapper must unhide its window before focus or size measurements.
    if(changed)notifyLayout();
    if(opened){fitInput();if(focus)input.focus({preventScroll:true});updateFocus();}
  }
  function setHistoryOpen(value,{focus=true}={}){
    if(destroyed)return;const next=Boolean(value),changed=historyOpen!==next;
    if(next&&!opened)setOpen(true,{focus:false});
    historyOpen=next;history.hidden=!historyOpen;
    if(historyOpen){historyHost.dataset.chatOpen='true';unread=0;updateUnread();scrollToEnd();}
    else delete historyHost.dataset.chatOpen;
    historyButton.setAttribute('aria-expanded',String(historyOpen));updateUnread();
    if(changed)notifyLayout();
    if(focus){if(historyOpen)log.focus({preventScroll:true});else if(opened)input.focus({preventScroll:true});}
    updateFocus();
  }
  function send(text){
    const value=String(text).trim();if(!value||destroyed)return;
    input.value='';fitInput();setOpen(true,{focus:false});showRetry(null);invoke(onSend,value);
  }
  function nearBottom(){return log.scrollHeight-log.scrollTop-log.clientHeight<72;}
  function scrollToEnd(){log.scrollTop=log.scrollHeight;}
  function addMessage(role,text=''){
    if(destroyed)return null;
    const safeRole=['user','assistant','system'].includes(role)?role:'system',id=`chat-${instance}-${++sequence}`;
    const follow=nearBottom()||safeRole==='user',row=element('article',`cat-chat__message cat-chat__message--${safeRole}`);row.dataset.messageId=id;row.dataset.role=safeRole;
    const author=element('span','cat-chat__author',safeRole==='user'?'你':safeRole==='assistant'?'小灰':'提示'),body=element('p','cat-chat__text');
    body.append(document.createTextNode(String(text)));row.append(author,body);log.append(row);messages.set(id,{row,body});empty.hidden=true;
    if(safeRole!=='user'&&!historyOpen){unread++;updateUnread();}
    while(messages.size>100){const oldest=messages.keys().next().value;messages.get(oldest).row.remove();messages.delete(oldest);}
    if(follow)scrollToEnd();return id;
  }
  function appendText(id,delta){if(destroyed)return;const entry=messages.get(id);if(!entry)return;const follow=nearBottom();entry.body.firstChild.appendData(String(delta));if(follow)scrollToEnd();}
  function setMessage(id,text){if(destroyed)return;const entry=messages.get(id);if(!entry)return;const follow=nearBottom();entry.body.firstChild.data=String(text);if(follow)scrollToEnd();}
  function setSource(id,article){
    const entry=messages.get(id);
    if(destroyed||!entry||!article||typeof article.title!=='string'||typeof article.slug!=='string'||!['zh','en'].includes(article.locale))return;
    if(entry.source)entry.source.remove();
    const source=element('a','cat-chat__source',`参考：${article.title.slice(0,200)}${article.truncated?'（部分正文）':''}`);
    source.href=`/${article.locale}/posts/${encodeURIComponent(article.slug)}`;
    entry.row.append(source);entry.source=source;
  }
  function setStatus(text,nextTone='neutral'){
    if(destroyed)return;const value=String(text||'');if(status.textContent!==value)status.textContent=value;
    tone=['error','success','warning'].includes(nextTone)?nextTone:'neutral';status.dataset.tone=tone;updateControls();
    if(tone!=='error'&&tone!=='warning'&&announcement.textContent!==value)announcement.textContent=value;
  }
  function setPhase(value){if(destroyed)return;phase=['thinking','executing','reporting','idle'].includes(value)?value:'idle';updateControls();}
  function setBusy(value){
    if(destroyed)return;const wasBusy=busy;busy=Boolean(value);
    if(!busy)phase='idle';else if(phase==='idle')phase='thinking';updateControls();
    if(busy&&!wasBusy)announcement.textContent='';
    if(wasBusy&&!busy){
      const latest=[...messages.values()].reverse().find(entry=>entry.row.dataset.role==='assistant');
      if(latest?.body.textContent)announcement.textContent=`小灰说：${latest.body.textContent}`;
    }
  }
  function showRetry(callback){if(destroyed)return;retryHandler=typeof callback==='function'?callback:null;updateControls();}
  function clearMessages(){
    for(const {row}of messages.values())row.remove();messages.clear();empty.hidden=false;log.scrollTop=0;unread=0;announcement.textContent='';updateUnread();showRetry(null);
  }
  listen(form,'submit',event=>{event.preventDefault();send(input.value);});listen(input,'input',fitInput);
  listen(form,'focusin',updateFocus);listen(form,'focusout',()=>queueMicrotask(updateFocus));
  listen(input,'compositionstart',()=>{composing=true;});listen(input,'compositionend',()=>{composing=false;lastCompositionEnd=performance.now();});
  listen(input,'keydown',event=>{
    if(composing||event.isComposing||event.keyCode===229)return;
    if(event.key==='Enter'&&!event.shiftKey&&!event.altKey){event.preventDefault();if(performance.now()-lastCompositionEnd<80)return;send(input.value);}
  });
  listen(foldButton,'click',()=>setOpen(false));
  listen(historyButton,'click',()=>setHistoryOpen(!historyOpen));listen(historyClose,'click',()=>setHistoryOpen(false));
  for(const node of [root,history])listen(node,'keydown',event=>{
    if(event.key==='Escape'&&!composing&&!event.isComposing&&event.keyCode!==229){event.preventDefault();setOpen(false);}
  });
  listen(toggle,'change',()=>{setEnabled(toggle.checked);invoke(onToggle,enabled);});
  listen(clearButton,'click',()=>{clearMessages();setStatus('新的对话开始了。');invoke(onClear);});
  listen(stopReply,'click',()=>invoke(onStopReply));listen(stopActions,'click',()=>invoke(onStopActions));
  listen(retryButton,'click',()=>{const callback=retryHandler;showRetry(null);if(callback)invoke(callback);});
  // Composer events never become host-page shortcuts, clicks or drags.
  for(const node of [root,history])for(const event of ['pointerdown','pointermove','pointerup','click','dblclick','wheel','touchstart','touchmove','touchend','keydown','keyup'])listen(node,event,e=>e.stopPropagation());
  setConnection(connection);setEnabled(true);setBusy(false);setOpen(false);setHistoryOpen(false);
  return {addMessage,appendText,setMessage,setSource,setStatus,setBusy,setConnection,setEnabled,setOpen,showRetry,setPhase,
    openHistory(options){setHistoryOpen(true,options);},close(){setOpen(false);},
    get expanded(){return opened;},get historyOpened(){return historyOpen;},get inputFocused(){return focused;},
    destroy(){
      if(destroyed)return;
      if(focused){focused=false;invoke(onEngagementChange,false);}destroyed=true;
      for(const cleanup of cleanups)cleanup();messages.clear();retryHandler=null;delete historyHost.dataset.chatOpen;root.remove();history.remove();
    }};
}
