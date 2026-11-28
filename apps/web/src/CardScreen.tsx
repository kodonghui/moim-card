import React from 'react';
import { Button } from '@toss/tds-mobile';
import { AgreementCard, type CardData } from './AgreementCard';
import { ApiError, formatAsOf, onVisible } from './api';
import { entryContext } from './entry-context';
import { navigate } from './routes';
import { roomContext } from './room-context';
import { client, sessionState } from './session';
type Room = { gatheringName: string; theme: { name: string }; status: 'open' | 'closed'; myRole: 'host' | 'member' | 'none'; submittedCount: number; partySize: number; asOf: string };
export function CardScreen() {
  const [card, setCard] = React.useState<CardData>(); const [room, setRoom] = React.useState<Room>(); const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string>(); const [permission, setPermission] = React.useState(false); const [missing, setMissing] = React.useState(false); const [hostAllowed, setHostAllowed] = React.useState(true); const [closing, setClosing] = React.useState(false);
  const [closeError, setCloseError] = React.useState<string>(); const [seconds, setSeconds] = React.useState(0); const [refreshing, setRefreshing] = React.useState(false); const pending = React.useRef(false);
  const dialog = React.useRef<HTMLDialogElement>(null); const operation = React.useRef<(() => Promise<unknown>)>();
  const code = entryContext.room; const path = `/v1/rooms/${encodeURIComponent(code || '')}`;
  const failure = React.useCallback((err: unknown) => {
    if (err instanceof ApiError && err.problem.code === 'origin_not_allowed') setPermission(true);
    else if (err instanceof ApiError && err.problem.code === 'not_participant') navigate('/room', true);
    else if (err instanceof ApiError && err.problem.code === 'response_required') navigate('/room/questions', true);
    else if (err instanceof ApiError && err.problem.code === 'room_not_found') setMissing(true);
    else if (err instanceof ApiError && ['unauthenticated', 'reauthentication_failed'].includes(err.problem.code)) { sessionState.reauthenticationFailed = true; navigate('/', true); }
    else setError(err instanceof ApiError ? err.problem.traceId || '' : '');
  }, []);
  const load = React.useCallback(async () => {
    if (!code) { navigate('/home', true); return; }
    if (pending.current) return; pending.current = true; setRefreshing(true);
    const timer = setTimeout(() => setLoading(true), 1000); setError(undefined);
    try {
      const [r, c] = await Promise.allSettled([client.operation<Room>(path)(), client.operation<CardData>(`${path}/card`)()]);
      if ((r.status === 'fulfilled' && r.value.status === 'closed') || (c.status === 'fulfilled' && c.value.stage === 'final')) { roomContext.closedNotice = true; navigate('/room/final', true); return; }
      if (r.status === 'fulfilled') setRoom(r.value); else failure(r.reason);
      if (c.status === 'fulfilled') setCard(c.value); else failure(c.reason);
    } finally { clearTimeout(timer); setLoading(false); setRefreshing(false); pending.current = false; }
  }, [code, failure, path]);
  React.useEffect(() => { void load(); return onVisible(() => void load()); }, [load]);
  React.useEffect(() => { if (!seconds) return; const timer = setTimeout(() => setSeconds(value => Math.max(0, value - 1)), 1000); return () => clearTimeout(timer); }, [seconds]);
  async function close() {
    if (closing || seconds) return; setClosing(true); setError(undefined); setCloseError(undefined);
    try {
      operation.current ??= client.operation(`${path}/close`, { method: 'POST', idempotent: true });
      await operation.current(); dialog.current?.close(); navigate('/room/final', true);
    } catch (err) {
      if (err instanceof ApiError && err.problem.code === 'not_host') { setHostAllowed(false); dialog.current?.close(); setError('not-host'); }
      else if (err instanceof ApiError && err.problem.code === 'not_enough_responses') { dialog.current?.close(); await load(); setError('not-enough'); }
      else if (err instanceof ApiError && ['origin_not_allowed', 'room_not_found', 'unauthenticated', 'reauthentication_failed'].includes(err.problem.code)) { dialog.current?.close(); failure(err); }
      else { setCloseError(err instanceof ApiError ? err.problem.traceId || '' : ''); if (err instanceof ApiError) setSeconds(err.retryAfter); }
    } finally { setClosing(false); }
  }
  if (permission) return <main className="entry"><section className="entry-content"><h1>지금은 쓸 수 없어요</h1></section></main>;
  if (missing) return <main className="create"><h1>이 방은 없거나 보관 기간이 지났어요</h1><Button display="block" onClick={() => navigate('/rooms/new')}>방 만들기</Button></main>;
  return <main className="create">
    {error !== undefined && <div role="alert"><p>{error === 'not-enough' ? '2명 이상이 답해야 마감할 수 있어요' : error === 'not-host' ? '방장만 마감할 수 있어요' : '잠시 뒤 다시 해 주세요'}</p>{error && !['not-enough', 'not-host'].includes(error) && <p>오류 번호 {error}</p>}{!['not-enough', 'not-host'].includes(error) && <button className="link-button" onClick={() => void load()}>다시 시도</button>}</div>}
    {!card && loading && <div className="skeletons" role="status"><span /><span /><span /><span className="sr-only">불러오고 있어요</span></div>}
    {room && card && <><div className="as-of"><span>인원 {room.partySize}명 중 {room.submittedCount}명 답했어요 · {formatAsOf(room.asOf)}{refreshing && <> · 다시 불러오는 중 <span aria-hidden="true" className="refresh-spinner" /></>}</span>{!refreshing && <button className="link-button" onClick={() => void load()}>새로고침</button>}</div>{roomContext.nicknameRoom === code && roomContext.nickname && <p>{roomContext.nickname} 님으로 참여 중</p>}
      {card.stage === 'none' ? <div><p>친구를 부르면 카드가 생겨요</p><p>2명 이상 답하면 카드가 만들어져요</p><Button display="block" disabled>친구 부르기</Button></div> : <AgreementCard card={card} name={room.gatheringName} theme={room.theme.name} />}
      {card.stage !== 'none' && <div className="card-actions"><Button display="block" disabled>카드 저장</Button><Button display="block" disabled>단톡방에 보내기</Button></div>}
      {room.myRole === 'host' && hostAllowed && <section><h2>방장에게만 보여요</h2><Button display="block" disabled={room.submittedCount < 2} onClick={() => dialog.current?.showModal()}>지금 마감하기</Button>{room.submittedCount < 2 && <p>2명 이상이 답하면 마감할 수 있어요</p>}</section>}
      <button className="link-button" onClick={() => navigate('/room/result')}>내 모임 성향 다시 보기</button>
      <dialog ref={dialog}><h2>지금 마감할까요?</h2><p>마감하면 더 답할 수 없어요. 지금 {room.submittedCount}명의 답으로 최종 카드가 만들어져요</p>{closeError !== undefined && <div role="alert"><p>잠시 뒤 다시 해 주세요</p>{closeError && <p>오류 번호 {closeError}</p>}</div>}<Button loading={closing} disabled={closing || seconds > 0} onClick={() => void close()}>{seconds ? `다시 시도 (${seconds}초)` : closeError !== undefined ? '다시 시도' : '마감하기'}</Button><Button variant="weak" disabled={closing} onClick={() => dialog.current?.close()}>취소</Button></dialog></>}
  </main>;
}
