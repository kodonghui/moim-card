import {calculateCard, calculateProfile, type Answer, type Axis, type CardQuestion, type ProfilePhrases} from '@moim-card/packages-shared';
import {problemResponse} from './app';
import {idempotent} from './idempotency';
import {findSessionUser} from './session';
import {writeLimitReservation, writeLimitDenied} from './rate-limit';

type Room = {id:number;status:string;participantId:number|null;responseId:number|null;submittedCount:number;partySize:number;conversionLogged:number;setId:number;defaultAction:string};
type Question = CardQuestion & {axis:Axis|null;axisPoleA:'low'|'high'|null};
type Plan = {status:number;body:unknown;statements:D1PreparedStatement[];headers?:Record<string,string>};
const CODE = /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{10}$/;
async function problem(code: 'invalid_request'|'validation_failed'|'room_not_found'|'not_participant'|'room_closed'|'already_submitted', errors?:unknown[]): Promise<Plan> {
  const r=problemResponse(code); const body=await r.json() as Record<string,unknown>;
  return {status:r.status,body:errors?{...body,errors}:body,statements:[]};
}
function parseAnswers(value: unknown): {answers:Answer[]} | {errors:unknown[]} {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(k=>k!=='answers') || !Array.isArray((value as {answers?:unknown}).answers)) return {errors:[{field:'answers',reason:'required'}]};
  const raw=(value as {answers:unknown[]}).answers;
  const byPosition=new Map<number,Answer>(); const invalid:number[]=[]; let unknown=false;
  for (const item of raw) {
    if (!item || typeof item !== 'object' || Array.isArray(item) || Object.keys(item).some(k=>k!=='position'&&k!=='choice')) {unknown=true;continue}
    const {position,choice}=item as {position:unknown;choice:unknown};
    if (!Number.isInteger(position) || (position as number)<1 || (position as number)>8 || byPosition.has(position as number)) {unknown=true;continue}
    if (choice!=='A' && choice!=='B' && choice!=='none') {invalid.push(position as number);continue}
    byPosition.set(position as number,choice==='none'?'N':choice);
  }
  if (unknown) return {errors:[{field:'answers',reason:'unknown_question'}]};
  if (invalid.length) return {errors:[{field:'answers',reason:'invalid_choice',positions:invalid.sort()}]};
  if (byPosition.size!==8 || raw.length!==8) return {errors:[{field:'answers',reason:'wrong_count',positions:Array.from({length:8},(_,i)=>i+1).filter(p=>!byPosition.has(p))}]};
  return {answers:Array.from({length:8},(_,i)=>byPosition.get(i+1)!)};
}
async function readRoom(db:D1Database,user:string,code:string,now:number):Promise<Room|null> {
 return db.prepare(`SELECT r.id,r.status,r.submitted_count AS submittedCount,r.party_size AS partySize,r.conversion_logged AS conversionLogged,
 r.question_set_id AS setId,q.default_next_action AS defaultAction,p.id AS participantId,resp.participant_id AS responseId
 FROM rooms r JOIN question_sets q ON q.id=r.question_set_id LEFT JOIN participants p ON p.room_id=r.id AND p.user_id=?
 LEFT JOIN responses resp ON resp.participant_id=p.id WHERE r.code=? AND r.expires_at>?`).bind(user,code,now).first<Room>();
}
async function readQuestions(db:D1Database,setId:number):Promise<Question[]> {
 const result=await db.prepare(`SELECT position,prompt,option_a AS optionA,option_b AS optionB,split_suggestion AS splitSuggestion,
 agreed_text_a AS agreedTextA,agreed_text_b AS agreedTextB,axis,axis_pole_a AS axisPoleA FROM questions WHERE question_set_id=? ORDER BY position`).bind(setId).all<Question>();
 if(result.results.length!==8) throw new Error('Question set incomplete');return result.results;
}
async function readAnswers(db:D1Database,roomId:number):Promise<Answer[][]> {
 const result=await db.prepare('SELECT answers FROM responses WHERE room_id=?').bind(roomId).all<{answers:string}>();
 return result.results.map(row=>[...row.answers] as Answer[]);
}
function serializedItems(items: ReturnType<typeof calculateCard>['items']) {
 return JSON.stringify(items.map(i=>({position:i.position,a:i.countA,b:i.countB,none:i.countNone,category:i.category})));
}
async function profile(db:D1Database,setId:number,questions:Question[],answers:Answer[]) {
 const rows=await db.prepare('SELECT slot,phrase FROM profile_phrases WHERE question_set_id=?').bind(setId).all<{slot:string;phrase:string}>();
 if(rows.results.length!==7) throw new Error('Profile phrases incomplete');
 const phrases=Object.fromEntries(rows.results.map(row=>[row.slot,row.phrase])) as ProfilePhrases;
 return calculateProfile(questions.map(q=>({axis:q.axis,highChoice:q.axisPoleA==null?null:q.axisPoleA==='high'?'A':'B'})),answers,phrases);
}
/** Only errors identifying the card write qualify. The explicit marker is for fault injection; production failures often lack a statement identifier, so unknown failures stay errors. */
function isCardWriteFailure(error:unknown):boolean {
 const message=error instanceof Error ? error.message : '';
 return /(?:interim_card_write_failed|(?:UNIQUE|NOT NULL) constraint failed: consensus_cards\.)/.test(message);
}
export async function submitResponse(request:Request,db:D1Database,now=Math.floor(Date.now()/1000)):Promise<Response> {
 const user=await findSessionUser(db,request.headers.get('Authorization')??undefined,now);if(!user)return problemResponse('unauthenticated');
 const path=new URL(request.url).pathname, code=path.split('/')[3]??'', text=await request.text(), key=request.headers.get('Idempotency-Key');
 const fingerprint=JSON.stringify([request.method,path,text]);
 let fallback=false; const state: {snapshot:Room|null} = {snapshot:null};
 for(let attempt=0;attempt<10;attempt++) {
  try {
   return await idempotent(db,user,key,'POST submitResponse',fingerprint,now,async()=>{
    const denied=await writeLimitDenied(db,user,now);
    if(denied)return {status:429,body:await denied.json(),headers:{'Retry-After':denied.headers.get('Retry-After')!},statements:[]};
    const reserve=()=>writeLimitReservation(db,user,now);
    const fail=(plan:Promise<Plan>)=>plan;
    let value:unknown;try{value=JSON.parse(text)}catch{return fail(problem('invalid_request'))}
    const parsed=parseAnswers(value);if('errors' in parsed)return fail(problem('validation_failed',parsed.errors));
    if(!CODE.test(code))return fail(problem('room_not_found'));
    state.snapshot=await readRoom(db,user,code,now);const room=state.snapshot;
    if(!room)return fail(problem('room_not_found'));
    if(!room.participantId)return fail(problem('not_participant'));
    if(room.status!=='open')return fail(problem('room_closed'));
    if(room.responseId)return fail(problem('already_submitted'));
    const [questions,previous]=await Promise.all([readQuestions(db,room.setId),readAnswers(db,room.id)]);
    if(previous.length!==room.submittedCount) throw new Error('stale_submission_snapshot');
    const resultProfile=await profile(db,room.setId,questions,parsed.answers);
    const count=room.submittedCount+1, final=count===room.partySize, withCard=count>=2 && !fallback;
    const card=withCard?calculateCard(questions,[...previous,parsed.answers],room.defaultAction):null;
    const conversion=withCard && !final && room.conversionLogged===0;
    const statements=[
      db.prepare("UPDATE rooms SET submitted_count=CASE WHEN status='open' AND submitted_count=? AND expires_at>? THEN submitted_count+1 ELSE NULL END,conversion_logged=CASE WHEN ?=1 THEN 1 ELSE conversion_logged END,status=CASE WHEN ?=1 THEN 'closed' ELSE status END,close_reason=CASE WHEN ?=1 THEN 'all_submitted' ELSE close_reason END,closed_at=CASE WHEN ?=1 THEN ? ELSE closed_at END WHERE id=?").bind(room.submittedCount,now,conversion?1:0,final?1:0,final?1:0,final?1:0,now,room.id),
      db.prepare('INSERT INTO responses(participant_id,room_id,answers,submitted_at) VALUES(?,?,?,?)').bind(room.participantId,room.id,parsed.answers.join(''),now),
      reserve(),
    ];
    if(card) {
      statements.push(db.prepare("INSERT INTO consensus_cards(room_id,stage,based_on_count,items,next_action,computed_at,finalized_at) VALUES(?,?,?,?,?,?,?) ON CONFLICT(room_id) DO UPDATE SET stage=excluded.stage,based_on_count=excluded.based_on_count,items=excluded.items,next_action=excluded.next_action,computed_at=excluded.computed_at,finalized_at=excluded.finalized_at WHERE consensus_cards.stage='interim'").bind(room.id,final?'final':'interim',count,serializedItems(card.items),card.nextAction,now,final?now:null));
      if(final) {
        statements.push(db.prepare("INSERT INTO past_cards(user_id,room_ref,gathering_name,theme_name,based_on_count,summary,next_action,finalized_at) SELECT p.user_id,r.id,r.gathering_name,t.name,?,?,?,? FROM rooms r JOIN question_sets q ON q.id=r.question_set_id JOIN themes t ON t.id=q.theme_id JOIN participants p ON p.room_id=r.id JOIN responses x ON x.participant_id=p.id WHERE r.id=?").bind(count,JSON.stringify(card.items),card.nextAction,now,room.id));
        statements.push(db.prepare('DELETE FROM notification_subscriptions WHERE room_id=?').bind(room.id));
      }
    }
    return {status:201,body:{roomStatus:final?'closed':'open',submittedCount:count,partySize:room.partySize,cardStage:final?'final':count>=2?'interim':'none',logConversion:conversion,profile:resultProfile},statements};

   });
  } catch(error) {
   if(error instanceof Error && error.message.includes('stale_submission_snapshot')) continue;
   const denied=await writeLimitDenied(db,user,now);if(denied)return denied;
   const current=CODE.test(code)?await readRoom(db,user,code,now):null;
   if(state.snapshot && current && (current.submittedCount!==state.snapshot.submittedCount || current.status!==state.snapshot.status || current.responseId)) {fallback=false;continue}
   if(!fallback && state.snapshot && state.snapshot.submittedCount+1<state.snapshot.partySize && isCardWriteFailure(error)) {fallback=true;continue}
   throw error;
  }
 }
 throw new Error('Concurrent submissions did not settle');
}

/** Recompute a missing or stale interim card on read, with a count guard against concurrent submissions. */
export async function readFreshInterimCard(db:D1Database,roomId:number,now:number):Promise<{basedOnCount:number;items:string;nextAction:string}|null> {
 for(let attempt=0;attempt<10;attempt++) {
  const room=await db.prepare("SELECT r.submitted_count AS n,r.status,r.question_set_id AS setId,q.default_next_action AS defaultAction FROM rooms r JOIN question_sets q ON q.id=r.question_set_id WHERE r.id=?").bind(roomId).first<{n:number;status:string;setId:number;defaultAction:string}>();
  if(!room || room.status!=='open' || room.n<2)return null;
  const existing=await db.prepare("SELECT based_on_count AS basedOnCount,items,next_action AS nextAction FROM consensus_cards WHERE room_id=? AND stage='interim'").bind(roomId).first<{basedOnCount:number;items:string;nextAction:string}>();
  if(existing?.basedOnCount===room.n)return existing;
  const [questions,answers]=await Promise.all([readQuestions(db,room.setId),readAnswers(db,roomId)]);
  if(answers.length!==room.n)continue;
  const card=calculateCard(questions,answers,room.defaultAction),items=serializedItems(card.items);
  const result=await db.prepare("INSERT INTO consensus_cards(room_id,stage,based_on_count,items,next_action,computed_at,finalized_at) SELECT ?,'interim',?,?,?,?,NULL WHERE EXISTS(SELECT 1 FROM rooms WHERE id=? AND status='open' AND submitted_count=?) ON CONFLICT(room_id) DO UPDATE SET based_on_count=excluded.based_on_count,items=excluded.items,next_action=excluded.next_action,computed_at=excluded.computed_at WHERE consensus_cards.stage='interim'").bind(roomId,room.n,items,card.nextAction,now,roomId,room.n).run();
  if(result.meta.changes===1)return {basedOnCount:room.n,items,nextAction:card.nextAction};
 }
 throw new Error('Concurrent card repair did not settle');
}
