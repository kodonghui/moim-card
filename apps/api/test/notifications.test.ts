import {env} from 'cloudflare:test';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {hashToken} from '../src/session';
import {activeNotificationKey,notificationAAD} from '../src/notification-crypto';
import {sendNotifications,type SendSnapshot} from '../src/notifications';
import {notificationLimitSubject} from '../src/notification-limit';
import {checkLimit} from '../src/rate-limit';
import worker from '../src/worker';
const origin='https://example.test',now=Math.floor(Date.now()/1000),key='12345678-1234-1234-1234-123456789abc',identity='fake-notification-identity';
const encoded=btoa(String.fromCharCode(...new Uint8Array(32).fill(7))).replace(/=+$/,'');
const success=()=>Response.json({resultType:'SUCCESS',success:{}});
const bindings=(fetcher:(request:Request)=>Promise<Response>|Response=success)=>({DB:env.DB,USER_HMAC_KEY:'x'.repeat(32),NOTIFICATION_KEYS:JSON.stringify({'1':encoded}),NOTIFICATION_ACTIVE_KEY_VERSION:'1',NOTIFICATION_TEMPLATE_SET_CODE:'fake-template',NOTIFICATION_LIMIT_HMAC_KEY:'independent-fake-notification-limit-key',ORIGIN_PUBLIC:origin,ORIGIN_PRIVATE:'https://private.test',TOSS:{fetch:async(req:Request)=>fetcher(req)}});
const token=(ch:string)=>ch.repeat(43),user=(ch:string)=>ch.repeat(26),answers=Array.from({length:8},(_,i)=>({position:i+1,choice:'A'}));
const req=(ch:string)=>new Request('https://api.test/v1/rooms/ABCDEFGH23/responses',{method:'POST',headers:{origin,'content-type':'application/json',authorization:`Bearer ${token(ch)}`,'Idempotency-Key':key},body:JSON.stringify({answers})});
const context=()=>{const pending:Promise<unknown>[]=[];return {pending,ctx:{waitUntil:(p:Promise<unknown>)=>pending.push(p),passThroughOnException:()=>{},props:{}} as ExecutionContext}};
const close=()=>env.DB.batch([env.DB.prepare("UPDATE rooms SET status='closed',close_reason='host_closed',closed_at=? WHERE id=1").bind(now),env.DB.prepare('DELETE FROM notification_subscriptions WHERE room_id=1')]);
let snapshot:SendSnapshot;
beforeEach(async()=>{
 vi.spyOn(Date,'now').mockReturnValue(now*1000);
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
afterEach(()=>vi.restoreAllMocks());
describe('TASK-032 notification delivery',()=>{
 it('sends after commit and does not resend an idempotent replay',async()=>{
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
 it('does not send when the room is closed even if the subscription still exists',async()=>{
  await env.DB.prepare("INSERT INTO notification_sends VALUES(1,1,1,2,'pending',NULL,?)").bind(now).run();
  await env.DB.prepare("UPDATE rooms SET status='closed',close_reason='host_closed',closed_at=? WHERE id=1").bind(now).run();
  expect((await env.DB.prepare('SELECT count(*) n FROM notification_subscriptions').first<{n:number}>())?.n).toBe(1);
  const fetch=vi.fn(success);await sendNotifications(bindings(fetch),[snapshot],false);expect(fetch).not.toHaveBeenCalled();
 });
 it('does not send when only the subscription is deleted while the room remains open',async()=>{
  await env.DB.prepare("INSERT INTO notification_sends VALUES(1,1,1,2,'pending',NULL,?)").bind(now).run();
  await env.DB.prepare('DELETE FROM notification_subscriptions WHERE id=1').run();
  expect((await env.DB.prepare('SELECT status FROM rooms').first<{status:string}>())?.status).toBe('open');
  const fetch=vi.fn(success);await sendNotifications(bindings(fetch),[snapshot],false);expect(fetch).not.toHaveBeenCalled();
 });
 it('does not send when the open room has expired',async()=>{
  await env.DB.prepare("INSERT INTO notification_sends VALUES(1,1,1,2,'pending',NULL,?)").bind(now).run();
  await env.DB.prepare('UPDATE rooms SET created_at=?,expires_at=? WHERE id=1').bind(now-2592001,now-1).run();
  const fetch=vi.fn(success);await sendNotifications(bindings(fetch),[snapshot],false);expect(fetch).not.toHaveBeenCalled();
 });
 it('does not send after recipient deletion in an open room or a final-response snapshot',async()=>{
  await env.DB.prepare("INSERT INTO notification_sends VALUES(1,1,1,2,'pending',NULL,?)").bind(now).run();
  await env.DB.prepare('DELETE FROM participants WHERE id=1').run();
  const fetch=vi.fn(success);await sendNotifications(bindings(fetch),[snapshot],false);expect(fetch).not.toHaveBeenCalled();
  await env.DB.prepare("UPDATE rooms SET status='closed',close_reason='all_submitted',closed_at=? WHERE id=1").bind(now).run();
  await env.DB.prepare("UPDATE notification_sends SET result='pending' WHERE id=1").run();
  await sendNotifications(bindings(fetch),[snapshot],true);expect(fetch).not.toHaveBeenCalled();
 });
 it('skips the per-identity limit and keeps the committed response on partner failure',async()=>{
  const fetch=vi.fn(()=>new Response('',{status:500})),e=bindings(fetch),{ctx,pending}=context();
  await env.DB.prepare("INSERT INTO rate_counters VALUES('toss_send_key',?,?,10)").bind(await notificationLimitSubject(new TextEncoder().encode(identity),e),Math.floor(now/60)*60).run();
  expect((await worker.fetch(req('b'),e,ctx)).status).toBe(201);await Promise.all(pending);expect(fetch).not.toHaveBeenCalled();
  expect(await env.DB.prepare('SELECT result FROM notification_sends').first()).toEqual({result:'skipped_limit'});
  await env.DB.prepare('DELETE FROM rate_counters').run();expect((await worker.fetch(req('c'),e,ctx)).status).toBe(201);await Promise.all(pending);
  expect(fetch).toHaveBeenCalledTimes(1);expect((await env.DB.prepare('SELECT count(*) n FROM responses').first<{n:number}>())?.n).toBe(3);
  expect((await env.DB.prepare("SELECT count(*) n FROM notification_sends WHERE result='failed'").first<{n:number}>())?.n).toBe(1);
 });
 it('aborts a stalled partner call after five seconds without logging identity',async()=>{
  await env.DB.prepare("INSERT INTO notification_sends VALUES(1,1,1,2,'pending',NULL,?)").bind(now).run();
  let ready!:()=>void;const reached=new Promise<void>(r=>{ready=r});
  const fetch=vi.fn(async()=>{ready();return new Promise<Response>(()=>{})});
  const logs=(['log','error','warn','info','debug'] as const).map(method=>vi.spyOn(console,method).mockImplementation(()=>{}));
  const pending=sendNotifications(bindings(fetch),[snapshot],false);await reached;const started=performance.now();
  await pending;
  expect(performance.now()-started).toBeLessThan(5500);
  expect(fetch).toHaveBeenCalledTimes(1);expect(await env.DB.prepare('SELECT result FROM notification_sends').first()).toEqual({result:'failed'});
  for(const log of logs){expect(JSON.stringify(log.mock.calls)).not.toContain(identity);log.mockRestore()}
 },10000);
 it('keeps the identity quota after deleting and recreating a user',async()=>{
  const e=bindings(),subject=await notificationLimitSubject(new TextEncoder().encode(identity),e),minute=Math.floor(now/60)*60;
  await env.DB.prepare("INSERT INTO rate_counters VALUES('toss_send_key',?,?,10)").bind(subject,minute).run();
  const deletion=new Request('https://api.test/v1/me',{method:'DELETE',headers:{origin,authorization:`Bearer ${token('a')}`,'Idempotency-Key':key}});
  expect((await worker.fetch(deletion,e)).status).toBe(204);
  expect((await env.DB.prepare("SELECT count(*) n FROM rate_counters WHERE scope='toss_send_key' AND subject=?").bind(subject).first<{n:number}>())?.n).toBe(1);
  await env.DB.prepare('INSERT INTO users VALUES (?,?,?)').bind(user('d'),'a'.repeat(64),now).run();
  await env.DB.prepare("INSERT INTO rooms(code,gathering_name,party_size,question_set_id,created_at,expires_at) VALUES('BBBBBBBB23','여행',3,1,?,?)").bind(now,now+2592000).run();
  await env.DB.prepare("INSERT INTO participants(room_id,user_id,role,nickname,joined_at) VALUES(2,?,'member','이름',?)").bind(user('d'),now).run();
  const participant=(await env.DB.prepare('SELECT id FROM participants WHERE room_id=2').first<{id:number}>())!.id;
  await env.DB.prepare("INSERT INTO responses VALUES(?,2,'AAAAAAAA',?)").bind(participant,now).run();
  const nonce=new Uint8Array(12).fill(2),aes=await activeNotificationKey(e),ciphertext=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv:nonce,additionalData:notificationAAD(2,participant,1)},aes.key,new TextEncoder().encode(identity)));
  await env.DB.prepare('INSERT INTO notification_subscriptions(participant_id,room_id,anon_key_ciphertext,nonce,key_version,created_at) VALUES(?,2,?,?,1,?)').bind(participant,ciphertext,nonce,now).run();
  const subscription=(await env.DB.prepare('SELECT id FROM notification_subscriptions WHERE room_id=2').first<{id:number}>())!.id;
  await env.DB.prepare("INSERT INTO notification_sends(room_id,subscription_id,trigger_participant_id,result,created_at) VALUES(2,?,2,'pending',?)").bind(subscription,now).run();
  const fetch=vi.fn(success);await sendNotifications(bindings(fetch),[{sendId:1,roomId:2,subscriptionId:subscription,participantId:participant,userId:user('d'),ciphertext:[...ciphertext],nonce:[...nonce],keyVersion:1}],false);
  expect(fetch).not.toHaveBeenCalled();expect(await env.DB.prepare('SELECT result FROM notification_sends').first()).toEqual({result:'skipped_limit'});
 });
 it('deletes expired limit rows atomically with reservation, including rollback on failure',async()=>{
  const subject='h'+'b'.repeat(25),minute=Math.floor(now/60)*60;
  await env.DB.prepare("INSERT INTO rate_counters VALUES('toss_send_key',?,?,1)").bind(subject,minute-60).run();
  await env.DB.prepare("CREATE TRIGGER fail_limit BEFORE INSERT ON rate_counters WHEN NEW.scope='toss_api_user' BEGIN SELECT RAISE(ABORT,'fail_limit'); END").run();
  await expect(checkLimit(env.DB,'send',user('a'),now,()=>{},subject)).rejects.toThrow();
  expect((await env.DB.prepare("SELECT count(*) n FROM rate_counters WHERE scope='toss_send_key' AND window_start=?").bind(minute-60).first<{n:number}>())?.n).toBe(1);
  await env.DB.prepare('DROP TRIGGER fail_limit').run();
  expect(await checkLimit(env.DB,'send',user('a'),now,()=>{},subject)).toBeNull();
  expect((await env.DB.prepare("SELECT window_start FROM rate_counters WHERE scope='toss_send_key'").all()).results).toEqual([{window_start:minute}]);
 });
 it('requires a separate notification limit secret',async()=>{
  const e=bindings(),plain=new TextEncoder().encode(identity);
  await expect(notificationLimitSubject(plain,{...e,NOTIFICATION_LIMIT_HMAC_KEY:e.USER_HMAC_KEY})).rejects.toThrow();
  await expect(notificationLimitSubject(plain,{...e,NOTIFICATION_LIMIT_HMAC_KEY:''})).rejects.toThrow();
  await expect(notificationLimitSubject(plain,{...e,NOTIFICATION_LIMIT_HMAC_KEY:encoded})).rejects.toThrow();
  await expect(notificationLimitSubject(plain,{...e,NOTIFICATION_LIMIT_HMAC_KEY:String.fromCharCode(...new Uint8Array(32).fill(7))})).rejects.toThrow();
  expect(await notificationLimitSubject(plain,e)).toMatch(/^h[0-9a-f]{25}$/);
 });
});
