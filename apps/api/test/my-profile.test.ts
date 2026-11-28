import {env} from 'cloudflare:test';
import {beforeEach,describe,expect,it} from 'vitest';
import {hashToken} from '../src/session';
import worker from '../src/worker';
const origin='https://example.test',token='a'.repeat(43),user='a'.repeat(26),now=Math.floor(Date.now()/1000);
const bindings={DB:env.DB,USER_HMAC_KEY:'x'.repeat(32),ORIGIN_PUBLIC:origin,ORIGIN_PRIVATE:'https://private.test',TOSS:{fetch:async()=>new Response()}};
const req=(code='ABCDEFGH23',auth=true,o=origin)=>new Request(`https://api.test/v1/rooms/${code}/my-profile`,{headers:{origin:o,...(auth?{authorization:`Bearer ${token}`}:{})}});
beforeEach(async()=>{
 await env.DB.prepare('INSERT INTO users VALUES (?,?,?)').bind(user,'b'.repeat(64),now).run();
 await env.DB.prepare('INSERT INTO sessions(token_hash,user_id,created_at,expires_at) VALUES(?,?,?,?)').bind(await hashToken(token),user,now,now+43200).run();
 await env.DB.prepare("INSERT INTO themes VALUES ('trip','여행',1)").run();
 await env.DB.prepare("INSERT INTO question_sets(theme_id,version,status,default_next_action,content_sha256,published_at) VALUES('trip',1,'published','정해요',?,?)").bind('c'.repeat(64),now).run();
 for(let i=1;i<=8;i++)await env.DB.prepare("INSERT INTO questions(question_set_id,position,prompt,option_a,option_b,split_suggestion,agreed_text_a,agreed_text_b,axis,axis_pole_a) VALUES(1,?,'질문','A','B','조율','A 합의','B 합의',?,?)").bind(i,i<=2?'plan_speed':null,i<=2?'high':null).run();
 for(const slot of ['plan_speed_low','plan_speed_high','spending_priority_low','spending_priority_high','schedule_change_low','schedule_change_high','balanced'])await env.DB.prepare('INSERT INTO profile_phrases VALUES(1,?,?)').bind(slot,slot==='plan_speed_high'?'미리 정해요':'균형이에요').run();
 await env.DB.prepare("INSERT INTO rooms(code,gathering_name,party_size,question_set_id,created_at,expires_at) VALUES('ABCDEFGH23','여행',4,1,?,?)").bind(now,now+2592000).run();
 await env.DB.prepare("INSERT INTO participants(room_id,user_id,role,nickname,joined_at) VALUES(1,?,'host','이름',?)").bind(user,now).run();
});
describe('TASK-023 API-008 my profile',()=>{
 it('computes the profile from answers and does not persist a result',async()=>{
  await env.DB.prepare("INSERT INTO responses VALUES(1,1,'AANNNNNN',?)").bind(now).run();
  const before=await env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
  const r=await worker.fetch(req(),bindings);expect(r.status).toBe(200);expect(await r.json()).toEqual({summary:'미리 정해요',axes:[{axis:'plan_speed',band:'high'}]});
  expect(await env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all()).toMatchObject({results:before.results});
  expect((await env.DB.prepare('SELECT count(*) AS n FROM profile_phrases').first<{n:number}>())?.n).toBe(7);
 });
 it('returns 401, 403 and 404',async()=>{
  expect((await worker.fetch(req('ABCDEFGH23',false),bindings)).status).toBe(401);
  expect((await worker.fetch(req('ABCDEFGH23',true,'https://bad.test'),bindings)).status).toBe(403);
  expect((await worker.fetch(req('bad'),bindings)).status).toBe(404);
  let r=await worker.fetch(req(),bindings);expect(r.status).toBe(403);expect(await r.json()).toMatchObject({code:'response_required'});
  await env.DB.prepare('DELETE FROM participants').run();r=await worker.fetch(req(),bindings);expect(r.status).toBe(403);expect(await r.json()).toMatchObject({code:'not_participant'});
 });
 it('returns default 500 when required phrase data is missing',async()=>{
  await env.DB.prepare("INSERT INTO responses VALUES(1,1,'AAAAAAAA',?)").bind(now).run();await env.DB.prepare('DELETE FROM profile_phrases WHERE slot=\'balanced\'').run();
  const r=await worker.fetch(req(),bindings);expect(r.status).toBe(500);expect(await r.json()).toMatchObject({code:'internal'});
 });
});
