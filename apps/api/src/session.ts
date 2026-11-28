import { createMiddleware } from 'hono/factory';
import { problemResponse } from './app';

/** Only a SHA-256 digest enters D1; the caller must issue random 256-bit tokens. */
export async function hashToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}
export async function findSessionUser(db: D1Database, authorization: string | undefined, now: number): Promise<string | null> {
  const match = /^Bearer ([A-Za-z0-9_-]{43})$/.exec(authorization ?? '');
  if (!match) return null;
  const hash = await hashToken(match[1]);
  const row = await db.prepare('SELECT s.user_id AS userId FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.revoked_at IS NULL AND s.expires_at > ? AND s.created_at <= ?').bind(hash, now, now).first<{userId: string}>();
  return row?.userId ?? null;
}
export function requireSession(db: D1Database, now: () => number = () => Math.floor(Date.now() / 1000)) {
  return createMiddleware<{Variables: {userId: string}}>(async (c, next) => {
    const userId = await findSessionUser(db, c.req.header('Authorization'), now());
    if (!userId) return problemResponse('unauthenticated');
    c.set('userId', userId);
    await next();
  });
}
