import { describe, expect, it } from 'vitest';
import { createApi, userLogId } from '../src/app';
import { errorCatalog } from '../src/errors';

const origins = ['https://example.test', 'https://private.example.test'] as const;
const logs: unknown[] = [];
const app = createApi(origins, [{ method: 'GET', path: '/rooms/:id', handler: () => new Response('ok') }], entry => logs.push(entry));
const request = (path: string, origin?: string, method = 'GET') => app.request(path, { method, headers: origin ? { Origin: origin } : {} });

describe('TASK-004 API common layer', () => {
  it('has the 22 contract error codes', () => expect(Object.keys(errorCatalog)).toHaveLength(22));
  it('rejects missing and unapproved origins with a traced problem', async () => {
    for (const origin of [undefined, 'https://evil.test']) {
      const response = await request('/rooms/a', origin);
      const body = await response.json() as {code: string; traceId: string};
      expect(response.status).toBe(403);
      expect(response.headers.get('content-type')).toBe('application/problem+json');
      expect(body.code).toBe('origin_not_allowed');
      expect(body.traceId).toMatch(/^[0-9a-f]{16}$/);
      expect(logs).toContainEqual({ traceId: body.traceId, code: body.code });
    }
  });
  it('accepts both configured origins and sends their CORS headers', async () => {
    for (const origin of origins) {
      const response = await request('/rooms/a', origin);
      expect(response.status).toBe(200);
      expect(response.headers.get('access-control-allow-origin')).toBe(origin);
    }
  });
  it('answers a permitted CORS preflight', async () => {
    const response = await app.request('/rooms/a', { method: 'OPTIONS', headers: { Origin: origins[0], 'Access-Control-Request-Method': 'GET' } });
    expect(response.status).toBe(204);
    expect(response.headers.get('access-control-allow-methods')).toBe('GET');
    expect(response.headers.get('access-control-allow-origin')).toBe(origins[0]);
  });
  it('returns a problem for 404 and a problem with Allow for 405', async () => {
    const missing = await request('/missing', origins[0]);
    expect(missing.status).toBe(404);
    expect(await missing.json()).toMatchObject({code: 'route_not_found', status: 404});
    const wrongMethod = await request('/rooms/a', origins[0], 'POST');
    expect(wrongMethod.status).toBe(405);
    expect(wrongMethod.headers.get('allow')).toBe('GET');
    expect(await wrongMethod.json()).toMatchObject({code: 'method_not_allowed', status: 405});
  });
  it('exposes only eight hex digits of the hashed user identity', async () => {
    expect(await userLogId('alice')).toBe('2bd806c9');
  });
  it('hides exception details in internal errors', async () => {
    const broken = createApi(origins, [{method: 'GET', path: '/bad', handler: () => { throw new Error('private'); }}], entry => logs.push(entry));
    const response = await broken.request('/bad', {headers: {Origin: origins[0]}});
    expect(response.status).toBe(500);
    expect(await response.text()).not.toContain('private');
  });
});
