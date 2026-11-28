import {env} from 'cloudflare:test';
import {beforeEach,describe,expect,it} from 'vitest';
import {hashToken} from '../src/session';
import worker from '../src/worker';
const origin='https://example.test', now=Math.floor(Date.now()/1000), key='12345678-1234-1234-1234-123456789abc',tokenA='a'.repeat(43),tokenB='b'.repeat(43),userA='a'.repeat(26),userB='b'.repeat(26);
const bindings={DB:env.DB,USER_HMAC_KEY:'test-only',ORIGIN_PUBLIC:origin,ORIGIN_PRIVATE:'https://private.test',TOSS:{fetch:async()=>new Response()}};
const req=(token=tokenA,code='ABCDEFGH23',data:unknown={nickname:'하늘'},k=key,o=origin)=>new Request(`https://api.test/v1/rooms/${code}/participants`,{method:'POST',headers:{origin:o,'content-type':'application/json',...(token?{authorization:`Bearer ${token}`} : {}),...(k?{'Idempotency-Key':k}:{})},body:JSON.stringify(data)});
const count=async (table:string)=>(await env.DB.prepare(`SELECT count(*) AS n FROM ${table}`).first<{n:number}>())!.n;
beforeEach(async()=>{
 for(const [id,token,ch] of [[userA,tokenA,'a'],[userB,tokenB,'b']]) {
  await env.DB.prepare('INSERT INTO users VALUES (?,?,?)').bind(id,ch.repeat(64),now).run();
  await env.DB.prepare('INSERT INTO sessions (token_hash,user_id,created_at,expires_at) VALUES (?,?,?,?)').bind(await hashToken(token),id,now,now+43200).run();
 }
 await env.DB.prepare("INSERT INTO themes VALUES ('trip','여행',1)").run();
 await env.DB.prepare("INSERT INTO question_sets (theme_id,version,status,default_next_action,content_sha256,published_at) VALUES ('trip',1,'published','정해요',?,?)").bind('c'.repeat(64),now).run();
 await env.DB.prepare("INSERT INTO rooms (code,gathering_name,party_size,question_set_id,participant_count,created_at,expires_at) VALUES ('ABCDEFGH23','여행',8,1,0,?,?)").bind(now,now+2592000).run();
});
describe('TASK-019 API-005 join room',()=>{
 it('creates and replays membership, and returns 200 to an existing member',async()=>{
  const first=await worker.fetch(req(),bindings);expect(first.status).toBe(201);expect(await first.json()).toEqual({roomCode:'ABCDEFGH23',myRole:'member',mySubmitted:false});
  expect((await worker.fetch(req(),bindings)).status).toBe(201);
  const again=await worker.fetch(req(tokenA,'ABCDEFGH23',{nickname:'다른이름'},'22345678-1234-1234-1234-123456789abc'),bindings);expect(again.status).toBe(200);
  expect(await count('participants')).toBe(1);
 });
 it('returns 400, 401, 403, 404, 409 and 429 with contract codes',async()=>{
  let r=await worker.fetch(req(tokenA,'ABCDEFGH23',{nickname:''}),bindings);expect(r.status).toBe(400);expect(await r.json()).toMatchObject({code:'validation_failed'});expect(await count('rate_counters')).toBe(0);
  expect((await worker.fetch(req('', 'ABCDEFGH23'),bindings)).status).toBe(401);
  expect((await worker.fetch(req(tokenA,'ABCDEFGH23',{nickname:'하늘'},key,'https://bad.test'),bindings)).status).toBe(403);
  r=await worker.fetch(req(tokenB,'bad'),bindings);expect(r.status).toBe(404);expect(await r.json()).toMatchObject({code:'room_not_found'});
  r=await worker.fetch(req(tokenA,'DIFFEREN23',{nickname:''}),bindings);expect(r.status).toBe(409);expect(await r.json()).toMatchObject({code:'idempotency_conflict'});
  await env.DB.prepare("INSERT INTO rate_counters VALUES ('write',?,?,60) ON CONFLICT(scope,subject,window_start) DO UPDATE SET count=60").bind(userB,Math.floor(now/60)*60).run();
  r=await worker.fetch(req(tokenB,'ABCDEFGH23',{nickname:'하늘'},'22345678-1234-1234-1234-123456789abc'),bindings);expect(r.status).toBe(429);expect(Number(r.headers.get('Retry-After'))).toBeGreaterThan(0);expect(await count('participants')).toBe(0);expect((await env.DB.prepare('SELECT count(*) AS n FROM idempotency_records WHERE user_id=? AND request_id=?').bind(userB,'22345678-1234-1234-1234-123456789abc').first<{n:number}>())?.n).toBe(0);
 });
 it('allows only one concurrent join when seven seats are occupied',async()=>{
  for(let i=0;i<7;i++) {const id=String(i).repeat(26);await env.DB.prepare('INSERT INTO users VALUES (?,?,?)').bind(id,String(i).repeat(64),now).run();await env.DB.prepare("INSERT INTO participants(room_id,user_id,role,nickname,joined_at) VALUES(1,?,'member','기존',?)").bind(id,now).run();}
  await env.DB.prepare('UPDATE rooms SET participant_count=7').run();
  let ready!: () => void, release!: () => void, waiting=0;
  const bothReady=new Promise<void>(resolve=>{ready=resolve}), gate=new Promise<void>(resolve=>{release=resolve});
  const delayed=new Proxy(env.DB,{get(target,prop) {
    if(prop==='batch') return async (...args: Parameters<D1Database['batch']>) => {if(++waiting<=2){if(waiting===2)ready();await gate} return target.batch(...args)};
    const value=Reflect.get(target,prop,target);return typeof value==='function'?value.bind(target):value;
  }});
  const pending=Promise.all([worker.fetch(req(tokenA),{...bindings,DB:delayed}),worker.fetch(req(tokenB),{...bindings,DB:delayed})]);
  await bothReady; release(); const responses=await pending;
  expect(responses.map(r=>r.status).sort()).toEqual([201,409]);
  const loser=responses.find(r=>r.status===409)!;expect(await loser.json()).toMatchObject({code:'room_full'});
  expect(await count('participants')).toBe(8);expect((await env.DB.prepare('SELECT participant_count AS n FROM rooms').first<{n:number}>())?.n).toBe(8);
 });
 it('serializes concurrent successful writes at the last rate-limit slot',async()=>{
  await env.DB.prepare("INSERT INTO rooms (code,gathering_name,party_size,question_set_id,participant_count,created_at,expires_at) VALUES ('BBBBBBBB23','여행',8,1,0,?,?)").bind(now,now+2592000).run();
  await env.DB.prepare("INSERT INTO rate_counters VALUES ('write',?,?,59)").bind(userA,Math.floor(now/60)*60).run();
  let ready!:()=>void,release!:()=>void,waiting=0;
  const both=new Promise<void>(resolve=>{ready=resolve}),gate=new Promise<void>(resolve=>{release=resolve});
  const delayed=new Proxy(env.DB,{get(target,prop){if(prop==='batch')return async (...args:Parameters<D1Database['batch']>)=>{if(++waiting<=2){if(waiting===2)ready();await gate}return target.batch(...args)};const v=Reflect.get(target,prop,target);return typeof v==='function'?v.bind(target):v}});
  const pending=Promise.all([worker.fetch(req(tokenA),{...bindings,DB:delayed}),worker.fetch(req(tokenA,'BBBBBBBB23',{nickname:'하늘'},'22345678-1234-1234-1234-123456789abc'),{...bindings,DB:delayed})]);
  await both;release();const responses=await pending;expect(responses.map(r=>r.status).sort()).toEqual([201,429]);
  expect(await count('participants')).toBe(1);expect((await env.DB.prepare("SELECT count FROM rate_counters WHERE scope='write' AND subject=?").bind(userA).first<{count:number}>())?.count).toBe(60);
 });
 it('rejects a close committed after the join snapshot but before its batch',async()=>{
  let signal!: () => void, release!: () => void;
  const started=new Promise<void>(resolve=>{signal=resolve}), gate=new Promise<void>(resolve=>{release=resolve});
  const delayed = new Proxy(env.DB, {get(target,prop) {
    if(prop==='batch') return async (...args: Parameters<D1Database['batch']>) => {signal();await gate;return target.batch(...args)};
    const value=Reflect.get(target,prop,target);return typeof value==='function'?value.bind(target):value;
  }});
  const pending=worker.fetch(req(),{...bindings,DB:delayed});
  await started;
  await env.DB.prepare("UPDATE rooms SET status='closed',close_reason='host_closed',closed_at=? WHERE id=1").bind(now).run();
  release();const r=await pending;
  expect(r.status).toBe(409);expect(await r.json()).toMatchObject({code:'room_closed'});expect(await count('participants')).toBe(0);expect(await count('rate_counters')).toBe(0);
 });
 it('rolls back a failed write and returns default 500',async()=>{
  await env.DB.prepare("CREATE TRIGGER test_join_failure BEFORE INSERT ON participants BEGIN SELECT RAISE(ABORT, 'injected_failure'); END").run();const r=await worker.fetch(req(),bindings);expect(r.status).toBe(500);expect(await r.json()).toMatchObject({code:'internal'});expect(await count('rate_counters')).toBe(0);expect(await count('idempotency_records')).toBe(0);
 });
});
