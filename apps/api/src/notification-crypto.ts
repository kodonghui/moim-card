export interface NotificationKeys { NOTIFICATION_KEYS: string; NOTIFICATION_ACTIVE_KEY_VERSION: string }
/** Secret JSON maps integer key versions to base64url-encoded 32-byte AES keys. */
export async function activeNotificationKey(env:NotificationKeys):Promise<{version:number;key:CryptoKey}> {
 const version=Number(env.NOTIFICATION_ACTIVE_KEY_VERSION);
 if(!Number.isSafeInteger(version)||version<1||String(version)!==env.NOTIFICATION_ACTIVE_KEY_VERSION)throw new Error('Notification key version unavailable');
 let values:unknown;try{values=JSON.parse(env.NOTIFICATION_KEYS)}catch{throw new Error('Notification keyring unavailable')}
 if(!values||typeof values!=='object'||Array.isArray(values))throw new Error('Notification keyring unavailable');
 const encoded=(values as Record<string,unknown>)[String(version)];
 if(typeof encoded!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(encoded))throw new Error('Notification key unavailable');
 let bytes:Uint8Array;try{bytes=Uint8Array.from(atob(encoded.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0))}catch{throw new Error('Notification key unavailable')}
 if(bytes.length!==32)throw new Error('Notification key unavailable');
 return {version,key:await crypto.subtle.importKey('raw',bytes,'AES-GCM',false,['encrypt','decrypt'])};
}
export const notificationAAD=(roomId:number,participantId:number,version:number)=>new TextEncoder().encode(`${roomId}:${participantId}:${version}`);
