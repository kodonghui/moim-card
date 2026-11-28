import {applyD1Migrations,env} from 'cloudflare:test';
import {describe,expect,it} from 'vitest';

describe('TASK-032 migration 0003',()=>{
 it('preserves dependent data and never reuses participant or subscription IDs',async()=>{
  const db=env.MIGRATION_DB;
  expect(env.TEST_MIGRATIONS).toHaveLength(3);
  await applyD1Migrations(db,env.TEST_MIGRATIONS.slice(0,2));
  for(const c of ['a','b'])await db.prepare('INSERT INTO users VALUES (?,?,0)').bind(c.repeat(26),c.repeat(64)).run();
  await db.prepare("INSERT INTO themes VALUES ('trip','여행',1)").run();await db.prepare("INSERT INTO question_sets(theme_id,version,status,default_next_action,content_sha256,published_at) VALUES('trip',1,'published','정해요',?,0)").bind('c'.repeat(64)).run();
  await db.prepare("INSERT INTO rooms(code,gathering_name,party_size,question_set_id,created_at,expires_at) VALUES('ABCDEFGH23','여행',4,1,0,2592000)").run();
  await db.prepare("INSERT INTO participants(id,room_id,user_id,role,nickname,joined_at) VALUES(10,1,?,'host','이름',0)").bind('a'.repeat(26)).run();
  await db.prepare("INSERT INTO responses VALUES(10,1,'AAAAAAAA',0)").run();
  await db.prepare('INSERT INTO notification_subscriptions(id,participant_id,room_id,anon_key_ciphertext,nonce,key_version,created_at) VALUES(20,10,1,?,?,1,0)').bind(new Uint8Array(17).fill(3),new Uint8Array(12).fill(4)).run();
  await db.prepare("INSERT INTO notification_sends(room_id,subscription_id,trigger_participant_id,result,created_at) VALUES(1,1000,2000,'sent',0)").run();
  await applyD1Migrations(db,env.TEST_MIGRATIONS.slice(2));
  expect((await db.prepare('PRAGMA foreign_key_check').all()).results).toEqual([]);
  expect((await db.prepare('SELECT id,room_id FROM participants').all()).results).toEqual([{id:10,room_id:1}]);
  expect((await db.prepare('SELECT participant_id,answers FROM responses').all()).results).toEqual([{participant_id:10,answers:'AAAAAAAA'}]);
  const saved=await db.prepare('SELECT id,participant_id,anon_key_ciphertext,nonce FROM notification_subscriptions').first<{id:number;participant_id:number;anon_key_ciphertext:number[];nonce:number[]}>();
  expect(saved).toMatchObject({id:20,participant_id:10});expect([...new Uint8Array(saved!.anon_key_ciphertext)]).toEqual(Array(17).fill(3));expect([...new Uint8Array(saved!.nonce)]).toEqual(Array(12).fill(4));
  expect((await db.prepare('SELECT subscription_id,trigger_participant_id FROM notification_sends').all()).results).toEqual([{subscription_id:1000,trigger_participant_id:2000}]);
  async function createMember(){
   const p=await db.prepare("INSERT INTO participants(room_id,user_id,role,nickname,joined_at) VALUES(1,?,'member','이름',0) RETURNING id").bind('b'.repeat(26)).first<{id:number}>();
   await db.prepare("INSERT INTO responses VALUES(?,1,'BBBBBBBB',0)").bind(p!.id).run();
   const sub=await db.prepare('INSERT INTO notification_subscriptions(participant_id,room_id,anon_key_ciphertext,nonce,key_version,created_at) VALUES(?,1,?,?,1,0) RETURNING id').bind(p!.id,new Uint8Array(17),new Uint8Array(12)).first<{id:number}>();
   return {participant:p!.id,subscription:sub!.id};
  }
  const first=await createMember();expect(first).toEqual({participant:2001,subscription:1001});
  await db.prepare('DELETE FROM participants WHERE id=?').bind(first.participant).run();
  const second=await createMember();expect(second).toEqual({participant:2002,subscription:1002});
  await db.prepare('DELETE FROM rooms WHERE id=1').run();
  for(const table of ['participants','responses','notification_subscriptions','notification_sends'])expect((await db.prepare(`SELECT count(*) AS n FROM ${table}`).first<{n:number}>())?.n).toBe(0);
  expect((await db.prepare('PRAGMA foreign_key_check').all()).results).toEqual([]);
 });
});
