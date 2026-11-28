import {calculateCard,type Answer} from '@moim-card/packages-shared';
import {problemResponse} from './app';
import {hashToken,findSessionUser} from './session';
import {writeLimitDenied,writeLimitReservation} from './rate-limit';
import {readQuestions,serializedItems} from './responses';
const UUID=/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
type Membership={participantId:number;roomId:number;role:'host'|'member';status:'open'|'closed';participantCount:number;submittedCount:number;setId:number;defaultAction:string;answered:number};
type RecordRow={operation:string;request_sha256:string};
async function deletedSession(db:D1Database,authorization:string|null,now:number):Promise<boolean>{
 const match=/^Bearer ([A-Za-z0-9_-]{43})$/.exec(authorization??'');if(!match)return false;
 const row=await db.prepare('SELECT 1 FROM sessions WHERE token_hash=? AND user_id IS NULL AND revoked_at IS NOT NULL AND created_at<=? AND expires_at>?').bind(await hashToken(match[1]),now,now).first();
 return row!==null;
}
async function memberships(db:D1Database,user:string):Promise<Membership[]>{
 return (await db.prepare(`SELECT p.id AS participantId,p.room_id AS roomId,p.role,r.status,r.participant_count AS participantCount,
 r.submitted_count AS submittedCount,r.question_set_id AS setId,q.default_next_action AS defaultAction,
 CASE WHEN x.participant_id IS NULL THEN 0 ELSE 1 END AS answered
 FROM participants p JOIN rooms r ON r.id=p.room_id JOIN question_sets q ON q.id=r.question_set_id
 LEFT JOIN responses x ON x.participant_id=p.id WHERE p.user_id=? ORDER BY p.id`).bind(user).all<Membership>()).results;
}
async function previousRecord(db:D1Database,user:string,key:string,now:number):Promise<RecordRow|null>{
 return db.prepare('SELECT operation,request_sha256 FROM idempotency_records WHERE user_id=? AND request_id=? AND created_at>?').bind(user,key,now-86400).first<RecordRow>();
}
export async function deleteMyData(request:Request,db:D1Database,now=Math.floor(Date.now()/1000)):Promise<Response>{
 const authorization=request.headers.get('Authorization'),key=request.headers.get('Idempotency-Key');
 const user=await findSessionUser(db,authorization??undefined,now);
 if(!user){
  if(await deletedSession(db,authorization,now))return key&&UUID.test(key)?new Response(null,{status:204}):problemResponse('invalid_request');
  return problemResponse('unauthenticated');
 }
 if(!key||!UUID.test(key)||(await request.text()).length>0)return problemResponse('invalid_request');
 const digest=await hashToken(''),operation='DELETE /v1/me';
 for(let attempt=0;attempt<10;attempt++){
  const record=await previousRecord(db,user,key,now);
  if(record)return record.operation===operation&&record.request_sha256===digest?new Response(null,{status:204}):problemResponse('idempotency_conflict');
  const denied=await writeLimitDenied(db,user,now);if(denied)return denied;
  const before=await memberships(db,user),signature=JSON.stringify(before);
  const statements:D1PreparedStatement[]=[
   db.prepare('DELETE FROM idempotency_records WHERE user_id=? AND request_id=? AND created_at<=?').bind(user,key,now-86400),
   db.prepare('INSERT INTO idempotency_records(user_id,request_id,operation,request_sha256,status_code,response_body,created_at) VALUES(?,?,?,?,204,?,?)').bind(user,key,operation,digest,'null',now),
   writeLimitReservation(db,user,now),
   db.prepare('UPDATE users SET key_hash=CASE WHEN (SELECT COUNT(*) FROM participants WHERE user_id=?)=? AND NOT EXISTS(SELECT 1 FROM participants WHERE user_id=? AND id NOT IN (SELECT CAST(value AS INTEGER) FROM json_each(?))) THEN key_hash ELSE NULL END WHERE id=?').bind(user,before.length,user,JSON.stringify(before.map(p=>p.participantId)),user),
  ];
  let stale=false; const responseSnapshots=new Map<number,string>();
  for(const m of before){
   if(m.status!=='open')continue;
   const remaining=m.submittedCount-m.answered;
   const rows=(await db.prepare('SELECT participant_id AS id,answers FROM responses WHERE room_id=? ORDER BY participant_id').bind(m.roomId).all<{id:number;answers:string}>()).results;
   responseSnapshots.set(m.roomId,JSON.stringify(rows));
   const answers=rows.filter(r=>r.id!==m.participantId).map(r=>[...r.answers] as Answer[]);
   if(rows.length!==m.submittedCount||remaining!==answers.length){stale=true;break}
   const card=remaining>=2?calculateCard(await readQuestions(db,m.setId),answers,m.defaultAction):null;
   const isHost=m.role==='host';
   statements.push(db.prepare(`UPDATE rooms SET participant_count=CASE WHEN status='open' AND participant_count=? AND submitted_count=? AND EXISTS(SELECT 1 FROM participants WHERE id=? AND user_id=? AND room_id=rooms.id) AND (SELECT json_group_array(json_object('id',participant_id,'answers',answers)) FROM (SELECT participant_id,answers FROM responses WHERE room_id=rooms.id ORDER BY participant_id))=? THEN participant_count-1 ELSE NULL END,
    submitted_count=submitted_count-?,status=CASE WHEN ?=1 THEN 'closed' ELSE status END,
    close_reason=CASE WHEN ?=1 THEN 'host_deleted' ELSE close_reason END,closed_at=CASE WHEN ?=1 THEN ? ELSE closed_at END WHERE id=?`)
    .bind(m.participantCount,m.submittedCount,m.participantId,user,JSON.stringify(rows),m.answered,isHost?1:0,isHost?1:0,isHost?1:0,now,m.roomId));
   if(card){
    statements.push(db.prepare("INSERT INTO consensus_cards(room_id,stage,based_on_count,items,next_action,computed_at,finalized_at) VALUES(?,?,?,?,?,?,?) ON CONFLICT(room_id) DO UPDATE SET stage=excluded.stage,based_on_count=excluded.based_on_count,items=excluded.items,next_action=excluded.next_action,computed_at=excluded.computed_at,finalized_at=excluded.finalized_at WHERE consensus_cards.stage='interim'").bind(m.roomId,isHost?'final':'interim',remaining,serializedItems(card.items),card.nextAction,now,isHost?now:null));
    if(isHost)statements.push(db.prepare("INSERT INTO past_cards(user_id,room_ref,gathering_name,theme_name,based_on_count,summary,next_action,finalized_at) SELECT p.user_id,r.id,r.gathering_name,t.name,?,?,?,? FROM rooms r JOIN question_sets q ON q.id=r.question_set_id JOIN themes t ON t.id=q.theme_id JOIN participants p ON p.room_id=r.id JOIN responses x ON x.participant_id=p.id WHERE r.id=? AND p.user_id<>?").bind(remaining,JSON.stringify(card.items),card.nextAction,now,m.roomId,user));
   }else statements.push(db.prepare("DELETE FROM consensus_cards WHERE room_id=? AND stage='interim'").bind(m.roomId));
   if(isHost)statements.push(db.prepare('DELETE FROM notification_subscriptions WHERE room_id=?').bind(m.roomId));
  }
  if(stale)continue;
  statements.push(db.prepare('UPDATE sessions SET revoked_at=? WHERE user_id=? AND revoked_at IS NULL').bind(now,user));
  statements.push(db.prepare("DELETE FROM rate_counters WHERE subject=? AND scope<>'toss_send_key'").bind(user));
  statements.push(db.prepare('DELETE FROM users WHERE id=?').bind(user));
  try {await db.batch(statements);return new Response(null,{status:204})}catch(error){
   if(await deletedSession(db,authorization,now))return new Response(null,{status:204});
   const winner=await previousRecord(db,user,key,now);
   if(winner)return winner.operation===operation&&winner.request_sha256===digest?new Response(null,{status:204}):problemResponse('idempotency_conflict');
   const current=await memberships(db,user);if(JSON.stringify(current)!==signature)continue;
   let responsesChanged=false;
   for(const [roomId,expected] of responseSnapshots){
    const rows=(await db.prepare('SELECT participant_id AS id,answers FROM responses WHERE room_id=? ORDER BY participant_id').bind(roomId).all<{id:number;answers:string}>()).results;
    if(JSON.stringify(rows)!==expected){responsesChanged=true;break}
   }
   if(responsesChanged)continue;
   const limited=await writeLimitDenied(db,user,now);if(limited)return limited;
   throw error;
  }
 }
 throw new Error('Concurrent deletion did not settle');
}
