import React from 'react';
import { Button } from '@toss/tds-mobile';
import { ApiError, formatAsOf, onVisible } from './api';
import { entryContext } from './entry-context';
import { navigate } from './routes';
import { roomContext } from './room-context';
import { client, sessionState } from './session';

type Room = { roomCode: string; gatheringName: string; theme: { name: string }; partySize: number; submittedCount: number; myRole: 'host' | 'member'; mySubmitted: boolean };
type RoomList = { rooms: Room[]; asOf: string };
export function Home() {
  const [data, setData] = React.useState<RoomList>();
  const [loading, setLoading] = React.useState(false);
  const [refreshing, setRefreshing] = React.useState(false);
  const dataRef = React.useRef<RoomList>();
  const [error, setError] = React.useState<string>();
  const [permission, setPermission] = React.useState(false);
  const pending = React.useRef(false);
  const load = React.useCallback(async () => {
    if (pending.current) return;
    pending.current = true;
    const hasData = Boolean(dataRef.current);
    if (hasData) setRefreshing(true);
    const timer = hasData ? undefined : setTimeout(() => setLoading(true), 1000);
    setError(undefined);
    try {
      const result = await client.operation<RoomList>('/v1/me/rooms')();
      dataRef.current = result; setData(result);
    } catch (err) {
      if (err instanceof ApiError && err.problem.code === 'origin_not_allowed') setPermission(true);
      else if (err instanceof ApiError && ['unauthenticated', 'reauthentication_failed'].includes(err.problem.code)) { sessionState.reauthenticationFailed = true; navigate('/', true); }
      else setError(err instanceof ApiError ? err.problem.traceId || '' : '');
    } finally { if (timer) clearTimeout(timer); setLoading(false); setRefreshing(false); pending.current = false; }
  }, []);
  React.useEffect(() => { void load(); return onVisible(() => void load()); }, [load]);
  if (permission) return <main className="entry"><section className="entry-content"><h1>지금은 쓸 수 없어요</h1></section></main>;
  return <main className="home">
    <header><h1>모임 합의 카드</h1><p>가칭 · 이름은 정해지면 바꿔요</p></header>
    <Button display="block" onClick={() => navigate('/rooms/new')}>방 만들기</Button>
    <section aria-labelledby="rooms-title"><h2 id="rooms-title">참여 중인 방</h2>
      {error !== undefined && <div role="alert"><p>잠시 뒤 다시 해 주세요</p>{error && <p>오류 번호 {error}</p>}<button className="link-button" onClick={() => void load()}>다시 시도</button></div>}
      {!data && loading && <div role="status" aria-label="불러오고 있어요"><div className="room-skeleton"><span /><span /></div><div className="room-skeleton"><span /><span /></div></div>}
      {data && error === undefined && <>{data.rooms.length === 0 ? <div className="empty"><p>참여 중인 방이 없어요</p><p>방을 만들고 친구를 불러 보세요</p></div> : <ul className="room-list">{data.rooms.map(room => <li key={room.roomCode}><button className="room-button" onClick={() => { entryContext.room = room.roomCode; roomContext.origin = 'home'; navigate('/room'); }}><span className="room-top"><strong>{room.gatheringName}</strong><span className="room-tags">{room.myRole === 'host' && <span className="room-tag">방장</span>}{!room.mySubmitted && <span className="room-tag room-tag-muted">답하기 전</span>}<span aria-hidden="true">›</span></span></span><span className="room-detail">{room.theme.name} · {room.partySize}명 중 {room.submittedCount}명 답했어요</span></button></li>)}</ul>}
      <div className="as-of"><span>{formatAsOf(data.asOf)}{refreshing && <> · 다시 불러오는 중 <span aria-hidden="true" className="refresh-spinner" /></>}</span>{!refreshing && <button className="link-button" onClick={() => void load()}>새로고침</button>}</div></>}
    </section>
    <nav aria-label="메뉴"><h2>더 보기</h2>{[['지난 카드', '/past-cards'], ['내 데이터 지우기', '/me/delete'], ['이용약관', '/legal/terms'], ['개인정보처리방침', '/legal/privacy']].map(([label, path]) => <button className="menu-button" key={path} onClick={() => navigate(path)}>{label}</button>)}</nav>
  </main>;
}
