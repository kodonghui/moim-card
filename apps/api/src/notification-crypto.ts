export interface NotificationKeys { NOTIFICATION_KEYS: string; NOTIFICATION_ACTIVE_KEY_VERSION: string }
/** Secret JSON maps integer key versions to base64url-encoded 32-byte AES keys. */
export async function notificationKeyForVersion(env:NotificationKeys,version:number,usage:'encrypt'|'decrypt'):Promise<CryptoKey> {
 if(!Number.isSafeInteger(version)||version<1)throw new Error('Notification key version unavailable');
 let values:unknown;try{values=JSON.parse(env.NOTIFICATION_KEYS)}catch{throw new Error('Notification keyring unavailable')}
 if(!values||typeof values!=='object'||Array.isArray(values))throw new Error('Notification keyring unavailable');
 let selected:Uint8Array|undefined;
 for(const [name,encoded] of Object.entries(values)){
  const n=Number(name);
  if(!Number.isSafeInteger(n)||n<1||String(n)!==name||typeof encoded!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(encoded))throw new Error('Notification keyring unavailable');
  let bytes:Uint8Array;try{bytes=Uint8Array.from(atob(encoded.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0))}catch{throw new Error('Notification keyring unavailable')}
  if(bytes.length!==32)throw new Error('Notification keyring unavailable');
  if(n===version)selected=bytes;else bytes.fill(0);
 }
 if(!selected)throw new Error('Notification key unavailable');
 try{return await crypto.subtle.importKey('raw',selected,'AES-GCM',false,[usage])}finally{selected.fill(0)}
}
export async function activeNotificationKey(env:NotificationKeys):Promise<{version:number;key:CryptoKey}> {
 const version=Number(env.NOTIFICATION_ACTIVE_KEY_VERSION);
 if(!Number.isSafeInteger(version)||version<1||String(version)!==env.NOTIFICATION_ACTIVE_KEY_VERSION)throw new Error('Notification key version unavailable');
 return {version,key:await notificationKeyForVersion(env,version,'encrypt')};
}
export const notificationAAD=(roomId:number,participantId:number,version:number)=>new TextEncoder().encode(`${roomId}:${participantId}:${version}`);
