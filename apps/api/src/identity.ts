/** Identity keys are never persisted or logged; only keyed digests leave this function. */
export async function identityHash(anonymousKey:string,secret:string):Promise<string> {
 if(typeof secret!=='string'||new TextEncoder().encode(secret).length<32)throw new Error('HMAC key unavailable');
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const bytes=new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(anonymousKey)));
 return Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
}
export function equalDigest(a:string,b:string):boolean {
 if(a.length!==64||b.length!==64)return false;
 let difference=0;for(let i=0;i<64;i++)difference|=a.charCodeAt(i)^b.charCodeAt(i);return difference===0;
}
