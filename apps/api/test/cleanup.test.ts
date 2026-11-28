import { env } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import worker from '../src/worker';

const now = 1000000, user = 'a'.repeat(26);
async function setup() {
  await env.DB.prepare('INSERT INTO users (id,key_hash,created_at) VALUES (?,?,?)').bind(user, 'a'.repeat(64), now).run();
  const session = (char: string, expires: number) => env.DB.prepare('INSERT INTO sessions (token_hash,user_id,created_at,expires_at) VALUES (?,?,?,?)').bind(char.repeat(64), user, expires - 43200, expires);
  const record = (id: string, created: number) => env.DB.prepare('INSERT INTO idempotency_records VALUES (?,?,?,?,?,?,?)').bind(user, id.repeat(36), 'create', 'b'.repeat(64), 200, '{}', created);
  const counter = (scope: string, start: number) => env.DB.prepare('INSERT INTO rate_counters VALUES (?,?,?,?)').bind(scope,user,start,1);
  await env.DB.batch([session('a',now),session('b',now+1),record('a',now-86400),record('b',now-86399),counter('write',now-604800),counter('room_create',now-604799)]);
}
describe('TASK-011 hourly cleanup', () => {
  it('deletes expired sessions, 24-hour records and seven-day counters while retaining newer rows', async () => {
    await setup();
    await worker.scheduled({scheduledTime: now * 1000, cron: '0 * * * *', noRetry() {}} as ScheduledController, env);
    expect((await env.DB.prepare('SELECT token_hash FROM sessions').all()).results).toEqual([{token_hash:'b'.repeat(64)}]);
    expect((await env.DB.prepare('SELECT request_id FROM idempotency_records').all()).results).toEqual([{request_id:'b'.repeat(36)}]);
    expect((await env.DB.prepare('SELECT scope FROM rate_counters').all()).results).toEqual([{scope:'room_create'}]);
  });
  it('is safe to run again on an empty or already cleaned database', async () => {
    const controller = {scheduledTime: now * 1000, cron: '0 * * * *', noRetry() {}} as ScheduledController;
    await worker.scheduled(controller, env);
    await worker.scheduled(controller, env);
    expect((await env.DB.prepare('SELECT count(*) AS n FROM sessions').first<{n:number}>())?.n).toBe(0);
  });
});
