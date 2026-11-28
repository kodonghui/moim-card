import { problemResponse } from './app';
import { hashToken } from './session';
import { createTossClient } from './toss';
import { identityHash } from './identity';

export interface SessionEnv {
  DB: D1Database;
  TOSS: { fetch(input: Request): Promise<Response> };
  USER_HMAC_KEY: string;
}

const alphabet = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
function newId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  let value = 0n;
  for (const byte of bytes) value = (value << 8n) | BigInt(byte);
  let result = '';
  for (let i = 0; i < 26; i++) { result = alphabet[Number(value & 31n)] + result; value >>= 5n; }
  return result;
}
function token(): string {
  return btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function createSession(request: Request, env: SessionEnv, now = Math.floor(Date.now() / 1000)): Promise<Response> {
  if (typeof env.USER_HMAC_KEY !== 'string' || new TextEncoder().encode(env.USER_HMAC_KEY).length < 32) return problemResponse('internal');
  let body: unknown;
  try { body = await request.json(); } catch { return problemResponse('invalid_request'); }
  if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some(k => k !== 'authCode') || !('authCode' in body) || typeof body.authCode !== 'string' || !/^[\x21-\x7e]{1,512}$/.test(body.authCode)) {
    const reason = !body || typeof body !== 'object' || !('authCode' in body) || body.authCode === '' ? 'required' : typeof body.authCode === 'string' && body.authCode.length > 512 ? 'too_long' : 'invalid_format';
    const response = problemResponse('validation_failed');
    return Response.json({...await response.json() as object, errors:[{field:'authCode', reason}]}, {status:400,headers:{'content-type':'application/problem+json'}});
  }
  const minute = Math.floor(now / 60) * 60;
  const reservation = await env.DB.prepare("INSERT INTO rate_counters (scope,subject,window_start,count) VALUES ('toss_api_app','app',?,1) ON CONFLICT(scope,subject,window_start) DO UPDATE SET count=count+1 WHERE count<3000 RETURNING count").bind(minute).first<{count:number}>();
  if (!reservation) return problemResponse('rate_limited', undefined, {'Retry-After': String(minute + 60 - now)});
  console.log(JSON.stringify({event:'toss_api_minute', minute, calls:reservation.count}));
  const exchanged = await createTossClient(env.TOSS).exchange(body.authCode);
  if (!exchanged.ok) return exchanged.reason === 'rate_limited' ? problemResponse('rate_limited', undefined, {'Retry-After': '60'}) : problemResponse('auth_failed');
  const keyHash = await identityHash(exchanged.value, env.USER_HMAC_KEY);
  const sessionToken = token();
  const tokenHash = await hashToken(sessionToken);
  await env.DB.batch([
    env.DB.prepare('INSERT INTO users (id,key_hash,created_at) VALUES (?,?,?) ON CONFLICT(key_hash) DO NOTHING').bind(newId(), keyHash, now),
    env.DB.prepare('INSERT INTO sessions (token_hash,user_id,created_at,expires_at) SELECT ?,id,?,? FROM users WHERE key_hash=?').bind(tokenHash, now, now + 43200, keyHash),
  ]);
  return Response.json({sessionToken, expiresAt:new Date((now + 43200)*1000).toISOString()}, {status:201});
}
