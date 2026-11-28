import { env } from 'cloudflare:test';
import { Hono } from 'hono';
import { describe, expect, it, vi } from 'vitest';
import { findSessionUser, hashToken, requireSession } from '../src/session';

const userId = 'a'.repeat(26), token = 'x'.repeat(43), now = 100000;
async function setup() {
  await env.DB.prepare('INSERT INTO users (id,key_hash,created_at) VALUES (?,?,?)').bind(userId, 'a'.repeat(64), now).run();
  await env.DB.prepare('INSERT INTO sessions (token_hash,user_id,created_at,expires_at) VALUES (?,?,?,?)').bind(await hashToken(token), userId, now, now + 43200).run();
}
describe('TASK-005 session authentication', () => {
  it('authenticates only a valid bearer token before expiry', async () => {
    await setup();
    expect(await findSessionUser(env.DB, `Bearer ${token}`, now + 43199)).toBe(userId);
    for (const header of [undefined, token, 'Bearer wrong', `Bearer ${'y'.repeat(43)}`]) expect(await findSessionUser(env.DB, header, now)).toBeNull();
    expect(await findSessionUser(env.DB, `Bearer ${token}`, now + 43200)).toBeNull();
  });
  it('rejects revoked and deleted users', async () => {
    await setup();
    await env.DB.prepare('UPDATE sessions SET revoked_at = ? WHERE user_id = ?').bind(now, userId).run();
    await env.DB.prepare('DELETE FROM users WHERE id = ?').bind(userId).run();
    expect(await findSessionUser(env.DB, `Bearer ${token}`, now)).toBeNull();
  });
  it('returns a traced 401 and does not log or store the token', async () => {
    await setup();
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const app = new Hono<{Variables: {userId: string}}>();
      app.use('*', requireSession(env.DB, () => now));
      app.get('/', c => c.text(c.get('userId')));
      expect((await app.request('/', {headers: {Authorization: `Bearer ${token}`}})).status).toBe(200);
      const denied = await app.request('/', {headers: {Authorization: `Bearer ${'y'.repeat(43)}`}});
      expect(denied.status).toBe(401);
      expect(await denied.json()).toMatchObject({code: 'unauthenticated'});
      expect(JSON.stringify(log.mock.calls)).not.toContain(token);
      const stored = await env.DB.prepare('SELECT * FROM sessions').all();
      expect(JSON.stringify(stored)).not.toContain(token);
    } finally { log.mockRestore(); }
  });
});
