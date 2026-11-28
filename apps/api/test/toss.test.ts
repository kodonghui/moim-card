import { describe, it, expect, vi } from 'vitest';
import { createTossClient } from '../src/toss';

function fake(response: unknown, status = 200) {
  const requests: Request[] = [];
  return { requests, binding: { async fetch(request: Request) { requests.push(request); return Response.json(response, {status}); } } };
}

describe('TASK-010 Toss partner client', () => {
  it('sends exchange request and extracts only the anonymous key', async () => {
    const server = fake({resultType: 'SUCCESS', success: {anonKey: 'fake-key', extra: 'raw-response'}});
    const result = await createTossClient(server.binding).exchange('fake-code');
    expect(result).toEqual({ok: true, value: 'fake-key'});
    expect(new URL(server.requests[0].url).pathname).toBe('/api-partner/v1/apps-in-toss/users/anon-key/exchange');
    expect(await server.requests[0].json()).toEqual({code: 'fake-code'});
  });
  it('sends notification through the binding with the required fields', async () => {
    const server = fake({resultType: 'SUCCESS', success: {}});
    expect(await createTossClient(server.binding).sendMessage('fake-key', 'template', {room: 'x'})).toEqual({ok: true, value: undefined});
    expect(server.requests[0].headers.get('x-anon-key')).toBe('fake-key');
    expect(await server.requests[0].json()).toEqual({templateSetCode: 'template', context: {room: 'x'}});
  });
  it.each([['4011', 'invalid_auth'], ['4095', 'rate_limited'], ['5004', 'unavailable'], ['4010', 'unavailable']])('classifies HTTP 200 FAIL %s', async (errorCode, reason) => {
    const server = fake({resultType: 'FAIL', error: {errorCode, message: 'raw-secret-response'}});
    const result = await createTossClient(server.binding).exchange('fake-code');
    expect(result).toEqual({ok: false, reason});
    expect(JSON.stringify(result)).not.toContain('raw-secret-response');
  });
  it('does not treat HTTP errors, malformed responses or connection failures as success', async () => {
    for (const binding of [fake({}, 500).binding, fake({resultType: 'SUCCESS', success: {}}).binding, {fetch: async () => {throw new Error('raw-secret-response');}}]) {
      const result = await createTossClient(binding).exchange('fake-code');
      expect(result).toEqual({ok: false, reason: 'unavailable'});
    }
  });
  it('does not log upstream responses', async () => {
    const log = vi.spyOn(console, 'log');
    const error = vi.spyOn(console, 'error');
    try {
      const server = fake({resultType: 'FAIL', error: {errorCode: '5004', reason: 'private upstream response'}});
      await createTossClient(server.binding).sendMessage('fake-key', 'template', {});
      expect(log).not.toHaveBeenCalled();
      expect(error).not.toHaveBeenCalled();
    } finally { log.mockRestore(); error.mockRestore(); }
  });
  it('times out after five seconds even if the binding never settles', async () => {
    vi.useFakeTimers();
    try {
      const client = createTossClient({fetch: () => new Promise(() => {})});
      const result = client.exchange('fake-code');
      await vi.advanceTimersByTimeAsync(5000);
      expect(await result).toEqual({ok: false, reason: 'unavailable'});
    } finally { vi.useRealTimers(); }
  });
});
