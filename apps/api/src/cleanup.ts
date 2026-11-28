/** Expiry timestamps and D1 values are UTC Unix seconds. */
export async function cleanup(db: D1Database, now: number): Promise<void> {
  await db.batch([
    db.prepare('DELETE FROM sessions WHERE expires_at <= ?').bind(now),
    db.prepare('DELETE FROM idempotency_records WHERE created_at <= ?').bind(now - 86400),
    db.prepare('DELETE FROM rate_counters WHERE window_start <= ?').bind(now - 7 * 86400),
  ]);
}
