import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiClient } from './api';
import { readEntry, startEntry, supported, type EntryState } from './entry';
afterEach(() => vi.useRealTimers());
const json = (data: unknown, status = 200, headers?: HeadersInit) => new Response(JSON.stringify(data), { status, headers });
function setup(fetcher: typeof fetch, version = '5.240.0') {
  const states: EntryState[] = [];
  const authCode = vi.fn().mockResolvedValue('auth-code');
  const navigate = vi.fn();
  const client = new ApiClient({ baseUrl: 'http://localhost', fetcher, reauthenticate: vi.fn() });
  return { states, authCode, navigate, args: { version: () => version, authCode, client, onState: (s: EntryState) => states.push(s), navigate, room: null as string | null, referrerKind: 'other' as const } };
}
describe('SCR-001 진입 확인', () => {
  it('구버전과 버전 읽기 실패는 네트워크 요청이 없다', async () => {
    const fetcher = vi.fn(); const x = setup(fetcher, '5.231.0');
    await startEntry(x.args);
    expect(x.states).toEqual([{ kind: 'update-required' }]);
    expect(fetcher).not.toHaveBeenCalled(); expect(x.authCode).not.toHaveBeenCalled();
    expect(supported('5.232.0')).toBe(true); expect(supported('unknown')).toBe(false);
  });
  it('링크의 방 코드는 메모리에만 남기고 주소에서 지운다', () => {
    const replace = vi.fn();
    const entry = readEntry('https://example.com/?room=secret&referrer=external_share', replace);
    expect(entry).toEqual({ room: 'secret', referrerKind: 'external_share' });
    expect(replace).toHaveBeenCalledWith('/?referrer=external_share');
  });
  it('인증 성공 후 진입 기록이 실패해도 초대 화면으로 이동한다', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(json({ sessionToken: 'token' }, 201)).mockResolvedValueOnce(json({ status: 401, code: 'unauthenticated' }, 401));
    const x = setup(fetcher); x.args.room = 'secret';
    await startEntry(x.args);
    expect(x.navigate).toHaveBeenCalledWith('/room');
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it('허용되지 않은 Origin은 버튼 없는 permission 상태다', async () => {
    const x = setup(vi.fn().mockResolvedValue(json({ status: 403, code: 'origin_not_allowed' }, 403)));
    await startEntry(x.args); expect(x.states.at(-1)).toEqual({ kind: 'permission' });
  });
  it('429는 대기 시간과 오류 번호를 보존한다', async () => {
    const x = setup(vi.fn().mockResolvedValue(json({ status: 429, code: 'rate_limited', traceId: 'trace' }, 429, { 'Retry-After': '30' })));
    await startEntry(x.args); expect(x.states.at(-1)).toEqual({ kind: 'error', retryAfter: 30, traceId: 'trace' });
  });
  it('1초 뒤에만 확인 중 상태를 보여 준다', async () => {
    vi.useFakeTimers();
    const x = setup(vi.fn(() => new Promise<Response>(() => {})));
    void startEntry(x.args);
    await vi.advanceTimersByTimeAsync(999); expect(x.states).toEqual([{ kind: 'waiting' }]);
    await vi.advanceTimersByTimeAsync(1); expect(x.states.at(-1)).toEqual({ kind: 'loading' });
    await vi.advanceTimersByTimeAsync(9000);
  });
});

describe.skipIf(!process.env.PRISM_URL)('Prism 계약 목 서버', () => {
  it('세션과 유입 기록을 보낸 뒤 홈으로 이동한다', async () => {
    const navigate = vi.fn(); const states: EntryState[] = [];
    const client = new ApiClient({ baseUrl: process.env.PRISM_URL!, reauthenticate: vi.fn() });
    await startEntry({ version: () => '5.240.0', authCode: async () => 'a1b2c3d4e5f60718293a4b5c6d7e8f90', client, onState: state => states.push(state), navigate, room: null, referrerKind: 'other' });
    expect(navigate).toHaveBeenCalledWith('/home');
    expect(states).not.toContainEqual(expect.objectContaining({ kind: 'error' }));
  });
});
