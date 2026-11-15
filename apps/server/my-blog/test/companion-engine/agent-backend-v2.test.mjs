import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {randomUUID} from 'node:crypto';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createAgentHandler} from '../../src/companion/runtime/agent-handler.mjs';

const config={CAT_AGENT_PROVIDER:'deepseek',CAT_AGENT_API_KEY:'test-only-key',CAT_AGENT_MODEL:'fixture'};
const state={mode:'room',motion:'idle',visible:true,paused:false};
function response(text='我在这里。'){
 const frames=[{choices:[{index:0,delta:{content:text},finish_reason:null}]},{choices:[{index:0,delta:{},finish_reason:'stop'}]}];
 return new Response(frames.map(frame=>'data: '+JSON.stringify(frame)+'\n\n').join('')+'data: [DONE]\n\n');
}
async function fixture(options={}){
 const {env={},fetchImpl=async()=>response(),now,apiPrefix='/api/agent'}=options;
 const handler=createAgentHandler({env:{...config,...env},fetchImpl,now,apiPrefix});await handler.ready;
 const server=createServer(async(req,res)=>{if(!await handler(req,res))res.writeHead(404).end();});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+server.address().port;
 function client(initialCookie=''){
  let cookie=initialCookie;
  async function post(route,data,options={}){
   const result=await fetch(base+apiPrefix+'/'+route,{method:'POST',headers:{origin:base,'content-type':'application/json',...(cookie?{cookie}:{}),...options.headers},body:JSON.stringify(data),signal:options.signal});
   const value=result.headers.get('set-cookie');if(value)cookie=value.split(';')[0];return result;
  }
  return {post,get cookie(){return cookie;},async session(){const res=await post('sessions',{});assert.equal(res.status,200);return(await res.json()).sessionId;},
   chat:(sessionId,extra={})=>post('chat',{sessionId,turnId:randomUUID(),message:'你好',state,...extra})};
 }
 return {handler,base,client,async close(){await handler.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}};
}
const textOf=async response=>{assert.equal(response.status,200);return response.text();};

test('session ownership protects chat, cancellation, receipts and clearing',async()=>{
 let calls=0;const f=await fixture({fetchImpl:async()=>{calls++;return response();}});
 try{
  const alice=f.client(),bob=f.client(),id=await alice.session();await bob.session();
  assert.notEqual(alice.cookie,bob.cookie);
  for(const route of ['chat','cancel','result','clear']){
   const res=await bob.post(route,{sessionId:id,turnId:randomUUID(),message:'你好',state});
   assert.equal(res.status,404);assert.equal((await res.json()).code,'SESSION_EXPIRED');
  }
  assert.equal(calls,0);await textOf(await alice.chat(id));assert.equal(calls,1);
 }finally{await f.close();}
});

test('clearing and recreating a session does not reset visitor model quota',async()=>{
 let calls=0;const f=await fixture({env:{CAT_AGENT_MODEL_PER_MINUTE_VISITOR:'1'},fetchImpl:async()=>{calls++;return response();}});
 try{
  const client=f.client(),id=await client.session();await textOf(await client.chat(id));
  assert.equal((await client.post('clear',{sessionId:id})).status,200);
  const next=await client.session(),limited=await client.chat(next);
  assert.equal(limited.status,429);assert.ok(Number(limited.headers.get('retry-after'))>0);assert.equal(calls,1);
 }finally{await f.close();}
});

test('discarding a visitor cookie cannot reset network model quota',async()=>{
 let calls=0;const f=await fixture({env:{CAT_AGENT_MODEL_PER_MINUTE_NETWORK:'1'},fetchImpl:async()=>{calls++;return response();}});
 try{
  const first=f.client();await textOf(await first.chat(await first.session()));
  const second=f.client();const limited=await second.chat(await second.session());
  assert.equal(limited.status,429);assert.equal(calls,1);
 }finally{await f.close();}
});

test('one visitor cannot occupy all session slots, clearing releases only a slot',async()=>{
 const f=await fixture({env:{CAT_AGENT_MAX_SESSIONS_PER_VISITOR:'2'}});
 try{
  const first=f.client(),ids=[await first.session(),await first.session()];
  assert.equal((await first.post('sessions',{})).status,429);
  const second=f.client();assert.ok(await second.session());
  assert.equal((await first.post('clear',{sessionId:ids[0]})).status,200);assert.ok(await first.session());
 }finally{await f.close();}
});

test('expired sessions are rejected while signed identity remains usable',async()=>{
 let time=Date.now();const f=await fixture({now:()=>time});
 try{
  const client=f.client(),old=await client.session();await textOf(await client.chat(old));
  time+=31*60*1000;
  const expired=await client.chat(old);assert.equal(expired.status,404);assert.equal((await expired.json()).code,'SESSION_EXPIRED');
  await textOf(await client.chat(await client.session()));
 }finally{await f.close();}
});

test('simultaneous duplicate turn calls the provider only once',async()=>{
 let started,finish,calls=0;
 const began=new Promise(resolve=>{started=resolve;});
 const model=new Promise(resolve=>{finish=resolve;});
 const f=await fixture({fetchImpl:async()=>{calls++;started();await model;return response();}});
 try{
  const client=f.client(),id=await client.session(),turnId=randomUUID();
  const first=client.chat(id,{turnId}).then(textOf);await began;
  assert.equal((await client.chat(id,{turnId})).status,409);
  finish();await first;assert.equal(calls,1);
 }finally{finish();await f.close();}
});

test('close cancels a provider that ignores AbortSignal and is idempotent',async()=>{
 let started;const began=new Promise(resolve=>{started=resolve;});
 const f=await fixture({fetchImpl:async()=>{started();return new Promise(()=>{});}});
 try{
  const client=f.client(),id=await client.session();const stream=client.chat(id).then(textOf);await began;
  await Promise.race([f.handler.close(),new Promise((_,reject)=>setTimeout(()=>reject(Error('close hung')),2000).unref())]);
  await stream;await f.handler.close();
 }finally{await f.close();}
});

test('HTTP stream sends heartbeat during upstream silence and abort remains usable', {timeout:15000},async()=>{
 let calls=0;
 const f=await fixture({fetchImpl:async(_url,options)=>{
  calls++;if(calls>1)return response();
  return new Promise((_,reject)=>options.signal.addEventListener('abort',()=>reject(options.signal.reason),{once:true}));
 }});
 try{
  const client=f.client(),id=await client.session(),abort=new AbortController();
  const res=await client.post('chat',{sessionId:id,turnId:randomUUID(),message:'你好',state},{signal:abort.signal});
  assert.equal(res.headers.get('x-accel-buffering'),'no');const reader=res.body.getReader();let raw='';
  while(!raw.includes('heartbeat')){const chunk=await reader.read();assert.equal(chunk.done,false);raw+=new TextDecoder().decode(chunk.value);}
  abort.abort();await reader.cancel().catch(()=>{});reader.releaseLock();
  await textOf(await client.chat(id));assert.equal(calls,2);
 }finally{await f.close();}
});

test('persistent global daily budget survives restart and new identity',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'cat-handler-quota-'));let calls=0;
 const options={env:{CAT_AGENT_STATE_DIR:dir,CAT_AGENT_MODEL_PER_DAY_GLOBAL:'1'},fetchImpl:async()=>{calls++;return response();}};
 let f;
 try{
  f=await fixture(options);const first=f.client();await textOf(await first.chat(await first.session()));await f.close();f=null;
  f=await fixture(options);const next=f.client();const limited=await next.chat(await next.session());
  assert.equal(limited.status,429);assert.equal(calls,1);
 }finally{if(f)await f.close();await rm(dir,{recursive:true,force:true});}
});

test('same handler serves the explicit website API prefix without legacy routing',async()=>{
 const f=await fixture({apiPrefix:'/v1/public/companion'});
 try{
  assert.equal((await fetch(f.base+'/api/agent/status')).status,404);
  assert.equal((await fetch(f.base+'/v1/public/companion/status')).status,200);
  const client=f.client();await textOf(await client.chat(await client.session()));
 }finally{await f.close();}
});
