import React from 'react';
import { Button } from '@toss/tds-mobile';
import { ApiError, formatAsOf, onVisible } from './api';
import { entryContext } from './entry-context';
import { requestAgreement, withConsent } from './notification';
import { navigate } from './routes';
import { roomContext, type Profile } from './room-context';
import { authCode, client } from './session';

type RoomStatus = { status: 'open' | 'closed'; submittedCount: number; partySize: number; asOf: string };
const labels = { plan_speed: '계획 속도', spending_priority: '지출 우선순위', schedule_change: '일정 변경 반응' };
export function Result() {
  const [profile, setProfile] = React.useState<Profile | undefined>(roomContext.profileRoom === entryContext.room ? roomContext.profile : undefined); const [room, setRoom] = React.useState<RoomStatus>();
  const [loading, setLoading] = React.useState(false); const [error, setError] = React.useState<string>(); const [permission, setPermission] = React.useState(false); const [missing, setMissing] = React.useState(false);
  const [notify, setNotify] = React.useState<'idle' | 'loading' | 'update' | 'done' | 'already' | 'error'>('idle');
  const subscription = React.useRef<(() => Promise<unknown>)>();
  const subscriptionStatus = React.useRef(201);
  const code = entryContext.room; const path = `/v1/rooms/${encodeURIComponent(code || '')}`;
  const failure = React.useCallback((err: unknown) => {
    if (err instanceof ApiError && err.problem.code === 'origin_not_allowed') setPermission(true);
    else if (err instanceof ApiError && err.problem.code === 'not_participant') navigate('/room', true);
    else if (err instanceof ApiError && err.problem.code === 'response_required') navigate('/room/questions', true);
    else if (err instanceof ApiError && err.problem.code === 'room_not_found') setMissing(true);
    else if (err instanceof ApiError && err.problem.code === 'unauthenticated') navigate('/', true);
    else setError(err instanceof ApiError ? err.problem.traceId || '' : '');
  }, []);
  const load = React.useCallback(async () => {
    if (!code) { navigate('/home', true); return; }
    const timer = setTimeout(() => setLoading(true), 1000); setError(undefined);
    try {
      const [p, r] = await Promise.all([roomContext.profile && roomContext.profileRoom === code ? Promise.resolve(roomContext.profile) : client.operation<Profile>(`${path}/my-profile`)(), client.operation<RoomStatus>(path)()]);
      setProfile(p); setRoom(r);
    } catch (err) { failure(err); } finally { clearTimeout(timer); setLoading(false); }
  }, [code, failure, path]);
  React.useEffect(() => { void load(); return onVisible(() => void load()); }, [load]);
  async function subscribe() {
    setNotify('loading');
    try {
      const result = subscription.current ? 'alreadyAgreed' : await requestAgreement(import.meta.env.VITE_NOTIFICATION_TEMPLATE_CODE || '');
      const outcome = await withConsent(result, async () => {
        if (!subscription.current) {
          const code = await authCode();
          subscription.current = client.operation(`${path}/notification-subscription`, { method: 'POST', idempotent: true, body: { authCode: code }, onStatus: value => { subscriptionStatus.current = value; } });
        }
        await subscription.current();
        return subscriptionStatus.current;
      });
      if (outcome === 'unsupported') setNotify('update');
      else if (outcome === 'rejected') setNotify('idle');
      else setNotify(outcome === 200 ? 'already' : 'done');
    } catch (err) {
      if (err instanceof ApiError && err.problem.code === 'room_closed') { setNotify('idle'); await load(); }
      else if (err instanceof ApiError && ['origin_not_allowed', 'not_participant', 'response_required', 'room_not_found'].includes(err.problem.code)) { setNotify('idle'); failure(err); }
      else setNotify('error');
    }
  }
  if (permission) return <main className="entry"><section className="entry-content"><h1>지금은 쓸 수 없어요</h1></section></main>;
  if (missing) return <main className="create"><h1>이 방은 없거나 보관 기간이 지났어요</h1><Button display="block" onClick={() => navigate('/rooms/new')}>방 만들기</Button></main>;
  return <main className="create"><h1>내 모임 성향</h1>
    {error !== undefined && <div role="alert"><p>잠시 뒤 다시 해 주세요</p>{error && <p>오류 번호 {error}</p>}<button className="link-button" onClick={() => void load()}>다시 시도</button></div>}
    {!profile && loading && <div className="skeletons" role="status"><span /><span /><span /><span className="sr-only">불러오고 있어요</span></div>}
    {profile && <><p>{profile.summary}</p>{profile.axes.map(axis => <section key={axis.axis}><h2>{labels[axis.axis]}</h2><div className="axis">{(['low', 'balanced', 'high'] as const).map((band, i) => <span className={axis.band === band ? 'axis-selected' : ''} key={band}>{['낮음', '균형', '높음'][i]}{axis.band === band ? ' · 선택됨' : ''}</span>)}</div></section>)}</>}
    {room && <>{room.status === 'closed' && <p>방이 마감됐어요</p>}<div className="as-of"><span>{room.partySize}명 중 {room.submittedCount}명 답했어요 · {formatAsOf(room.asOf)}</span><button className="link-button" onClick={() => void load()}>새로고침</button></div><Button display="block" onClick={() => navigate(room.status === 'closed' ? '/room/final' : '/room/card')}>카드 보기</Button>
    {room.status === 'open' && <>{notify === 'done' || notify === 'already' ? <p>{notify === 'already' ? '이미 알림을 신청했어요' : '알림을 신청했어요. 친구가 답을 마치면 알려 드려요'}</p> : <Button display="block" variant="weak" loading={notify === 'loading'} disabled={notify === 'loading'} onClick={() => void subscribe()}>알림 받기</Button>}{notify === 'update' && <p>토스 앱을 업데이트하면 알림을 받을 수 있어요</p>}{notify === 'error' && <div role="alert"><p>알림을 신청하지 못했어요</p><button className="link-button" onClick={() => void subscribe()}>다시 시도</button></div>}</>}</>}
  </main>;
}
