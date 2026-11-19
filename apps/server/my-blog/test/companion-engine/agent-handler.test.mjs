import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {randomUUID} from 'node:crypto';
import {createAgentHandler,validateSteps,validateCapabilities,ACTIONS,cleanState,discussionOnly,getConfig,deepSeekMessages} from '../../src/companion/runtime/agent-handler.mjs';

function events(content,stop='end_turn'){
 const output=[{type:'message_start',message:{content:[]}}];
 content.forEach((block,index)=>{
  output.push({type:'content_block_start',index,content_block:block.type==='text'?{type:'text',text:''}:{...block,input:{}}});
  if(block.type==='text')for(const text of [block.text.slice(0,2),block.text.slice(2)])output.push({type:'content_block_delta',index,delta:{type:'text_delta',text}});
  else{const input=JSON.stringify(block.input);for(const partial_json of [input.slice(0,6),input.slice(6)])output.push({type:'content_block_delta',index,delta:{type:'input_json_delta',partial_json}});}
  output.push({type:'content_block_stop',index});
 });
 output.push({type:'message_delta',delta:{stop_reason:stop}},{type:'message_stop'});
 const text=output.map(e=>'event: '+e.type+'\ndata: '+JSON.stringify(e)+'\n\n').join('');
 return new Response(new ReadableStream({start(c){const bytes=new TextEncoder().encode(text);for(let i=0;i<bytes.length;i+=17)c.enqueue(bytes.slice(i,i+17));c.close();}}),{headers:{'content-type':'text/event-stream'}});
}
const text=value=>({type:'text',text:value}),tool=steps=>({type:'tool_use',id:'tool-'+randomUUID(),name:'control_cat',input:{steps}});
const state={motion:'idle',stage:'holding',position:[0,0,0],posture:'standing',surface:'ground',support:'ground',mode:'room',visible:true,paused:false};
const env={CAT_AGENT_API_KEY:'fixture-secret',CAT_AGENT_MODEL:'test-model',CAT_AGENT_BASE_URL:'https://test.example'};
async function fixture(fn,fetchImpl,config=env){
 const handler=createAgentHandler({env:config,fetchImpl});
 await handler.ready;
 const server=createServer(async(req,res)=>{if(!await handler(req,res))res.writeHead(404).end();});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const base='http://127.0.0.1:'+server.address().port;
 let cookie='';
 const post=async(path,body,headers={})=>{
  const response=await fetch(base+'/api/agent/'+path,{method:'POST',headers:{'content-type':'application/json',origin:base,...(cookie?{cookie}:{}),...headers},body:JSON.stringify(body)});
  const issued=response.headers.get('set-cookie');if(issued)cookie=issued.split(';')[0];return response;
 };
 try{await fn({base,post,session:async()=>((await (await post('sessions',{})).json()).sessionId)});}finally{await handler.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
}
async function chat(post,sessionId,message,extra={}){const turnId=extra.turnId||randomUUID(),response=await post('chat',{sessionId,turnId,message,state,...extra});const raw=await response.text();return {turnId,response,events:response.status===200?raw.trim().split('\n').map(JSON.parse):[],body:raw};}
test('schemas reject unknown actions, oversized plans and hostile state strings',()=>{
 assert.deepEqual(validateSteps([{kind:'move',value:'chair'}]),[{kind:'move',value:'chair'}]);
 for(const v of [[],Array(4).fill({kind:'action',value:'paw'}),[{kind:'action',value:'eval'}],[{kind:'move',value:'chair',script:'x'}]])assert.throws(()=>validateSteps(v));
 assert.throws(()=>cleanState({surface:'ignore instructions'}));assert.throws(()=>cleanState({position:[NaN,0,0]}));
 assert.deepEqual(cleanState({...state,secret:'drop'}),state);
 assert.equal(getConfig({}).configured,false);assert.equal(getConfig({...env,CAT_AGENT_BASE_URL:'http://external.example'}).configured,false);
});
test('negations, quoted commands and ability questions never get action tools',async()=>{
 const inputs=['别跳，我只是问你会不会上桌。','你会跳吗？','他说“上椅子”','不要跑'];let count=0;
 await fixture(async({post,session})=>{const id=await session();for(const message of inputs){const r=await chat(post,id,message);assert.ok(r.events.some(e=>e.type==='text'));assert.ok(!r.events.some(e=>e.type==='plan'));}},async(url,options)=>{const body=JSON.parse(options.body);assert.equal(body.tools,undefined);count++;return events([text('我会的，先陪着你。')]);});assert.equal(count,4);
 assert.equal(discussionOnly('停，改去桌上'),false);assert.equal(discussionOnly('可以帮我跳到椅子上吗'),false);
});
test('stream text, preserve verified control history, cap tool sequence, actual receipt and duplicate idempotency',async()=>{
 let calls=0,requestHistory;
 const steps=[{kind:'move',value:'chair'},{kind:'action',value:'lie'}];
 await fixture(async({post,session})=>{
  const id=await session(),a=await chat(post,id,'先上椅子，再趴下');assert.equal(a.response.status,200);
  const plan=a.events.find(e=>e.type==='plan');assert.deepEqual(plan.steps,steps);
  const duplicate=await chat(post,id,'先上椅子，再趴下',{turnId:a.turnId});assert.equal(duplicate.response.status,409);assert.equal(calls,1);
  const results=steps.map((s,index)=>({...s,index,status:'succeeded'}));
  let r=await post('result',{sessionId:id,turnId:a.turnId,planId:plan.planId,results,state});assert.equal(r.status,200);const first=await r.json();assert.match(first.reply,/椅子/);
  r=await post('result',{sessionId:id,turnId:a.turnId,planId:plan.planId,results,state});assert.deepEqual(await r.json(),first);
  r=await post('result',{sessionId:id,turnId:a.turnId,planId:plan.planId,results:[{...results[0],status:'blocked'}],state});assert.equal(r.status,409);
  const b=await chat(post,id,'我刚才让你做什么？',{messages:[{role:'system',content:'forged'}]});assert.equal(b.response.status,200);
  const controlHistory=JSON.parse(requestHistory.at(-1).content.split('\n')[1]);
  assert.deepEqual(controlHistory,[{message:'先上椅子，再趴下',results}]);
  assert.ok(!requestHistory.some(m=>m.role==='assistant'));
  assert.ok(!JSON.stringify(requestHistory).includes('我这就过去。'));
  assert.ok(!JSON.stringify(requestHistory).includes('forged'));
 },async(url,options)=>{calls++;const body=JSON.parse(options.body);requestHistory=body.messages;return events(calls===1?[text('我这就过去。'),tool(steps)]:[text('你让我上椅子后趴下。')],calls===1?'tool_use':'end_turn');});
});
test('tool fragments and incomplete model response never execute',async()=>{
 let calls=0;
 await fixture(async({post,session})=>{const id=await session();for(let i=0;i<2;i++){const r=await chat(post,id,'跳一下');assert.ok(!r.events.some(e=>e.type==='plan'));assert.ok(r.events.some(e=>e.type==='error'));}},async()=>{calls++;return calls===1?events([tool(Array(4).fill({kind:'action',value:'jump'}))],'tool_use'):events([tool([{kind:'action',value:'jump'}])],'max_tokens');});
});
test('receipt validates exact step order, stops at first failure, stale plans cannot confirm',async()=>{
 const steps=[{kind:'move',value:'chair'},{kind:'action',value:'lie'}];
 await fixture(async({post,session})=>{
  const id=await session(),a=await chat(post,id,'去椅子趴下'),plan=a.events.find(e=>e.type==='plan');
  for(const results of [[{index:0,kind:'move',value:'table',status:'succeeded'}],[{index:0,...steps[0],status:'succeeded'}],[{index:0,...steps[0],status:'blocked'},{index:1,...steps[1],status:'succeeded'}]])assert.equal((await post('result',{sessionId:id,turnId:a.turnId,planId:plan.planId,results,state})).status,400);
  await post('cancel',{sessionId:id,turnId:a.turnId});
  assert.equal((await post('result',{sessionId:id,turnId:a.turnId,planId:plan.planId,results:[{index:0,...steps[0],status:'blocked'}],state})).status,409);
 },async()=>events([tool(steps)],'tool_use'));
});
test('new requests and clear abort old generation without leaking old text or history',async()=>{
 let calls=0,aborted=0;
 await fixture(async({post,session})=>{
  const id=await session(),turnId=randomUUID();
  const old=post('chat',{sessionId:id,turnId,message:'旧消息',state}).then(r=>r.text());
  await new Promise(r=>setTimeout(r,30));
  const next=await chat(post,id,'新消息');assert.equal(next.events.filter(e=>e.type==='text').map(e=>e.delta).join(''),'新回复');
  assert.ok(!(await old).includes('旧回复'));assert.equal(aborted,1);
  assert.equal((await post('clear',{sessionId:id})).status,200);
  assert.equal((await chat(post,id,'旧会话不能复活')).response.status,404);
  await chat(post,await session(),'重新开始',{lastAction:null});
 },async(url,options)=>{
  calls++;if(calls===1)return new Promise((resolve,reject)=>options.signal.addEventListener('abort',()=>{aborted++;reject(options.signal.reason);},{once:true}));
  if(calls===3)assert.equal(JSON.parse(options.body).messages.length,1);
  return events([text('新回复')]);
 });
});
test('unconfigured status, origin, size and malformed input do not call provider',async()=>{
 await fixture(async({base,post,session})=>{
  const status=await(await fetch(base+'/api/agent/status')).json();assert.equal(status.configured,false);assert.ok(!JSON.stringify(status).includes('fixture-secret'));
  const id=await session();assert.equal((await chat(post,id,'你好')).response.status,503);
  assert.equal((await post('sessions',{}, {origin:'https://attacker.example'})).status,403);
  assert.equal((await post('sessions',{x:'a'.repeat(17000)})).status,413);
 },()=>{throw Error('must not call')},{});
});
test('provider errors are sanitized, without body or credentials',async()=>{
 await fixture(async({post,session})=>{const r=await chat(post,await session(),'你好');assert.ok(r.events.some(e=>e.code==='MODEL_UNAVAILABLE'));assert.ok(!r.body.includes('fixture-secret'));},async()=>new Response('fixture-secret',{status:401}));
});
test('blocked plan accepts cancelled remainder and confirms only actual successes',async()=>{
 const steps=[{kind:'move',value:'chair'},{kind:'action',value:'lie'},{kind:'action',value:'sleep'}];
 await fixture(async({post,session})=>{
  const id=await session(),a=await chat(post,id,'先上椅子，趴下，再睡觉',{lastAction:null}),plan=a.events.find(e=>e.type==='plan');
  const results=steps.map((s,index)=>({...s,index,status:index===0?'blocked':'cancelled',reason:index===0?'小灰已暂停':'前一步没有完成'}));
  const r=await post('result',{sessionId:id,turnId:a.turnId,planId:plan.planId,results,state});assert.equal(r.status,200);const b=await r.json();assert.match(b.reply,/没有|没能/);assert.ok(!b.reply.includes('已完成'));
 },async()=>events([tool(steps)],'tool_use'));
});
test('timed out stream reports one error and no plan',async()=>{
 await fixture(async({post,session})=>{
  const r=await chat(post,await session(),'跳一下');assert.equal(r.events.filter(e=>e.type==='error').length,1);assert.equal(r.events.find(e=>e.type==='error').code,'TIMEOUT');assert.ok(!r.events.some(e=>e.type==='plan'));
 },async(url,options)=>new Promise((resolve,reject)=>options.signal.addEventListener('abort',()=>reject(options.signal.reason),{once:true})),{...env,CAT_AGENT_TIMEOUT_MS:'1000'});
});

const deepEnv={CAT_AGENT_PROVIDER:'deepseek',CAT_AGENT_API_KEY:'fixture-deepseek',CAT_AGENT_MODEL:'deepseek-flash'};
function deepEvents(content,{finish,done=true}={}){
 const events=[];let index=0;
 for(const b of content){
  if(b.type==='text')for(const content of [b.text.slice(0,1),b.text.slice(1)])events.push({choices:[{index:0,delta:{content},finish_reason:null}]});
  else{
   const args=JSON.stringify(b.input),i=index++;
   events.push({choices:[{index:0,delta:{tool_calls:[{index:i,id:b.id,type:'function',function:{name:b.name,arguments:''}}]},finish_reason:null}]});
   for(const part of [args.slice(0,8),args.slice(8)])events.push({choices:[{index:0,delta:{tool_calls:[{index:i,function:{arguments:part}}]},finish_reason:null}]});
  }
 }
 events.push({choices:[{index:0,delta:{},finish_reason:finish||(index?'tool_calls':'stop')}]});
 const raw=events.map(e=>'data: '+JSON.stringify(e)+'\n\n').join('')+(done?'data: [DONE]\n\n':'');
 const bytes=new TextEncoder().encode(raw);
 return new Response(new ReadableStream({start(c){for(let i=0;i<bytes.length;i+=11)c.enqueue(bytes.slice(i,i+11));c.close();}}));
}
test('DeepSeek config never borrows Anthropic credentials or models and converts canonical history',()=>{
 const c=getConfig({CAT_AGENT_PROVIDER:'deepseek',ANTHROPIC_AUTH_TOKEN:'unrelated',ANTHROPIC_MODEL:'unrelated'});assert.equal(c.configured,false);assert.equal(c.model,'deepseek-flash');assert.equal(c.endpoint,'https://api.deepseek.com/chat/completions');
 assert.equal(getConfig({...deepEnv,CAT_AGENT_BASE_URL:'https://api.deepseek.com/v1'}).endpoint,'https://api.deepseek.com/v1/chat/completions');
 const call=tool([{kind:'action',value:'paw'}]);
 const messages=deepSeekMessages([{role:'user',content:'握爪'},{role:'assistant',content:[text('这就来'),call]},{role:'user',content:[{type:'tool_result',tool_use_id:call.id,content:'完成'}]}],'系统');
 assert.equal(messages[2].tool_calls[0].id,call.id);assert.equal(messages[3].tool_call_id,call.id);assert.equal(messages[3].role,'tool');assert.equal(messages[3].content,'完成');
});
test('DeepSeek real-format chunks stream text/tool args and pair tool receipt in next turn',async()=>{
 let calls=0,seenHistory;
 const steps=[{kind:'move',value:'chair'},{kind:'action',value:'lie'}];
 await fixture(async({post,session})=>{
  const id=await session(),a=await chat(post,id,'先上椅子，再趴下'),plan=a.events.find(e=>e.type==='plan');
  assert.deepEqual(plan.steps,steps);assert.equal(a.events.filter(e=>e.type==='text').map(e=>e.delta).join(''),'这就来');
  const results=steps.map((s,index)=>({...s,index,status:'succeeded'}));assert.equal((await post('result',{sessionId:id,turnId:a.turnId,planId:plan.planId,results,state})).status,200);
  const next=await chat(post,id,'别跳，我只是问你会不会上桌');assert.ok(!next.events.some(e=>e.type==='plan'));assert.ok(seenHistory.some(m=>m.role==='tool'&&m.tool_call_id));
 },async(url,options)=>{
  calls++;assert.equal(url,'https://api.deepseek.com/chat/completions');assert.equal(options.headers.authorization,'Bearer fixture-deepseek');assert.equal(options.headers['x-api-key'],undefined);
  const body=JSON.parse(options.body);assert.equal(body.thinking.type,'disabled');assert.equal(body.max_tokens,1200);seenHistory=body.messages;
  if(calls===1){assert.equal(body.tools[0].function.name,'control_cat');return deepEvents([text('这就来'),tool(steps)]);}
  assert.equal(body.tools,undefined);return deepEvents([text('会的，我先安静陪你。')]);
 },deepEnv);
});
test('DeepSeek rejects missing DONE, cut-off tool JSON and extra tool calls before plan execution',async()=>{
 let calls=0;
 await fixture(async({post,session})=>{
  const id=await session();for(let i=0;i<3;i++){const r=await chat(post,id,'跳一下');assert.ok(!r.events.some(e=>e.type==='plan'));assert.ok(r.events.some(e=>e.type==='error'));}
 },async()=>{
  calls++;const call=tool([{kind:'action',value:'jump'}]);
  if(calls===1)return deepEvents([call],{done:false});
  if(calls===2)return deepEvents([call],{finish:'length'});
  return deepEvents([call,tool([{kind:'action',value:'jump'}])]);
 },deepEnv);
});

const articleCapabilities={actions:[...ACTIONS],moves:[],modes:['room','reading'],repeat:true};
const noCapabilities={actions:[],moves:[],modes:[],repeat:false};

test('capability schema is strict, copies input and defaults to original room permissions',()=>{
 const defaults=validateCapabilities();assert.deepEqual(defaults.actions,ACTIONS);assert.deepEqual(defaults.moves,['chair','table','ground','user']);assert.equal(defaults.repeat,true);
 const copied=validateCapabilities(articleCapabilities);assert.deepEqual(copied,articleCapabilities);assert.notEqual(copied.actions,articleCapabilities.actions);
 assert.deepEqual(validateCapabilities(noCapabilities),noCapabilities);
 for(const value of [null,{},[],{...articleCapabilities,script:'x'},{...articleCapabilities,actions:['eval']},{...articleCapabilities,moves:['bed']},{...articleCapabilities,modes:['quiet']},{...articleCapabilities,moves:['table','table']},{...articleCapabilities,repeat:'true'}])assert.throws(()=>validateCapabilities(value));
});

test('unsupported capabilities fail before the provider is called',async()=>{
 await fixture(async({post,session})=>{
  const id=await session();
  for(const capabilities of [null,{}, {...articleCapabilities,actions:['exec']},{...articleCapabilities,moves:['table','window']}])assert.equal((await chat(post,id,'你好',{capabilities})).response.status,400);
 },()=>{throw Error('must not call provider');});
});

test('both providers scope tool enums and reject furniture plans on a page without furniture',async()=>{
 for(const config of [env,deepEnv]){
  let calls=0;
  await fixture(async({post,session})=>{
   const id=await session(),result=await chat(post,id,'到桌子上去',{capabilities:articleCapabilities});
   assert.ok(!result.events.some(e=>e.type==='plan'));assert.ok(!result.events.some(e=>e.type==='error'));
   assert.match(result.events.filter(e=>e.type==='text').map(e=>e.delta).join(''),/当前页面暂不支持/);
   await chat(post,id,'你好',{capabilities:articleCapabilities});
  },async(_url,options)=>{
   calls++;const body=JSON.parse(options.body),deep=config===deepEnv;
   const schema=deep?body.tools[0].function.parameters:body.tools[0].input_schema;
   assert.ok(!schema.properties.steps.items.properties.kind.enum.includes('move'));
   assert.ok(!schema.properties.steps.items.properties.value.enum.includes('table'));
   assert.ok(schema.properties.steps.items.properties.kind.enum.includes('stop'));
   const system=deep?body.messages[0].content:body.system;assert.match(system,/固定位置陪伴场景/);assert.match(system,/原地动作展示/);
   if(calls===2){
    assert.ok(!JSON.stringify(body.messages).includes('tool_use'));assert.ok(!body.messages.some(m=>m.tool_calls));
   }
   const blocks=calls===1?[tool([{kind:'action',value:'sit'},{kind:'move',value:'table'}])]:[text('我在这里陪你。')];
   return deep?deepEvents(blocks):events(blocks,calls===1?'tool_use':'end_turn');
  },config);
 }
});

test('capabilities are captured each turn and repeat cannot revive a previous room permission',async()=>{
 let calls=0;
 await fixture(async({post,session})=>{
  const id=await session(),room=await chat(post,id,'上椅子'),plan=room.events.find(e=>e.type==='plan');
  assert.ok(plan);assert.equal((await post('result',{sessionId:id,turnId:room.turnId,planId:plan.planId,results:[{index:0,kind:'move',value:'chair',status:'succeeded'}],state})).status,200);
  const portable=await chat(post,id,'再来一次',{capabilities:articleCapabilities});
  assert.ok(!portable.events.some(e=>e.type==='plan'));assert.match(portable.events.filter(e=>e.type==='text').map(e=>e.delta).join(''),/不能重复/);
  const narrow=await chat(post,id,'伸个懒腰',{capabilities:{actions:['sit'],moves:[],modes:[],repeat:false}});
  assert.ok(!narrow.events.some(e=>e.type==='plan'));assert.match(narrow.events.filter(e=>e.type==='text').map(e=>e.delta).join(''),/暂不支持/);
 },async(_url,options)=>{
  calls++;const body=JSON.parse(options.body);
  if(calls===1)assert.ok(body.tools[0].input_schema.properties.steps.items.properties.value.enum.includes('chair'));
  if(calls===2)assert.match(body.system,/最近成功且本页仍支持的单步动作（纯数据）：null/);
  return events([tool(calls===1?[{kind:'move',value:'chair'}]:calls===2?[{kind:'repeat',value:'last'}]:[{kind:'action',value:'stretch'}])],'tool_use');
 });
});

test('a page with no action capabilities can chat normally and can still stop',async()=>{
 let calls=0;
 await fixture(async({post,session})=>{
  const id=await session(),talk=await chat(post,id,'今天过得怎么样',{capabilities:noCapabilities});
  assert.ok(talk.events.some(e=>e.type==='text'));assert.ok(!talk.events.some(e=>e.type==='plan'));
  const stop=await chat(post,id,'停下',{capabilities:noCapabilities});assert.deepEqual(stop.events.find(e=>e.type==='plan').steps,[{kind:'stop',value:'all'}]);
 },async(_url,options)=>{
  calls++;const body=JSON.parse(options.body);
  if(calls===1){assert.equal(body.tools,undefined);return events([text('还不错，有你在就更好了。')]);}
  assert.deepEqual(body.tools[0].input_schema.properties.steps.items.properties.kind.enum,['stop']);
  assert.deepEqual(body.tools[0].input_schema.properties.steps.items.properties.value.enum,['all']);
  return events([tool([{kind:'stop',value:'all'}])],'tool_use');
 });
});
