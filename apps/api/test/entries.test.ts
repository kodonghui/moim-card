import {env} from 'cloudflare:test';
import {beforeEach,describe,expect,it} from 'vitest';
import {hashToken} from '../src/session';
import worker from '../src/worker';
const origin='https://example.test',token='a'.repeat(43),user='a'.repeat(26),now=Math.floor(Date.now()/1000);
const bindings={DB:env.DB,USER_HMAC_KEY:'x'.repeat(32),ORIGIN_PUBLIC:origin,ORIGIN_PRIVATE:'https://private.test',TOSS:{fetch:async()=>new Response()}};
const req=(body='{"referrerKind":"external_share"}',auth=true,o=origin)=>new Request('https://api.test/v1/entries',{method:'POST',headers:{origin:o,'content-type':'application/json',...(auth?{authorization:`Bearer ${token}`}:{})},body});
beforeEach(async()=>{await env.DB.prepare('INSERT INTO users VALUES (?,?,?)').bind(user,'b'.repeat(64),now).run();await env.DB.prepare('INSERT INTO sessions(token_hash,user_id,created_at,expires_at) VALUES(?,?,?,?)').bind(await hashToken(token),user,now,now+43200).run()});
describe('TASK-030 API-016 entry stats',()=>{
 it('returns 204 and stores only daily anonymous aggregate counts',async()=>{
  for(const body of ['{"referrerKind":"external_share"}','{"referrerKind":"external_share"}','{"referrerKind":"other"}'])expect((await worker.fetch(req(body),bindings)).status).toBe(204);
  const rows=(await env.DB.prepare('SELECT * FROM entry_stats ORDER BY referrer_kind').all()).results;
  expect(rows).toEqual([{day:new Date(now*1000).toISOString().slice(0,10),referrer_kind:'external_share',count:2},{day:new Date(now*1000).toISOString().slice(0,10),referrer_kind:'other',count:1}]);expect(JSON.stringify(rows)).not.toContain(user);
 });
 it('rejects 400, 401, 403 and 429 without adding aggregate rows',async()=>{
  let r=await worker.fetch(req('{}'),bindings);expect(r.status).toBe(400);expect(await r.json()).toMatchObject({code:'validation_failed'});
  expect((await worker.fetch(req('not json'),bindings)).status).toBe(400);expect((await worker.fetch(req('{}',false),bindings)).status).toBe(401);expect((await worker.fetch(req('{}',true,'https://bad.test'),bindings)).status).toBe(403);
  expect((await env.DB.prepare('SELECT count(*) AS n FROM rate_counters').first<{n:number}>())?.n).toBe(0);
  await env.DB.prepare("INSERT INTO rate_counters VALUES('write',?,?,60)").bind(user,Math.floor(now/60)*60).run();
  r=await worker.fetch(req(),bindings);expect(r.status).toBe(429);expect(Number(r.headers.get('Retry-After'))).toBeGreaterThan(0);expect((await env.DB.prepare('SELECT count(*) AS n FROM entry_stats').first<{n:number}>())?.n).toBe(0);
 });
 it('returns default 500 and rolls back quota if the aggregate write fails',async()=>{
  await env.DB.prepare("CREATE TRIGGER test_entry_failure BEFORE INSERT ON entry_stats BEGIN SELECT RAISE(ABORT,'injected_failure'); END").run();
  const r=await worker.fetch(req(),bindings);expect(r.status).toBe(500);expect((await env.DB.prepare('SELECT count(*) AS n FROM rate_counters').first<{n:number}>())?.n).toBe(0);
 });
});
