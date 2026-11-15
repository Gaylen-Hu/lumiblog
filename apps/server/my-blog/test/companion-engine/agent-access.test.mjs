import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, readFile, writeFile, mkdir, rm, access} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import fsPromises from 'node:fs/promises';
import {syncBuiltinESMExports} from 'node:module';
import {ApiError,createAgentSecurity} from '../../src/companion/runtime/access-control.mjs';

const secret='fixture-cookie-secret-with-at-least-32-bytes';
const proxyToken='fixture-proxy-token-with-at-least-32-bytes';
const initialTime=Date.UTC(2026,10,13,6,0,0);
const directoryOwners=new Map();
function request({cookie,headers={},method='POST',remoteAddress='127.0.0.1'}={}) {
 return {method,url:'/api/agent/sessions',socket:{remoteAddress},headers:{host:'localhost:4317',origin:'http://localhost:4317',...(cookie?{cookie}:{}),...headers}};
}
function response() {
 const headers={};return {headers,setHeader(name,value){headers[name.toLowerCase()]=value;},getHeader(name){return headers[name.toLowerCase()];}};
}
function identity(security,options={}) {
 const res=response(),principal=security.authorize(request(options),res,{issueIdentity:true});
 return {principal,cookie:res.headers['set-cookie']?.split(';')[0],res};
}
function code(expected,status) {
 return error=>error instanceof ApiError&&error.code===expected&&(!status||error.status===status);
}
async function fixture(t,env={},options={}) {
 const security=createAgentSecurity({env:{CAT_AGENT_COOKIE_SECRET:secret,...env},now:()=>initialTime,...options});
 directoryOwners.get(env.CAT_AGENT_STATE_DIR)?.add(security);
 t.after(()=>security.close());await security.ready;return security;
}
async function directory(t) {
 const value=await mkdtemp(join(tmpdir(),'cat-access-'));
 const owners=new Set();directoryOwners.set(value,owners);
 t.after(async()=>{for(const security of owners)await security.close();await rm(value,{recursive:true,force:true});directoryOwners.delete(value);});return value;
}
function production(directory,extra={}) {
 return {CAT_AGENT_MODE:'production',CAT_AGENT_ALLOWED_ORIGINS:'https://study.example',CAT_AGENT_COOKIE_SECRET:secret,
  CAT_AGENT_PROXY_TOKEN:proxyToken,CAT_AGENT_STATE_DIR:directory,...extra};
}
const proxyHeaders={origin:'https://study.example','x-cat-proxy-token':proxyToken,'x-cat-client-ip':'203.0.113.8','x-cat-origin':'https://study.example'};

test('signed identity belongs to the browser; status is optional without issuing a cookie',async t=>{
 const s=await fixture(t),{principal,cookie,res}=identity(s);
 assert.ok(principal.id);assert.match(res.headers['set-cookie'],/Path=\/; HttpOnly; SameSite=Strict/);
 assert.doesNotMatch(res.headers['set-cookie'],/Secure/);
 assert.equal(s.authorize(request({cookie}),response()).id,principal.id);
 assert.notEqual(identity(s).principal.id,principal.id);
 assert.throws(()=>s.authorize(request(),response()),code('SESSION_EXPIRED',404));
 const status=response(),anonymous=s.authorize(request({method:'GET',headers:{origin:undefined}}),status,{optionalIdentity:true});
 assert.equal(anonymous.id,null);assert.equal(status.headers['set-cookie'],undefined);
 assert.equal(anonymous.networkId,principal.networkId);
});

test('tampered, duplicate, expired and future cookies cannot authorize; sessions recover',async t=>{
 let time=initialTime;const s=await fixture(t,{}, {now:()=>time});const {cookie,principal}=identity(s);
 const tampered=cookie.slice(0,-1)+(cookie.endsWith('a')?'b':'a');
 for(const invalid of [tampered,cookie+'; '+cookie,'cat-agent-dev=garbage']) {
  assert.throws(()=>s.authorize(request({cookie:invalid}),response()),code('SESSION_EXPIRED'));
  assert.notEqual(identity(s,{cookie:invalid}).principal.id,principal.id);
 }
 time=initialTime-120_000;assert.throws(()=>s.authorize(request({cookie}),response()),code('SESSION_EXPIRED'));
 time=initialTime+31*86_400_000;assert.throws(()=>s.authorize(request({cookie}),response()),code('SESSION_EXPIRED'));
});

test('localhost requests enforce host, origin and actual peer; forwarded IP is ignored',async t=>{
 const s=await fixture(t),first=identity(s),second=identity(s,{headers:{'x-forwarded-for':'198.51.100.1','x-cat-client-ip':'198.51.100.1'}});
 assert.equal(first.principal.networkId,second.principal.networkId);
 for(const options of [{headers:{origin:'https://evil.example'}},{headers:{host:'evil.example'}},{headers:{origin:undefined}},
  {headers:{origin:'null'}},{remoteAddress:'192.0.2.8'},{headers:{'sec-fetch-site':'cross-site'}},{headers:{host:'localhost:4317.evil.example'}},
  {headers:{host:'localhost:4317',origin:'http://127.0.0.1:4317'}}])assert.throws(()=>identity(s,options),code('FORBIDDEN',403));
});

test('explicit development origins allow the website proxy across localhost ports only',async t=>{
 const s=await fixture(t,{CAT_AGENT_ALLOWED_ORIGINS:'http://localhost:3001,http://127.0.0.1:3001'});
 const headers={host:'localhost:3000',origin:'http://localhost:3001','sec-fetch-site':'same-origin'};
 const first=identity(s,{headers});assert.ok(first.principal.id);
 assert.ok(identity(s,{headers:{...headers,origin:'http://127.0.0.1:3001'}}).principal.id);
 const forwarded=identity(s,{headers:{...headers,'x-forwarded-for':'203.0.113.5','x-cat-client-ip':'203.0.113.5'}});
 assert.equal(forwarded.principal.networkId,first.principal.networkId);
 for(const options of [
  {headers:{origin:'http://localhost:3002'}},{headers:{origin:'http://localhost:3000'}},
  {headers:{origin:'https://evil.example'}},{headers:{host:'evil.example:3000'}},
  {headers:{origin:undefined}},{headers:{'sec-fetch-site':'cross-site'}},{remoteAddress:'192.0.2.4'},
  {remoteAddress:'192.0.2.4',headers:{'x-forwarded-for':'127.0.0.1','x-cat-client-ip':'127.0.0.1'}}
 ])assert.throws(()=>identity(s,{...options,headers:{...headers,...options.headers}}),code('FORBIDDEN',403));
 const defaultSecurity=await fixture(t);
 assert.throws(()=>identity(defaultSecurity,{headers}),code('FORBIDDEN',403));
});

test('production rejects explicit placeholder secrets and requires different cookie and proxy secrets',()=>{
 for(const key of ['CAT_AGENT_COOKIE_SECRET','CAT_AGENT_PROXY_TOKEN']){
  for(const value of [
   'REPLACE_WITH_A_NEW_RANDOM_COOKIE_SECRET_AT_LEAST_32_BYTES',
   'REPLACE_WITH_A_DIFFERENT_RANDOM_PROXY_TOKEN_AT_LEAST_32_BYTES',
   'change-me-to-a-cryptographically-random-secret-at-least-32-bytes',
   'your-random-secret-must-be-at-least-32-bytes-long',
   '<replace with a cryptographically random secret here>',
   '${REPLACE_WITH_A_REAL_RANDOM_SECRET_32_BYTES}'
  ])assert.throws(()=>createAgentSecurity({env:production(tmpdir(),{[key]:value})}),/配置无效/);
 }
 assert.throws(()=>createAgentSecurity({env:production(tmpdir(),{CAT_AGENT_PROXY_TOKEN:secret})}),/CAT_AGENT_PROXY_TOKEN/);
});

test('NODE_ENV prod enables all production checks and cannot downgrade to development',async t=>{
 for(const env of [
  {NODE_ENV:'prod'}, {NODE_ENV:'prod',CAT_AGENT_MODE:'development'},
  production(tmpdir(),{NODE_ENV:'prod',CAT_AGENT_MODE:undefined,CAT_AGENT_ALLOWED_ORIGINS:'http://localhost:3001'}),
  production(tmpdir(),{NODE_ENV:'prod',CAT_AGENT_MODE:undefined,CAT_AGENT_COOKIE_SECRET:'REPLACE_WITH_A_RANDOM_COOKIE_SECRET_32_BYTES'})
 ])assert.throws(()=>createAgentSecurity({env}),/配置无效/);
 const s=await fixture(t,production(await directory(t),{NODE_ENV:'prod',CAT_AGENT_MODE:undefined}));
 const good=identity(s,{headers:proxyHeaders});
 assert.match(good.cookie,/^__Host-cat-agent=/);assert.match(good.res.headers['set-cookie'],/; Secure$/);
 assert.throws(()=>identity(s),code('FORBIDDEN',403));
 assert.throws(()=>identity(s,{headers:proxyHeaders,remoteAddress:'203.0.113.4'}),code('FORBIDDEN',403));
 assert.throws(()=>identity(s,{headers:{...proxyHeaders,'x-cat-proxy-token':undefined}}),code('FORBIDDEN',403));
});

test('production trusts only loopback proxy token, exact origin, and one validated client IP',async t=>{
 const dir=await directory(t),s=await fixture(t,production(dir));
 const good=identity(s,{headers:proxyHeaders});assert.match(good.res.headers['set-cookie'],/^__Host-cat-agent=/);assert.match(good.res.headers['set-cookie'],/; Secure$/);
 assert.equal(s.authorize(request({headers:proxyHeaders,cookie:good.cookie}),response()).id,good.principal.id);
 for(const options of [{remoteAddress:'203.0.113.1'}, {headers:{'x-cat-proxy-token':'wrong'}}, {headers:{'x-cat-proxy-token':undefined}},
  {headers:{origin:'https://evil.example'}},{headers:{origin:undefined}},{headers:{'x-cat-client-ip':'203.0.113.1, 127.0.0.1'}},
  {headers:{'x-cat-client-ip':undefined,'x-forwarded-for':'203.0.113.8'}},{headers:{'x-cat-client-ip':'fe80::1%eth0'}}]) {
  assert.throws(()=>identity(s,{...options,headers:{...proxyHeaders,...options.headers}}),code('FORBIDDEN'));
 }
 const changedXFF=identity(s,{headers:{...proxyHeaders,'x-forwarded-for':'8.8.8.8'}});
 assert.equal(changedXFF.principal.networkId,good.principal.networkId);
 assert.notEqual(identity(s,{headers:{...proxyHeaders,'x-cat-client-ip':'203.0.113.9'}}).principal.networkId,good.principal.networkId);
 const status=response();s.authorize(request({method:'GET',headers:{...proxyHeaders,origin:undefined}}),status,{optionalIdentity:true});
 assert.equal(status.headers['set-cookie'],undefined);
 assert.throws(()=>s.authorize(request({method:'GET',headers:{...proxyHeaders,origin:undefined,'x-cat-origin':'https://evil.example'}}),response(),{optionalIdentity:true}),code('FORBIDDEN'));
});

test('equivalent IPv6 and mapped IPv4 client addresses share network limits',async t=>{
 const s=await fixture(t,production(await directory(t)));
 const ip=value=>identity(s,{headers:{...proxyHeaders,'x-cat-client-ip':value}}).principal.networkId;
 assert.equal(ip('2001:db8::1'),ip('2001:0DB8:0:0:0:0:0:1'));
 assert.equal(ip('203.0.113.8'),ip('::ffff:203.0.113.8'));
 assert.equal(ip('203.0.113.8'),ip('::ffff:cb00:7108'));
});

test('new sessions and cleared histories do not replenish visitor/day budgets',async t=>{
 let time=initialTime;const s=await fixture(t,{CAT_AGENT_MODEL_PER_DAY_VISITOR:'2'}, {now:()=>time});
 const {principal,cookie}=identity(s);
 for(let i=0;i<2;i++){await s.createSession(principal);const release=await s.reserveModel(principal);release();release();}
 const restored=s.authorize(request({cookie}),response());await s.createSession(restored);
 await assert.rejects(s.reserveModel(restored),error=>code('RATE_LIMITED',429)(error)&&error.retryAfter>0);
 time+=86_400_000;const release=await s.reserveModel(restored);release();
});

test('removing cookies does not reset the network session or model allowance',async t=>{
 const s=await fixture(t,{CAT_AGENT_SESSION_PER_MINUTE_NETWORK:'2',CAT_AGENT_MODEL_PER_DAY_NETWORK:'2'});
 for(let i=0;i<2;i++){const p=identity(s).principal;await s.createSession(p);(await s.reserveModel(p))();}
 const fresh=identity(s).principal;
 await assert.rejects(s.createSession(fresh),code('RATE_LIMITED'));
 await assert.rejects(s.reserveModel(fresh),code('RATE_LIMITED'));
});

test('global daily allowance survives different visitors and networks',async t=>{
 const s=await fixture(t,production(await directory(t),{CAT_AGENT_MODEL_PER_DAY_GLOBAL:'2'}));
 const ip=value=>identity(s,{headers:{...proxyHeaders,'x-cat-client-ip':value}}).principal;
 (await s.reserveModel(ip('203.0.113.1')))();(await s.reserveModel(ip('203.0.113.2')))();
 await assert.rejects(s.reserveModel(ip('203.0.113.3')),code('RATE_LIMITED'));
});

test('minute budgets roll over; session creation throttles separately',async t=>{
 let time=initialTime;const s=await fixture(t,{CAT_AGENT_MODEL_PER_MINUTE_VISITOR:'1',CAT_AGENT_SESSION_PER_MINUTE_VISITOR:'1'},{now:()=>time});
 const p=identity(s).principal;await s.createSession(p);(await s.reserveModel(p))();
 await assert.rejects(s.reserveModel(p),error=>code('RATE_LIMITED')(error)&&error.retryAfter===60);
 await assert.rejects(s.createSession(p),code('RATE_LIMITED'));
 time+=60_000;await s.createSession(p);(await s.reserveModel(p))();
});

test('serialized reservations enforce all concurrency limits and idempotent release',async t=>{
 for(const [name,extra,principals]of [
  ['visitor',{CAT_AGENT_MODEL_CONCURRENCY_VISITOR:'1'},false],
  ['network',{CAT_AGENT_MODEL_CONCURRENCY_NETWORK:'1'},true],
  ['global',{CAT_AGENT_MODEL_CONCURRENCY_GLOBAL:'1'},true]
 ]) {
  const s=await fixture(t,extra),a=identity(s).principal,b=principals?identity(s).principal:a;
  const results=await Promise.allSettled([s.reserveModel(a),s.reserveModel(b)]);
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1,name);
  const failure=results.find(r=>r.status==='rejected');assert.equal(failure.reason.code,'CONCURRENCY_LIMIT');
  const release=results.find(r=>r.status==='fulfilled').value;release();release();
  (await s.reserveModel(b))();
 }
});

test('durable budgets, identity signatures and network hashes survive restart',async t=>{
 const dir=await directory(t),env=production(dir,{CAT_AGENT_MODEL_PER_DAY_VISITOR:'1',CAT_AGENT_SESSION_PER_MINUTE_VISITOR:'1'});
 const first=await fixture(t,env),{principal,cookie}=identity(first,{headers:proxyHeaders});
 await first.createSession(principal);(await first.reserveModel(principal))();await first.close();
 const second=await fixture(t,env),restored=second.authorize(request({cookie,headers:proxyHeaders}),response());
 assert.deepEqual(restored,principal);
 await assert.rejects(second.reserveModel(restored),code('RATE_LIMITED'));
 await assert.rejects(second.createSession(restored),code('RATE_LIMITED'));
 const contents=await readFile(join(dir,'security-ledger.json'),'utf8');
 assert.ok(!contents.includes('203.0.113.8'));assert.ok(!contents.includes(secret));assert.ok(!contents.includes(proxyToken));
});

test('release while another durable reservation is writing does not leak a concurrency slot',async t=>{
 const s=await fixture(t,production(await directory(t))),p=identity(s,{headers:proxyHeaders}).principal;
 const releaseFirst=await s.reserveModel(p),originalRename=fsPromises.rename;
 let beginWrite,finishWrite;
 const writing=new Promise(resolve=>{beginWrite=resolve;}),gate=new Promise(resolve=>{finishWrite=resolve;});
 let pause=true;
 t.mock.method(fsPromises,'rename',async(...args)=>{
  if(pause){pause=false;beginWrite();await gate;}
  return originalRename(...args);
 });syncBuiltinESMExports();
 try {
  const pending=s.reserveModel(p);await writing;releaseFirst();finishWrite();
  (await pending)();
  const reservations=await Promise.allSettled([s.reserveModel(p),s.reserveModel(p)]);
  for(const result of reservations)if(result.status==='fulfilled')result.value();
  assert.equal(reservations.filter(result=>result.status==='fulfilled').length,2);
 }finally {finishWrite();t.mock.restoreAll();syncBuiltinESMExports();}
});

test('ledger lock prevents another instance; close releases it and disables access',async t=>{
 const dir=await directory(t),s=await fixture(t,production(dir)),p=identity(s,{headers:proxyHeaders}).principal;
 const second=createAgentSecurity({env:production(dir)});
 await assert.rejects(second.ready,/安全账本不可用/);await second.close();
 await access(join(dir,'security.lock'));
 await Promise.all([s.close(),s.close()]);
 assert.throws(()=>s.authorize(request(),response()),code('SERVICE_UNAVAILABLE'));
 await assert.rejects(s.reserveModel(p),code('SERVICE_UNAVAILABLE'));
 const third=await fixture(t,production(dir));assert.ok(third);
});

test('invalid config is rejected synchronously and cannot downgrade production',async()=>{
 for(const env of [
  {CAT_AGENT_MODE:'prod'}, {NODE_ENV:'production',CAT_AGENT_MODE:'development'}, {CAT_AGENT_MODE:'production'},
  {CAT_AGENT_COOKIE_SECRET:'small'}, {CAT_AGENT_PROXY_TOKEN:'small'}, {CAT_AGENT_STATE_DIR:'relative'},
  {CAT_AGENT_MODEL_PER_DAY_VISITOR:'1e3'}, {CAT_AGENT_MODEL_PER_DAY_VISITOR:'12x'}, {CAT_AGENT_MODEL_PER_DAY_VISITOR:'0'},
  {CAT_AGENT_MODEL_CONCURRENCY_GLOBAL:'-1'}, {CAT_AGENT_MAX_SESSIONS:'Infinity'}, {CAT_AGENT_MODEL_PER_DAY_VISITOR:2},
  {CAT_AGENT_ALLOWED_ORIGINS:'*'}, {CAT_AGENT_ALLOWED_ORIGINS:'https://localhost'}, {CAT_AGENT_ALLOW_ORIGINS:'typo'},
  production(tmpdir(),{CAT_AGENT_ALLOWED_ORIGINS:'http://study.example'}),production(tmpdir(),{CAT_AGENT_ALLOWED_ORIGINS:'https://study.example/'}),
  production(tmpdir(),{CAT_AGENT_ALLOWED_ORIGINS:'https://user:pass@study.example'}),production(tmpdir(),{CAT_AGENT_HOST:'0.0.0.0'}),
  {NODE_ENV:'production',CAT_AGENT_COOKIE_SECRET:secret,CAT_AGENT_PROXY_TOKEN:proxyToken,CAT_AGENT_STATE_DIR:tmpdir()}
 ])assert.throws(()=>createAgentSecurity({env}),/配置无效/);
});

test('malformed and invalid-schema ledger data fail closed without overwriting',async t=>{
 const dir=await directory(t),path=join(dir,'security-ledger.json');
 for(const contents of ['broken-json',JSON.stringify({version:2,networkSalt:'a'.repeat(64),counters:{}}),
  JSON.stringify({version:1,networkSalt:'a'.repeat(64),counters:{'day:g:all':{window:1,count:-1}}}),
  JSON.stringify({version:1,networkSalt:'a'.repeat(64),counters:{'day:n:203.0.113.8':{window:1,count:1}}}),
  JSON.stringify({version:1,networkSalt:'a'.repeat(64),counters:{},unexpected:'data'})]) {
  await writeFile(path,contents);const s=createAgentSecurity({env:production(dir)});
  await assert.rejects(s.ready,/安全账本不可用/);assert.throws(()=>identity(s,{headers:proxyHeaders}),code('SERVICE_UNAVAILABLE'));await s.close();
  assert.equal(await readFile(path,'utf8'),contents);
 }
});

test('oversized ledger refuses startup without erasing existing data',async t=>{
 const dir=await directory(t),path=join(dir,'security-ledger.json');
 const contents=Buffer.alloc(24*1024*1024+1,0x20);await writeFile(path,contents);
 const s=createAgentSecurity({env:production(dir)});await assert.rejects(s.ready,/安全账本不可用/);await s.close();
 assert.equal((await readFile(path)).length,contents.length);
});

test('durable write failure denies reservations and permanently fails closed',async t=>{
 const dir=await directory(t),s=await fixture(t,production(dir)),p=identity(s,{headers:proxyHeaders}).principal;
 const path=join(dir,'security-ledger.json');await rm(path);await mkdir(path);
 await assert.rejects(s.reserveModel(p),code('SERVICE_UNAVAILABLE'));
 assert.throws(()=>identity(s,{headers:proxyHeaders}),code('SERVICE_UNAVAILABLE'));
 await assert.rejects(s.createSession(p),code('SERVICE_UNAVAILABLE'));
});

test('expired ledger buckets are pruned and clock rollback cannot refill a budget',async t=>{
 let time=initialTime;const dir=await directory(t),s=await fixture(t,production(dir,{CAT_AGENT_MODEL_PER_DAY_VISITOR:'1'}),{now:()=>time});
 const p=identity(s,{headers:proxyHeaders}).principal;(await s.reserveModel(p))();
 time-=86_400_000;await assert.rejects(s.reserveModel(p),code('RATE_LIMITED'));
 time=initialTime+86_400_000;
 const other=identity(s,{headers:proxyHeaders}).principal;(await s.reserveModel(other))();
 const ledger=JSON.parse(await readFile(join(dir,'security-ledger.json'),'utf8'));
 assert.equal(Object.keys(ledger.counters).some(key=>key.includes(p.id)),false);
});
