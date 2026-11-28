import {env} from 'cloudflare:test';
import {beforeEach,describe,expect,it} from 'vitest';
import {hashToken} from '../src/session';
import worker from '../src/worker';
const origin='https://example.test',now=Math.floor(Date.now()/1000),key='92345678-1234-1234-1234-123456789abc', submitKey='12345678-1234-1234-1234-123456789abc';
const bindings={DB:env.DB,USER_HMAC_KEY:'x'.repeat(32),ORIGIN_PUBLIC:origin,ORIGIN_PRIVATE:'https://private.test',TOSS:{fetch:async()=>new Response()}};
const token=(c:string)=>c.repeat(43),user=(c:string)=>c.repeat(26),answers=Array.from({length:8},(_,i)=>({position:i+1,choice:'A'}));
const close=(ch='a',k=key,code='ABCDEFGH23',o=origin)=>new Request(`https://api.test/v1/rooms/${code}/close`,{method:'POST',headers:{origin:o,...(ch?{authorization:`Bearer ${token(ch)}`} : {}),...(k?{'Idempotency-Key':k}:{})}});
const submit=(ch:string)=>new Request('https://api.test/v1/rooms/ABCDEFGH23/responses',{method:'POST',headers:{origin,'content-type':'application/json',authorization:`Bearer ${token(ch)}`,'Idempotency-Key':submitKey},body:JSON.stringify({answers})});
const count=async(table:string)=>(await env.DB.prepare(`SELECT count(*) AS n FROM ${table}`).first<{n:number}>())!.n;
beforeEach(async()=>{
 for(const ch of ['a','b','c','d']) {await env.DB.prepare('INSERT INTO users VALUES (?,?,?)').bind(user(ch),ch.repeat(64),now).run();await env.DB.prepare('INSERT INTO sessions(token_hash,user_id,created_at,expires_at) VALUES(?,?,?,?)').bind(await hashToken(token(ch)),user(ch),now,now+43200).run()}
 await env.DB.prepare("INSERT INTO themes VALUES ('trip','여행',1)").run();
 await env.DB.prepare("INSERT INTO question_sets(theme_id,version,status,default_next_action,content_sha256,published_at) VALUES('trip',1,'published','정해요',?,?)").bind('e'.repeat(64),now).run();
 for(let i=1;i<=8;i++)await env.DB.prepare("INSERT INTO questions(question_set_id,position,prompt,option_a,option_b,split_suggestion,agreed_text_a,agreed_text_b) VALUES(1,?,'질문','A','B','조율','A 합의','B 합의')").bind(i).run();
 for(const slot of ['plan_speed_low','plan_speed_high','spending_priority_low','spending_priority_high','schedule_change_low','schedule_change_high','balanced'])await env.DB.prepare('INSERT INTO profile_phrases VALUES(1,?,?)').bind(slot,'균형이에요').run();
 await env.DB.prepare("INSERT INTO rooms(code,gathering_name,party_size,question_set_id,participant_count,created_at,expires_at) VALUES('ABCDEFGH23','여행',4,1,4,?,?)").bind(now,now+2592000).run();
 for(const ch of ['a','b','c','d'])await env.DB.prepare('INSERT INTO participants(room_id,user_id,role,nickname,joined_at) VALUES(1,?,?,?,?)').bind(user(ch),ch==='a'?'host':'member','이름',now).run();
 for(const ch of ['a','b','c'])expect((await worker.fetch(submit(ch),bindings)).status).toBe(201);
 await env.DB.prepare('INSERT INTO notification_subscriptions(participant_id,room_id,anon_key_ciphertext,nonce,key_version,created_at) VALUES(1,1,?,?,1,?)').bind(new Uint8Array(17),new Uint8Array(12),now).run();
});
describe('TASK-025 API-010 host close',()=>{
 it('closes once, creates summaries and replays the same result',async()=>{
  const first=await worker.fetch(close(),bindings);expect(first.status).toBe(200);const body=await first.json();expect(body).toMatchObject({roomStatus:'closed',closeReason:'host_closed',card:{stage:'final',basedOnCount:3}});
  const replay=await worker.fetch(close(),bindings);expect(await replay.json()).toEqual(body);expect(await count('past_cards')).toBe(3);expect(await count('notification_subscriptions')).toBe(0);
  const again=await worker.fetch(close('a','22345678-1234-1234-1234-123456789abc'),bindings);expect(again.status).toBe(200);expect(await again.json()).toMatchObject({closeReason:'host_closed'});
 });
 it('returns 400, 401, 403, 404 and 409 without changing the room',async()=>{
  expect((await worker.fetch(close('a',''),bindings)).status).toBe(400);expect((await worker.fetch(close(''),bindings)).status).toBe(401);
  let r=await worker.fetch(close('b'),bindings);expect(r.status).toBe(403);expect(await r.json()).toMatchObject({code:'not_host'});
  expect((await worker.fetch(close('a',key,'bad'),bindings)).status).toBe(404);
  await env.DB.prepare('DELETE FROM responses WHERE participant_id IN (2,3)').run();await env.DB.prepare('UPDATE rooms SET submitted_count=1').run();
  r=await worker.fetch(close('a','22345678-1234-1234-1234-123456789abc'),bindings);expect(r.status).toBe(409);expect(await r.json()).toMatchObject({code:'not_enough_responses'});
 });
 it('returns 429 with Retry-After without changes',async()=>{
  await env.DB.prepare("INSERT INTO rate_counters VALUES('write',?,?,60) ON CONFLICT(scope,subject,window_start) DO UPDATE SET count=60").bind(user('a'),Math.floor(now/60)*60).run();
  const r=await worker.fetch(close(),bindings);expect(r.status).toBe(429);expect(Number(r.headers.get('Retry-After'))).toBeGreaterThan(0);expect(await count('past_cards')).toBe(0);expect(await count('notification_subscriptions')).toBe(1);
 });
 it('rolls back finalization when a summary write fails',async()=>{
  await env.DB.prepare("CREATE TRIGGER test_fail_past BEFORE INSERT ON past_cards BEGIN SELECT RAISE(ABORT, 'injected_failure'); END").run();
  const r=await worker.fetch(close(),bindings);expect(r.status).toBe(500);expect(await r.json()).toMatchObject({code:'internal'});
  expect((await env.DB.prepare('SELECT status FROM rooms').first<{status:string}>())?.status).toBe('open');expect(await count('past_cards')).toBe(0);expect(await count('notification_subscriptions')).toBe(1);
 });
 it('commits only one final card when host close races the last submission',async()=>{
  let ready!:()=>void,release!:()=>void,waiting=0;const both=new Promise<void>(r=>{ready=r}),gate=new Promise<void>(r=>{release=r});
  const delayed=new Proxy(env.DB,{get(target,prop){if(prop==='batch')return async (...args:Parameters<D1Database['batch']>)=>{if(++waiting<=2){if(waiting===2)ready();await gate}return target.batch(...args)};const v=Reflect.get(target,prop,target);return typeof v==='function'?v.bind(target):v}});
  const pending=Promise.all([worker.fetch(close(),{...bindings,DB:delayed}),worker.fetch(submit('d'),{...bindings,DB:delayed})]);await both;release();const [host,last]=await pending;
  expect(host.status).toBe(200);expect([201,409]).toContain(last.status);
  const row=await env.DB.prepare('SELECT stage,based_on_count AS n FROM consensus_cards').first<{stage:string;n:number}>();expect(row?.stage).toBe('final');expect([3,4]).toContain(row?.n);
  expect(await count('past_cards')).toBe(row?.n);expect(await count('notification_subscriptions')).toBe(0);
  expect((await env.DB.prepare('SELECT count(*) AS n FROM consensus_cards').first<{n:number}>())?.n).toBe(1);
 });
});
