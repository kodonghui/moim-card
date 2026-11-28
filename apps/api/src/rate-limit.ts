import { problemResponse } from './app';

type Kind = 'read' | 'write' | 'room_create' | 'toss';
type Scope = 'write' | 'room_create' | 'toss_api_user' | 'toss_api_app';
type Limit = {scope: Scope; subject: string; start: number; seconds: number; maximum: number};

/** Fixed UTC windows; all counters for an action increment together or not at all. */
export async function checkLimit(db: D1Database, kind: Kind, userId: string, now: number, log: (entry: {minute: number; calls: number}) => void = () => {}): Promise<Response | null> {
  if (kind === 'read') return null;
  const minute = Math.floor(now / 60) * 60, day = Math.floor(now / 86400) * 86400;
  const limits: Limit[] = kind === 'toss'
    ? [{scope:'toss_api_user',subject:userId,start:minute,seconds:60,maximum:20}, {scope:'toss_api_app',subject:'app',start:minute,seconds:60,maximum:3000}]
    : [{scope:'write',subject:userId,start:minute,seconds:60,maximum:60}, ...(kind === 'room_create' ? [{scope:'room_create' as const,subject:userId,start:day,seconds:86400,maximum:30}] : [])];
  const conditions = limits.map(() => 'COALESCE((SELECT count FROM rate_counters WHERE scope=? AND subject=? AND window_start=?),0) < ?').join(' AND ');
  const rows = limits.map(() => 'SELECT ? AS scope, ? AS subject, ? AS window_start, 1 AS count').join(' UNION ALL ');
  const params: (string | number)[] = [];
  for (const limit of limits) params.push(limit.scope, limit.subject, limit.start);
  for (const limit of limits) params.push(limit.scope, limit.subject, limit.start, limit.maximum);
  const sql = `INSERT INTO rate_counters (scope,subject,window_start,count) SELECT scope,subject,window_start,count FROM (${rows}) WHERE ${conditions} ON CONFLICT(scope,subject,window_start) DO UPDATE SET count=count+1 RETURNING scope`;
  const result = await db.prepare(sql).bind(...params).all<{scope: string}>();
  if (result.results.length === limits.length) {
    if (kind === 'toss') {
      const count = await db.prepare("SELECT count FROM rate_counters WHERE scope='toss_api_app' AND subject='app' AND window_start=?").bind(minute).first<{count:number}>();
      log({minute, calls: count?.count ?? 0});
    }
    return null;
  }
  let wait = 1;
  for (const limit of limits) {
    const row = await db.prepare('SELECT count FROM rate_counters WHERE scope=? AND subject=? AND window_start=?').bind(limit.scope, limit.subject, limit.start).first<{count:number}>();
    if ((row?.count ?? 0) >= limit.maximum) wait = Math.max(wait, limit.start + limit.seconds - now);
  }
  return problemResponse('rate_limited', undefined, {'Retry-After': String(wait)});
}

/** Call the remote server only after both user and app reservations succeed. */
export async function withTossLimit<T>(db: D1Database, userId: string, now: number, invoke: () => Promise<T>, log?: (entry: {minute: number; calls: number}) => void): Promise<{ok: true; value: T} | {ok: false; response: Response}> {
  const denied = await checkLimit(db, 'toss', userId, now, log);
  return denied ? {ok: false, response: denied} : {ok: true, value: await invoke()};
}
