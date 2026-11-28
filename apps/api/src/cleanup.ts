/** Expiry timestamps and D1 values are UTC Unix seconds. */
export async function cleanup(db: D1Database, now: number): Promise<void> {
  await db.batch([
    db.prepare('DELETE FROM sessions WHERE expires_at <= ?').bind(now),
    db.prepare('DELETE FROM idempotency_records WHERE created_at <= ?').bind(now - 86400),
    db.prepare('DELETE FROM rate_counters WHERE window_start <= ?').bind(now - 7 * 86400),
  ]);
}

/** Only notification-identity counters are removed by the minute trigger. */
export async function cleanupNotificationLimits(db:D1Database,now:number):Promise<void> {
  await db.prepare("DELETE FROM rate_counters WHERE scope='toss_send_key' AND window_start<?").bind(Math.floor(now/60)*60).run();
}
