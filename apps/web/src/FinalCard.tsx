import React from 'react';
import { Button } from '@toss/tds-mobile';
import { AgreementCard, type CardData } from './AgreementCard';
import { ApiError } from './api';
import { entryContext } from './entry-context';
import { navigate } from './routes';
import { roomContext } from './room-context';
import { client } from './session';
type Room = { gatheringName: string; theme: { name: string }; status: 'open' | 'closed'; mySubmitted: boolean };
export function FinalCard() {
  const [card, setCard] = React.useState<CardData>(); const [room, setRoom] = React.useState<Room>(); const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string>(); const [permission, setPermission] = React.useState(false); const [missing, setMissing] = React.useState(false);
  const code = entryContext.room; const path = `/v1/rooms/${encodeURIComponent(code || '')}`;
  const load = React.useCallback(async () => {
    if (!code) { navigate('/home', true); return; }
    const timer = setTimeout(() => setLoading(true), 1000); setError(undefined);
    try {
      const [r, c] = await Promise.all([client.operation<Room>(path)(), roomContext.finalCard && roomContext.finalRoom === code ? Promise.resolve(roomContext.finalCard) : client.operation<CardData>(`${path}/card`)()]);
      if (r.status !== 'closed' || c.stage === 'interim') { navigate('/room', true); return; }
      setRoom(r); setCard(c);
    } catch (err) {
      if (err instanceof ApiError && err.problem.code === 'origin_not_allowed') setPermission(true);
      else if (err instanceof ApiError && ['not_participant', 'response_required'].includes(err.problem.code)) navigate('/room', true);
      else if (err instanceof ApiError && err.problem.code === 'room_not_found') setMissing(true);
      else if (err instanceof ApiError && err.problem.code === 'unauthenticated') navigate('/', true);
      else setError(err instanceof ApiError ? err.problem.traceId || '' : '');
    } finally { clearTimeout(timer); setLoading(false); }
  }, [code, path]);
  React.useEffect(() => { void load(); }, [load]);
  if (permission) return <main className="entry"><section className="entry-content"><h1>지금은 쓸 수 없어요</h1></section></main>;
  if (missing) return <main className="create"><h1>이 방은 없거나 보관 기간이 지났어요</h1><Button display="block" onClick={() => navigate('/rooms/new')}>방 만들기</Button></main>;
  return <main className="create">{roomContext.closedNotice && <p>방이 마감됐어요</p>}
    {error !== undefined && <div role="alert"><p>잠시 뒤 다시 해 주세요</p>{error && <p>오류 번호 {error}</p>}<button className="link-button" onClick={() => void load()}>다시 시도</button></div>}
    {!card && loading && <div className="skeletons" role="status"><span /><span /><span /><span className="sr-only">불러오고 있어요</span></div>}
    {room && card && <>{card.stage === 'none' ? <h1>답한 사람이 적어 카드 없이 마감됐어요</h1> : <AgreementCard card={card} name={room.gatheringName} theme={room.theme.name} />}
      {room.mySubmitted && card.stage === 'final' && <><div className="card-actions"><Button display="block" disabled>카드 저장</Button><Button display="block" disabled>단톡방에 보내기</Button></div><button className="link-button" onClick={() => navigate('/room/result')}>내 모임 성향 다시 보기</button></>}
      <div className="create-action"><Button display="block" onClick={() => navigate('/rooms/new')}>우리도 해 보기</Button></div></>}
  </main>;
}
