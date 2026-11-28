import { env } from 'cloudflare:test';
import { describe, expect, it, vi } from 'vitest';
import worker from '../src/worker';

const origin = 'https://example.test';
const now = Math.floor(Date.now()/1000);
const binding = (exchange: (req: Request) => Response | Promise<Response>) => ({DB:env.DB, USER_HMAC_KEY:'x'.repeat(32), ORIGIN_PUBLIC:origin, ORIGIN_PRIVATE:'https://private.test', TOSS:{fetch:async (r: Request) => exchange(r)}});
const success = () => Response.json({resultType:'SUCCESS',success:{anonKey:'anonymous-key'}});
const request = (body: string, headers: Record<string,string> = {}) => new Request('https://api.test/v1/sessions', {method:'POST', headers:{origin, 'content-type':'application/json', ...headers},body});
const count = async (table: string) => (await env.DB.prepare(`SELECT count(*) AS n FROM ${table}`).first<{n:number}>())!.n;

describe('TASK-013 API-001 sessions', () => {
  it('issues a token, stores only hashes and converges concurrent first requests', async () => {
    const e = binding(success);
    const [a,b] = await Promise.all([worker.fetch(request('{"authCode":"one"}'),e),worker.fetch(request('{"authCode":"two"}'),e)]);
    expect([a.status,b.status]).toEqual([201,201]);
    const data = await a.json() as {sessionToken:string;expiresAt:string};
    expect(data.sessionToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(Date.parse(data.expiresAt)).toBeGreaterThan(Date.now());
    expect(await count('users')).toBe(1); expect(await count('sessions')).toBe(2);
    const stored = JSON.stringify([await env.DB.prepare('SELECT * FROM users').all(),await env.DB.prepare('SELECT * FROM sessions').all()]);
    expect(stored).not.toContain('anonymous-key'); expect(stored).not.toContain(data.sessionToken);
  });
  it('returns 401 for reused code and counts the call without users or sessions', async () => {
    const e = binding(() => Response.json({resultType:'FAIL',error:{errorCode:4011}}));
    const response = await worker.fetch(request('{"authCode":"used"}'),e);
    expect(response.status).toBe(401); expect(await response.json()).toMatchObject({code:'auth_failed'});
    expect(await count('users')).toBe(0); expect(await count('sessions')).toBe(0);
    expect((await env.DB.prepare("SELECT count FROM rate_counters WHERE scope='toss_api_app'").first<{count:number}>())?.count).toBe(1);
  });
  it('rejects invalid requests and unallowed origins without calling Toss', async () => {
    const call = vi.fn(success), e = binding(call);
    for (const body of ['{}','{"authCode":""}','{"authCode":"a b"}','not json']) expect((await worker.fetch(request(body),e)).status).toBe(400);
    expect((await worker.fetch(request('{"authCode":"ok"}',{origin:'https://bad.test'}),e)).status).toBe(403);
    expect(call).not.toHaveBeenCalled();
    expect(await (await worker.fetch(request('{}'),e)).json()).toMatchObject({errors:[{field:'authCode',reason:'required'}]});
  });
  it('returns 429 and Retry-After for application and Toss limits', async () => {
    const call = vi.fn(success), e = binding(call);
    await env.DB.prepare("INSERT INTO rate_counters VALUES ('toss_api_app','app',?,3000)").bind(Math.floor(now/60)*60).run();
    const limited = await worker.fetch(request('{"authCode":"ok"}'),e);
    expect(limited.status).toBe(429); expect(Number(limited.headers.get('Retry-After'))).toBeGreaterThan(0); expect(call).not.toHaveBeenCalled();
    await env.DB.prepare('DELETE FROM rate_counters').run();
    const remote = await worker.fetch(request('{"authCode":"ok"}'),binding(() => Response.json({resultType:'FAIL',error:{errorCode:4095}})));
    expect(remote.status).toBe(429); expect(remote.headers.get('Retry-After')).toBe('60');
  });
  it('rejects an invalid HMAC key before calling Toss or consuming quota', async () => {
    const call = vi.fn(success), e = binding(call); e.USER_HMAC_KEY = '';
    const response = await worker.fetch(request('{"authCode":"ok"}'),e);
    expect(response.status).toBe(500); expect(await response.json()).toMatchObject({code:'internal'}); expect(call).not.toHaveBeenCalled(); expect(await count('rate_counters')).toBe(0);
  });
});
