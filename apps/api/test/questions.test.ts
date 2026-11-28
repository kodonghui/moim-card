import {env} from 'cloudflare:test';
import {beforeEach,describe,expect,it} from 'vitest';
import {hashToken} from '../src/session';
import worker from '../src/worker';
const origin='https://example.test',token='a'.repeat(43),user='a'.repeat(26),now=Math.floor(Date.now()/1000);
const bindings={DB:env.DB,USER_HMAC_KEY:'x'.repeat(32),ORIGIN_PUBLIC:origin,ORIGIN_PRIVATE:'https://private.test',TOSS:{fetch:async()=>new Response()}};
const req=(code='ABCDEFGH23',auth=true,o=origin)=>new Request(`https://api.test/v1/rooms/${code}/questions`,{headers:{origin:o,...(auth?{authorization:`Bearer ${token}`}:{})}});
beforeEach(async()=>{
 await env.DB.prepare('INSERT INTO users VALUES (?,?,?)').bind(user,'b'.repeat(64),now).run();
 await env.DB.prepare('INSERT INTO sessions(token_hash,user_id,created_at,expires_at) VALUES(?,?,?,?)').bind(await hashToken(token),user,now,now+43200).run();
 await env.DB.prepare("INSERT INTO themes VALUES ('trip','여행',1)").run();
 await env.DB.prepare("INSERT INTO question_sets(theme_id,version,status,default_next_action,content_sha256,published_at) VALUES('trip',1,'published','정해요',?,?),('trip',2,'published','정해요',?,?)").bind('c'.repeat(64),now,'d'.repeat(64),now).run();
 for(let i=1;i<=8;i++) {
  await env.DB.prepare("INSERT INTO questions(question_set_id,position,prompt,option_a,option_b,split_suggestion,agreed_text_a,agreed_text_b) VALUES(1,?,'질문','A','B','조율','A 합의','B 합의')").bind(i).run();
  await env.DB.prepare("INSERT INTO questions(question_set_id,position,prompt,option_a,option_b,split_suggestion,agreed_text_a,agreed_text_b) VALUES(2,?,'새 질문','A','B','조율','A 합의','B 합의')").bind(i).run();
 }
 await env.DB.prepare("INSERT INTO rooms(code,gathering_name,party_size,question_set_id,created_at,expires_at) VALUES('ABCDEFGH23','여행',4,1,?,?)").bind(now,now+2592000).run();
 await env.DB.prepare("INSERT INTO participants(room_id,user_id,role,nickname,joined_at) VALUES(1,?,'host','이름',?)").bind(user,now).run();
});
describe('TASK-020 API-006 questions',()=>{
 it('returns only eight public questions from the room’s fixed version',async()=>{
  const r=await worker.fetch(req(),bindings);expect(r.status).toBe(200);const data=await r.json() as {questionSetVersion:number;questions:Record<string,unknown>[]};
  expect(data.questionSetVersion).toBe(1);expect(data.questions).toHaveLength(8);expect(data.questions[0]).toEqual({position:1,prompt:'질문',optionA:'A',optionB:'B'});
 });
 it('rejects missing session, origin, nonparticipant and missing rooms',async()=>{
  expect((await worker.fetch(req('ABCDEFGH23',false),bindings)).status).toBe(401);
  expect((await worker.fetch(req('ABCDEFGH23',true,'https://bad.test'),bindings)).status).toBe(403);
  expect((await worker.fetch(req('invalid'),bindings)).status).toBe(404);
  await env.DB.prepare('DELETE FROM participants').run();const r=await worker.fetch(req(),bindings);expect(r.status).toBe(403);expect(await r.json()).toMatchObject({code:'not_participant'});
 });
 it('rejects already-submitted or closed rooms',async()=>{
  await env.DB.prepare("INSERT INTO responses VALUES(1,1,'AAAAAAAA',?)").bind(now).run();
  let r=await worker.fetch(req(),bindings);expect(r.status).toBe(409);expect(await r.json()).toMatchObject({code:'already_submitted'});
  await env.DB.prepare("UPDATE rooms SET status='closed',close_reason='host_closed',closed_at=?").bind(now).run();
  r=await worker.fetch(req(),bindings);expect(r.status).toBe(409);expect(await r.json()).toMatchObject({code:'room_closed'});
 });
 it('returns a default error if the fixed version is incomplete',async()=>{
  await env.DB.prepare('DELETE FROM questions WHERE question_set_id=1 AND position=8').run();const r=await worker.fetch(req(),bindings);expect(r.status).toBe(500);expect(await r.json()).toMatchObject({code:'internal'});
 });
});
