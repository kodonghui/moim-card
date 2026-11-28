import { problemResponse } from './app';
import { idempotent } from './idempotency';
import { validateGatheringName, validateNickname } from './names';
import { findSessionUser } from './session';
import { ROOM_CREATE_MAX, ROOM_CREATE_SECONDS, writeLimitReservation, writeLimitDenied } from './rate-limit';

const CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
function newRoomCode(): string {
  let result = '';
  while (result.length < 10) {
    for (const n of crypto.getRandomValues(new Uint8Array(16))) {
      if (n < 248) result += CHARS[n % CHARS.length];
      if (result.length === 10) break;
    }
  }
  return result;
}
async function problem(code: 'invalid_request' | 'validation_failed' | 'theme_unavailable' | 'room_not_found' | 'room_closed' | 'room_full', errors?: {field:string;reason:string}[]) {
  const response = problemResponse(code);
  const body = await response.json() as Record<string, unknown>;
  return {status:response.status,body:errors ? {...body,errors} : body,statements:[]};
}
async function roomLimit(db: D1Database, user: string, now: number): Promise<Response | null> {
  const row = await db.prepare("SELECT SUM(count) AS n, MIN(window_start) AS oldest FROM rate_counters WHERE scope='room_create' AND subject=? AND window_start>? AND window_start<=?").bind(user, now-ROOM_CREATE_SECONDS, now).first<{n:number|null;oldest:number|null}>();
  return (row?.n ?? 0) >= ROOM_CREATE_MAX && row?.oldest != null ? problemResponse('rate_limited', undefined, {'Retry-After':String(Math.max(1,row.oldest + ROOM_CREATE_SECONDS - now))}) : null;
}
export async function createRoom(request: Request, db: D1Database, now = Math.floor(Date.now()/1000)): Promise<Response> {
  const user = await findSessionUser(db,request.headers.get('Authorization') ?? undefined,now);
  if (!user) return problemResponse('unauthenticated');
  const text = await request.text();
  const key = request.headers.get('Idempotency-Key');
  const operation = 'POST /v1/rooms';
  let plannedSetId: number | null = null;
  const create = () => idempotent(db,user,key,operation,text,now,async () => {
    let input: unknown;
    try {input=JSON.parse(text)} catch {return problem('invalid_request')}
    if (!input || typeof input !== 'object' || Array.isArray(input)) return problem('validation_failed');
    const value=input as Record<string,unknown>;
    const errors: {field:string;reason:string}[] = [];
    if (Object.keys(value).some(k => !['themeId','gatheringName','partySize','hostNickname'].includes(k))) return problem('invalid_request');
    if (typeof value.themeId !== 'string' || !/^[a-z_]{1,20}$/.test(value.themeId)) errors.push({field:'themeId',reason:value.themeId === undefined ? 'required' : 'invalid_format'});
    const gathering = typeof value.gatheringName === 'string' && [...value.gatheringName].length <= 40 ? validateGatheringName(value.gatheringName) : null;
    if (!gathering || !gathering.valid) errors.push({field:'gatheringName',reason:gathering?.reason ?? (value.gatheringName === undefined ? 'required' : typeof value.gatheringName === 'string' ? 'too_long' : 'invalid_format')});
    const nickname = typeof value.hostNickname === 'string' && [...value.hostNickname].length <= 30 ? validateNickname(value.hostNickname) : null;
    if (!nickname || !nickname.valid) errors.push({field:'hostNickname',reason:nickname?.reason ?? (value.hostNickname === undefined ? 'required' : typeof value.hostNickname === 'string' ? 'too_long' : 'invalid_format')});
    if (!Number.isInteger(value.partySize) || (value.partySize as number) < 2 || (value.partySize as number) > 8) errors.push({field:'partySize',reason:value.partySize === undefined ? 'required' : !Number.isInteger(value.partySize) ? 'not_integer' : 'out_of_range'});
    if (errors.length || !gathering?.valid || !nickname?.valid) return problem('validation_failed',errors);
    const theme = await db.prepare("SELECT t.id, t.name, q.id AS setId FROM themes t JOIN question_sets q ON q.theme_id=t.id WHERE t.id=? AND q.status='published' ORDER BY q.version DESC LIMIT 1").bind(value.themeId).first<{id:string;name:string;setId:number}>();
    if (!theme) return problem('theme_unavailable');
    plannedSetId = theme.setId;
    const denied=await roomLimit(db,user,now);
    if (denied) return {status:429,body:await denied.json(),headers:{'Retry-After':denied.headers.get('Retry-After')!},statements:[]};
    const code=newRoomCode();
    return {status:201,body:{roomCode:code,gatheringName:gathering.value,partySize:value.partySize,theme:{themeId:theme.id,name:theme.name}},statements:[
      db.prepare("INSERT INTO rate_counters (scope,subject,window_start,count) VALUES ('room_create',CASE WHEN COALESCE((SELECT SUM(count) FROM rate_counters WHERE scope='room_create' AND subject=? AND window_start>? AND window_start<=?),0)<? THEN ? ELSE NULL END,?,1) ON CONFLICT(scope,subject,window_start) DO UPDATE SET count=count+1").bind(user,now-ROOM_CREATE_SECONDS,now,ROOM_CREATE_MAX,user,now),
      db.prepare("INSERT INTO rooms (code,gathering_name,party_size,question_set_id,created_at,expires_at) VALUES (?,?,?,(SELECT id FROM question_sets WHERE id=? AND status='published'),?,?)").bind(code,gathering.value,value.partySize,theme.setId,now,now+2592000),
      db.prepare("INSERT INTO participants (room_id,user_id,role,nickname,joined_at) SELECT id,?,'host',?,? FROM rooms WHERE code=?").bind(user,nickname.value,now,code),
    ]};
  });
  for (let attempt=0; attempt<3; attempt++) {
    try {return await create()} catch (error) {
      const denied=await roomLimit(db,user,now);
      if (denied) return denied;
      if (plannedSetId !== null) {
        const chosen=await db.prepare("SELECT 1 FROM question_sets WHERE id=? AND status='published'").bind(plannedSetId).first();
        if (!chosen) continue;
      }
      throw error;
    }
  }
  throw new Error('Theme changed repeatedly');
}

export async function getRoom(request: Request, db: D1Database, now = Math.floor(Date.now()/1000)): Promise<Response> {
  const user = await findSessionUser(db,request.headers.get('Authorization') ?? undefined,now);
  if (!user) return problemResponse('unauthenticated');
  const code = new URL(request.url).pathname.split('/').pop() ?? '';
  if (!/^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{10}$/.test(code)) return problemResponse('room_not_found');
  const row = await db.prepare(`SELECT r.code AS roomCode,r.gathering_name AS gatheringName,r.party_size AS partySize,
    r.submitted_count AS submittedCount,r.participant_count AS participantCount,r.status,t.id AS themeId,t.name AS themeName,
    COALESCE(p.role,'none') AS myRole,CASE WHEN resp.participant_id IS NULL THEN 0 ELSE 1 END AS mySubmitted
    FROM rooms r JOIN question_sets q ON q.id=r.question_set_id JOIN themes t ON t.id=q.theme_id
    LEFT JOIN participants p ON p.room_id=r.id AND p.user_id=? LEFT JOIN responses resp ON resp.participant_id=p.id
    WHERE r.code=? AND r.expires_at>?`).bind(user,code,now).first<{roomCode:string;gatheringName:string;partySize:number;submittedCount:number;participantCount:number;status:string;themeId:string;themeName:string;myRole:string;mySubmitted:number}>();
  if (!row) return problemResponse('room_not_found');
  return Response.json({roomCode:row.roomCode,gatheringName:row.gatheringName,theme:{themeId:row.themeId,name:row.themeName},partySize:row.partySize,submittedCount:row.submittedCount,isFull:row.participantCount===8,status:row.status,myRole:row.myRole,mySubmitted:row.mySubmitted===1,asOf:new Date(now*1000).toISOString()});
}

export async function joinRoom(request: Request, db: D1Database, now = Math.floor(Date.now()/1000)): Promise<Response> {
  const user = await findSessionUser(db,request.headers.get('Authorization') ?? undefined,now);
  if (!user) return problemResponse('unauthenticated');
  const code = new URL(request.url).pathname.split('/')[3] ?? '';
  const text = await request.text(), key = request.headers.get('Idempotency-Key');
  const operation = 'POST joinRoom';
  const requestFingerprint = JSON.stringify([request.method, new URL(request.url).pathname, text]);
  const execute = () => idempotent(db,user,key,operation,requestFingerprint,now,async () => {
    let value: unknown;
    try {value=JSON.parse(text)} catch {return problem('invalid_request')}
    if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(k=>k!=='nickname')) return problem('invalid_request');
    const raw = (value as Record<string,unknown>).nickname;
    const nickname = typeof raw === 'string' && [...raw].length <= 30 ? validateNickname(raw) : null;
    if (!nickname?.valid) return problem('validation_failed',[{field:'nickname',reason:nickname?.reason ?? (raw === undefined ? 'required' : typeof raw === 'string' ? 'too_long' : 'invalid_format')}]);
    if (!/^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{10}$/.test(code)) return problem('room_not_found');
    const row = await db.prepare(`SELECT r.id,r.status,r.participant_count AS participantCount,p.role,
      CASE WHEN resp.participant_id IS NULL THEN 0 ELSE 1 END AS submitted
      FROM rooms r LEFT JOIN participants p ON p.room_id=r.id AND p.user_id=?
      LEFT JOIN responses resp ON resp.participant_id=p.id WHERE r.code=? AND r.expires_at>?`).bind(user,code,now).first<{id:number;status:string;participantCount:number;role:string|null;submitted:number}>();
    if (!row) return problem('room_not_found');
    if (row.role) return {status:200,body:{roomCode:code,myRole:row.role,mySubmitted:row.submitted===1},statements:[]};
    if (row.status !== 'open') return problem('room_closed');
    if (row.participantCount >= 8) return problem('room_full');
    const denied = await writeLimitDenied(db,user,now);
    if (denied) return {status:429,body:await denied.json(),headers:{'Retry-After':denied.headers.get('Retry-After')!},statements:[]};
    return {status:201,body:{roomCode:code,myRole:'member',mySubmitted:false},statements:[
      db.prepare("UPDATE rooms SET participant_count=CASE WHEN status='open' AND participant_count<8 AND expires_at>? THEN participant_count+1 ELSE NULL END WHERE id=?").bind(now,row.id),
      db.prepare("INSERT INTO participants (room_id,user_id,role,nickname,joined_at) VALUES (?,?,'member',?,?)").bind(row.id,user,nickname.value,now),
      writeLimitReservation(db,user,now),
    ]};
  });
  try { return await execute(); } catch (error) {
    const denied=await writeLimitDenied(db,user,now);if(denied)return denied;
    // A concurrent join or close can invalidate the snapshot used by the first plan.
    const current = /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{10}$/.test(code) ? await db.prepare("SELECT r.status,r.participant_count AS n,EXISTS(SELECT 1 FROM participants p WHERE p.room_id=r.id AND p.user_id=?) AS member FROM rooms r WHERE r.code=? AND r.expires_at>?").bind(user,code,now).first<{status:string;n:number;member:number}>() : null;
    if (!current || current.status !== 'open' || current.n >= 8 || current.member) return execute();
    throw error;
  }
}
