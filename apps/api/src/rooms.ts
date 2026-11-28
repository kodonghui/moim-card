import { problemResponse } from './app';
import { idempotent } from './idempotency';
import { validateGatheringName, validateNickname } from './names';
import { findSessionUser } from './session';

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
async function problem(code: 'invalid_request' | 'validation_failed' | 'theme_unavailable', errors?: {field:string;reason:string}[]) {
  const response = problemResponse(code);
  const body = await response.json() as Record<string, unknown>;
  return {status:response.status,body:errors ? {...body,errors} : body,statements:[]};
}
async function roomLimit(db: D1Database, user: string, now: number): Promise<Response | null> {
  const row = await db.prepare("SELECT SUM(count) AS n, MIN(window_start) AS oldest FROM rate_counters WHERE scope='room_create' AND subject=? AND window_start>? AND window_start<=?").bind(user, now-86400, now).first<{n:number|null;oldest:number|null}>();
  return (row?.n ?? 0) >= 30 && row?.oldest != null ? problemResponse('rate_limited', undefined, {'Retry-After':String(Math.max(1,row.oldest + 86400 - now))}) : null;
}
export async function createRoom(request: Request, db: D1Database, now = Math.floor(Date.now()/1000)): Promise<Response> {
  const user = await findSessionUser(db,request.headers.get('Authorization') ?? undefined,now);
  if (!user) return problemResponse('unauthenticated');
  const text = await request.text();
  const key = request.headers.get('Idempotency-Key');
  const operation = 'POST /v1/rooms';
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
    const denied=await roomLimit(db,user,now);
    if (denied) return {status:429,body:await denied.json(),headers:{'Retry-After':denied.headers.get('Retry-After')!},statements:[]};
    const code=newRoomCode();
    return {status:201,body:{roomCode:code,gatheringName:gathering.value,partySize:value.partySize,theme:{themeId:theme.id,name:theme.name}},statements:[
      db.prepare("INSERT INTO rate_counters (scope,subject,window_start,count) VALUES ('room_create',CASE WHEN COALESCE((SELECT SUM(count) FROM rate_counters WHERE scope='room_create' AND subject=? AND window_start>? AND window_start<=?),0)<30 THEN ? ELSE NULL END,?,1) ON CONFLICT(scope,subject,window_start) DO UPDATE SET count=count+1").bind(user,now-86400,now,user,now),
      db.prepare("INSERT INTO rooms (code,gathering_name,party_size,question_set_id,created_at,expires_at) VALUES (?,?,?,(SELECT id FROM question_sets WHERE id=? AND status='published'),?,?)").bind(code,gathering.value,value.partySize,theme.setId,now,now+2592000),
      db.prepare("INSERT INTO participants (room_id,user_id,role,nickname,joined_at) SELECT id,?,'host',?,? FROM rooms WHERE code=?").bind(user,nickname.value,now,code),
    ]};
  });
  try {return await create()} catch (error) {
    const denied=await roomLimit(db,user,now);
    if (denied) return denied;
    // A withdrawal between the read and the batch must not leave a room or an idempotency record.
    const value=JSON.parse(text) as {themeId?:unknown};
    if (typeof value.themeId === 'string') {
      const current=await db.prepare("SELECT 1 FROM question_sets WHERE theme_id=? AND status='published' LIMIT 1").bind(value.themeId).first();
      if (!current) return idempotent(db,user,key,operation,text,now,() => problem('theme_unavailable'));
    }
    throw error;
  }
}
