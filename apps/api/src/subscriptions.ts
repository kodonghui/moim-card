import {problemResponse} from './app';
import {idempotent} from './idempotency';
import {findSessionUser} from './session';
import {identityHash,equalDigest} from './identity';
import {createTossClient} from './toss';
import {withTossLimit,writeLimitDenied,writeLimitReservation} from './rate-limit';
import {activeNotificationKey,notificationAAD,type NotificationKeys} from './notification-crypto';
import type {SessionEnv} from './create-session';

type Env=SessionEnv & NotificationKeys;
type State={id:number;status:string;participantId:number|null;responseId:number|null;subscriptionId:number|null;keyHash:string};
const CODE=/^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{10}$/;
async function planProblem(code:'invalid_request'|'validation_failed'|'auth_code_invalid'|'room_not_found'|'not_participant'|'response_required'|'room_closed'|'identity_mismatch'|'toss_unavailable'){
 const r=problemResponse(code);return {status:r.status,body:await r.json(),statements:[]};
}
async function state(db:D1Database,user:string,code:string,now:number):Promise<State|null>{
 return db.prepare(`SELECT r.id,r.status,p.id AS participantId,x.participant_id AS responseId,s.id AS subscriptionId,u.key_hash AS keyHash
 FROM rooms r JOIN users u ON u.id=? LEFT JOIN participants p ON p.room_id=r.id AND p.user_id=u.id
 LEFT JOIN responses x ON x.participant_id=p.id LEFT JOIN notification_subscriptions s ON s.participant_id=p.id
 WHERE r.code=? AND r.expires_at>?`).bind(user,code,now).first<State>();
}
export async function subscribeNotification(request:Request,env:Env,now=Math.floor(Date.now()/1000)):Promise<Response>{
 const user=await findSessionUser(env.DB,request.headers.get('Authorization')??undefined,now);if(!user)return problemResponse('unauthenticated');
 const path=new URL(request.url).pathname,code=path.split('/')[3]??'',text=await request.text(),key=request.headers.get('Idempotency-Key');
 const fingerprint=JSON.stringify([request.method,path,text]);
 const snapshot:{previous:State|null}={previous:null};
 for(let attempt=0;attempt<3;attempt++){
  try{return await idempotent(env.DB,user,key,'POST subscribe',fingerprint,now,async()=>{
   let value:unknown;try{value=JSON.parse(text)}catch{return planProblem('invalid_request')}
   if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>k!=='authCode')||typeof (value as {authCode?:unknown}).authCode!=='string'||!/^[\x21-\x7e]{1,512}$/.test((value as {authCode:string}).authCode))return planProblem('validation_failed');
   if(!CODE.test(code))return planProblem('room_not_found');
   snapshot.previous=await state(env.DB,user,code,now);const current=snapshot.previous;
   if(!current)return planProblem('room_not_found');
   if(!current.participantId)return planProblem('not_participant');
   if(current.status!=='open')return planProblem('room_closed');
   if(!current.responseId)return planProblem('response_required');
   if(current.subscriptionId)return {status:200,body:{subscribed:true},statements:[]};
   const denied=await writeLimitDenied(env.DB,user,now);if(denied)return {status:429,body:await denied.json(),headers:{'Retry-After':denied.headers.get('Retry-After')!},statements:[]};
   const cryptoKey=await activeNotificationKey(env);
   if(typeof env.USER_HMAC_KEY!=='string'||new TextEncoder().encode(env.USER_HMAC_KEY).length<32)throw new Error('HMAC key unavailable');
   const exchanged=await withTossLimit(env.DB,user,now,()=>createTossClient(env.TOSS).exchange((value as {authCode:string}).authCode));
   if(!exchanged.ok)return {status:429,body:await exchanged.response.json(),headers:{'Retry-After':exchanged.response.headers.get('Retry-After')!},statements:[]};
   if(!exchanged.value.ok){
    if(exchanged.value.reason==='invalid_auth')return planProblem('auth_code_invalid');
    if(exchanged.value.reason==='rate_limited'){const r=problemResponse('rate_limited',undefined,{'Retry-After':'60'});return {status:429,body:await r.json(),headers:{'Retry-After':'60'},statements:[]}}
    return planProblem('toss_unavailable');
   }
   const anonymous=exchanged.value.value;
   if(!equalDigest(await identityHash(anonymous,env.USER_HMAC_KEY),current.keyHash))return planProblem('identity_mismatch');
   const bytes=new TextEncoder().encode(anonymous);if(bytes.length>496)return planProblem('toss_unavailable');
   const nonce=crypto.getRandomValues(new Uint8Array(12));
   const ciphertext=await crypto.subtle.encrypt({name:'AES-GCM',iv:nonce,additionalData:notificationAAD(current.id,current.participantId,cryptoKey.version)},cryptoKey.key,bytes);
   return {status:201,body:{subscribed:true},statements:[
    env.DB.prepare("INSERT INTO notification_subscriptions(participant_id,room_id,anon_key_ciphertext,nonce,key_version,created_at) VALUES((SELECT p.id FROM participants p JOIN rooms r ON r.id=p.room_id JOIN responses x ON x.participant_id=p.id WHERE p.id=? AND p.user_id=? AND r.id=? AND r.status='open' AND r.expires_at>?),?,?,?,?,?)").bind(current.participantId,user,current.id,now,current.id,new Uint8Array(ciphertext),nonce,cryptoKey.version,now),
    writeLimitReservation(env.DB,user,now),
   ]};
  });}catch(error){
   const current=CODE.test(code)?await state(env.DB,user,code,now):null;
   if(snapshot.previous && (!current || current.status!==snapshot.previous.status || current.subscriptionId || current.responseId!==snapshot.previous.responseId))continue;
   const denied=await writeLimitDenied(env.DB,user,now);if(denied)return denied;
   throw error;
  }
 }
 throw new Error('Concurrent subscription did not settle');
}
