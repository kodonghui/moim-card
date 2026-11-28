import {env} from 'cloudflare:test';
import {beforeEach,describe,expect,it,vi} from 'vitest';
import {hashToken} from '../src/session';
import {activeNotificationKey,notificationAAD} from '../src/notification-crypto';
import {sendNotifications,type SendSnapshot} from '../src/notifications';
import worker from '../src/worker';
const origin='https://example.test',now=Math.floor(Date.now()/1000),key='12345678-1234-1234-1234-123456789abc',identity='fake-notification-identity';
const encoded=btoa(String.fromCharCode(...new Uint8Array(32).fill(7))).replace(/=+$/,'');
const success=()=>Response.json({resultType:'SUCCESS',success:{}});
const bindings=(fetcher:(request:Request)=>Promise<Response>|Response=success)=>({DB:env.DB,USER_HMAC_KEY:'x'.repeat(32),NOTIFICATION_KEYS:JSON.stringify({'1':encoded}),NOTIFICATION_ACTIVE_KEY_VERSION:'1',NOTIFICATION_TEMPLATE_SET_CODE:'fake-template',ORIGIN_PUBLIC:origin,ORIGIN_PRIVATE:'https://private.test',TOSS:{fetch:async(req:Request)=>fetcher(req)}});
const token=(ch:string)=>ch.repeat(43),user=(ch:string)=>ch.repeat(26),answers=Array.from({length:8},(_,i)=>({position:i+1,choice:'A'}));
const req=(ch:string)=>new Request('https://api.test/v1/rooms/ABCDEFGH23/responses',{method:'POST',headers:{origin,'content-type':'application/json',authorization:`Bearer ${token(ch)}`,'Idempotency-Key':key},body:JSON.stringify({answers})});
const context=()=>{const pending:Promise<unknown>[]=[];return {pending,ctx:{waitUntil:(p:Promise<unknown>)=>pending.push(p),passThroughOnException:()=>{},props:{}} as ExecutionContext}};
const close=()=>env.DB.batch([env.DB.prepare("UPDATE rooms SET status='closed',close_reason='host_closed',closed_at=? WHERE id=1").bind(now),env.DB.prepare('DELETE FROM notification_subscriptions WHERE room_id=1')]);
let snapshot:SendSnapshot;
beforeEach(async()=>{
 for(const ch of ['a','b','c']){await env.DB.prepare('INSERT INTO users VALUES (?,?,?)').bind(user(ch),ch.repeat(64),now).run();await env.DB.prepare('INSERT INTO sessions(token_hash,user_id,created_at,expires_at) VALUES(?,?,?,?)').bind(await hashToken(token(ch)),user(ch),now,now+43200).run()}
 await env.DB.prepare("INSERT INTO themes VALUES ('trip','여행',1)").run();
 await env.DB.prepare("INSERT INTO question_sets(theme_id,version,status,default_next_action,content_sha256,published_at) VALUES('trip',1,'published','정해요',?,?)").bind('f'.repeat(64),now).run();
 for(let i=1;i<=8;i++)await env.DB.prepare("INSERT INTO questions(question_set_id,position,prompt,option_a,option_b,split_suggestion,agreed_text_a,agreed_text_b,axis,axis_pole_a) VALUES(1,?,'질문','A','B','조율','A 합의','B 합의','plan_speed','high')").bind(i).run();
 for(const slot of ['plan_speed_low','plan_speed_high','spending_priority_low','spending_priority_high','schedule_change_low','schedule_change_high','balanced'])await env.DB.prepare('INSERT INTO profile_phrases VALUES(1,?,?)').bind(slot,'설명이에요').run();
 await env.DB.prepare("INSERT INTO rooms(code,gathering_name,party_size,question_set_id,participant_count,submitted_count,created_at,expires_at) VALUES('ABCDEFGH23','여행',3,1,3,1,?,?)").bind(now,now+2592000).run();
 for(const ch of ['a','b','c'])await env.DB.prepare('INSERT INTO participants(room_id,user_id,role,nickname,joined_at) VALUES(1,?,?,?,?)').bind(user(ch),ch==='a'?'host':'member','이름',now).run();
 await env.DB.prepare("INSERT INTO responses VALUES(1,1,'AAAAAAAA',?)").bind(now).run();
 const cryptoKey=await activeNotificationKey(bindings()),nonce=new Uint8Array(12).fill(1),ciphertext=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv:nonce,additionalData:notificationAAD(1,1,1)},cryptoKey.key,new TextEncoder().encode(identity)));
 await env.DB.prepare('INSERT INTO notification_subscriptions(participant_id,room_id,anon_key_ciphertext,nonce,key_version,created_at) VALUES(1,1,?,?,1,?)').bind(ciphertext,nonce,now).run();
 snapshot={sendId:1,roomId:1,subscriptionId:1,participantId:1,userId:user('a'),ciphertext:[...ciphertext],nonce:[...nonce],keyVersion:1};
});
describe('TASK-032 notification delivery',()=>{
 it('sends after commit, excludes the submitter, and does not resend an idempotent replay',async()=>{
  const fetch=vi.fn(success),e=bindings(fetch),{ctx,pending}=context(),log=vi.spyOn(console,'log').mockImplementation(()=>{});
  expect((await worker.fetch(req('b'),e,ctx)).status).toBe(201);await Promise.all(pending);
  expect(fetch).toHaveBeenCalledTimes(1);expect(fetch.mock.calls[0][0].headers.get('x-anon-key')).toBe(identity);
  expect(await env.DB.prepare('SELECT result FROM notification_sends').first()).toEqual({result:'sent'});
  expect((await worker.fetch(req('b'),e,ctx)).status).toBe(201);await Promise.all(pending);expect(fetch).toHaveBeenCalledTimes(1);
  expect(JSON.stringify(log.mock.calls)).not.toContain(identity);log.mockRestore();
 });
 it('sends the last response after its closing transaction deletes ciphertext',async()=>{
  const fetch=vi.fn(success),e=bindings(fetch),{ctx,pending}=context();
  expect((await worker.fetch(req('b'),e,ctx)).status).toBe(201);await Promise.all(pending);fetch.mockClear();
  expect((await worker.fetch(req('c'),e,ctx)).status).toBe(201);
  expect((await env.DB.prepare('SELECT count(*) n FROM notification_subscriptions').first<{n:number}>())?.n).toBe(0);
  await Promise.all(pending);expect(fetch).toHaveBeenCalledTimes(1);
  expect((await env.DB.prepare("SELECT count(*) n FROM notification_sends WHERE result='sent'").first<{n:number}>())?.n).toBe(2);
 });
 it('does not start a send if the close commits before subscription confirmation',async()=>{
  await env.DB.prepare("INSERT INTO notification_sends VALUES(1,1,1,2,'pending',NULL,?)").bind(now).run();
  let ready!:()=>void,release!:()=>void;const reached=new Promise<void>(r=>{ready=r}),gate=new Promise<void>(r=>{release=r});
  const delayed=new Proxy(env.DB,{get(target,prop){if(prop==='prepare')return (sql:string)=>{const stmt=target.prepare(sql);if(!sql.includes('SELECT 1 AS ok FROM notification_sends'))return stmt;return new Proxy(stmt,{get(q,k){if(k==='bind')return (...args:unknown[])=>{const b=q.bind(...args);return new Proxy(b,{get(query,m){if(m==='first')return async()=>{ready();await gate;return query.first()};const v=Reflect.get(query,m,query);return typeof v==='function'?v.bind(query):v}})};const v=Reflect.get(q,k,q);return typeof v==='function'?v.bind(q):v}})};const v=Reflect.get(target,prop,target);return typeof v==='function'?v.bind(target):v}});
  const fetch=vi.fn(success),pending=sendNotifications({...bindings(fetch),DB:delayed},[snapshot],false);await reached;await close();release();await pending;
  expect(fetch).not.toHaveBeenCalled();expect(await env.DB.prepare('SELECT result FROM notification_sends').first()).toEqual({result:'failed'});
 });
 it('finishes a send already started before close commits',async()=>{
  await env.DB.prepare("INSERT INTO notification_sends VALUES(1,1,1,2,'pending',NULL,?)").bind(now).run();
  let ready!:()=>void,release!:()=>void;const reached=new Promise<void>(r=>{ready=r}),gate=new Promise<void>(r=>{release=r});
  const fetch=vi.fn(async()=>{ready();await gate;return success()}),pending=sendNotifications(bindings(fetch),[snapshot],false);await reached;await close();release();await pending;
  expect(fetch).toHaveBeenCalledTimes(1);expect(await env.DB.prepare('SELECT result FROM notification_sends').first()).toEqual({result:'sent'});
 });
 it('skips the per-identity limit and keeps the committed response on partner failure',async()=>{
  const fetch=vi.fn(()=>new Response('',{status:500})),e=bindings(fetch),{ctx,pending}=context();
  await env.DB.prepare("INSERT INTO rate_counters VALUES('toss_send_key',?,?,10)").bind(user('a'),Math.floor(now/60)*60).run();
  expect((await worker.fetch(req('b'),e,ctx)).status).toBe(201);await Promise.all(pending);expect(fetch).not.toHaveBeenCalled();
  expect(await env.DB.prepare('SELECT result FROM notification_sends').first()).toEqual({result:'skipped_limit'});
  await env.DB.prepare('DELETE FROM rate_counters').run();expect((await worker.fetch(req('c'),e,ctx)).status).toBe(201);await Promise.all(pending);
  expect(fetch).toHaveBeenCalledTimes(1);expect((await env.DB.prepare('SELECT count(*) n FROM responses').first<{n:number}>())?.n).toBe(3);
  expect((await env.DB.prepare("SELECT count(*) n FROM notification_sends WHERE result='failed'").first<{n:number}>())?.n).toBe(1);
 });
 it('aborts a stalled partner call after five seconds without logging identity',async()=>{
  await env.DB.prepare("INSERT INTO notification_sends VALUES(1,1,1,2,'pending',NULL,?)").bind(now).run();
  let ready!:()=>void;const reached=new Promise<void>(r=>{ready=r});
  const fetch=vi.fn(async()=>{ready();return new Promise<Response>(()=>{})}),logs=vi.spyOn(console,'log').mockImplementation(()=>{});
  const pending=sendNotifications(bindings(fetch),[snapshot],false);await reached;
  await pending;
  expect(fetch).toHaveBeenCalledTimes(1);expect(await env.DB.prepare('SELECT result FROM notification_sends').first()).toEqual({result:'failed'});
  expect(JSON.stringify(logs.mock.calls)).not.toContain(identity);logs.mockRestore();
 },10000);
});
