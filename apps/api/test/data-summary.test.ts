import {env} from 'cloudflare:test';
import {beforeEach,describe,expect,it} from 'vitest';
import {hashToken} from '../src/session';
import worker from '../src/worker';
const origin='https://example.test',token='a'.repeat(43),user='a'.repeat(26),now=Math.floor(Date.now()/1000);
const bindings={DB:env.DB,USER_HMAC_KEY:'x'.repeat(32),NOTIFICATION_KEYS:'',NOTIFICATION_ACTIVE_KEY_VERSION:'',ORIGIN_PUBLIC:origin,ORIGIN_PRIVATE:'https://private.test',TOSS:{fetch:async()=>new Response()}};
const req=(auth=true,o=origin)=>new Request('https://api.test/v1/me/data-summary',{headers:{origin:o,...(auth?{authorization:`Bearer ${token}`}:{})}});
beforeEach(async()=>{await env.DB.prepare('INSERT INTO users VALUES (?,?,?)').bind(user,'b'.repeat(64),now).run();await env.DB.prepare('INSERT INTO sessions(token_hash,user_id,created_at,expires_at) VALUES(?,?,?,?)').bind(await hashToken(token),user,now,now+43200).run()});
describe('TASK-028 API-014 data summary',()=>{
 it('returns zero counts for a user without data',async()=>{
  const r=await worker.fetch(req(),bindings);expect(r.status).toBe(200);expect(await r.json()).toEqual({responseCount:0,nicknameCount:0,notificationSubscriptionCount:0,pastCardCount:0,openHostedRoomCount:0,retainedFinalCardCount:0});
 });
 it('counts my data, open hosted rooms and retained final cards',async()=>{
  await env.DB.prepare("INSERT INTO themes VALUES ('trip','여행',1)").run();
  await env.DB.prepare("INSERT INTO question_sets(theme_id,version,status,default_next_action,content_sha256,published_at) VALUES('trip',1,'published','정해요',?,?)").bind('c'.repeat(64),now).run();
  for(const code of ['ABCDEFGH23','BBBBBBBB23'])await env.DB.prepare('INSERT INTO rooms(code,gathering_name,party_size,question_set_id,created_at,expires_at) VALUES(?,?,4,1,?,?)').bind(code,'여행',now,now+2592000).run();
  await env.DB.prepare("UPDATE rooms SET status='closed',close_reason='host_closed',closed_at=? WHERE id=2").bind(now).run();
  await env.DB.prepare("INSERT INTO participants(room_id,user_id,role,nickname,joined_at) VALUES(1,?,'host','이름',?),(2,?,'member','이름',?)").bind(user,now,user,now).run();
  await env.DB.prepare("INSERT INTO responses VALUES(1,1,'AAAAAAAA',?),(2,2,'AAAAAAAA',?)").bind(now,now).run();
  await env.DB.prepare('INSERT INTO notification_subscriptions(participant_id,room_id,anon_key_ciphertext,nonce,key_version,created_at) VALUES(1,1,?,?,1,?)').bind(new Uint8Array(17),new Uint8Array(12),now).run();
  await env.DB.prepare("INSERT INTO consensus_cards(room_id,stage,based_on_count,items,next_action,computed_at,finalized_at) VALUES(2,'final',2,?,'정해요',?,?)").bind(JSON.stringify(Array(8).fill({})),now,now).run();
  await env.DB.prepare('INSERT INTO past_cards(user_id,room_ref,gathering_name,theme_name,based_on_count,summary,next_action,finalized_at) VALUES(?,2,?,?,2,?,?,?)').bind(user,'여행','여행',JSON.stringify(Array(8).fill({})),'정해요',now).run();
  await env.DB.prepare('INSERT INTO users VALUES (?,?,?)').bind('b'.repeat(26),'d'.repeat(64),now).run();
  await env.DB.prepare("INSERT INTO participants(room_id,user_id,role,nickname,joined_at) VALUES(1,?,'member','다른이름',?)").bind('b'.repeat(26),now).run();
  await env.DB.prepare("INSERT INTO responses VALUES(3,1,'BBBBBBBB',?)").bind(now).run();
  await env.DB.prepare('INSERT INTO notification_subscriptions(participant_id,room_id,anon_key_ciphertext,nonce,key_version,created_at) VALUES(3,1,?,?,1,?)').bind(new Uint8Array(17),new Uint8Array(12),now).run();
  const body=await (await worker.fetch(req(),bindings)).json();expect(body).toEqual({responseCount:2,nicknameCount:2,notificationSubscriptionCount:1,pastCardCount:1,openHostedRoomCount:1,retainedFinalCardCount:1});
 });
 it('returns 401, 403 and default errors',async()=>{
  expect((await worker.fetch(req(false),bindings)).status).toBe(401);expect((await worker.fetch(req(true,'https://bad.test'),bindings)).status).toBe(403);
  await env.DB.prepare('DROP TABLE past_cards').run();const r=await worker.fetch(req(),bindings);expect(r.status).toBe(500);expect(await r.json()).toMatchObject({code:'internal'});
 });
});
