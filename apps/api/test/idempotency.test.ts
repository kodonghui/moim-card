import { env } from 'cloudflare:test';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { idempotent } from '../src/idempotency';
const user = 'a'.repeat(26), key = '12345678-1234-1234-1234-123456789abc', now = 100000;
const write = () => ({status: 201, body: {made: true}, statements: [env.DB.prepare("INSERT INTO themes (id,name,sort_order) VALUES ('trip','Trip',1)")]});
const call = (body = '{}', operation = 'create', time = now) => idempotent(env.DB, user, key, operation, body, time, async () => write());
beforeEach(async () => { await env.DB.prepare('INSERT INTO users (id,key_hash,created_at) VALUES (?,?,?)').bind(user, 'a'.repeat(64), now).run(); });
describe('TASK-006 idempotency', () => {
  it('replays the first result and applies the write once even for simultaneous requests', async () => {
    const [a,b] = await Promise.all([call(), call()]);
    expect(a.status).toBe(201); expect(await a.json()).toEqual(await b.json());
    expect((await env.DB.prepare('SELECT count(*) AS n FROM themes').first<{n:number}>())?.n).toBe(1);
  });
  it('conflicts on changed body or operation', async () => {
    await call();
    expect((await call('{"changed":true}')).status).toBe(409);
    expect((await call('{}', 'join')).status).toBe(409);
  });
  it('expires at 24 hours and accepts a new request', async () => {
    await idempotent(env.DB,user,key,'create','{}',now,async () => ({status: 200, body: {n: 1}, statements: []}));
    const next = await idempotent(env.DB,user,key,'create','{}',now + 86400,async () => ({status: 200, body: {n: 2}, statements: []}));
    expect(await next.json()).toEqual({n: 2});
  });
  it.each([401,429,500,503])('does not persist status %i', async status => {
    await idempotent(env.DB,user,key,'create','{}',now,async () => ({status,body:{},statements:[]}));
    expect((await env.DB.prepare('SELECT count(*) AS n FROM idempotency_records').first<{n:number}>())?.n).toBe(0);
  });
  it('rejects missing or invalid keys without invoking operation', async () => {
    const plan = vi.fn(async () => write());
    expect((await idempotent(env.DB,user,null,'create','{}',now,plan)).status).toBe(400);
    expect((await idempotent(env.DB,user,'bad','create','{}',now,plan)).status).toBe(400);
    expect(plan).not.toHaveBeenCalled();
  });
  it('rolls back the record when a write fails', async () => {
    await expect(idempotent(env.DB,user,key,'create','{}',now,async () => ({status:201,body:{},statements:[env.DB.prepare('INSERT INTO themes (id,name,sort_order) VALUES (?,?,?)').bind('INVALID','x',1)]}))).rejects.toThrow();
    expect((await env.DB.prepare('SELECT count(*) AS n FROM idempotency_records').first<{n:number}>())?.n).toBe(0);
  });
});
