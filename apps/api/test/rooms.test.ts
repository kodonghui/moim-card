import { env } from 'cloudflare:test';
import { beforeEach, describe, expect, it } from 'vitest';
import worker from '../src/worker';
import { hashToken } from '../src/session';

const origin='https://example.test', token='a'.repeat(43), user='a'.repeat(26), now=Math.floor(Date.now()/1000);
const key='12345678-1234-1234-1234-123456789abc', key2='22345678-1234-1234-1234-123456789abc';
const bindings={DB:env.DB, USER_HMAC_KEY:'test-only', ORIGIN_PUBLIC:origin, ORIGIN_PRIVATE:'https://private.test', TOSS:{fetch:async () => new Response()}};
const body={themeId:'trip',gatheringName:' 여행 ',partySize:4,hostNickname:' 나 '};
const req=(data:unknown=body,k=key,auth=true,requestOrigin=origin) => new Request('https://api.test/v1/rooms',{method:'POST',headers:{origin:requestOrigin,'content-type':'application/json',...(auth?{authorization:`Bearer ${token}`} : {}), ...(k?{'Idempotency-Key':k}:{})},body:JSON.stringify(data)});
const count = async (table:string) => (await env.DB.prepare(`SELECT count(*) AS n FROM ${table}`).first<{n:number}>())!.n;
beforeEach(async () => {
 await env.DB.prepare('INSERT INTO users VALUES (?,?,?)').bind(user,'b'.repeat(64),now).run();
 await env.DB.prepare('INSERT INTO sessions (token_hash,user_id,created_at,expires_at) VALUES (?,?,?,?)').bind(await hashToken(token),user,now,now+43200).run();
 await env.DB.prepare("INSERT INTO themes VALUES ('trip','여행',1)").run();
 await env.DB.prepare("INSERT INTO question_sets (theme_id,version,status,default_next_action,content_sha256,published_at) VALUES ('trip',1,'published','정해요',?,?)").bind('c'.repeat(64),now).run();
});
describe('TASK-017 API-003 create room', () => {
 it('creates a room and host and replays concurrent requests once', async () => {
  const [a,b]=await Promise.all([worker.fetch(req(),bindings),worker.fetch(req(),bindings)]);
  expect(a.status).toBe(201); expect(b.status).toBe(201);
  const result=await a.json() as {roomCode:string;gatheringName:string;partySize:number;theme:unknown}; expect(result).toEqual(await b.json());
  expect(result.roomCode).toMatch(/^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{10}$/); expect(result.gatheringName).toBe('여행');
  expect(await count('rooms')).toBe(1); expect(await count('participants')).toBe(1);
  expect((await env.DB.prepare("SELECT SUM(count) AS n FROM rate_counters WHERE scope='room_create'").first<{n:number}>())?.n).toBe(1);
  expect((await env.DB.prepare("SELECT count(*) AS n FROM rate_counters WHERE scope='write'").first<{n:number}>())?.n).toBe(0);
 });
 it('pins the latest published version rather than a withdrawn newer version', async () => {
  await env.DB.prepare("INSERT INTO question_sets (theme_id,version,status,default_next_action,content_sha256,published_at,withdrawn_at) VALUES ('trip',2,'published','정해요',?,?,NULL),('trip',3,'withdrawn','정해요',?,?,?)").bind('d'.repeat(64),now,'e'.repeat(64),now,now).run();
  const r=await worker.fetch(req(),bindings);expect(r.status).toBe(201);
  expect((await env.DB.prepare('SELECT q.version FROM rooms r JOIN question_sets q ON q.id=r.question_set_id').first<{version:number}>())?.version).toBe(2);
 });
 it('replans when the selected latest version is withdrawn before commit', async () => {
  await env.DB.prepare("INSERT INTO question_sets (theme_id,version,status,default_next_action,content_sha256,published_at) VALUES ('trip',2,'published','정해요',?,?)").bind('d'.repeat(64),now).run();
  let signal!:()=>void,release!:()=>void,blocked=false;
  const started=new Promise<void>(r=>{signal=r}),gate=new Promise<void>(r=>{release=r});
  const delayed=new Proxy(env.DB,{get(target,prop){
    if(prop==='batch')return async (...args:Parameters<D1Database['batch']>)=>{if(!blocked){blocked=true;signal();await gate}return target.batch(...args)};
    const value=Reflect.get(target,prop,target);return typeof value==='function'?value.bind(target):value;
  }});
  const pending=worker.fetch(req(),{...bindings,DB:delayed});await started;
  await env.DB.prepare("UPDATE question_sets SET status='withdrawn',withdrawn_at=? WHERE theme_id='trip' AND version=2").bind(now).run();
  release();const r=await pending;expect(r.status).toBe(201);
  expect((await env.DB.prepare('SELECT q.version FROM rooms r JOIN question_sets q ON q.id=r.question_set_id').first<{version:number}>())?.version).toBe(1);
  expect((await env.DB.prepare("SELECT SUM(count) AS n FROM rate_counters WHERE scope='room_create'").first<{n:number}>())?.n).toBe(1);
 });
 it('creates a room even when the separate write limit is exhausted', async () => {
  await env.DB.prepare("INSERT INTO rate_counters VALUES ('write',?,?,60)").bind(user,Math.floor(now/60)*60).run();
  expect((await worker.fetch(req(),bindings)).status).toBe(201);
  expect((await env.DB.prepare("SELECT count FROM rate_counters WHERE scope='write'").first<{count:number}>())?.count).toBe(60);
 });
 it('returns validation errors without consuming room quota and caches the failure', async () => {
  const invalid={...body,partySize:9}; const r=await worker.fetch(req(invalid),bindings);
  expect(r.status).toBe(400); expect(await r.json()).toMatchObject({code:'validation_failed',errors:[{field:'partySize',reason:'out_of_range'}]});
  expect((await worker.fetch(req(invalid),bindings)).status).toBe(400); expect(await count('rooms')).toBe(0); expect(await count('rate_counters')).toBe(0);
  expect((await worker.fetch(req(body,''),bindings)).status).toBe(400);
 });
 it('rejects unauthenticated and invalid origin', async () => {
  expect((await worker.fetch(req(body,key,false),bindings)).status).toBe(401);
  expect((await worker.fetch(req(body,key,true,'https://bad.test'),bindings)).status).toBe(403);
 });
 it('returns conflict for unavailable themes and reused IDs with changed body', async () => {
  const bad=await worker.fetch(req({...body,themeId:'missing'}),bindings); expect(bad.status).toBe(409); expect(await bad.json()).toMatchObject({code:'theme_unavailable'});
  const changed=await worker.fetch(req(body),bindings); expect(changed.status).toBe(409); expect(await changed.json()).toMatchObject({code:'idempotency_conflict'});
 });
 it('does not use quota for a replay even when the limit has been reached', async () => {
  const first=await worker.fetch(req(),bindings); expect(first.status).toBe(201);
  await env.DB.prepare("UPDATE rate_counters SET count=30 WHERE scope='room_create'").run();
  const replay=await worker.fetch(req(),bindings); expect(replay.status).toBe(201); expect(await replay.json()).toEqual(await first.json());
  const rejected=await worker.fetch(req(body,key2),bindings); expect(rejected.status).toBe(429); expect(Number(rejected.headers.get('Retry-After'))).toBeGreaterThan(0);
  expect(await count('rooms')).toBe(1);
 });
 it('allows only one concurrent request into the last room slot', async () => {
  await env.DB.prepare("INSERT INTO rate_counters VALUES ('room_create',?,?,29)").bind(user,now).run();
  let ready!:()=>void,release!:()=>void,waiting=0;
  const both=new Promise<void>(r=>{ready=r}),gate=new Promise<void>(r=>{release=r});
  const delayed=new Proxy(env.DB,{get(target,prop){
    if(prop==='batch')return async (...args:Parameters<D1Database['batch']>)=>{if(++waiting<=2){if(waiting===2)ready();await gate}return target.batch(...args)};
    const value=Reflect.get(target,prop,target);return typeof value==='function'?value.bind(target):value;
  }});
  const pending=Promise.all([worker.fetch(req(body,key),{...bindings,DB:delayed}),worker.fetch(req(body,key2),{...bindings,DB:delayed})]);
  await both;release();const responses=await pending;
  expect(responses.map(r=>r.status).sort()).toEqual([201,429]); expect(await count('rooms')).toBe(1);
  expect((await env.DB.prepare("SELECT SUM(count) AS n FROM rate_counters WHERE scope='room_create'").first<{n:number}>())?.n).toBe(30);
 });
 it('returns default 500 if database work fails', async () => {
  await env.DB.prepare('DROP TABLE participants').run();
  const r=await worker.fetch(req(),bindings); expect(r.status).toBe(500); expect(await r.json()).toMatchObject({code:'internal'}); expect(await count('rooms')).toBe(0); expect(await count('rate_counters')).toBe(0);
 });
});
