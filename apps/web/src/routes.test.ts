import { describe, expect, it, vi } from 'vitest';
import { matchRoute, navigate, routes } from './routes';
describe('사이트맵 경로', () => {
  it('15개 화면 경로를 찾고 카드 ID를 받는다', () => {
    expect(routes).toHaveLength(15);
    for (const route of routes) expect(matchRoute(route.replace(':pastCardId', 'card-1'))).toBe(route);
    expect(matchRoute('/past-cards/a/b')).toBeUndefined();
  });
  it('진입과 방 소개에서 이동할 때 기록을 바꿔 끼울 수 있다', () => {
    const replaceState = vi.fn();
    const pushState = vi.fn();
    const dispatchEvent = vi.fn();
    vi.stubGlobal('PopStateEvent', class {});
    vi.stubGlobal('window', { history: { replaceState, pushState }, dispatchEvent });
    navigate('/home', true);
    navigate('/room/questions', true);
    expect(replaceState.mock.calls.map(call => call[2])).toEqual(['/home', '/room/questions']);
    expect(pushState).not.toHaveBeenCalled();
    expect(dispatchEvent).toHaveBeenCalledTimes(2);
    vi.unstubAllGlobals();
  });
});
