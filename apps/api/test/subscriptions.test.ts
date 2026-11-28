import {env} from 'cloudflare:test';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {hashToken} from '../src/session';
import {identityHash} from '../src/identity';
import {activeNotificationKey,notificationKeyForVersion,notificationAAD} from '../src/notification-crypto';
import worker from '../src/worker';
const origin='https://example.test',token='a'.repeat(43),user='a'.repeat(26),now=Math.floor(Date.now()/1000),key='12345678-1234-1234-1234-123456789abc', key2='22345678-1234-1234-1234-123456789abc',secret='x'.repeat(32),anon='anonymous-test-identity';
const encoded=btoa(String.fromCharCode(...new Uint8Array(32).fill(7))).replace(/=+$/,'').replace(/\+/g,'-').replace(/\//g,'_');
const success=()=>Response.json({resultType:'SUCCESS',success:{anonKey:anon}});
const bindings=(fetcher:(request:Request)=>Response|Promise<Response>=success)=>({DB:env.DB,USER_HMAC_KEY:secret,NOTIFICATION_KEYS:JSON.stringify({'1':encoded}),NOTIFICATION_ACTIVE_KEY_VERSION:'1',ORIGIN_PUBLIC:origin,ORIGIN_PRIVATE:'https://private.test',TOSS:{fetch:async(req:Request)=>fetcher(req)}});
const req=(data:unknown={authCode:'valid-code'},k=key,auth=true,code='ABCDEFGH23',o=origin)=>new Request(`https://api.test/v1/rooms/${code}/notification-subscription`,{method:'POST',headers:{origin:o,'content-type':'application/json',...(auth?{authorization:`Bearer ${token}`} : {}),...(k?{'Idempotency-Key':k}:{})},body:JSON.stringify(data)});
const count=async(table:string)=>(await env.DB.prepare(`SELECT count(*) AS n FROM ${table}`).first<{n:number}>())!.n;
beforeEach(async()=>{
 await env.DB.prepare('INSERT INTO users VALUES (?,?,?)').bind(user,await identityHash(anon,secret),now).run();
 await env.DB.prepare('INSERT INTO sessions(token_hash,user_id,created_at,expires_at) VALUES(?,?,?,?)').bind(await hashToken(token),user,now,now+43200).run();
 await env.DB.prepare("INSERT INTO themes VALUES ('trip','여행',1)").run();
 await env.DB.prepare("INSERT INTO question_sets(theme_id,version,status,default_next_action,content_sha256,published_at) VALUES('trip',1,'published','정해요',?,?)").bind('d'.repeat(64),now).run();
 await env.DB.prepare("INSERT INTO rooms(code,gathering_name,party_size,question_set_id,created_at,expires_at) VALUES('ABCDEFGH23','여행',4,1,?,?)").bind(now,now+2592000).run();
 await env.DB.prepare("INSERT INTO participants(room_id,user_id,role,nickname,joined_at) VALUES(1,?,'host','이름',?)").bind(user,now).run();
 await env.DB.prepare("INSERT INTO responses VALUES(1,1,'AAAAAAAA',?)").bind(now).run();
});
beforeEach(()=>{vi.spyOn(Date,'now').mockReturnValue(now*1000)});
afterEach(()=>vi.restoreAllMocks());
describe('TASK-031 API-011 notification subscription',()=>{
 it('encrypts identity with fresh AES-GCM nonce and replays without a second Toss call',async()=>{
  const fetch=vi.fn(success),e=bindings(fetch),log=vi.spyOn(console,'log').mockImplementation(()=>{});
  const first=await worker.fetch(req(),e);expect(first.status).toBe(201);expect(await first.json()).toEqual({subscribed:true});
  expect((await worker.fetch(req(),e)).status).toBe(201);expect((await worker.fetch(req({authCode:'another'},key2),e)).status).toBe(200);expect(fetch).toHaveBeenCalledTimes(1);
  const row=await env.DB.prepare('SELECT participant_id,room_id,anon_key_ciphertext,nonce,key_version FROM notification_subscriptions').first<{participant_id:number;room_id:number;anon_key_ciphertext:ArrayBuffer;nonce:ArrayBuffer;key_version:number}>();
  expect(row?.key_version).toBe(1);expect(new Uint8Array(row!.nonce)).toHaveLength(12);
  expect(new TextDecoder().decode(new Uint8Array(row!.anon_key_ciphertext))).not.toContain(anon);
  const aes=await activeNotificationKey(e);expect(aes.key.usages).toEqual(['encrypt']);const decryptKey=await notificationKeyForVersion(e,1,'decrypt');const plaintext=await crypto.subtle.decrypt({name:'AES-GCM',iv:new Uint8Array(row!.nonce),additionalData:notificationAAD(row!.room_id,row!.participant_id,row!.key_version)},decryptKey,new Uint8Array(row!.anon_key_ciphertext));
  expect(new TextDecoder().decode(plaintext)).toBe(anon);
  for(const [room,participant,version] of [[row!.room_id+1,row!.participant_id,1],[row!.room_id,row!.participant_id+1,1],[row!.room_id,row!.participant_id,2]])await expect(crypto.subtle.decrypt({name:'AES-GCM',iv:new Uint8Array(row!.nonce),additionalData:notificationAAD(room,participant,version)},decryptKey,new Uint8Array(row!.anon_key_ciphertext))).rejects.toThrow();
  const rotated={...e,NOTIFICATION_KEYS:JSON.stringify({'1':encoded,'2':btoa(String.fromCharCode(...new Uint8Array(32).fill(8))).replace(/=+$/,'')}),NOTIFICATION_ACTIVE_KEY_VERSION:'2'};expect((await activeNotificationKey(rotated)).version).toBe(2);expect(new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:new Uint8Array(row!.nonce),additionalData:notificationAAD(row!.room_id,row!.participant_id,1)},await notificationKeyForVersion(rotated,1,'decrypt'),new Uint8Array(row!.anon_key_ciphertext)))).toBe(anon);
  await expect(notificationKeyForVersion({...rotated,NOTIFICATION_KEYS:JSON.stringify({'1':encoded,'2':'bad'})},1,'decrypt')).rejects.toThrow();
  expect((await env.DB.prepare("SELECT count FROM rate_counters WHERE scope='write' AND subject=?").bind(user).first<{count:number}>())?.count).toBe(1);expect(JSON.stringify(log.mock.calls)).not.toContain(anon);log.mockRestore();
 });
 it('uses independent nonces for distinct subscriptions',async()=>{
  expect((await worker.fetch(req(),bindings())).status).toBe(201);
  await env.DB.prepare("INSERT INTO rooms(code,gathering_name,party_size,question_set_id,created_at,expires_at) VALUES('BBBBBBBB23','여행',4,1,?,?)").bind(now,now+2592000).run();
  await env.DB.prepare("INSERT INTO participants(room_id,user_id,role,nickname,joined_at) VALUES(2,?,'host','이름',?)").bind(user,now).run();
  await env.DB.prepare("INSERT INTO responses VALUES(2,2,'AAAAAAAA',?)").bind(now).run();
  expect((await worker.fetch(req({authCode:'second'},key2,true,'BBBBBBBB23'),bindings())).status).toBe(201);
  const rows=(await env.DB.prepare('SELECT nonce FROM notification_subscriptions ORDER BY id').all<{nonce:ArrayBuffer}>()).results;
  expect([...new Uint8Array(rows[0].nonce)]).not.toEqual([...new Uint8Array(rows[1].nonce)]);
 });
 it('returns 400, 401, 403, 404 and 409 for invalid requests and states',async()=>{
  let r=await worker.fetch(req({},key),bindings());expect(r.status).toBe(400);
  expect((await worker.fetch(req({},key,false),bindings())).status).toBe(401);
  expect((await worker.fetch(req({},key,true,'ABCDEFGH23','https://bad.test'),bindings())).status).toBe(403);
  r=await worker.fetch(req({authCode:'valid'},key2,true,'bad'),bindings());expect(r.status).toBe(404);
  await env.DB.prepare('DELETE FROM responses').run();r=await worker.fetch(req({authCode:'valid'},'32345678-1234-1234-1234-123456789abc'),bindings());expect(r.status).toBe(403);expect(await r.json()).toMatchObject({code:'response_required'});
  await env.DB.prepare("UPDATE rooms SET status='closed',close_reason='host_closed',closed_at=?").bind(now).run();r=await worker.fetch(req({authCode:'valid'},'42345678-1234-1234-1234-123456789abc'),bindings());expect(r.status).toBe(409);expect(await r.json()).toMatchObject({code:'room_closed'});
 });
 it('rejects a mismatched identity without storing a subscription',async()=>{
  const r=await worker.fetch(req(),bindings(()=>Response.json({resultType:'SUCCESS',success:{anonKey:'different-identity'}})));expect(r.status).toBe(403);expect(await r.json()).toMatchObject({code:'identity_mismatch'});expect(await count('notification_subscriptions')).toBe(0);
 });
 it('maps invalid codes, partner limits, partner errors and missing configuration',async()=>{
  let r=await worker.fetch(req(),bindings(()=>Response.json({resultType:'FAIL',error:{errorCode:4011}})));expect(r.status).toBe(400);expect(await r.json()).toMatchObject({code:'auth_code_invalid'});
  r=await worker.fetch(req({authCode:'two'},key2),bindings(()=>Response.json({resultType:'FAIL',error:{errorCode:4095}})));expect(r.status).toBe(429);expect(r.headers.get('Retry-After')).toBe('60');
  r=await worker.fetch(req({authCode:'three'},'32345678-1234-1234-1234-123456789abc'),bindings(()=>new Response('',{status:500})));expect(r.status).toBe(503);expect(await r.json()).toMatchObject({code:'toss_unavailable'});
  const fetch=vi.fn(success),bad=bindings(fetch);bad.NOTIFICATION_KEYS='';r=await worker.fetch(req({authCode:'four'},'42345678-1234-1234-1234-123456789abc'),bad);expect(r.status).toBe(500);expect(fetch).not.toHaveBeenCalled();
  expect(await count('notification_subscriptions')).toBe(0);
 });
 it('enforces local write and Toss limits without invoking the partner',async()=>{
  const fetch=vi.fn(success),e=bindings(fetch),minute=Math.floor(now/60)*60;
  await env.DB.prepare("INSERT INTO rate_counters VALUES('write',?,?,60)").bind(user,minute).run();
  let r=await worker.fetch(req(),e);expect(r.status).toBe(429);expect(Number(r.headers.get('Retry-After'))).toBeGreaterThan(0);expect(fetch).not.toHaveBeenCalled();
  await env.DB.prepare('DELETE FROM rate_counters').run();await env.DB.prepare("INSERT INTO rate_counters VALUES('toss_api_user',?,?,20)").bind(user,minute).run();
  r=await worker.fetch(req(),e);expect(r.status).toBe(429);expect(Number(r.headers.get('Retry-After'))).toBeGreaterThan(0);expect(fetch).not.toHaveBeenCalled();
  expect(await count('notification_subscriptions')).toBe(0);expect(await count('idempotency_records')).toBe(0);
 });
 it('rolls back subscription and write quota when the database insert fails',async()=>{
  await env.DB.prepare("CREATE TRIGGER test_subscription_failure BEFORE INSERT ON notification_subscriptions BEGIN SELECT RAISE(ABORT,'injected_failure'); END").run();
  const r=await worker.fetch(req(),bindings());expect(r.status).toBe(500);expect(await count('notification_subscriptions')).toBe(0);expect(await count('idempotency_records')).toBe(0);
  expect((await env.DB.prepare("SELECT count(*) AS n FROM rate_counters WHERE scope='write'").first<{n:number}>())?.n).toBe(0);
 });
 it('does not insert a subscription when closing commits during exchange',async()=>{
  let signal!:()=>void,release!:()=>void;const started=new Promise<void>(r=>{signal=r}),gate=new Promise<void>(r=>{release=r});
  const e=bindings(async()=>{signal();await gate;return success()});const pending=worker.fetch(req(),e);await started;
  await env.DB.prepare("UPDATE rooms SET status='closed',close_reason='host_closed',closed_at=?").bind(now).run();release();
  const r=await pending;expect(r.status).toBe(409);expect(await r.json()).toMatchObject({code:'room_closed'});expect(await count('notification_subscriptions')).toBe(0);
 });
});
