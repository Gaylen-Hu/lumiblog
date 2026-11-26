import {createHmac, randomBytes, randomUUID, timingSafeEqual} from 'node:crypto';
import {mkdir, open, readFile, rename, unlink} from 'node:fs/promises';
import {isIP} from 'node:net';
import {isAbsolute, join} from 'node:path';

export class ApiError extends Error {
 constructor(status, code, message, retryAfter) {
  super(message);this.name='ApiError';this.status=status;this.code=code;
  if(retryAfter!==undefined)this.retryAfter=retryAfter;
 }
}

const MINUTE=60_000, DAY=86_400_000, IDENTITY_AGE=30*DAY, MAX_BUCKETS=100_000;
const UUID=/^[a-f\d]{8}-[a-f\d]{4}-4[a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/;
const HASH=/^[a-f\d]{64}$/;
const NUMBERS={
 MAX_SESSIONS:[256,1,100_000], MAX_SESSIONS_PER_VISITOR:[3,1,1000], MAX_SESSIONS_PER_NETWORK:[24,1,10_000],
 SESSION_TTL_MS:[30*MINUTE,1000,DAY],
 SESSION_PER_MINUTE_VISITOR:[6,1,100_000], SESSION_PER_MINUTE_NETWORK:[30,1,100_000],
 MODEL_PER_MINUTE_VISITOR:[12,1,100_000], MODEL_PER_MINUTE_NETWORK:[60,1,100_000],
 MODEL_PER_DAY_VISITOR:[200,1,10_000_000], MODEL_PER_DAY_NETWORK:[1000,1,10_000_000], MODEL_PER_DAY_GLOBAL:[2000,1,10_000_000],
 MODEL_CONCURRENCY_VISITOR:[2,1,1000], MODEL_CONCURRENCY_NETWORK:[4,1,1000], MODEL_CONCURRENCY_GLOBAL:[8,1,1000]
};
const KNOWN=new Set([...Object.keys(NUMBERS),'MODE','ALLOWED_ORIGINS','COOKIE_SECRET','PROXY_TOKEN','STATE_DIR',
 'HOST','PORT','API_PREFIX','PROVIDER','API_KEY','MODEL','BASE_URL','TIMEOUT_MS'].map(k=>'CAT_AGENT_'+k));
const unavailable=()=>new ApiError(503,'SERVICE_UNAVAILABLE','小灰暂时无法服务，请稍后再试。',60);
const forbidden=()=>new ApiError(403,'FORBIDDEN','这个请求暂时无法处理。');
const expired=()=>new ApiError(404,'SESSION_EXPIRED','陪伴会话已过期，请重新开始。');
const configuration=name=>new Error(`猫 Agent 配置无效：${name}`);
const record=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const exact=(value,keys)=>record(value)&&Object.keys(value).length===keys.length&&keys.every(k=>Object.hasOwn(value,k));
const sign=(secret,value)=>createHmac('sha256',secret).update(value).digest('base64url');
const placeholder=value=>/^(?:replace(?:[_\s-]|$)|change[_\s-]?me(?:[_\s-]|$)|your[_\s-]|(?:example|placeholder)(?:[_\s-]|$)|<[^>]+>$|\$\{[^}]+\}$)/i.test(value.trim());
function equal(a,b) {
 const left=Buffer.from(a),right=Buffer.from(b);
 return left.length===right.length&&timingSafeEqual(left,right);
}
function canonicalIP(value) {
 if(typeof value!=='string'||value.length>64||value.includes('%')||!isIP(value))return null;
 if(isIP(value)===4)return value;
 const normalized=new URL(`http://[${value}]`).hostname.slice(1,-1);
 const mapped=/^::ffff:([a-f\d]{1,4}):([a-f\d]{1,4})$/.exec(normalized);
 if(mapped){const a=parseInt(mapped[1],16),b=parseInt(mapped[2],16);return `${a>>>8}.${a&255}.${b>>>8}.${b&255}`;}
 return normalized;
}
function loopback(value) {const ip=canonicalIP(value);return ip==='::1'||!!ip&&/^127\./.test(ip);}
function originValue(value,production) {
 if(typeof value!=='string'||value.length>2048)return null;
 try {
  const url=new URL(value);
  if(url.origin!==value||url.username||url.password||url.search||url.hash)return null;
  if(production)return url.protocol==='https:'?url.origin:null;
  return url.protocol==='http:'&&['localhost','127.0.0.1','[::1]'].includes(url.hostname)?url.origin:null;
 }catch{return null;}
}
function parseConfig(env) {
 for(const key of Object.keys(env))if(key.startsWith('CAT_AGENT_')&&!KNOWN.has(key))throw configuration(key);
 const mode=env.CAT_AGENT_MODE;
 if(mode!==undefined&&!['development','production'].includes(mode))throw configuration('CAT_AGENT_MODE');
 const productionEnvironment=['production','prod'].includes(env.NODE_ENV);
 if(productionEnvironment&&mode==='development')throw configuration('CAT_AGENT_MODE');
 const production=mode==='production'||productionEnvironment;
 const values={};
 for(const [key,[fallback,min,max]]of Object.entries(NUMBERS)) {
  const raw=env['CAT_AGENT_'+key];
  if(raw!==undefined&&(typeof raw!=='string'||!/^\d+$/.test(raw)))throw configuration('CAT_AGENT_'+key);
  const value=raw===undefined?fallback:Number(raw);
  if(!Number.isSafeInteger(value)||value<min||value>max)throw configuration('CAT_AGENT_'+key);
  values[key]=value;
 }
 const origins=new Set();
 if(env.CAT_AGENT_ALLOWED_ORIGINS!==undefined) {
  if(typeof env.CAT_AGENT_ALLOWED_ORIGINS!=='string')throw configuration('CAT_AGENT_ALLOWED_ORIGINS');
  for(const item of env.CAT_AGENT_ALLOWED_ORIGINS.split(',')) {
   const value=originValue(item.trim(),production);
   if(!value)throw configuration('CAT_AGENT_ALLOWED_ORIGINS');
   origins.add(value);
  }
 }
 if(production&&!origins.size)throw configuration('CAT_AGENT_ALLOWED_ORIGINS');
 for(const key of ['COOKIE_SECRET','PROXY_TOKEN']) {
  const value=env['CAT_AGENT_'+key];
  if((production||value!==undefined)&&(typeof value!=='string'||Buffer.byteLength(value)<32||Buffer.byteLength(value)>512||/[\r\n\x00]/.test(value)))throw configuration('CAT_AGENT_'+key);
  if(production&&placeholder(value))throw configuration('CAT_AGENT_'+key);
 }
 if(production&&env.CAT_AGENT_COOKIE_SECRET===env.CAT_AGENT_PROXY_TOKEN)throw configuration('CAT_AGENT_PROXY_TOKEN');
 const directory=env.CAT_AGENT_STATE_DIR;
 if((production||directory!==undefined)&&(typeof directory!=='string'||!isAbsolute(directory)))throw configuration('CAT_AGENT_STATE_DIR');
 if(production&&env.CAT_AGENT_HOST!==undefined&&!['127.0.0.1','::1','localhost'].includes(env.CAT_AGENT_HOST))throw configuration('CAT_AGENT_HOST');
 return {production,values,origins,directory,secret:env.CAT_AGENT_COOKIE_SECRET||randomBytes(48).toString('base64url'),proxyToken:env.CAT_AGENT_PROXY_TOKEN};
}
function header(req,name) {
 const value=req.headers?.[name];
 return typeof value==='string'?value:undefined;
}
function bucketPeriod(key) {return key.startsWith('day:')?DAY:MINUTE;}
function validBucket(key,value) {
 if(!exact(value,['window','count'])||!Number.isSafeInteger(value.window)||value.window<0||!Number.isSafeInteger(value.count)||value.count<1||value.count>10_000_000)return false;
 const parts=key.split(':');
 if(parts.length!==3||!['session','minute','day'].includes(parts[0]))return false;
 return parts[1]==='v'?UUID.test(parts[2]):parts[1]==='n'?HASH.test(parts[2]):parts[0]==='day'&&parts[1]==='g'&&parts[2]==='all';
}
function validateLedger(value) {
 if(!exact(value,['version','networkSalt','counters'])||value.version!==1||!HASH.test(value.networkSalt)||!record(value.counters))throw unavailable();
 const entries=Object.entries(value.counters);
 if(entries.length>MAX_BUCKETS||entries.some(([key,bucket])=>!validBucket(key,bucket)))throw unavailable();
 return value;
}

// One process owns the ledger. Counters are persisted before granting any call;
// releases only return concurrency slots, never usage already charged to a day.
export function createAgentSecurity({env=process.env,now=Date.now}={}) {
 const config=parseConfig(env),n=config.values;
 const cookieName=config.production?'__Host-cat-agent':'cat-agent-dev';
 const limits=Object.freeze({maxSessions:n.MAX_SESSIONS,maxSessionsPerVisitor:n.MAX_SESSIONS_PER_VISITOR,
  maxSessionsPerNetwork:n.MAX_SESSIONS_PER_NETWORK,sessionTtlMs:n.SESSION_TTL_MS});
 let ledger={version:1,networkSalt:randomBytes(32).toString('hex'),counters:{}},lock;
 let initialized=false,closing=false,failed=false,queue=Promise.resolve(),closePromise;
 let globalActive=0;
 const activeVisitors=new Map(),activeNetworks=new Map(),principals=new WeakSet();
 const ledgerPath=config.directory&&join(config.directory,'security-ledger.json');
 const lockPath=config.directory&&join(config.directory,'security.lock');
 const clock=()=>{const time=now();if(!Number.isSafeInteger(time)||time<0)throw unavailable();return time;};
 function usable(){if(!initialized||closing||failed)throw unavailable();}
 function prune(time) {
  for(const [key,value]of Object.entries(ledger.counters))if(value.window<Math.floor(time/bucketPeriod(key)))delete ledger.counters[key];
 }
 async function persist() {
  if(!ledgerPath)return;
  const temporary=join(config.directory,`.security-${randomUUID()}.tmp`);
  let file;
  try {
   file=await open(temporary,'wx',0o600);
   await file.writeFile(JSON.stringify(ledger));await file.sync();await file.close();file=undefined;
   await rename(temporary,ledgerPath);
   // Windows does not support opening directories for fsync.
   if(process.platform!=='win32'){const directory=await open(config.directory,'r');try{await directory.sync();}finally{await directory.close();}}
  }catch {
   failed=true;
   if(file)await file.close().catch(()=>{});
   await unlink(temporary).catch(()=>{});
   throw unavailable();
  }
 }
 const ready=(async()=>{
  try {
   if(config.directory) {
    await mkdir(config.directory,{recursive:true,mode:0o700});
    lock=await open(lockPath,'wx',0o600);
    await lock.writeFile(JSON.stringify({version:1,pid:process.pid}));await lock.sync();
    let bytes;
    try{bytes=await readFile(ledgerPath);}catch(error){if(error.code!=='ENOENT')throw error;}
    if(bytes!==undefined) {
     if(bytes.length>24*1024*1024)throw unavailable();
     ledger=validateLedger(JSON.parse(bytes.toString('utf8')));
    }
    prune(clock());await persist();
   }
   initialized=true;
  }catch {
   failed=true;
   if(lock){await lock.close().catch(()=>{});lock=undefined;await unlink(lockPath).catch(()=>{});}
   throw new Error('猫 Agent 安全账本不可用，请检查配置、目录权限、账本及独占锁。');
  }
 })();
 // Callers still receive the rejection from ready; prevent an unhandled rejection
 // if a host constructs the handler before awaiting startup readiness.
 ready.catch(()=>{});
 function readIdentity(req,time) {
  const cookies=header(req,'cookie');
  if(!cookies||cookies.length>8192)return null;
  const matches=cookies.split(';').map(part=>part.trim()).filter(part=>part.startsWith(cookieName+'='));
  if(matches.length!==1)return null;
  const value=matches[0].slice(cookieName.length+1),parts=value.split('.');
  if(parts.length!==4||parts[0]!=='v1'||!UUID.test(parts[1])||!/^\d{1,16}$/.test(parts[2])||!/^[\w-]{43}$/.test(parts[3]))return null;
  const created=Number(parts[2]);
  if(!Number.isSafeInteger(created)||created>time+MINUTE||time-created>IDENTITY_AGE)return null;
  return equal(sign(config.secret,parts.slice(0,3).join('.')),parts[3])?parts[1]:null;
 }
 function authorize(req,res,{issueIdentity=false,optionalIdentity=false}={}) {
  usable();
  const time=clock(),origin=header(req,'origin'),fetchSite=header(req,'sec-fetch-site');
  if(fetchSite&&!['same-origin','none'].includes(fetchSite))throw forbidden();
  let clientIP;
  if(config.production) {
   const token=header(req,'x-cat-proxy-token');
   if(!loopback(req.socket?.remoteAddress)||!token||!equal(token,config.proxyToken))throw forbidden();
   clientIP=canonicalIP(header(req,'x-cat-client-ip'));
   if(!clientIP)throw forbidden();
   // Only safe reads may substitute the origin attested by the trusted proxy.
   const assertedOrigin=origin??(req.method==='GET'?header(req,'x-cat-origin'):undefined);
   if(!assertedOrigin||!config.origins.has(assertedOrigin))throw forbidden();
  }else {
   const host=header(req,'host'),localOrigin=host&&originValue('http://'+host,false);
   if(!localOrigin)throw forbidden();
   clientIP=canonicalIP(req.socket?.remoteAddress);
   if(!clientIP||!loopback(clientIP))throw forbidden();
   // A same-origin Next proxy may forward its frontend Origin to a different
   // localhost backend port. Only an explicit local allowlist permits this.
   if(origin!==undefined?(config.origins.size?!config.origins.has(origin):origin!==localOrigin):req.method!=='GET')throw forbidden();
  }
  let id=readIdentity(req,time);
  if(!id&&issueIdentity&&req.method==='POST') {
   id=randomUUID();const payload=`v1.${id}.${time}`;
   const cookie=`${cookieName}=${payload}.${sign(config.secret,payload)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${IDENTITY_AGE/1000}${config.production?'; Secure':''}`;
   const previous=res.getHeader?.('Set-Cookie');
   res.setHeader('Set-Cookie',previous?[...(Array.isArray(previous)?previous:[previous]),cookie]:cookie);
  }
  if(!id&&!optionalIdentity)throw expired();
  const networkId=createHmac('sha256',Buffer.from(ledger.networkSalt,'hex')).update(clientIP).digest('hex');
  const principal=Object.freeze({id,networkId});principals.add(principal);return principal;
 }
 function requirePrincipal(principal) {
  if(!principals.has(principal)||!principal.id)throw expired();
 }
 function serialize(operation) {
  const result=queue.then(async()=>{await ready;usable();return operation();});
  queue=result.catch(()=>{});return result;
 }
 async function charge(rules,time) {
  prune(time);
  let additional=0;
  for(const [key,limit]of rules) {
   const period=bucketPeriod(key),window=Math.floor(time/period),entry=ledger.counters[key];
   // A future counter means the wall clock moved backward. Never reset it early.
   if(entry&&entry.window>=window&&entry.count>=limit)throw new ApiError(429,'RATE_LIMITED','小灰需要休息一下，请稍后再来。',Math.max(1,Math.ceil(((entry.window+1)*period-time)/1000)));
   if(!entry)additional++;
  }
  if(Object.keys(ledger.counters).length+additional>MAX_BUCKETS)throw unavailable();
  for(const [key]of rules) {
   const window=Math.floor(time/bucketPeriod(key)),entry=ledger.counters[key];
   if(entry&&entry.window>=window)entry.count++;
   else ledger.counters[key]={window,count:1};
  }
  await persist();
 }
 async function createSession(principal) {
  requirePrincipal(principal);
  return serialize(()=>charge([[`session:v:${principal.id}`,n.SESSION_PER_MINUTE_VISITOR],
   [`session:n:${principal.networkId}`,n.SESSION_PER_MINUTE_NETWORK]],clock()));
 }
 async function reserveModel(principal) {
  requirePrincipal(principal);
  return serialize(async()=>{
   const visitor=activeVisitors.get(principal.id)||0,network=activeNetworks.get(principal.networkId)||0;
   if(globalActive>=n.MODEL_CONCURRENCY_GLOBAL||visitor>=n.MODEL_CONCURRENCY_VISITOR||network>=n.MODEL_CONCURRENCY_NETWORK)
    throw new ApiError(429,'CONCURRENCY_LIMIT','小灰正忙，请稍后再试。',1);
   await charge([[`minute:v:${principal.id}`,n.MODEL_PER_MINUTE_VISITOR],[`minute:n:${principal.networkId}`,n.MODEL_PER_MINUTE_NETWORK],
    [`day:v:${principal.id}`,n.MODEL_PER_DAY_VISITOR],[`day:n:${principal.networkId}`,n.MODEL_PER_DAY_NETWORK],['day:g:all',n.MODEL_PER_DAY_GLOBAL]],clock());
   // close() may have started while the durable write was in flight.
   usable();
   globalActive++;
   activeVisitors.set(principal.id,(activeVisitors.get(principal.id)||0)+1);
   activeNetworks.set(principal.networkId,(activeNetworks.get(principal.networkId)||0)+1);
   let released=false;
   return ()=>{
    if(released)return;released=true;globalActive--;
    for(const [map,key]of [[activeVisitors,principal.id],[activeNetworks,principal.networkId]]) {
     const count=map.get(key)-1;if(count)map.set(key,count);else map.delete(key);
    }
   };
  });
 }
 function close() {
  if(closePromise)return closePromise;
  closing=true;
  closePromise=(async()=>{
   await ready.catch(()=>{});await queue;
   if(lock){await lock.close();lock=undefined;await unlink(lockPath);}
  })();
  return closePromise;
 }
 return {ready,authorize,createSession,reserveModel,close,limits};
}
