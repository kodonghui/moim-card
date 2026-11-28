import React from 'react';
import { createRoot } from 'react-dom/client';
import { Button } from '@toss/tds-mobile';
import { TDSMobileAITProvider } from '@toss/tds-mobile-ait';
import { closeView, getTossAppVersion } from '@apps-in-toss/web-framework';
import tokens from '../../../design/base.tokens.json';
import { startEntry, type EntryState } from './entry';
import { entryContext } from './entry-context';
import { authCode, client } from './session';
import { matchRoute, navigate } from './routes';
import './style.css';

export function EntryScreen() {
  const [state, setState] = React.useState<EntryState>({ kind: 'waiting' });
  const [seconds, setSeconds] = React.useState(0);
  const start = React.useCallback(() => startEntry({ version: getTossAppVersion, authCode, client, onState: setState, navigate: path => navigate(path, true), ...entryContext }), []);
  React.useEffect(() => { void start(); }, [start]);
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
  return <main className="entry"><section className="entry-content"><h1>{state.kind === 'update-required' ? '토스 앱을 업데이트하면 쓸 수 있어요' : state.kind === 'error' && state.retryAfter > 0 ? '잠시 뒤 다시 해 주세요' : '확인하지 못했어요'}</h1>{state.kind === 'update-required' && <p>앱스토어나 플레이스토어에서 토스를 업데이트해 주세요</p>}{state.kind === 'error' && state.traceId && <p>오류 번호 {state.traceId}</p>}</section><div className="entry-actions">{state.kind === 'error' && <Button display="block" disabled={seconds > 0} onClick={() => void start()}>{seconds > 0 ? `다시 시도 (${seconds}초)` : '다시 시도'}</Button>}<Button display="block" variant="weak" onClick={() => void closeView()}>닫기</Button></div></main>;
}
function App() {
  const [path, setPath] = React.useState(location.pathname);
  React.useEffect(() => { const update = () => setPath(location.pathname); window.addEventListener('popstate', update); return () => window.removeEventListener('popstate', update); }, []);
  if (path === '/') return <EntryScreen />;
  return <main><p role="status">{matchRoute(path) ? '확인하고 있어요' : '화면을 찾을 수 없어요'}</p></main>;
}
createRoot(document.getElementById('root')!).render(<TDSMobileAITProvider brandPrimaryColor={tokens.color.accent.default.$value.hex}><App /></TDSMobileAITProvider>);
