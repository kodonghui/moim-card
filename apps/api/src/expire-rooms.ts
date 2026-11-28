/** Expire up to 500 rooms; each batch is atomic and a failed batch is retried room by room. */
export async function expireRooms(db:D1Database,now:number,log:(entry:{event:string;count:number})=>void=entry=>console.error(JSON.stringify(entry))):Promise<void>{
 const expired=await db.prepare('SELECT id FROM rooms WHERE expires_at<=? ORDER BY expires_at,id LIMIT 500').bind(now).all<{id:number}>();
 // One query is used by the SELECT and one is reserved for the hourly cleanup batch.
 // Never exceed Workers Free's 50 D1 calls even if many batches fail.
 let budget=48;
 const deletion=(id:number)=>db.prepare('DELETE FROM rooms WHERE id=? AND expires_at<=?').bind(id,now);
 for(let index=0;index<expired.results.length && budget>0;index+=25){
  const group=expired.results.slice(index,index+25);budget--;
  try{await db.batch(group.map(room=>deletion(room.id)))}
  catch{
   for(const room of group){
    if(budget===0)break;
    budget--;
    try{await deletion(room.id).run()}catch{log({event:'room_expiry_failed',count:1})}
   }
  }
 }
}
