import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {randomUUID} from 'node:crypto';
import {createAgentHandler} from '../../src/companion/runtime/agent-handler.mjs';

const apiPrefix='/v1/public/companion';
async function parsedFixture(t,prepare=()=>{}){
 let providerCalls=0,streamReads=0;
 const handler=createAgentHandler({apiPrefix,env:{CAT_AGENT_PROVIDER:'deepseek',CAT_AGENT_API_KEY:'test-only-key',CAT_AGENT_MODEL:'fixture'},
  fetchImpl:async()=>{providerCalls++;return new Response('data: '+JSON.stringify({choices:[{index:0,delta:{content:'我在这里。'},finish_reason:'stop'}]})+'\n\ndata: [DONE]\n\n');}});
 await handler.ready;
 const server=createServer(async(req,res)=>{
  const chunks=[];for await(const chunk of req)chunks.push(chunk);
  req.rawBody=Buffer.concat(chunks);req.body=JSON.parse(req.rawBody.toString('utf8'));
  req[Symbol.asyncIterator]=()=>{streamReads++;throw Error('consumed request must not be read again');};
  prepare(req);
  if(!await handler(req,res))res.writeHead(404).end();
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 t.after(async()=>{await handler.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));});
 const base='http://127.0.0.1:'+server.address().port;let cookie='';
 return {get providerCalls(){return providerCalls;},get streamReads(){return streamReads;},async post(route,body,headers={}){
  const response=await fetch(base+apiPrefix+'/'+route,{method:'POST',headers:{origin:base,'content-type':'application/json',...(cookie?{cookie}:{}),...headers},body:typeof body==='string'?body:JSON.stringify(body)});
  const issued=response.headers.get('set-cookie');if(issued)cookie=issued.split(';')[0];return response;
 }};
}

test('Express parsed bodies support complete website sessions and streaming without rereading the stream',async t=>{
 const f=await parsedFixture(t);
 const session=await f.post('sessions',{});assert.equal(session.status,200);
 const {sessionId}=await session.json();
 const chat=await f.post('chat',{sessionId,turnId:randomUUID(),message:'你好',state:{mode:'room',visible:true,paused:false}});
 assert.equal(chat.status,200);assert.match(await chat.text(),/我在这里/);
 assert.equal(f.providerCalls,1);assert.equal(f.streamReads,0);
});

test('parsed bodies still require JSON Content-Type and a plain record',async t=>{
 const f=await parsedFixture(t,req=>{
  if(req.headers['x-body-shape']==='class')req.body=new (class Payload {})();
  if(req.headers['x-body-shape']==='undefined')req.body=undefined;
  if(req.headers['x-body-shape']==='date')req.body=new Date();
  if(req.headers['x-body-shape']==='circular'){req.body={};req.body.self=req.body;}
  if(req.headers['x-body-shape']==='null-prototype')req.body=Object.create(null);
 });
 assert.equal((await f.post('sessions',{}, {'content-type':'text/plain'})).status,415);
 for(const raw of ['[]','null','42','"text"'])assert.equal((await f.post('sessions',raw)).status,400);
 for(const shape of ['class','undefined','date','circular'])assert.equal((await f.post('sessions',{}, {'x-body-shape':shape})).status,400);
 assert.equal((await f.post('sessions',{}, {'x-body-shape':'null-prototype'})).status,200);
 assert.equal(f.providerCalls,0);assert.equal(f.streamReads,0);
});

test('parsed record size is limited to 16000 UTF-8 bytes even without a content length',async t=>{
 const f=await parsedFixture(t,req=>{delete req.headers['content-length'];delete req.rawBody;});
 const overhead=Buffer.byteLength(JSON.stringify({padding:''}));
 assert.equal((await f.post('sessions',{padding:'a'.repeat(16000-overhead)})).status,200);
 assert.equal((await f.post('sessions',{padding:'a'.repeat(16001-overhead)})).status,413);
 assert.equal((await f.post('sessions',{padding:'猫'.repeat(6000)})).status,413);
 assert.equal(f.providerCalls,0);assert.equal(f.streamReads,0);
});

test('parsed requests retain raw byte limits for whitespace and content length',async t=>{
 const f=await parsedFixture(t,req=>{
  if(req.headers['x-limit-source']==='raw')delete req.headers['content-length'];
  if(req.headers['x-limit-source']==='length')delete req.rawBody;
 });
 const tooLarge=' '.repeat(15999)+'{}';
 for(const source of ['raw','length']){
  const result=await f.post('sessions',tooLarge,{'x-limit-source':source});
  assert.equal(result.status,413);assert.equal((await result.json()).code,'BODY_LIMIT');
 }
 assert.equal(f.streamReads,0);
});

test('a consumed request without a parsed body fails promptly instead of rereading',async t=>{
 const f=await parsedFixture(t,req=>{delete req.body;});
 assert.equal((await f.post('sessions',{})).status,400);
 assert.equal(f.streamReads,0);assert.equal(f.providerCalls,0);
});
