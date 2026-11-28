import React from 'react';
import { Button } from '@toss/tds-mobile';
import { saveCard } from './save-card';
export function SaveCardButton({ cardRef }: { cardRef: React.RefObject<HTMLElement> }) {
  const [state, setState] = React.useState<'idle' | 'success' | 'error'>('idle');
  async function save() {
    try { if (!cardRef.current) throw new Error('missing card'); await saveCard(cardRef.current); setState('success'); }
    catch { setState('error'); }
  }
  return <><Button display="block" onClick={() => void save()}>카드 저장</Button>{state === 'success' && <p role="status">저장했어요</p>}{state === 'error' && <div role="alert"><p>저장하지 못했어요</p><button className="link-button" onClick={() => void save()}>다시 시도</button></div>}</>;
}
