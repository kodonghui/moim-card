import {env} from 'cloudflare:test';
import {beforeEach,describe,expect,it} from 'vitest';
import {hashToken} from '../src/session';
import worker from '../src/worker';
const origin='https://example.test', token='a'.repeat(43), user='a'.repeat(26), now=Math.floor(Date.now()/1000);
const bindings={DB:env.DB, USER_HMAC_KEY:'test-only',ORIGIN_PUBLIC:origin,ORIGIN_PRIVATE:'https://private.test',TOSS:{fetch:async()=>new Response()}};
const req=(code='ABCDEFGH23',auth=true,o=origin)=>new Request(`https://api.test/v1/rooms/${code}`,{headers:{origin:o,...(auth?{authorization:`Bearer ${token}`}:{})}});
beforeEach(async()=>{
 await env.DB.prepare('INSERT INTO users VALUES (?,?,?)').bind(user,'b'.repeat(64),now).run();
 await env.DB.prepare('INSERT INTO sessions (token_hash,user_id,created_at,expires_at) VALUES (?,?,?,?)').bind(await hashToken(token),user,now,now+43200).run();
 await env.DB.prepare("INSERT INTO themes VALUES ('trip','여행',1)").run();
 await env.DB.prepare("INSERT INTO question_sets (theme_id,version,status,default_next_action,content_sha256,published_at) VALUES ('trip',1,'published','정해요',?,?)").bind('c'.repeat(64),now).run();
 await env.DB.prepare("INSERT INTO rooms (code,gathering_name,party_size,question_set_id,created_at,expires_at) VALUES ('ABCDEFGH23','여행',4,1,?,?)").bind(now,now+2592000).run();
});
describe('TASK-018 API-004 room view',()=>{
 it('returns newcomer state without counts or nicknames and includes asOf',async()=>{
  const r=await worker.fetch(req(),bindings);expect(r.status).toBe(200);
  const data=await r.json() as Record<string,unknown>;
  expect(data).toMatchObject({roomCode:'ABCDEFGH23',gatheringName:'여행',theme:{themeId:'trip',name:'여행'},partySize:4,submittedCount:0,isFull:false,status:'open',myRole:'none',mySubmitted:false});
  expect(typeof data.asOf).toBe('string'); expect(data).not.toHaveProperty('participantCount'); expect(JSON.stringify(data)).not.toContain('nickname');
 });
 it('returns host role, submission and closed state',async()=>{
  await env.DB.prepare("INSERT INTO participants (room_id,user_id,role,nickname,joined_at) VALUES (1,?,'host','비밀',?)").bind(user,now).run();
  await env.DB.prepare("INSERT INTO responses (participant_id,room_id,answers,submitted_at) VALUES (1,1,'AAAAAAAA',?)").bind(now).run();
  await env.DB.prepare("UPDATE rooms SET status='closed',close_reason='host_closed',closed_at=?,submitted_count=1 WHERE id=1").bind(now).run();
  const data=await (await worker.fetch(req(),bindings)).json();expect(data).toMatchObject({status:'closed',myRole:'host',mySubmitted:true,submittedCount:1});expect(JSON.stringify(data)).not.toContain('비밀');
 });
 it('returns member role and permits a nonparticipant to view a closed room',async()=>{
  await env.DB.prepare("INSERT INTO participants (room_id,user_id,role,nickname,joined_at) VALUES (1,?,'member','이름',?)").bind(user,now).run();
  expect(await (await worker.fetch(req(),bindings)).json()).toMatchObject({myRole:'member',mySubmitted:false});
  await env.DB.prepare('DELETE FROM participants').run();
  await env.DB.prepare("UPDATE rooms SET status='closed',close_reason='host_closed',closed_at=?").bind(now).run();
  const r=await worker.fetch(req(),bindings);expect(r.status).toBe(200);expect(await r.json()).toMatchObject({status:'closed',myRole:'none',mySubmitted:false});
 });
 it('reports full only at eight participants',async()=>{
  await env.DB.prepare('UPDATE rooms SET participant_count=8 WHERE id=1').run();
  expect(await (await worker.fetch(req(),bindings)).json()).toMatchObject({isFull:true});
 });
 it('returns the same 404 code for malformed, unknown and expired rooms',async()=>{
  for(const code of ['bad','BBBBBBBB23']) {const r=await worker.fetch(req(code),bindings);expect(r.status).toBe(404);expect(await r.json()).toMatchObject({code:'room_not_found'});}
  await env.DB.prepare('UPDATE rooms SET created_at=?,expires_at=?').bind(now-2592000,now).run();
  const r=await worker.fetch(req(),bindings); expect(r.status).toBe(404);expect(await r.json()).toMatchObject({code:'room_not_found'});
 });
 it('returns 401, 403 and default errors',async()=>{
  expect((await worker.fetch(req('ABCDEFGH23',false),bindings)).status).toBe(401);
  expect((await worker.fetch(req('ABCDEFGH23',true,'https://bad.test'),bindings)).status).toBe(403);
  await env.DB.prepare('DROP TABLE responses').run(); const r=await worker.fetch(req(),bindings);expect(r.status).toBe(500);expect(await r.json()).toMatchObject({code:'internal'});
 });
});
