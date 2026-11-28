export async function getDataSummary(db:D1Database,user:string,now=Math.floor(Date.now()/1000)):Promise<Response>{
 const row=await db.prepare(`SELECT
 (SELECT COUNT(*) FROM responses x JOIN participants p ON p.id=x.participant_id WHERE p.user_id=?) AS responseCount,
 (SELECT COUNT(*) FROM participants WHERE user_id=?) AS nicknameCount,
 (SELECT COUNT(*) FROM notification_subscriptions s JOIN participants p ON p.id=s.participant_id WHERE p.user_id=?) AS notificationSubscriptionCount,
 (SELECT COUNT(*) FROM past_cards WHERE user_id=?) AS pastCardCount,
 (SELECT COUNT(*) FROM participants p JOIN rooms r ON r.id=p.room_id WHERE p.user_id=? AND p.role='host' AND r.status='open' AND r.expires_at>?) AS openHostedRoomCount,
 (SELECT COUNT(*) FROM participants p JOIN responses x ON x.participant_id=p.id JOIN consensus_cards c ON c.room_id=p.room_id WHERE p.user_id=? AND c.stage='final') AS retainedFinalCardCount`)
 .bind(user,user,user,user,user,now,user).first();
 return Response.json(row);
}
