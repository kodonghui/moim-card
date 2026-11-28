import {env} from 'cloudflare:test';
import {beforeEach,describe,expect,it} from 'vitest';
import {expireRooms} from '../src/expire-rooms';
import worker from '../src/worker';
const now=3_000_000,user='a'.repeat(26);
const bindings={DB:env.DB,USER_HMAC_KEY:'x'.repeat(32),NOTIFICATION_KEYS:'',NOTIFICATION_ACTIVE_KEY_VERSION:'',ORIGIN_PUBLIC:'https://example.test',ORIGIN_PRIVATE:'https://private.test',TOSS:{fetch:async()=>new Response()}};
const count=async(table:string)=>(await env.DB.prepare(`SELECT count(*) AS n FROM ${table}`).first<{n:number}>())!.n;
beforeEach(async()=>{
 await env.DB.prepare('INSERT INTO users VALUES(?,?,?)').bind(user,'b'.repeat(64),now).run();
 await env.DB.prepare("INSERT INTO themes VALUES('trip','여행',1)").run();await env.DB.prepare("INSERT INTO question_sets(theme_id,version,status,default_next_action,content_sha256,published_at) VALUES('trip',1,'published','정해요',?,?)").bind('c'.repeat(64),now).run();
});
describe('TASK-033 expiry cron',()=>{
 it('deletes expired room data while retaining past cards and the unexpired room',async()=>{
  await env.DB.prepare("INSERT INTO rooms(code,gathering_name,party_size,question_set_id,created_at,expires_at) VALUES('ABCDEFGH23','여행',4,1,?,?),('BBBBBBBB23','여행',4,1,?,?)").bind(now-2595600,now-3600,now-2591999,now+1).run();
  await env.DB.prepare("INSERT INTO participants(room_id,user_id,role,nickname,joined_at) VALUES(1,?,'host','이름',?)").bind(user,now).run();await env.DB.prepare("INSERT INTO responses VALUES(1,1,'AAAAAAAA',?)").bind(now).run();
  await env.DB.prepare('INSERT INTO notification_subscriptions(participant_id,room_id,anon_key_ciphertext,nonce,key_version,created_at) VALUES(1,1,?,?,1,?)').bind(new Uint8Array(17),new Uint8Array(12),now).run();
  await env.DB.prepare('INSERT INTO past_cards(user_id,room_ref,gathering_name,theme_name,based_on_count,summary,next_action,finalized_at) VALUES(?,1,?,?,2,?,?,?)').bind(user,'여행','여행',JSON.stringify(Array(8).fill({})),'정해요',now).run();
  await worker.scheduled({scheduledTime:now*1000,cron:'0 * * * *'} as ScheduledController,bindings);
  expect(await count('rooms')).toBe(1);expect(await count('participants')).toBe(0);expect(await count('responses')).toBe(0);expect(await count('notification_subscriptions')).toBe(0);expect(await count('past_cards')).toBe(1);
 });
 it('limits a run to 500 and deletes the remaining room on the next run',async()=>{
  await env.DB.prepare(`WITH RECURSIVE n(i) AS (SELECT 0 UNION ALL SELECT i+1 FROM n WHERE i<500)
   INSERT INTO rooms(code,gathering_name,party_size,question_set_id,created_at,expires_at)
   SELECT 'AAAAAAA'||substr('ABCDEFGHJKMNPQRSTUVWXYZ23456789',1+(i/961)%31,1)||substr('ABCDEFGHJKMNPQRSTUVWXYZ23456789',1+(i/31)%31,1)||substr('ABCDEFGHJKMNPQRSTUVWXYZ23456789',1+i%31,1),'여행',4,1,?,? FROM n`).bind(now-2592000,now).run();
  expect(await count('rooms')).toBe(501);let batches=0;const metered=new Proxy(env.DB,{get(target,key){if(key==='batch')return (...args:Parameters<D1Database['batch']>)=>{batches++;return target.batch(...args)};const value=Reflect.get(target,key,target);return typeof value==='function'?value.bind(target):value}});await expireRooms(metered,now);expect(batches).toBe(20);expect(await count('rooms')).toBe(1);await expireRooms(env.DB,now);expect(await count('rooms')).toBe(0);
 });
 it('stops within the free-plan query budget when many deletes fail',async()=>{
  await env.DB.prepare(`WITH RECURSIVE n(i) AS (SELECT 0 UNION ALL SELECT i+1 FROM n WHERE i<99)
   INSERT INTO rooms(code,gathering_name,party_size,question_set_id,created_at,expires_at)
   SELECT 'AAAAAAA'||substr('ABCDEFGHJKMNPQRSTUVWXYZ23456789',1+(i/961)%31,1)||substr('ABCDEFGHJKMNPQRSTUVWXYZ23456789',1+(i/31)%31,1)||substr('ABCDEFGHJKMNPQRSTUVWXYZ23456789',1+i%31,1),'여행',4,1,?,? FROM n`).bind(now-2592000,now).run();
  await env.DB.prepare("CREATE TRIGGER test_all_expiry_fail BEFORE DELETE ON rooms BEGIN SELECT RAISE(ABORT,'injected_failure'); END").run();
  let calls=0;const metered=new Proxy(env.DB,{get(target,key){
   if(key==='batch')return (...args:Parameters<D1Database['batch']>)=>{calls++;return target.batch(...args)};
   if(key==='prepare')return (sql:string)=>{const stmt=target.prepare(sql);return new Proxy(stmt,{get(q,k){if(k==='bind')return (...args:unknown[])=>{const bound=q.bind(...args);return new Proxy(bound,{get(query,m){if(m==='run'||m==='all')return (...a:unknown[])=>{calls++;return (query[m] as (...x:unknown[])=>unknown).apply(query,a)};const v=Reflect.get(query,m,query);return typeof v==='function'?v.bind(query):v}})};const v=Reflect.get(q,k,q);return typeof v==='function'?v.bind(q):v}})};
   const v=Reflect.get(target,key,target);return typeof v==='function'?v.bind(target):v;
  }});
  await expireRooms(metered,now,()=>{});expect(calls).toBeLessThanOrEqual(49);expect(await count('rooms')).toBe(100);
 });
 it('continues after one room fails and retries it next run',async()=>{
  await env.DB.prepare("INSERT INTO rooms(code,gathering_name,party_size,question_set_id,created_at,expires_at) VALUES('ABCDEFGH23','여행',4,1,?,?),('BBBBBBBB23','여행',4,1,?,?)").bind(now-2592000,now,now-2592000,now).run();
  await env.DB.prepare("CREATE TRIGGER test_expiry_failure BEFORE DELETE ON rooms WHEN OLD.id=1 BEGIN SELECT RAISE(ABORT,'injected_failure'); END").run();
  const logs:unknown[]=[];await expireRooms(env.DB,now,entry=>logs.push(entry));expect(await count('rooms')).toBe(1);expect(logs).toEqual([{event:'room_expiry_failed',count:1}]);
  await env.DB.prepare('DROP TRIGGER test_expiry_failure').run();await expireRooms(env.DB,now);expect(await count('rooms')).toBe(0);
 });
});
