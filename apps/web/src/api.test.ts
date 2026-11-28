import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiClient, ApiError, retrySeconds, onVisible, formatAsOf } from './api';
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });
const json = (body: unknown, status = 200, headers?: HeadersInit) => new Response(JSON.stringify(body), { status, headers });
describe('공통 API 처리', () => {
  it('401이면 한 번 다시 확인하고 Bearer 토큰을 바꿔 재요청한다', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(json({ status: 401, code: 'unauthenticated' }, 401)).mockResolvedValueOnce(json({ ok: true }));
    const reauthenticate = vi.fn().mockResolvedValue('new-token');
    const client = new ApiClient({ baseUrl: 'http://localhost', fetcher, reauthenticate });
    client.setToken('old-token');
    expect(await client.operation('/v1/themes')()).toEqual({ ok: true });
    expect(reauthenticate).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls.map(call => call[1].headers.get('Authorization'))).toEqual(['Bearer old-token', 'Bearer new-token']);
  });
  it('재확인이 실패하면 토큰을 지우고 실패 상태를 돌려준다', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(json({ status: 401, code: 'unauthenticated' }, 401)).mockResolvedValueOnce(json({ ok: true }));
    const client = new ApiClient({ baseUrl: 'http://localhost', fetcher, reauthenticate: vi.fn().mockRejectedValue(new Error('failed')) });
    client.setToken('expired-token');
    await expect(client.operation('/v1/themes')()).rejects.toMatchObject({ problem: { code: 'reauthentication_failed' } });
    await client.operation('/v1/themes')();
    expect(fetcher.mock.calls[1][1].headers.has('Authorization')).toBe(false);
  });
  it('시간 초과 후 같은 요청 ID를 쓰고 동시에 누른 요청은 합친다', async () => {
    vi.useFakeTimers();
    const fetcher = vi.fn().mockImplementationOnce(() => new Promise(() => {})).mockResolvedValueOnce(json({ ok: true }));
    const client = new ApiClient({ baseUrl: 'http://localhost', fetcher, reauthenticate: vi.fn() });
    const send = client.operation('/v1/rooms', { method: 'POST', idempotent: true, body: {} });
    const first = send();
    expect(send()).toBe(first);
    const failed = expect(first).rejects.toMatchObject({ problem: { code: 'timeout' } });
    await vi.advanceTimersByTimeAsync(10000);
    await failed;
    expect(await send()).toEqual({ ok: true });
    expect(fetcher.mock.calls[0][1].headers.get('Idempotency-Key')).toBe(fetcher.mock.calls[1][1].headers.get('Idempotency-Key'));
  });
  it('읽기가 1초 넘으면 자리 표시를 켠 뒤 끈다', async () => {
    vi.useFakeTimers();
    let complete!: (response: Response) => void;
    const fetcher = vi.fn(() => new Promise<Response>(resolve => { complete = resolve; }));
    const onLoading = vi.fn();
    const client = new ApiClient({ baseUrl: 'http://localhost', fetcher, reauthenticate: vi.fn(), onLoading });
    const result = client.operation('/v1/themes')();
    await vi.advanceTimersByTimeAsync(999);
    expect(onLoading).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(onLoading).toHaveBeenCalledWith(true);
    complete(json({ themes: [] }));
    await result;
    expect(onLoading).toHaveBeenLastCalledWith(false);
  });
  it('429 대기 시간을 읽고 남은 초를 계산한다', async () => {
    const client = new ApiClient({ baseUrl: 'http://localhost', fetcher: vi.fn().mockResolvedValue(json({ status: 429, code: 'rate_limited' }, 429, { 'Retry-After': '30' })), reauthenticate: vi.fn() });
    await expect(client.operation('/v1/rooms')()).rejects.toMatchObject({ retryAfter: 30 });
    expect(retrySeconds(30, 1000, 12500)).toBe(19);
    expect(retrySeconds(30, 1000, 50000)).toBe(0);
  });
  it('401이 반복되면 재확인을 반복하지 않는다', async () => {
    const fetcher = vi.fn().mockImplementation(async () => json({ status: 401, code: 'unauthenticated' }, 401));
    const reauthenticate = vi.fn().mockResolvedValue('new-token');
    const client = new ApiClient({ baseUrl: 'http://localhost', fetcher, reauthenticate });
    await expect(client.operation('/v1/themes')()).rejects.toMatchObject({ problem: { code: 'unauthenticated' } });
    expect(reauthenticate).toHaveBeenCalledTimes(1);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it('유입 기록은 인증 실패 시 재확인하지 않는다', async () => {
    const fetcher = vi.fn().mockResolvedValue(json({ status: 401, code: 'unauthenticated' }, 401));
    const reauthenticate = vi.fn();
    const client = new ApiClient({ baseUrl: 'http://localhost', fetcher, reauthenticate });
    client.setToken('token');
    await expect(client.operation('/v1/entries', { method: 'POST', retryAuthentication: false })()).rejects.toBeInstanceOf(ApiError);
    expect(fetcher.mock.calls[0][1].headers.get('Authorization')).toBe('Bearer token');
    expect(reauthenticate).not.toHaveBeenCalled();
  });
  it('화면이 다시 보일 때만 새로고침하고 기준 시각을 표시한다', () => {
    let listener!: () => void;
    const doc = { visibilityState: 'hidden', addEventListener: vi.fn((_event, cb) => { listener = cb; }), removeEventListener: vi.fn() };
    vi.stubGlobal('document', doc);
    const refresh = vi.fn();
    const dispose = onVisible(refresh);
    listener();
    doc.visibilityState = 'visible';
    listener();
    expect(refresh).toHaveBeenCalledTimes(1);
    dispose();
    expect(doc.removeEventListener).toHaveBeenCalledWith('visibilitychange', listener);
    expect(formatAsOf('2026-11-28T15:05:00Z')).toMatch(/기준$/);
    vi.unstubAllGlobals();
  });
  it('요청 ID 충돌 시 새 ID로 한 번만 재시도한다', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(json({ status: 409, code: 'idempotency_conflict' }, 409)).mockResolvedValueOnce(json({ status: 409, code: 'idempotency_conflict' }, 409));
    const client = new ApiClient({ baseUrl: 'http://localhost', fetcher, reauthenticate: vi.fn() });
    await expect(client.operation('/v1/rooms', { method: 'POST', idempotent: true })()).rejects.toBeInstanceOf(ApiError);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(fetcher.mock.calls[0][1].headers.get('Idempotency-Key')).not.toBe(fetcher.mock.calls[1][1].headers.get('Idempotency-Key'));
  });
});

describe.skipIf(!process.env.PRISM_URL)('Prism 공통 응답', () => {
  const baseUrl = process.env.PRISM_URL!;
  function selected(statuses: number[]): typeof fetch {
    return async (input, init) => {
      const headers = new Headers(init?.headers);
      headers.set('Prefer', `code=${statuses.shift() ?? 200}`);
      return fetch(input, { ...init, headers });
    };
  }
  it('401 뒤 재확인하고 같은 요청을 정상 응답으로 다시 보낸다', async () => {
    const reauthenticate = vi.fn().mockResolvedValue('fresh');
    const client = new ApiClient({ baseUrl, fetcher: selected([401, 200]), reauthenticate });
    client.setToken('expired');
    const result = await client.operation<{ rooms: unknown[] }>('/v1/me/rooms')();
    expect(result.rooms.length).toBeGreaterThan(0); expect(reauthenticate).toHaveBeenCalledOnce();
  });
  it('403 Origin 거부와 500 오류 코드·번호를 전달한다', async () => {
    for (const [status, code] of [[403, 'origin_not_allowed'], [500, 'internal']] as const) {
      const client = new ApiClient({ baseUrl, fetcher: selected([status]), reauthenticate: vi.fn() }); client.setToken('token');
      await expect(client.operation('/v1/me/rooms')()).rejects.toMatchObject({ problem: { status, code, traceId: expect.any(String) } });
    }
  });
  it('429의 Retry-After를 전달한다', async () => {
    const client = new ApiClient({ baseUrl, fetcher: selected([429]), reauthenticate: vi.fn() });
    await expect(client.operation('/v1/sessions', { method: 'POST', authenticated: false, body: { authCode: 'example' } })()).rejects.toMatchObject({ problem: { status: 429, code: 'rate_limited' }, retryAfter: 30 });
  });
});
