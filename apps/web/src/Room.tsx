import React from 'react';
import { Button } from '@toss/tds-mobile';
import { ApiError, formatAsOf, onVisible } from './api';
import { entryContext } from './entry-context';
import { validateNickname } from './names';
import { navigate } from './routes';
import { roomContext } from './room-context';
import { client, sessionState } from './session';

type RoomView = { gatheringName: string; theme: { name: string }; partySize: number; submittedCount: number; isFull: boolean; status: 'open' | 'closed'; myRole: 'none' | 'member' | 'host'; mySubmitted: boolean; asOf: string };
const roomPath = () => `/v1/rooms/${encodeURIComponent(entryContext.room || '')}`;
export function RoomIntro() {
  const [room, setRoom] = React.useState<RoomView>(); const [error, setError] = React.useState<string>();
  const [missing, setMissing] = React.useState(false); const [permission, setPermission] = React.useState(false); const [loading, setLoading] = React.useState(false);
  const pending = React.useRef(false); const roomRef = React.useRef<RoomView>(); const [refreshing, setRefreshing] = React.useState(false);
  const load = React.useCallback(async () => {
    if (!entryContext.room) { navigate('/home', true); return; }
    if (pending.current) return; pending.current = true; setError(undefined);
    const hasRoom = Boolean(roomRef.current); if (hasRoom) setRefreshing(true);
    const timer = hasRoom ? undefined : setTimeout(() => setLoading(true), 1000);
    try {
      const data = await client.operation<RoomView>(roomPath())();
      roomContext.name = data.gatheringName; roomContext.role = data.myRole;
      if (data.status === 'closed') navigate('/room/final', true);
      else if (data.myRole !== 'none') navigate(data.mySubmitted ? roomContext.origin === 'invite' ? '/room/result' : '/room/card' : '/room/questions', true);
      else { roomRef.current = data; setRoom(data); }
    } catch (err) {
      if (err instanceof ApiError && err.problem.code === 'origin_not_allowed') setPermission(true);
      else if (err instanceof ApiError && err.problem.code === 'room_not_found') setMissing(true);
      else if (err instanceof ApiError && ['unauthenticated', 'reauthentication_failed'].includes(err.problem.code)) { sessionState.reauthenticationFailed = true; navigate('/', true); }
      else setError(err instanceof ApiError ? err.problem.traceId || '' : '');
    } finally { if (timer) clearTimeout(timer); setLoading(false); setRefreshing(false); pending.current = false; }
  }, []);
  React.useEffect(() => { void load(); return onVisible(() => void load()); }, [load]);
  if (permission) return <main className="entry"><section className="entry-content"><h1>지금은 쓸 수 없어요</h1></section></main>;
  if (missing) return <main className="create"><h1>이 방은 없거나 보관 기간이 지났어요</h1><Button display="block" onClick={() => navigate('/rooms/new')}>방 만들기</Button></main>;
  return <main className="create">{!room && loading && <div className="skeletons" role="status"><span /><span /><span /><span className="sr-only">불러오고 있어요</span></div>}
    {error !== undefined && <div role="alert"><p>잠시 뒤 다시 해 주세요</p>{error && <p>오류 번호 {error}</p>}<button className="link-button" onClick={() => void load()}>다시 시도</button></div>}
    {room && <><h1>{room.gatheringName}</h1><p>{room.theme.name}</p>{room.isFull ? <><div className="room-notice"><p>이 방은 8명이 다 찼어요</p><p>우리 모임 방을 새로 만들 수 있어요</p></div><div className="create-action"><Button display="block" onClick={() => navigate('/rooms/new')}>방 만들기</Button></div></> : <><p>인원 {room.partySize}명</p><p>{room.submittedCount}명 답했어요</p><p>응답 받는 중</p><div className="room-notice">인원이 다 답하면 마감돼요. 누가 무엇을 골랐는지는 아무에게도 보이지 않아요</div><div className="as-of"><span>{formatAsOf(room.asOf)}{refreshing && <> · 다시 불러오는 중 <span aria-hidden="true" className="refresh-spinner" /></>}</span>{!refreshing && <button className="link-button" onClick={() => void load()}>새로고침</button>}</div><div className="create-action"><Button display="block" onClick={() => navigate('/room/join', true)}>참여하기</Button></div></>}</>}
  </main>;
}
export function JoinRoom() {
  const [nickname, setNickname] = React.useState(''); const [fieldError, setFieldError] = React.useState(false); const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string>(); const [state, setState] = React.useState<'normal' | 'permission' | 'full' | 'missing'>('normal'); const [seconds, setSeconds] = React.useState(0);
  const operation = React.useRef<(() => Promise<{ mySubmitted: boolean; myRole: 'host' | 'member' }>)>(); const valid = validateNickname(nickname);
  React.useEffect(() => { if (!entryContext.room || !roomContext.name) navigate('/room', true); }, []);
  React.useEffect(() => { operation.current = undefined; }, [nickname]);
  React.useEffect(() => { if (!seconds) return; const timer = setTimeout(() => setSeconds(s => Math.max(0, s - 1)), 1000); return () => clearTimeout(timer); }, [seconds]);
  async function submit() {
    if (!valid.valid || loading || seconds) return;
    setLoading(true); setError(undefined);
    try {
      operation.current ??= client.operation<{ mySubmitted: boolean; myRole: 'host' | 'member' }>(`${roomPath()}/participants`, { method: 'POST', idempotent: true, body: { nickname: valid.value } });
      const result = await operation.current(); roomContext.role = result.myRole; roomContext.nickname = valid.value; roomContext.nicknameRoom = entryContext.room || undefined; navigate(result.mySubmitted ? '/room/result' : '/room/questions', true);
    } catch (err) {
      if (err instanceof ApiError && err.problem.code === 'origin_not_allowed') setState('permission');
      else if (err instanceof ApiError && err.problem.code === 'room_closed') { roomContext.closedNotice = true; navigate('/room/final', true); }
      else if (err instanceof ApiError && err.problem.code === 'room_full') setState('full');
      else if (err instanceof ApiError && err.problem.code === 'room_not_found') setState('missing');
      else if (err instanceof ApiError && err.problem.code === 'validation_failed') setFieldError(true);
      else if (err instanceof ApiError && ['unauthenticated', 'reauthentication_failed'].includes(err.problem.code)) { sessionState.reauthenticationFailed = true; navigate('/', true); }
      else { setError(err instanceof ApiError ? err.problem.traceId || '' : ''); if (err instanceof ApiError) setSeconds(err.retryAfter); }
    } finally { setLoading(false); }
  }
  if (state === 'permission') return <main className="entry"><section className="entry-content"><h1>지금은 쓸 수 없어요</h1></section></main>;
  if (state === 'missing') return <main className="create"><h1>이 방은 없거나 보관 기간이 지났어요</h1><Button display="block" onClick={() => navigate('/rooms/new')}>방 만들기</Button></main>;
  return <main className="create"><h1>{roomContext.name}에서 쓸 닉네임을 적어 주세요</h1><fieldset disabled={loading || state === 'full'}><label htmlFor="join-name">닉네임</label><input id="join-name" aria-describedby="join-name-help" value={nickname} maxLength={30} onChange={e => setNickname(e.target.value)} onBlur={() => setFieldError(!valid.valid)} aria-invalid={fieldError} /><p id="join-name-help">닉네임은 이 방에서 나만 봐요 · {[...nickname.trim()].length}/10</p>{fieldError && <p role="alert">닉네임은 1~10자로, 쓸 수 없는 말이 있어요</p>}</fieldset>
    {error !== undefined && <div role="alert"><p>잠시 뒤 다시 해 주세요</p>{error && <p>오류 번호 {error}</p>}</div>}
    {state === 'full' && <div role="alert"><h2>이 방은 8명이 다 찼어요</h2><p>우리 모임 방을 새로 만들 수 있어요</p></div>}
    <div className="create-action"><Button display="block" loading={loading} disabled={!valid.valid || loading || seconds > 0 || state === 'full'} onClick={() => void submit()}>{seconds ? `다시 시도 (${seconds}초)` : '들어가기'}</Button>{state === 'full' && <Button display="block" variant="weak" onClick={() => navigate('/rooms/new')}>방 만들기</Button>}</div></main>;
}
