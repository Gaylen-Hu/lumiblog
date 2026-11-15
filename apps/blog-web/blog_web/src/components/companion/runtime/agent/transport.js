export class AgentConnectionError extends Error {
  constructor(message,code='connection'){super(message);this.name='AgentConnectionError';this.code=code;}
}

async function responseError(response){
  let body;try{body=await response.json();}catch{}
  throw new AgentConnectionError(body?.message||body?.error?.message||'聊天连接暂时不可用，请稍后重试。',body?.code||String(response.status));
}

function deadline(signal,timeoutMs){
  const controller=new AbortController();
  const abort=()=>controller.abort(signal.reason);
  if(signal?.aborted)abort();else signal?.addEventListener('abort',abort,{once:true});
  const timer=setTimeout(()=>controller.abort(new AgentConnectionError('聊天连接等待超时，请稍后重试。','timeout')),timeoutMs);
  return {signal:controller.signal,dispose(){clearTimeout(timer);signal?.removeEventListener('abort',abort);}};
}

function normalizeApiBase(value){
  if(typeof value!=='string'||!value||/[\s\\?#]/.test(value)||value.startsWith('//'))throw new TypeError('apiBase 必须是无查询参数的相对路径或 HTTPS 地址。');
  let base=value;
  if(/^[a-z][a-z\d+.-]*:/i.test(value)){
    const url=new URL(value);
    const local=['localhost','127.0.0.1','[::1]'].includes(url.hostname);
    if((url.protocol!=='https:'&&!(url.protocol==='http:'&&local))||url.username||url.password||!url.hostname)throw new TypeError('apiBase 仅支持 HTTPS 或本机 HTTP，且不能包含凭据。');
    base=url.href;
  }else if(value.includes(':'))throw new TypeError('apiBase 路径无效。');
  let decoded;try{decoded=decodeURIComponent(value);}catch{throw new TypeError('apiBase 路径编码无效。');}
  if(decoded.includes('\\')||decoded.split('/').includes('..'))throw new TypeError('apiBase 不能包含父级路径或反斜杠。');
  return base.replace(/\/+$/,'');
}

export function createAgentTransport({apiBase='/api/agent',fetchImpl=globalThis.fetch,credentials='same-origin'}={}){
  const base=normalizeApiBase(apiBase);
  if(typeof fetchImpl!=='function')throw new TypeError('fetchImpl 必须是函数。');
  if(!['omit','same-origin','include'].includes(credentials))throw new TypeError('credentials 配置无效。');
  const endpoint=path=>{
    if(typeof path!=='string'||! /^[a-z][a-z\d-]*$/i.test(path))throw new TypeError('Agent 接口路径无效。');
    return `${base}/${path}`;
  };
  async function request(path,body,{signal,timeoutMs=15000}={}){
    const url=endpoint(path),pending=deadline(signal,timeoutMs);
    try{
      const response=await fetchImpl(url,{method:body===undefined?'GET':'POST',
        headers:body===undefined?{}:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),signal:pending.signal,credentials});
      if(!response.ok)return await responseError(response);
      return await response.json();
    }finally{pending.dispose();}
  }
  async function streamChat(body,onEvent,{signal,timeoutMs=75000}={}){
  const request=deadline(signal,timeoutMs);let reader;
  try{
  const response=await fetchImpl(endpoint('chat'),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:request.signal,credentials});
  if(!response.ok)return await responseError(response);
  if(!response.body)throw new AgentConnectionError('聊天连接没有返回内容。');
  reader=response.body.getReader();const decoder=new TextDecoder();let buffer='',done=false;
  const consume=line=>{
    if(!line.trim())return;
    let event;try{event=JSON.parse(line);}catch{throw new AgentConnectionError('聊天消息格式异常，请重新发送。','protocol');}
    if(event.type==='error')throw new AgentConnectionError(event.message||'这次回复没有完成。',event.code);
    if(event.type==='done')done=true;
    onEvent(event);
  };
    while(true){
      const result=await reader.read();if(result.done)break;
      buffer+=decoder.decode(result.value,{stream:true});
      if(buffer.length>131072)throw new AgentConnectionError('聊天消息过长。','protocol');
      let end;while((end=buffer.indexOf('\n'))>=0){consume(buffer.slice(0,end));buffer=buffer.slice(end+1);}
    }
    buffer+=decoder.decode();if(buffer.trim())consume(buffer);
    if(!done)throw new AgentConnectionError('连接中断，这次回复未完成。','interrupted');
  }finally{request.dispose();if(reader){await reader.cancel().catch(()=>{});reader.releaseLock();}}
  }
  return {request,streamChat};
}

// Keep the original exports and resolve fetch at call time for existing hosts.
export function agentRequest(...args){return createAgentTransport().request(...args);}
export function streamChat(...args){return createAgentTransport().streamChat(...args);}

export function sceneSnapshot(state){
  if(!state)return null;
  const copy={};
  for(const key of ['motion','stage','posture','surface','support','mode','visible','paused'])copy[key]=state[key];
  if(Array.isArray(state.position))copy.position=state.position.slice(0,3);
  if(Number.isFinite(state.yaw))copy.yaw=state.yaw;
  return copy;
}
