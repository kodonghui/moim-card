import { hashToken } from './session';
import { problemResponse } from './app';

const UUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
type Plan = { status: number; body: unknown; statements: D1PreparedStatement[] };
type RecordRow = { operation: string; request_sha256: string; status_code: number; response_body: string };
const response = (status: number, body: unknown) => status === 204 ? new Response(null, {status}) : Response.json(body, {status, headers: status >= 400 ? {'content-type': 'application/problem+json'} : undefined});

/** The operation's prepared writes and record are committed together in one D1 batch. */
export async function idempotent(db: D1Database, userId: string, key: string | null, operation: string, requestBody: string, now: number, plan: () => Promise<Plan>): Promise<Response> {
  if (!key || !UUID.test(key)) return problemResponse('invalid_request');
  const digest = await hashToken(requestBody);
  const lookup = () => db.prepare('SELECT operation, request_sha256, status_code, response_body FROM idempotency_records WHERE user_id = ? AND request_id = ? AND created_at > ?').bind(userId, key, now - 86400).first<RecordRow>();
  const replay = (row: RecordRow) => row.operation !== operation || row.request_sha256 !== digest ? problemResponse('idempotency_conflict') : response(row.status_code, JSON.parse(row.response_body));
  const previous = await lookup();
  if (previous) return replay(previous);
  const result = await plan();
  const cacheable = (result.status >= 200 && result.status < 300) || [400, 403, 404, 409].includes(result.status);
  if (!cacheable) {
    if (result.statements.length) throw new Error('Non-cacheable results cannot mutate data');
    return response(result.status, result.body);
  }
  const body = JSON.stringify(result.body ?? null);
  const expire = db.prepare('DELETE FROM idempotency_records WHERE user_id = ? AND request_id = ? AND created_at <= ?').bind(userId, key, now - 86400);
  const insert = db.prepare('INSERT INTO idempotency_records (user_id, request_id, operation, request_sha256, status_code, response_body, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(userId, key, operation, digest, result.status, body, now);
  try { await db.batch([expire, insert, ...result.statements]); }
  catch (error) {
    const winner = await lookup();
    if (winner) return replay(winner);
    throw error;
  }
  return response(result.status, result.body);
}
