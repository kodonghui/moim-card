import {env} from 'cloudflare:test';
import {beforeEach,describe,expect,it} from 'vitest';
import {hashToken} from '../src/session';
import {readFreshInterimCard} from '../src/responses';
import worker from '../src/worker';
const origin='https://example.test',now=Math.floor(Date.now()/1000),key='12345678-1234-1234-1234-123456789abc';
const bindings={DB:env.DB,USER_HMAC_KEY:'x'.repeat(32),ORIGIN_PUBLIC:origin,ORIGIN_PRIVATE:'https://private.test',TOSS:{fetch:async()=>new Response()}};
const token=(ch:string)=>ch.repeat(43),user=(ch:string)=>ch.repeat(26),answers=Array.from({length:8},(_,i)=>({position:i+1,choice:'A'}));
const req=(ch:string)=>new Request('https://api.test/v1/rooms/ABCDEFGH23/responses',{method:'POST',headers:{origin,'content-type':'application/json',authorization:`Bearer ${token(ch)}`,'Idempotency-Key':key},body:JSON.stringify({answers})});
const count=async(table:string)=>(await env.DB.prepare(`SELECT count(*) AS n FROM ${table}`).first<{n:number}>())!.n;
beforeEach(async()=>{
 for(const ch of ['a','b','c','d','e']) {
  await env.DB.prepare('INSERT INTO users VALUES (?,?,?)').bind(user(ch),ch.repeat(64),now).run();
  await env.DB.prepare('INSERT INTO sessions(token_hash,user_id,created_at,expires_at) VALUES(?,?,?,?)').bind(await hashToken(token(ch)),user(ch),now,now+43200).run();
 }
 await env.DB.prepare("INSERT INTO themes VALUES ('trip','여행',1)").run();
 await env.DB.prepare("INSERT INTO question_sets(theme_id,version,status,default_next_action,content_sha256,published_at) VALUES('trip',1,'published','정해요',?,?)").bind('f'.repeat(64),now).run();
 for(let i=1;i<=8;i++) await env.DB.prepare("INSERT INTO questions(question_set_id,position,prompt,option_a,option_b,split_suggestion,agreed_text_a,agreed_text_b,axis,axis_pole_a) VALUES(1,?,'질문','A','B','조율','A 합의','B 합의','plan_speed','high')").bind(i).run();
 for(const slot of ['plan_speed_low','plan_speed_high','spending_priority_low','spending_priority_high','schedule_change_low','schedule_change_high','balanced']) await env.DB.prepare('INSERT INTO profile_phrases VALUES(1,?,?)').bind(slot,'설명이에요').run();
 await env.DB.prepare("INSERT INTO rooms(code,gathering_name,party_size,question_set_id,participant_count,created_at,expires_at) VALUES('ABCDEFGH23','여행',4,1,5,?,?)").bind(now,now+2592000).run();
 for(const ch of ['a','b','c','d','e']) await env.DB.prepare('INSERT INTO participants(room_id,user_id,role,nickname,joined_at) VALUES(1,?,?,?,?)').bind(user(ch),ch==='a'?'host':'member','이름',now).run();
 for(const ch of ['a','b','c'])expect((await worker.fetch(req(ch),bindings)).status).toBe(201);
 for(const id of [1,2,3]) await env.DB.prepare('INSERT INTO notification_subscriptions(participant_id,room_id,anon_key_ciphertext,nonce,key_version,created_at) VALUES(?,1,?,?,1,?)').bind(id,new Uint8Array(17),new Uint8Array(12),now).run();
});
describe('TASK-022 automatic close',()=>{
 it('commits one final response and immutable card when the final submissions race',async()=>{
  let ready!:()=>void, release!:()=>void, waiting=0;
  const both=new Promise<void>(resolve=>{ready=resolve}),gate=new Promise<void>(resolve=>{release=resolve});
  const delayed=new Proxy(env.DB,{get(target,prop){if(prop==='batch')return async (...args:Parameters<D1Database['batch']>)=>{if(++waiting<=2){if(waiting===2)ready();await gate}return target.batch(...args)};const v=Reflect.get(target,prop,target);return typeof v==='function'?v.bind(target):v}});
  const pending=Promise.all([worker.fetch(req('d'),{...bindings,DB:delayed}),worker.fetch(req('e'),{...bindings,DB:delayed})]);
  await both;release();const responses=await pending;expect(responses.map(r=>r.status).sort()).toEqual([201,409]);
  expect(await responses.find(r=>r.status===201)!.json()).toMatchObject({roomStatus:'closed',submittedCount:4,cardStage:'final'});
  expect(await responses.find(r=>r.status===409)!.json()).toMatchObject({code:'room_closed'});
  expect(await count('responses')).toBe(4);expect(await count('past_cards')).toBe(4);expect(await count('notification_subscriptions')).toBe(0);
  const card=await env.DB.prepare('SELECT stage,based_on_count AS n,items FROM consensus_cards').first<{stage:string;n:number;items:string}>();
  expect(card).toMatchObject({stage:'final',n:4});
  expect((await env.DB.prepare("SELECT status,close_reason AS reason FROM rooms").first())).toEqual({status:'closed',reason:'all_submitted'});
  await expect(env.DB.prepare("UPDATE consensus_cards SET next_action='바꿔요'").run()).rejects.toThrow();
  expect((await env.DB.prepare('SELECT items FROM consensus_cards').first<{items:string}>())?.items).toBe(card?.items);
 });
 it('never falls back for a final response after another submission commits',async()=>{
  await env.DB.prepare('DELETE FROM responses WHERE participant_id=3').run();
  await env.DB.prepare('DELETE FROM idempotency_records WHERE user_id=?').bind(user('c')).run();
  await env.DB.prepare('UPDATE rooms SET submitted_count=2').run();
  await env.DB.prepare('DELETE FROM consensus_cards').run();await readFreshInterimCard(env.DB,1,now);
  await env.DB.prepare(`CREATE TRIGGER test_fail_b_card BEFORE INSERT ON consensus_cards WHEN NEW.items LIKE '%"b":1%' BEGIN SELECT RAISE(ABORT,'interim_card_write_failed'); END`).run();
  let reads=0,interposed=false;
  const delayed=new Proxy(env.DB,{get(target,prop){
   if(prop==='prepare')return (sql:string)=>{
    const stmt=target.prepare(sql);if(!sql.includes('LEFT JOIN responses resp'))return stmt;
    return new Proxy(stmt,{get(statement,key){if(key==='bind')return (...args:unknown[])=>{
     const bound=statement.bind(...args);return new Proxy(bound,{get(query,method){if(method==='first')return async (...args:unknown[])=>{
      const result=await query.first(...args);if(++reads===2){interposed=true;expect((await worker.fetch(req('d'),bindings)).status).toBe(201)}return result;
     };const v=Reflect.get(query,method,query);return typeof v==='function'?v.bind(query):v}});
    };const v=Reflect.get(statement,key,statement);return typeof v==='function'?v.bind(statement):v}});
   };const v=Reflect.get(target,prop,target);return typeof v==='function'?v.bind(target):v;
  }});
  const changed=answers.map((answer,index)=>({...answer,choice:index===0?'B':'A'}));
  const request=new Request('https://api.test/v1/rooms/ABCDEFGH23/responses',{method:'POST',headers:{origin,'content-type':'application/json',authorization:`Bearer ${token('c')}`,'Idempotency-Key':key},body:JSON.stringify({answers:changed})});
  const r=await worker.fetch(request,{...bindings,DB:delayed});expect(interposed).toBe(true);expect(r.status).toBe(500);
  expect(await env.DB.prepare('SELECT status,submitted_count AS n FROM rooms').first()).toEqual({status:'open',n:3});
  expect(await count('responses')).toBe(3);expect(await count('past_cards')).toBe(0);expect(await count('notification_subscriptions')).toBe(2);
  expect(await env.DB.prepare('SELECT stage,based_on_count AS n FROM consensus_cards').first()).toEqual({stage:'interim',n:3});
 });
 it('rolls back the final response and subscriptions when card finalization fails',async()=>{
  await env.DB.prepare("CREATE TRIGGER test_fail_final BEFORE UPDATE ON consensus_cards WHEN NEW.stage='final' BEGIN SELECT RAISE(ABORT, 'interim_card_write_failed'); END").run();
  const r=await worker.fetch(req('d'),bindings);expect(r.status).toBe(500);
  expect(await count('responses')).toBe(3);expect(await count('past_cards')).toBe(0);expect(await count('notification_subscriptions')).toBe(3);
  expect(await env.DB.prepare('SELECT status,submitted_count AS n FROM rooms').first()).toEqual({status:'open',n:3});
  expect((await env.DB.prepare("SELECT count(*) AS n FROM idempotency_records WHERE user_id=?").bind(user('d')).first<{n:number}>())?.n).toBe(0);
 });
});
