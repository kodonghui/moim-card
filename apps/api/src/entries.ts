import {problemResponse} from './app';
import {writeLimitDenied,writeLimitReservation} from './rate-limit';
export async function recordEntry(request:Request,db:D1Database,user:string,now=Math.floor(Date.now()/1000)):Promise<Response>{
 let value:unknown;try{value=await request.json()}catch{return problemResponse('invalid_request')}
 const kind=value && typeof value==='object' && !Array.isArray(value) ? (value as {referrerKind?:unknown}).referrerKind : undefined;
 if(!value || typeof value!=='object' || Array.isArray(value) || Object.keys(value).some(k=>k!=='referrerKind') || (kind!=='external_share'&&kind!=='other')){
  const r=problemResponse('validation_failed');return Response.json({...await r.json() as object,errors:[{field:'referrerKind',reason:kind===undefined?'required':'invalid_choice'}]}, {status:400,headers:{'content-type':'application/problem+json'}});
 }
 const denied=await writeLimitDenied(db,user,now);if(denied)return denied;
 const day=new Date(now*1000).toISOString().slice(0,10);
 try {await db.batch([writeLimitReservation(db,user,now),db.prepare('INSERT INTO entry_stats(day,referrer_kind,count) VALUES(?,?,1) ON CONFLICT(day,referrer_kind) DO UPDATE SET count=count+1').bind(day,kind)])}
 catch(error){const limited=await writeLimitDenied(db,user,now);if(limited)return limited;throw error}
 return new Response(null,{status:204});
}
