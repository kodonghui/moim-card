import {env} from 'cloudflare:test';
import {beforeEach,describe,expect,it} from 'vitest';
import {hashToken} from '../src/session';
import worker from '../src/worker';
const origin='https://example.test',token='a'.repeat(43),user='a'.repeat(26),now=Math.floor(Date.now()/1000);
const bindings={DB:env.DB,USER_HMAC_KEY:'x'.repeat(32),ORIGIN_PUBLIC:origin,ORIGIN_PRIVATE:'https://private.test',TOSS:{fetch:async()=>new Response()}};
const req=(query='',auth=true,o=origin)=>new Request(`https://api.test/v1/me/past-cards${query}`,{headers:{origin:o,...(auth?{authorization:`Bearer ${token}`}:{})}});
const item={position:1,prompt:'질문',optionA:'A',optionB:'B',category:'agreed',countA:2,countB:0,countNone:0,text:'A 합의'};
beforeEach(async()=>{
 await env.DB.prepare('INSERT INTO users VALUES (?,?,?)').bind(user,'b'.repeat(64),now).run();
 await env.DB.prepare('INSERT INTO sessions(token_hash,user_id,created_at,expires_at) VALUES(?,?,?,?)').bind(await hashToken(token),user,now,now+43200).run();
});
describe('TASK-027 API-013 past cards',()=>{
 it('returns an empty page',async()=>{const r=await worker.fetch(req(),bindings);expect(r.status).toBe(200);expect(await r.json()).toEqual({pastCards:[],nextCursor:null})});
 it('paginates twenty at a time with stable ties and retains summaries without rooms',async()=>{
  await env.DB.prepare('INSERT INTO users VALUES (?,?,?)').bind('b'.repeat(26),'c'.repeat(64),now).run();
  await env.DB.prepare('INSERT INTO past_cards(user_id,room_ref,gathering_name,theme_name,based_on_count,summary,next_action,finalized_at) VALUES(?,99,?,?,?,?,?,?)').bind('b'.repeat(26),'다른 방','여행',2,JSON.stringify(Array(8).fill(item)),'정해요',now+1).run();
  for(let i=1;i<=22;i++)await env.DB.prepare('INSERT INTO past_cards(user_id,room_ref,gathering_name,theme_name,based_on_count,summary,next_action,finalized_at) VALUES(?,?,?,?,?,?,?,?)').bind(user,i,`방${i}`,'여행',2,JSON.stringify(Array.from({length:8},(_,j)=>({...item,position:j+1}))),'정해요',now).run();
  const first=await (await worker.fetch(req(),bindings)).json() as {pastCards:{pastCardId:number}[];nextCursor:string};
  expect(first.pastCards).toHaveLength(20);expect(first.pastCards[0].pastCardId).toBe(23);expect(first.pastCards[19].pastCardId).toBe(4);
  const second=await (await worker.fetch(req(`?cursor=${first.nextCursor}`),bindings)).json() as {pastCards:{pastCardId:number}[];nextCursor:string|null};
  expect(second.pastCards.map(x=>x.pastCardId)).toEqual([3,2]);expect(second.nextCursor).toBeNull();expect(JSON.stringify(second)).not.toContain('roomCode');
 });
 it('returns 400 for invalid cursors and 401 or 403 for access',async()=>{
  for(const query of ['?cursor=','?cursor=not-base64','?cursor=YQ&cursor=Yg']) {const r=await worker.fetch(req(query),bindings);expect(r.status).toBe(400);expect(await r.json()).toMatchObject({code:'validation_failed',errors:[{field:'cursor',reason:'invalid_format'}]});}
  expect((await worker.fetch(req('',false),bindings)).status).toBe(401);expect((await worker.fetch(req('',true,'https://bad.test'),bindings)).status).toBe(403);
 });
 it('returns default 500 on a database error',async()=>{await env.DB.prepare('DROP TABLE past_cards').run();const r=await worker.fetch(req(),bindings);expect(r.status).toBe(500);expect(await r.json()).toMatchObject({code:'internal'})});
});
