import { problemResponse } from './app';

export const ROOM_CREATE_MAX = 30;
export const ROOM_CREATE_SECONDS = 86400;

type Kind = 'read' | 'write' | 'room_create' | 'toss';
type Scope = 'write' | 'room_create' | 'toss_api_user' | 'toss_api_app';
type Limit = {scope: Scope; subject: string; start: number; seconds: number; maximum: number; rolling?: boolean};

/** Minute limits use UTC windows; room creation uses a rolling 24 hours. */
export async function checkLimit(db: D1Database, kind: Kind, userId: string, now: number, log: (entry: {minute: number; calls: number}) => void = entry => console.log(JSON.stringify({event: 'toss_api_minute', ...entry}))): Promise<Response | null> {
  if (kind === 'read') return null;
  const minute = Math.floor(now / 60) * 60;
  const limits: Limit[] = kind === 'toss'
    ? [{scope:'toss_api_user',subject:userId,start:minute,seconds:60,maximum:20}, {scope:'toss_api_app',subject:'app',start:minute,seconds:60,maximum:3000}]
    : kind === 'room_create' ? [{scope:'room_create',subject:userId,start:now,seconds:ROOM_CREATE_SECONDS,maximum:ROOM_CREATE_MAX,rolling:true}] : [{scope:'write',subject:userId,start:minute,seconds:60,maximum:60}];
  const conditions = limits.map(limit => limit.rolling ? 'COALESCE((SELECT SUM(count) FROM rate_counters WHERE scope=? AND subject=? AND window_start>? AND window_start<=?),0) < ?' : 'COALESCE((SELECT count FROM rate_counters WHERE scope=? AND subject=? AND window_start=?),0) < ?').join(' AND ');
  const rows = limits.map(() => 'SELECT ? AS scope, ? AS subject, ? AS window_start, 1 AS count').join(' UNION ALL ');
  const params: (string | number)[] = [];
  for (const limit of limits) params.push(limit.scope, limit.subject, limit.start);
  for (const limit of limits) {
    if (limit.rolling) params.push(limit.scope, limit.subject, now - limit.seconds, now, limit.maximum);
    else params.push(limit.scope, limit.subject, limit.start, limit.maximum);
  }
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
    if (limit.rolling) {
      const row = await db.prepare('SELECT SUM(count) AS count, MIN(window_start) AS oldest FROM rate_counters WHERE scope=? AND subject=? AND window_start>? AND window_start<=?').bind(limit.scope, limit.subject, now - limit.seconds, now).first<{count:number | null; oldest:number | null}>();
      if ((row?.count ?? 0) >= limit.maximum && row?.oldest != null) wait = Math.max(wait, row.oldest + limit.seconds - now);
    } else {
      const row = await db.prepare('SELECT count FROM rate_counters WHERE scope=? AND subject=? AND window_start=?').bind(limit.scope, limit.subject, limit.start).first<{count:number}>();
      if ((row?.count ?? 0) >= limit.maximum) wait = Math.max(wait, limit.start + limit.seconds - now);
    }
  }
  return problemResponse('rate_limited', undefined, {'Retry-After': String(wait)});
}

/** Call the remote server only after both user and app reservations succeed. */
export async function withTossLimit<T>(db: D1Database, userId: string, now: number, invoke: () => Promise<T>, log?: (entry: {minute: number; calls: number}) => void): Promise<{ok: true; value: T} | {ok: false; response: Response}> {
  const denied = await checkLimit(db, 'toss', userId, now, log);
  return denied ? {ok: false, response: denied} : {ok: true, value: await invoke()};
}

/** Reserve a successful write in the same batch as its idempotency record and domain changes. */
export function writeLimitReservation(db:D1Database,user:string,now:number): D1PreparedStatement {
  const minute=Math.floor(now/60)*60;
  return db.prepare("INSERT INTO rate_counters(scope,subject,window_start,count) VALUES('write',?,?,1) ON CONFLICT(scope,subject,window_start) DO UPDATE SET count=CASE WHEN rate_counters.count<60 THEN rate_counters.count+1 ELSE NULL END").bind(user,minute);
}
export async function writeLimitDenied(db:D1Database,user:string,now:number): Promise<Response|null> {
  const minute=Math.floor(now/60)*60;
  const row=await db.prepare("SELECT count FROM rate_counters WHERE scope='write' AND subject=? AND window_start=?").bind(user,minute).first<{count:number}>();
  return (row?.count ?? 0)>=60 ? problemResponse('rate_limited',undefined,{'Retry-After':String(minute+60-now)}) : null;
}
