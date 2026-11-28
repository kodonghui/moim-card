export async function listMyRooms(db:D1Database,userId:string,now=Math.floor(Date.now()/1000)):Promise<Response> {
 const rows=await db.prepare(`SELECT r.code AS roomCode,r.gathering_name AS gatheringName,t.id AS themeId,t.name AS themeName,
 r.party_size AS partySize,r.submitted_count AS submittedCount,p.role AS myRole,
 CASE WHEN x.participant_id IS NULL THEN 0 ELSE 1 END AS mySubmitted
 FROM participants p JOIN rooms r ON r.id=p.room_id JOIN question_sets q ON q.id=r.question_set_id JOIN themes t ON t.id=q.theme_id
 LEFT JOIN responses x ON x.participant_id=p.id
 WHERE p.user_id=? AND r.status='open' AND r.expires_at>? ORDER BY p.joined_at DESC,p.id DESC LIMIT 20`).bind(userId,now).all<{roomCode:string;gatheringName:string;themeId:string;themeName:string;partySize:number;submittedCount:number;myRole:string;mySubmitted:number}>();
 return Response.json({rooms:rows.results.map(r=>({roomCode:r.roomCode,gatheringName:r.gatheringName,theme:{themeId:r.themeId,name:r.themeName},partySize:r.partySize,submittedCount:r.submittedCount,myRole:r.myRole,mySubmitted:r.mySubmitted===1})),asOf:new Date(now*1000).toISOString()});
}
