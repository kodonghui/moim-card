import React from 'react';
import { Button } from '@toss/tds-mobile';
import { closeView, getTossAppVersion } from '@apps-in-toss/web-framework';
import { type ApiClient } from './api';
import { startEntry, type EntryState } from './entry';
import { entryContext } from './entry-context';
import { authCode, client, sessionState } from './session';
import { navigate } from './routes';
type EntryServices = { version: () => string; authCode: () => Promise<string>; client: ApiClient; navigate: (path: string) => void; close: () => Promise<void>; room: string | null; referrerKind: 'external_share' | 'other' };
const defaults = { version: getTossAppVersion, authCode, client, navigate: (path: string) => navigate(path, true), close: closeView };
export function EntryScreen({ services }: { services?: EntryServices }) {
  const resolved = React.useMemo(() => services ?? { ...defaults, ...entryContext }, [services]);
  const [state, setState] = React.useState<EntryState>(sessionState.reauthenticationFailed ? { kind: 'error', retryAfter: 0 } : { kind: 'waiting' });
  const [seconds, setSeconds] = React.useState(0);
  const start = React.useCallback(() => { sessionState.reauthenticationFailed = false; return startEntry({ ...resolved, onState: setState }); }, [resolved]);
  React.useEffect(() => { if (!sessionState.reauthenticationFailed) void start(); }, [start]);
  React.useEffect(() => {
    if (state.kind !== 'error' || state.retryAfter <= 0) { setSeconds(0); return; }
    const end = Date.now() + state.retryAfter * 1000;
    const update = () => setSeconds(Math.max(0, Math.ceil((end - Date.now()) / 1000)));
    update();
    const timer = setInterval(update, 250);
    return () => clearInterval(timer);
  }, [state]);
  if (state.kind === 'waiting') return <main />;
  if (state.kind === 'loading') return <main className="entry"><section className="entry-content" role="status"><h1>모임 합의 카드</h1><p>확인하고 있어요</p></section></main>;
  if (state.kind === 'permission') return <main className="entry"><section className="entry-content"><h1>지금은 쓸 수 없어요</h1></section></main>;
  return <main className="entry"><section className="entry-content"><h1>{state.kind === 'update-required' ? '토스 앱을 업데이트하면 쓸 수 있어요' : state.kind === 'error' && state.retryAfter > 0 ? '잠시 뒤 다시 해 주세요' : '확인하지 못했어요'}</h1>{state.kind === 'update-required' && <p>앱스토어나 플레이스토어에서 토스를 업데이트해 주세요</p>}{state.kind === 'error' && state.traceId && <p>오류 번호 {state.traceId}</p>}</section><div className="entry-actions">{state.kind === 'error' && <Button display="block" disabled={seconds > 0} onClick={() => void start()}>{seconds > 0 ? `다시 시도 (${seconds}초)` : '다시 시도'}</Button>}<Button display="block" variant="weak" onClick={() => void resolved.close()}>닫기</Button></div></main>;
}
