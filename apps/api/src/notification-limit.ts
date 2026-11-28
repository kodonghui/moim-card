import type {NotificationEnv} from './notifications';

/** A dedicated secret yields a non-reversible minute-limit subject, never a user or room ID. */
export async function notificationLimitSubject(identity:Uint8Array,env:NotificationEnv):Promise<string> {
 const secret=env.NOTIFICATION_LIMIT_HMAC_KEY;
 if(typeof secret!=='string'||new TextEncoder().encode(secret).length<32||secret===env.USER_HMAC_KEY)throw new Error('Notification limit key unavailable');
 const raw=new TextEncoder().encode(secret);
 try {
  const keys:unknown=JSON.parse(env.NOTIFICATION_KEYS);
  if(!keys||typeof keys!=='object'||Array.isArray(keys))throw new Error('Notification keyring unavailable');
  for(const encoded of Object.values(keys)){
   if(typeof encoded!=='string')throw new Error('Notification keyring unavailable');
   if(encoded===secret)throw new Error('Notification limit key must be separate');
   const aes=Uint8Array.from(atob(encoded.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
   const same=aes.length===raw.length && aes.every((byte,index)=>byte===raw[index]);aes.fill(0);
   if(same)throw new Error('Notification limit key must be separate');
  }
  const key=await crypto.subtle.importKey('raw',raw,{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const digest=new Uint8Array(await crypto.subtle.sign('HMAC',key,identity));
  try {return 'h'+Array.from(digest,b=>b.toString(16).padStart(2,'0')).join('').slice(0,25)}finally{digest.fill(0)}
 } finally {raw.fill(0)}
}
