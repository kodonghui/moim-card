import {notificationAAD,notificationKeyForVersion,type NotificationKeys} from './notification-crypto';
import {checkLimit} from './rate-limit';
import {createTossClient} from './toss';
import type {SessionEnv} from './create-session';

export type NotificationEnv=SessionEnv & NotificationKeys & {NOTIFICATION_TEMPLATE_SET_CODE?:string};
export type SendSnapshot={sendId:number;roomId:number;subscriptionId:number;participantId:number;userId:string;ciphertext:number[];nonce:number[];keyVersion:number};

/** Process only committed, unique send records; never persist or log the decrypted identity. */
export async function sendNotifications(env:NotificationEnv, snapshots:SendSnapshot[], final:boolean):Promise<void> {
 await Promise.all(snapshots.map(async row=>{
  let result:'sent'|'failed'|'skipped_limit'='failed';
  let plaintext:Uint8Array|null=null,identity:string|null=null,timer:ReturnType<typeof setTimeout>|undefined,expired=false;
  try {
   if(!env.NOTIFICATION_TEMPLATE_SET_CODE)throw new Error('Template unavailable');
   const key=await notificationKeyForVersion(env,row.keyVersion,'decrypt');
   plaintext=new Uint8Array(await crypto.subtle.decrypt({name:'AES-GCM',iv:new Uint8Array(row.nonce),additionalData:notificationAAD(row.roomId,row.participantId,row.keyVersion)},key,new Uint8Array(row.ciphertext)));
   const deadline=Date.now()+5000;
   const timeout=new Promise<never>((_,reject)=>{timer=setTimeout(()=>{expired=true;plaintext?.fill(0);plaintext=null;identity=null;reject(new Error('timeout'))},5000)});
   const deliver=async()=>{
    const eligible=await env.DB.prepare(`SELECT 1 AS ok FROM notification_sends n JOIN participants p ON p.id=? AND p.user_id=? JOIN rooms r ON r.id=n.room_id WHERE n.id=? AND n.result='pending' AND p.room_id=r.id AND ${final ? "r.status='closed' AND r.close_reason='all_submitted'" : "r.status='open' AND r.expires_at>? AND EXISTS(SELECT 1 FROM notification_subscriptions s WHERE s.id=? AND s.participant_id=p.id AND s.room_id=r.id)"}`).bind(...(final?[row.participantId,row.userId,row.sendId]:[row.participantId,row.userId,row.sendId,Math.floor(Date.now()/1000),row.subscriptionId])).first();
    if(!eligible||expired)return;
    const denied=await checkLimit(env.DB,'send',row.userId,Math.floor(Date.now()/1000));
    if(expired)return;
    if(denied){result='skipped_limit';return}
    if(!plaintext)return;
    identity=new TextDecoder().decode(plaintext);
    const remaining=deadline-Date.now();if(remaining<=0)return;
    const sent=await createTossClient(env.TOSS).sendMessage(identity,env.NOTIFICATION_TEMPLATE_SET_CODE!,{},remaining);
    if(!expired && sent.ok)result='sent';
   };
   await Promise.race([deliver(),timeout]);
  } catch { /* Individual delivery errors do not change the committed response. */ }
  finally {if(timer!==undefined)clearTimeout(timer);plaintext?.fill(0);plaintext=null;identity=null}
  await env.DB.prepare('UPDATE notification_sends SET result=? WHERE id=? AND result=\'pending\'').bind(result,row.sendId).run();
 }));
}
