import {env} from 'cloudflare:test';
import {beforeEach,describe,expect,it,vi} from 'vitest';
import {hashToken} from '../src/session';
import worker from '../src/worker';
const origin='https://example.test',now=Math.floor(Date.now()/1000),key='12345678-1234-1234-1234-123456789abc';
const bindings={DB:env.DB,USER_HMAC_KEY:'x'.repeat(32),ORIGIN_PUBLIC:origin,ORIGIN_PRIVATE:'https://private.test',TOSS:{fetch:async()=>new Response()}};
const token=(c:string)=>c.repeat(43), user=(c:string)=>c.repeat(26),answers=Array.from({length:8},(_,i)=>({position:i+1,choice:'A'}));
const card=(ch='a',code='ABCDEFGH23',o=origin)=>new Request(`https://api.test/v1/rooms/${code}/card`,{headers:{origin:o,...(ch?{authorization:`Bearer ${token(ch)}`}:{})}});
const submit=(ch:string)=>new Request('https://api.test/v1/rooms/ABCDEFGH23/responses',{method:'POST',headers:{origin,'content-type':'application/json',authorization:`Bearer ${token(ch)}`,'Idempotency-Key':key},body:JSON.stringify({answers})});
beforeEach(async()=>{
 for(const ch of ['a','b','c']) {await env.DB.prepare('INSERT INTO users VALUES (?,?,?)').bind(user(ch),ch.repeat(64),now).run();await env.DB.prepare('INSERT INTO sessions(token_hash,user_id,created_at,expires_at) VALUES(?,?,?,?)').bind(await hashToken(token(ch)),user(ch),now,now+43200).run()}
 await env.DB.prepare("INSERT INTO themes VALUES ('trip','여행',1)").run();
 await env.DB.prepare("INSERT INTO question_sets(theme_id,version,status,default_next_action,content_sha256,published_at) VALUES('trip',1,'published','정해요',?,?)").bind('d'.repeat(64),now).run();
 for(let i=1;i<=8;i++) await env.DB.prepare("INSERT INTO questions(question_set_id,position,prompt,option_a,option_b,split_suggestion,agreed_text_a,agreed_text_b) VALUES(1,?,'질문','A','B','조율','A 합의','B 합의')").bind(i).run();
 for(const slot of ['plan_speed_low','plan_speed_high','spending_priority_low','spending_priority_high','schedule_change_low','schedule_change_high','balanced']) await env.DB.prepare('INSERT INTO profile_phrases VALUES(1,?,?)').bind(slot,'균형이에요').run();
 await env.DB.prepare("INSERT INTO rooms(code,gathering_name,party_size,question_set_id,participant_count,created_at,expires_at) VALUES('ABCDEFGH23','여행',3,1,2,?,?)").bind(now,now+2592000).run();
 for(const ch of ['a','b']) await env.DB.prepare('INSERT INTO participants(room_id,user_id,role,nickname,joined_at) VALUES(1,?,?,?,?)').bind(user(ch),ch==='a'?'host':'member','비밀이름',now).run();
});
describe('TASK-024 API-009 card',()=>{
 it('returns none for a single response and blocks people without a response',async()=>{
  let r=await worker.fetch(card('a'),bindings);expect(r.status).toBe(403);expect(await r.json()).toMatchObject({code:'response_required'});
  r=await worker.fetch(card('c'),bindings);expect(r.status).toBe(403);expect(await r.json()).toMatchObject({code:'not_participant'});
  await worker.fetch(submit('a'),bindings);r=await worker.fetch(card('a'),bindings);expect(r.status).toBe(200);expect(await r.json()).toMatchObject({stage:'none',basedOnCount:1,items:[],nextAction:null,finalizedAt:null});
 });
 it('repairs a failed interim card write when the card is read',async()=>{
  await worker.fetch(submit('a'),bindings);
  await env.DB.prepare("CREATE TRIGGER test_fail_card BEFORE INSERT ON consensus_cards BEGIN SELECT RAISE(ABORT, 'interim_card_write_failed'); END").run();
  expect((await worker.fetch(submit('b'),bindings)).status).toBe(201);
  await env.DB.prepare('DROP TRIGGER test_fail_card').run();
  const log=vi.spyOn(console,'log').mockImplementation(()=>{});
  const r=await worker.fetch(card('a'),bindings);expect(r.status).toBe(200);
  expect(log.mock.calls.map(args=>JSON.parse(String(args[0])))).toContainEqual({event:'conversion_may_be_missing',count:1});
  expect(JSON.stringify(log.mock.calls)).not.toContain('ABCDEFGH23');log.mockRestore();
  const body=await r.json() as {stage:string;basedOnCount:number;items:Record<string,unknown>[]};
  expect(body).toMatchObject({stage:'interim',basedOnCount:2});expect(body.items).toHaveLength(8);expect(body.items[0]).toMatchObject({countA:2,countB:0,countNone:0,text:'A 합의'});
  expect((await env.DB.prepare('SELECT based_on_count AS n FROM consensus_cards').first<{n:number}>())?.n).toBe(2);
 });
 it('shows a fixed final card to a nonparticipant even after a response is removed',async()=>{
  await worker.fetch(submit('a'),bindings);await worker.fetch(submit('b'),bindings);
  await env.DB.prepare("UPDATE consensus_cards SET stage='final',finalized_at=? WHERE room_id=1").bind(now).run();
  await env.DB.prepare("UPDATE rooms SET status='closed',close_reason='host_closed',closed_at=?").bind(now).run();
  await env.DB.prepare('DELETE FROM participants WHERE user_id=?').bind(user('b')).run();
  const r=await worker.fetch(card('c'),bindings);expect(r.status).toBe(200);const body=await r.json() as {items:Record<string,unknown>[]};
  expect(body).toMatchObject({stage:'final',basedOnCount:2});expect(body.items[0]).toMatchObject({countA:2});expect(JSON.stringify(body)).not.toContain('비밀이름');
 });
 it('returns 401, 403, 404 and default errors',async()=>{
  expect((await worker.fetch(card(''),bindings)).status).toBe(401);
  expect((await worker.fetch(card('a','ABCDEFGH23','https://bad.test'),bindings)).status).toBe(403);
  const missing=await worker.fetch(card('a','bad'),bindings);expect(missing.status).toBe(404);expect(await missing.json()).toMatchObject({code:'room_not_found'});
  await worker.fetch(submit('a'),bindings);await worker.fetch(submit('b'),bindings);await env.DB.prepare('DELETE FROM questions WHERE position=8').run();
  const failed=await worker.fetch(card('a'),bindings);expect(failed.status).toBe(500);expect(await failed.json()).toMatchObject({code:'internal'});
 });
});
