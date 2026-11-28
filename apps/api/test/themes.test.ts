import { env } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import { hashToken } from '../src/session';
import worker from '../src/worker';

const origin='https://example.test', token='a'.repeat(43), now=Math.floor(Date.now()/1000);
const bindings={DB:env.DB, USER_HMAC_KEY:'test-only', ORIGIN_PUBLIC:origin, ORIGIN_PRIVATE:'https://private.test', TOSS:{fetch:async () => new Response()}};
const req=(authorization?: string, requestOrigin=origin) => new Request('https://api.test/v1/themes',{headers:{origin:requestOrigin,...(authorization ? {authorization}: {})}});
async function session() {
  await env.DB.prepare('INSERT INTO users VALUES (?,?,?)').bind('a'.repeat(26),'b'.repeat(64),now).run();
  await env.DB.prepare('INSERT INTO sessions (token_hash,user_id,created_at,expires_at) VALUES (?,?,?,?)').bind(await hashToken(token),'a'.repeat(26),now,now+43200).run();
}
async function set(theme: string, version: number, status: string) {
  await env.DB.prepare('INSERT INTO question_sets (theme_id,version,status,default_next_action,content_sha256,published_at,withdrawn_at) VALUES (?,?,?,?,?,?,?)').bind(theme,version,status,'Discuss','c'.repeat(64),now,status==='withdrawn'?now:null).run();
}
describe('TASK-016 API-002 themes', () => {
  it('returns empty array when nothing is published', async () => {
    await session();
    const r=await worker.fetch(req(`Bearer ${token}`),bindings);
    expect(r.status).toBe(200); expect(await r.json()).toEqual({themes:[]});
  });
  it('returns latest published version in theme order and omits withdrawn-only themes', async () => {
    await session();
    await env.DB.prepare("INSERT INTO themes VALUES ('trip','Travel',2),('dinner','Dinner',1),('hidden','Hidden',3)").run();
    await set('trip',1,'published'); await set('trip',2,'published'); await set('trip',3,'withdrawn'); await set('dinner',1,'published'); await set('hidden',1,'withdrawn');
    const r=await worker.fetch(req(`Bearer ${token}`),bindings);
    expect(await r.json()).toEqual({themes:[{themeId:'dinner',name:'Dinner',questionSetVersion:1},{themeId:'trip',name:'Travel',questionSetVersion:2}]});
  });
  it('returns 401 or 403 before reading themes', async () => {
    expect((await worker.fetch(req(),bindings)).status).toBe(401);
    expect((await worker.fetch(req(undefined,'https://bad.test'),bindings)).status).toBe(403);
  });
  it('returns traced default 500 when database fails', async () => {
    await session(); await env.DB.prepare('DROP TABLE themes').run();
    const r=await worker.fetch(req(`Bearer ${token}`),bindings);
    expect(r.status).toBe(500); expect(await r.json()).toMatchObject({code:'internal'});
  });
});
