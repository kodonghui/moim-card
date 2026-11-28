import React from 'react';
import { Button } from '@toss/tds-mobile';
import { entryContext } from './entry-context';
import { shareRoom } from './share';
export function ShareButton({ label }: { label: '친구 부르기' | '단톡방에 보내기' }) {
  const [state, setState] = React.useState<'idle' | 'loading' | 'update' | 'error'>('idle');
  async function share() {
    setState('loading');
    try { setState(await shareRoom(import.meta.env.VITE_APP_NAME || '', entryContext.room || '') === 'update' ? 'update' : 'idle'); }
    catch { setState('error'); }
  }
  return <><Button display="block" variant="weak" loading={state === 'loading'} disabled={state === 'loading'} onClick={() => void share()}>{label}</Button>{state === 'update' && <p>토스 앱을 업데이트하면 링크를 보낼 수 있어요</p>}{state === 'error' && <div role="alert"><p>링크를 만들지 못했어요</p><button className="link-button" onClick={() => void share()}>다시 시도</button></div>}</>;
}
