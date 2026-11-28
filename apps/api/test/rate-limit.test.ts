import { env } from 'cloudflare:test';
import { describe, expect, it, vi } from 'vitest';
import { checkLimit, withTossLimit } from '../src/rate-limit';
const user = 'a'.repeat(26), now = 172801, minute = Math.floor(now / 60) * 60, day = Math.floor(now / 86400) * 86400;
const seed = (scope: string, subject: string, start: number, count: number) => env.DB.prepare('INSERT INTO rate_counters VALUES (?,?,?,?)').bind(scope,subject,start,count).run();
const snapshot = async () => (await env.DB.prepare('SELECT * FROM rate_counters ORDER BY scope').all()).results;
describe('TASK-007 rate limits', () => {
  it('rejects the 61st write with retry-after and no counter change', async () => {
    await seed('write',user,minute,60); const before = await snapshot();
    const result = await checkLimit(env.DB,'write',user,now);
    expect(result?.status).toBe(429); expect(result?.headers.get('retry-after')).toBe(String(minute + 60 - now));
    expect(await snapshot()).toEqual(before);
  });
  it('rejects the 31st room creation without consuming a write', async () => {
    await seed('room_create',user,day,30); const before = await snapshot();
    const result = await checkLimit(env.DB,'room_create',user,now);
    expect(result?.status).toBe(429); expect(Number(result?.headers.get('retry-after'))).toBe(day + 86400 - now);
    expect(await snapshot()).toEqual(before);
  });
  it('does not call Toss on user request 21 or app request 3001', async () => {
    const invoke = vi.fn(async () => 'called');
    await seed('toss_api_user',user,minute,20);
    expect((await withTossLimit(env.DB,user,now,invoke)).ok).toBe(false);
    await env.DB.prepare('DELETE FROM rate_counters').run();
    await seed('toss_api_app','app',minute,3000);
    expect((await withTossLimit(env.DB,user,now,invoke)).ok).toBe(false);
    expect(invoke).not.toHaveBeenCalled();
  });
  it('logs app call counts per minute and never counts reads', async () => {
    const logs: unknown[] = [];
    expect(await checkLimit(env.DB,'read',user,now, e => logs.push(e))).toBeNull();
    expect(await snapshot()).toHaveLength(0);
    expect((await withTossLimit(env.DB,user,now,async () => 1, e => logs.push(e))).ok).toBe(true);
    expect(logs).toEqual([{minute,calls:1}]);
  });
  it('increments both room and write counters and resets on a new window', async () => {
    expect(await checkLimit(env.DB, 'room_create', user, now)).toBeNull();
    const rows = await snapshot();
    expect(rows).toEqual([{scope:'room_create',subject:user,window_start:day,count:1}, {scope:'write',subject:user,window_start:minute,count:1}]);
    await seed('write', user, minute + 60, 60);
    expect((await checkLimit(env.DB, 'write', user, minute + 60))?.status).toBe(429);
    expect(await checkLimit(env.DB, 'write', user, minute + 120)).toBeNull();
  });
  it('allows just one simultaneous request into the final app slot', async () => {
    await seed('toss_api_app','app',minute,2999);
    const result = await Promise.all([checkLimit(env.DB,'toss',user,now),checkLimit(env.DB,'toss','b'.repeat(26),now)]);
    expect(result.filter(x => x === null)).toHaveLength(1);
    expect(result.filter(x => x?.status === 429)).toHaveLength(1);
  });
});
