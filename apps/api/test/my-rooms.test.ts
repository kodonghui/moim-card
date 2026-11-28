import {env} from 'cloudflare:test';
import {beforeEach,describe,expect,it} from 'vitest';
import {hashToken} from '../src/session';
import worker from '../src/worker';
const origin='https://example.test',token='a'.repeat(43),user='a'.repeat(26),now=Math.floor(Date.now()/1000);
const bindings={DB:env.DB,USER_HMAC_KEY:'x'.repeat(32),ORIGIN_PUBLIC:origin,ORIGIN_PRIVATE:'https://private.test',TOSS:{fetch:async()=>new Response()}};
const req=(auth=true,o=origin)=>new Request('https://api.test/v1/me/rooms',{headers:{origin:o,...(auth?{authorization:`Bearer ${token}`}:{})}});
beforeEach(async()=>{
 await env.DB.prepare('INSERT INTO users VALUES (?,?,?)').bind(user,'b'.repeat(64),now).run();
 await env.DB.prepare('INSERT INTO sessions(token_hash,user_id,created_at,expires_at) VALUES(?,?,?,?)').bind(await hashToken(token),user,now,now+43200).run();
 await env.DB.prepare("INSERT INTO themes VALUES ('trip','여행',1)").run();
 await env.DB.prepare("INSERT INTO question_sets(theme_id,version,status,default_next_action,content_sha256,published_at) VALUES('trip',1,'published','정해요',?,?)").bind('c'.repeat(64),now).run();
});
describe('TASK-026 API-012 my rooms',()=>{
 it('returns an empty list and a timestamp',async()=>{const r=await worker.fetch(req(),bindings);expect(r.status).toBe(200);expect(await r.json()).toMatchObject({rooms:[],asOf:expect.any(String)});});
 it('returns only my unexpired open rooms in latest join order, at most twenty',async()=>{
  const alphabet='ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  for(let i=0;i<22;i++){
   const code='ABCDEFGH2'+alphabet[i];
   await env.DB.prepare('INSERT INTO rooms(code,gathering_name,party_size,question_set_id,created_at,expires_at) VALUES(?,?,4,1,?,?)').bind(code,`방${i}`,now,now+2592000).run();
   await env.DB.prepare("INSERT INTO participants(room_id,user_id,role,nickname,joined_at) VALUES(?,?,'member','비밀',?)").bind(i+1,user,now+i).run();
  }
  await env.DB.prepare("UPDATE rooms SET status='closed',close_reason='host_closed',closed_at=? WHERE id=22").bind(now).run();
  await env.DB.prepare("INSERT INTO rooms(code,gathering_name,party_size,question_set_id,created_at,expires_at) VALUES('ZZZZZZZZ23','만료',4,1,?,?)").bind(now-2592001,now-1).run();
  await env.DB.prepare("INSERT INTO participants(room_id,user_id,role,nickname,joined_at) VALUES(23,?,'member','이름',?)").bind(user,now+100).run();
  await env.DB.prepare("INSERT INTO rooms(code,gathering_name,party_size,question_set_id,created_at,expires_at) VALUES('YYYYYYYY23','다른 방',4,1,?,?)").bind(now,now+2592000).run();
  await env.DB.prepare("INSERT INTO responses(participant_id,room_id,answers,submitted_at) VALUES(21,21,'AAAAAAAA',?)").bind(now).run();
  await env.DB.prepare('UPDATE rooms SET submitted_count=1 WHERE id=21').run();
  const r=await worker.fetch(req(),bindings);const data=await r.json() as {rooms:Record<string,unknown>[]};
  expect(r.status).toBe(200);expect(data.rooms).toHaveLength(20);expect(data.rooms[0]).toMatchObject({gatheringName:'방20',myRole:'member',mySubmitted:true,submittedCount:1});expect(data.rooms[19]).toMatchObject({gatheringName:'방1'});expect(JSON.stringify(data)).not.toContain('비밀');
 });
 it('returns 401 and 403',async()=>{expect((await worker.fetch(req(false),bindings)).status).toBe(401);expect((await worker.fetch(req(true,'https://bad.test'),bindings)).status).toBe(403)});
 it('returns default 500 on a database error',async()=>{await env.DB.prepare('DROP TABLE responses').run();const r=await worker.fetch(req(),bindings);expect(r.status).toBe(500);expect(await r.json()).toMatchObject({code:'internal'})});
});
