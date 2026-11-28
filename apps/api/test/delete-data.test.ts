import {env} from 'cloudflare:test';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {hashToken} from '../src/session';
import {readFreshInterimCard} from '../src/responses';
import worker from '../src/worker';
const origin='https://example.test',now=Math.floor(Date.now()/1000),key='92345678-1234-1234-1234-123456789abc';
const token=(c:string)=>c.repeat(43),user=(c:string)=>c.repeat(26),answers=Array.from({length:8},(_,i)=>({position:i+1,choice:'B'}));
const bindings={DB:env.DB,USER_HMAC_KEY:'x'.repeat(32),NOTIFICATION_KEYS:'',NOTIFICATION_ACTIVE_KEY_VERSION:'',ORIGIN_PUBLIC:origin,ORIGIN_PRIVATE:'https://private.test',TOSS:{fetch:async()=>new Response()}};
const del=(ch='a',k=key,o=origin)=>new Request('https://api.test/v1/me',{method:'DELETE',headers:{origin:o,...(ch?{authorization:`Bearer ${token(ch)}`} : {}),...(k?{'Idempotency-Key':k}:{})}});
const submit=(ch:string)=>new Request('https://api.test/v1/rooms/ABCDEFGH23/responses',{method:'POST',headers:{origin,'content-type':'application/json',authorization:`Bearer ${token(ch)}`,'Idempotency-Key':'12345678-1234-1234-1234-123456789abc'},body:JSON.stringify({answers})});
const count=async(table:string)=>(await env.DB.prepare(`SELECT count(*) AS n FROM ${table}`).first<{n:number}>())!.n;
beforeEach(async()=>{
 for(const ch of ['a','b','c']){await env.DB.prepare('INSERT INTO users VALUES (?,?,?)').bind(user(ch),ch.repeat(64),now).run();await env.DB.prepare('INSERT INTO sessions(token_hash,user_id,created_at,expires_at) VALUES(?,?,?,?)').bind(await hashToken(token(ch)),user(ch),now,now+43200).run()}
 await env.DB.prepare("INSERT INTO themes VALUES ('trip','여행',1)").run();await env.DB.prepare("INSERT INTO question_sets(theme_id,version,status,default_next_action,content_sha256,published_at) VALUES('trip',1,'published','정해요',?,?)").bind('d'.repeat(64),now).run();
 for(let i=1;i<=8;i++)await env.DB.prepare("INSERT INTO questions(question_set_id,position,prompt,option_a,option_b,split_suggestion,agreed_text_a,agreed_text_b) VALUES(1,?,'질문','A','B','조율','A 합의','B 합의')").bind(i).run();
 for(const slot of ['plan_speed_low','plan_speed_high','spending_priority_low','spending_priority_high','schedule_change_low','schedule_change_high','balanced'])await env.DB.prepare('INSERT INTO profile_phrases VALUES(1,?,?)').bind(slot,'균형이에요').run();
 for(const code of ['ABCDEFGH23','BBBBBBBB23','CCCCCCCC23'])await env.DB.prepare('INSERT INTO rooms(code,gathering_name,party_size,question_set_id,participant_count,submitted_count,created_at,expires_at) VALUES(?,?,4,1,3,3,?,?)').bind(code,'여행',now,now+2592000).run();
 for(const room of [1,2,3])for(const ch of ['a','b','c']){
  const role=(room===1?ch==='a':ch==='b')?'host':'member';
  await env.DB.prepare('INSERT INTO participants(room_id,user_id,role,nickname,joined_at) VALUES(?,?,?,?,?)').bind(room,user(ch),role,'이름',now).run();
 }
 for(let id=1;id<=9;id++)await env.DB.prepare("INSERT INTO responses VALUES(?,?,?,?)").bind(id,Math.ceil(id/3),id%3===1?'AAAAAAAA':'BBBBBBBB',now).run();
 await readFreshInterimCard(env.DB,1,now);await readFreshInterimCard(env.DB,2,now);
 await env.DB.prepare("INSERT INTO consensus_cards(room_id,stage,based_on_count,items,next_action,computed_at,finalized_at) VALUES(3,'final',3,?,'정해요',?,?)").bind(JSON.stringify(Array.from({length:8},(_,i)=>({position:i+1,a:1,b:2,none:0,category:'split'}))),now,now).run();
 await env.DB.prepare("UPDATE rooms SET status='closed',close_reason='host_closed',closed_at=? WHERE id=3").bind(now).run();
 for(const [pid,rid] of [[1,1],[2,1],[4,2],[5,2]])await env.DB.prepare('INSERT INTO notification_subscriptions(participant_id,room_id,anon_key_ciphertext,nonce,key_version,created_at) VALUES(?,?,?, ?,1,?)').bind(pid,rid,new Uint8Array(17),new Uint8Array(12),now).run();
 await env.DB.prepare('INSERT INTO past_cards(user_id,room_ref,gathering_name,theme_name,based_on_count,summary,next_action,finalized_at) VALUES(?,3,?,?,3,?,?,?)').bind(user('a'),'여행','여행',JSON.stringify(Array(8).fill({})),'정해요',now).run();
});
beforeEach(()=>{vi.spyOn(Date,'now').mockReturnValue(now*1000)});afterEach(()=>vi.restoreAllMocks());
describe('TASK-029 API-015 delete personal data',()=>{
 it('closes hosted rooms excluding my answers, recalculates other rooms, and preserves final cards',async()=>{
  const fixed=await env.DB.prepare('SELECT items FROM consensus_cards WHERE room_id=3').first<{items:string}>();
  const r=await worker.fetch(del(),bindings);expect(r.status).toBe(204);expect(await r.text()).toBe('');
  expect(await env.DB.prepare('SELECT status,close_reason AS reason,submitted_count AS n FROM rooms WHERE id=1').first()).toEqual({status:'closed',reason:'host_deleted',n:2});
  expect(await env.DB.prepare('SELECT stage,based_on_count AS n FROM consensus_cards WHERE room_id=1').first()).toEqual({stage:'final',n:2});
  expect(await env.DB.prepare('SELECT status,submitted_count AS n FROM rooms WHERE id=2').first()).toEqual({status:'open',n:2});
  expect(await env.DB.prepare('SELECT stage,based_on_count AS n FROM consensus_cards WHERE room_id=2').first()).toEqual({stage:'interim',n:2});
  expect((await env.DB.prepare('SELECT items FROM consensus_cards WHERE room_id=3').first<{items:string}>())?.items).toBe(fixed?.items);
  expect((await env.DB.prepare('SELECT count(*) AS n FROM past_cards WHERE room_ref=1').first<{n:number}>())?.n).toBe(2);
  expect((await env.DB.prepare('SELECT count(*) AS n FROM notification_subscriptions').first<{n:number}>())?.n).toBe(1);
  expect((await env.DB.prepare('SELECT count(*) AS n FROM users WHERE id=?').bind(user('a')).first<{n:number}>())?.n).toBe(0);
  expect(await env.DB.prepare('SELECT user_id,revoked_at FROM sessions WHERE token_hash=?').bind(await hashToken(token('a'))).first()).toEqual({user_id:null,revoked_at:now});
  expect((await worker.fetch(del(),bindings)).status).toBe(204);
  const themes=new Request('https://api.test/v1/themes',{headers:{origin,authorization:`Bearer ${token('a')}`}});expect((await worker.fetch(themes,bindings)).status).toBe(401);
 });
 it('returns 400, 401, 403, 409 and 429 without deleting data',async()=>{
  expect((await worker.fetch(del('a',''),bindings)).status).toBe(400);expect((await worker.fetch(del(''),bindings)).status).toBe(401);expect((await worker.fetch(del('a',key,'https://bad.test'),bindings)).status).toBe(403);
  await env.DB.prepare("INSERT INTO idempotency_records VALUES(?,?,'another',?,201,'{}',?)").bind(user('a'),key,'e'.repeat(64),now).run();
  let r=await worker.fetch(del(),bindings);expect(r.status).toBe(409);expect(await r.json()).toMatchObject({code:'idempotency_conflict'});
  await env.DB.prepare('DELETE FROM idempotency_records').run();await env.DB.prepare("INSERT INTO rate_counters VALUES('write',?,?,60)").bind(user('a'),Math.floor(now/60)*60).run();
  r=await worker.fetch(del(),bindings);expect(r.status).toBe(429);expect(Number(r.headers.get('Retry-After'))).toBeGreaterThan(0);expect(await count('users')).toBe(3);
 });
 it('rolls back every deletion when a summary insert fails',async()=>{
  const tables=['users','sessions','rooms','participants','responses','consensus_cards','past_cards','notification_subscriptions','idempotency_records','rate_counters'];
  const snapshot=()=>Promise.all(tables.map(async table=>(await env.DB.prepare(`SELECT * FROM ${table}`).all()).results));const before=await snapshot();
  await env.DB.prepare("CREATE TRIGGER test_fail_past BEFORE INSERT ON past_cards BEGIN SELECT RAISE(ABORT,'injected_failure'); END").run();
  const r=await worker.fetch(del(),bindings);expect(r.status).toBe(500);expect(await snapshot()).toEqual(before);
 });
 it('replans when responses change while their count stays the same',async()=>{
  await env.DB.prepare('INSERT INTO users VALUES (?,?,?)').bind(user('d'),'d'.repeat(64),now).run();
  let signal!:()=>void,release!:()=>void,first=true;const started=new Promise<void>(r=>{signal=r}),gate=new Promise<void>(r=>{release=r});
  const delayed=new Proxy(env.DB,{get(target,prop){if(prop==='batch')return async (...args:Parameters<D1Database['batch']>)=>{if(first){first=false;signal();await gate}return target.batch(...args)};const v=Reflect.get(target,prop,target);return typeof v==='function'?v.bind(target):v}});
  const pending=worker.fetch(del(),{...bindings,DB:delayed});await started;
  await env.DB.prepare('DELETE FROM participants WHERE id=2').run();
  await env.DB.prepare("INSERT INTO participants(room_id,user_id,role,nickname,joined_at) VALUES(1,?,'member','새 참여자',?)").bind(user('d'),now).run();
  await env.DB.prepare("INSERT INTO responses(participant_id,room_id,answers,submitted_at) SELECT id,1,'AAAAAAAA',? FROM participants WHERE room_id=1 AND user_id=?").bind(now,user('d')).run();
  release();const r=await pending;expect(r.status).toBe(204);
  const row=await env.DB.prepare('SELECT items FROM consensus_cards WHERE room_id=1').first<{items:string}>();expect(JSON.parse(row!.items)[0]).toMatchObject({a:1,b:1,category:'split'});
  expect((await env.DB.prepare('SELECT count(*) AS n FROM past_cards WHERE room_ref=1').first<{n:number}>())?.n).toBe(2);
 });
 it('replans deletion when another participant submits after the snapshot',async()=>{
  await env.DB.prepare('DELETE FROM responses WHERE participant_id=3').run();await env.DB.prepare('UPDATE rooms SET submitted_count=2 WHERE id=1').run();
  let signal!:()=>void,release!:()=>void,first=true;const started=new Promise<void>(r=>{signal=r}),gate=new Promise<void>(r=>{release=r});
  const delayed=new Proxy(env.DB,{get(target,prop){if(prop==='batch')return async (...args:Parameters<D1Database['batch']>)=>{if(first){first=false;signal();await gate}return target.batch(...args)};const v=Reflect.get(target,prop,target);return typeof v==='function'?v.bind(target):v}});
  const pending=worker.fetch(del(),{...bindings,DB:delayed});await started;expect((await worker.fetch(submit('c'),bindings)).status).toBe(201);release();
  const r=await pending;expect(r.status).toBe(204);expect(await env.DB.prepare('SELECT status,submitted_count AS n FROM rooms WHERE id=1').first()).toEqual({status:'closed',n:2});
  expect(await env.DB.prepare('SELECT stage,based_on_count AS n FROM consensus_cards WHERE room_id=1').first()).toEqual({stage:'final',n:2});
  expect((await env.DB.prepare('SELECT count(*) AS n FROM past_cards WHERE room_ref=1').first<{n:number}>())?.n).toBe(2);
 });
});
