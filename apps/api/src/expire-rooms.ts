/** Expire at most 500 rooms per run; a failure in one room does not block the others. */
export async function expireRooms(db:D1Database,now:number,log:(entry:{event:string;count:number})=>void=entry=>console.error(JSON.stringify(entry))):Promise<void>{
 const expired=await db.prepare('SELECT id FROM rooms WHERE expires_at<=? ORDER BY expires_at,id LIMIT 500').bind(now).all<{id:number}>();
 for(const room of expired.results){
  try{await db.prepare('DELETE FROM rooms WHERE id=? AND expires_at<=?').bind(room.id,now).run()}
  catch{log({event:'room_expiry_failed',count:1})}
 }
}
