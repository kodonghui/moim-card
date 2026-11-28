import {env} from 'cloudflare:test';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {hashToken} from '../src/session';
import {readFreshInterimCard} from '../src/responses';
import worker from '../src/worker';
const origin='https://example.test', now=Math.floor(Date.now()/1000), userA='a'.repeat(26),userB='b'.repeat(26),userC='c'.repeat(26),tokenA='a'.repeat(43),tokenB='b'.repeat(43),tokenC='c'.repeat(43),key='12345678-1234-1234-1234-123456789abc';
const bindings={DB:env.DB,USER_HMAC_KEY:'x'.repeat(32),ORIGIN_PUBLIC:origin,ORIGIN_PRIVATE:'https://private.test',TOSS:{fetch:async()=>new Response()}};
const answers=Array.from({length:8},(_,i)=>({position:i+1,choice:'A'}));
const req=(token=tokenA,data:unknown={answers},k=key,code='ABCDEFGH23',o=origin)=>new Request(`https://api.test/v1/rooms/${code}/responses`,{method:'POST',headers:{origin:o,'content-type':'application/json',...(token?{authorization:`Bearer ${token}`} : {}),...(k?{'Idempotency-Key':k}:{})},body:JSON.stringify(data)});
const count=async(table:string)=>(await env.DB.prepare(`SELECT count(*) AS n FROM ${table}`).first<{n:number}>())!.n;
beforeEach(async()=>{
 for(const [id,token,ch] of [[userA,tokenA,'a'],[userB,tokenB,'b'],[userC,tokenC,'c']]) {
  await env.DB.prepare('INSERT INTO users VALUES (?,?,?)').bind(id,ch.repeat(64),now).run();
  await env.DB.prepare('INSERT INTO sessions(token_hash,user_id,created_at,expires_at) VALUES(?,?,?,?)').bind(await hashToken(token),id,now,now+43200).run();
 }
 await env.DB.prepare("INSERT INTO themes VALUES ('trip','여행',1)").run();
 await env.DB.prepare("INSERT INTO question_sets(theme_id,version,status,default_next_action,content_sha256,published_at) VALUES('trip',1,'published','정해요',?,?)").bind('d'.repeat(64),now).run();
 for(let i=1;i<=8;i++) await env.DB.prepare("INSERT INTO questions(question_set_id,position,prompt,option_a,option_b,split_suggestion,agreed_text_a,agreed_text_b,axis,axis_pole_a) VALUES(1,?,'질문','A','B','조율','A 합의','B 합의','plan_speed','high')").bind(i).run();
 for(const slot of ['plan_speed_low','plan_speed_high','spending_priority_low','spending_priority_high','schedule_change_low','schedule_change_high','balanced']) await env.DB.prepare('INSERT INTO profile_phrases VALUES(1,?,?)').bind(slot,'설명이에요').run();
 await env.DB.prepare("INSERT INTO rooms(code,gathering_name,party_size,question_set_id,participant_count,created_at,expires_at) VALUES('ABCDEFGH23','여행',4,1,3,?,?)").bind(now,now+2592000).run();
 for(const [id,role] of [[userA,'host'],[userB,'member'],[userC,'member']]) await env.DB.prepare('INSERT INTO participants(room_id,user_id,role,nickname,joined_at) VALUES(1,?,?,?,?)').bind(id,role,'이름',now).run();
});
beforeEach(()=>{vi.spyOn(Date,'now').mockReturnValue(now*1000)});
afterEach(()=>vi.restoreAllMocks());
describe('TASK-021 API-007 submit response',()=>{
 it('creates a first response and second interim card exactly once',async()=>{
  let r=await worker.fetch(req(),bindings);expect(r.status).toBe(201);expect(await r.json()).toMatchObject({submittedCount:1,cardStage:'none',logConversion:false});
  r=await worker.fetch(req(tokenB),bindings);expect(r.status).toBe(201);expect(await r.json()).toMatchObject({submittedCount:2,cardStage:'interim',logConversion:true});
  expect((await env.DB.prepare('SELECT based_on_count AS n FROM consensus_cards').first<{n:number}>())?.n).toBe(2);
  expect((await worker.fetch(req(tokenB),bindings)).status).toBe(201);
  r=await worker.fetch(req(tokenC),bindings);expect(await r.json()).toMatchObject({submittedCount:3,logConversion:false});
  expect((await env.DB.prepare('SELECT based_on_count AS n FROM consensus_cards').first<{n:number}>())?.n).toBe(3);
 });
 it('validates seven answers with missing position and rejects a second submission',async()=>{
  let r=await worker.fetch(req(tokenA,{answers:answers.slice(0,7)}),bindings);expect(r.status).toBe(400);expect(await r.json()).toMatchObject({code:'validation_failed',errors:[{field:'answers',reason:'wrong_count',positions:[8]}]});expect(await count('responses')).toBe(0);expect(await count('rate_counters')).toBe(0);
  await worker.fetch(req(tokenA,{answers},'22345678-1234-1234-1234-123456789abc'),bindings);
  r=await worker.fetch(req(tokenA,{answers},'32345678-1234-1234-1234-123456789abc'),bindings);expect(r.status).toBe(409);expect(await r.json()).toMatchObject({code:'already_submitted'});
 });
 it('returns 401, 403, 404 and 429 with Retry-After',async()=>{
  expect((await worker.fetch(req(''),bindings)).status).toBe(401);
  expect((await worker.fetch(req(tokenA,{answers},key,'ABCDEFGH23','https://bad.test'),bindings)).status).toBe(403);
  let r=await worker.fetch(req(tokenA,{answers},key,'bad'),bindings);expect(r.status).toBe(404);expect(await r.json()).toMatchObject({code:'room_not_found'});
  await env.DB.prepare("INSERT INTO rate_counters VALUES('write',?,?,60) ON CONFLICT(scope,subject,window_start) DO UPDATE SET count=60").bind(userB,Math.floor(now/60)*60).run();
  r=await worker.fetch(req(tokenB),bindings);expect(r.status).toBe(429);expect(Number(r.headers.get('Retry-After'))).toBeGreaterThan(0);
 });
 it('rejects a nonparticipant and a closed room',async()=>{
  await env.DB.prepare('DELETE FROM participants WHERE user_id=?').bind(userC).run();
  let r=await worker.fetch(req(tokenC),bindings);expect(r.status).toBe(403);expect(await r.json()).toMatchObject({code:'not_participant'});
  await env.DB.prepare("UPDATE rooms SET status='closed',close_reason='host_closed',closed_at=?").bind(now).run();
  r=await worker.fetch(req(tokenA),bindings);expect(r.status).toBe(409);expect(await r.json()).toMatchObject({code:'room_closed'});
 });
 it('preserves the response and repairs the interim card after a confirmed card write failure',async()=>{
  expect((await worker.fetch(req(),bindings)).status).toBe(201);
  await env.DB.prepare("CREATE TRIGGER test_fail_card BEFORE INSERT ON consensus_cards BEGIN SELECT RAISE(ABORT, 'interim_card_write_failed'); END").run();
  const r=await worker.fetch(req(tokenB),bindings);expect(r.status).toBe(201);expect(await count('responses')).toBe(2);expect(await count('consensus_cards')).toBe(0);
  expect((await env.DB.prepare("SELECT count FROM rate_counters WHERE scope='write' AND subject=?").bind(userB).first<{count:number}>())?.count).toBe(1);
  expect((await worker.fetch(req(tokenB),bindings)).status).toBe(201);expect(await count('responses')).toBe(2);
  await env.DB.prepare('DROP TRIGGER test_fail_card').run();
  expect(await readFreshInterimCard(env.DB,1,now)).toMatchObject({basedOnCount:2});expect(await count('consensus_cards')).toBe(1);
 });
 it('does not use the fallback when the card failure is not identifiable',async()=>{
  expect((await worker.fetch(req(),bindings)).status).toBe(201);
  await env.DB.prepare("CREATE TRIGGER test_unknown_card_failure BEFORE INSERT ON consensus_cards BEGIN SELECT RAISE(ABORT, 'disk_full'); END").run();
  const r=await worker.fetch(req(tokenB),bindings);expect(r.status).toBe(500);expect(await count('responses')).toBe(1);
  expect((await env.DB.prepare('SELECT count(*) AS n FROM idempotency_records WHERE user_id=?').bind(userB).first<{n:number}>())?.n).toBe(0);
  expect((await env.DB.prepare("SELECT count(*) AS n FROM rate_counters WHERE scope='write' AND subject=?").bind(userB).first<{n:number}>())?.n).toBe(0);
 });
 it('serializes concurrent interim submissions and keeps a complete card',async()=>{
  await worker.fetch(req(),bindings);
  let ready!:()=>void, release!:()=>void, waiting=0;
  const both=new Promise<void>(resolve=>{ready=resolve}),gate=new Promise<void>(resolve=>{release=resolve});
  const delayed=new Proxy(env.DB,{get(target,prop){if(prop==='batch')return async (...args:Parameters<D1Database['batch']>)=>{if(++waiting<=2){if(waiting===2)ready();await gate}return target.batch(...args)};const v=Reflect.get(target,prop,target);return typeof v==='function'?v.bind(target):v}});
  const pending=Promise.all([worker.fetch(req(tokenB),{...bindings,DB:delayed}),worker.fetch(req(tokenC),{...bindings,DB:delayed})]);
  await both;release();const results=await pending;
  expect(results.map(r=>r.status)).toEqual([201,201]);
  expect((await env.DB.prepare('SELECT based_on_count AS n FROM consensus_cards').first<{n:number}>())?.n).toBe(3);
  const bodies=await Promise.all(results.map(r=>r.json() as Promise<{logConversion:boolean}>));expect(bodies.filter(b=>b.logConversion)).toHaveLength(1);
 });
});
