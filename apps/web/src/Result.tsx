import React from 'react';
import { Button } from '@toss/tds-mobile';
import { ApiError, formatAsOf, onVisible } from './api';
import { entryContext } from './entry-context';
import { isNotificationConfigured, requestAgreement, withConsent } from './notification';
import { navigate } from './routes';
import { roomContext, type Profile } from './room-context';
import { authCode, client, refreshSession, sessionState } from './session';

type RoomStatus = { status: 'open' | 'closed'; submittedCount: number; partySize: number; asOf: string };
const labels = { plan_speed: '계획 속도', spending_priority: '지출 우선순위', schedule_change: '일정 변경 반응' };
export function Result() {
  const [profile, setProfile] = React.useState<Profile | undefined>(roomContext.profileRoom === entryContext.room ? roomContext.profile : undefined); const [room, setRoom] = React.useState<RoomStatus>();
  const [loading, setLoading] = React.useState(false); const [error, setError] = React.useState<string>(); const [permission, setPermission] = React.useState(false); const [missing, setMissing] = React.useState(false);
  const [notify, setNotify] = React.useState<'idle' | 'loading' | 'update' | 'done' | 'already' | 'error'>('idle');
  const [seconds, setSeconds] = React.useState(0); const [refreshing, setRefreshing] = React.useState(false);
  const [alreadySubmitted] = React.useState(() => { const value = roomContext.alreadySubmitted; roomContext.alreadySubmitted = false; return value; });
  const pending = React.useRef(false);
  const subscription = React.useRef<(() => Promise<unknown>)>();
  const subscriptionStatus = React.useRef(201);
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
      const [p, r] = await Promise.allSettled([roomContext.profile && roomContext.profileRoom === code ? Promise.resolve(roomContext.profile) : client.operation<Profile>(`${path}/my-profile`)(), client.operation<RoomStatus>(path)()]);
      if (p.status === 'fulfilled') setProfile(p.value); else failure(p.reason);
      if (r.status === 'fulfilled') setRoom(r.value); else failure(r.reason);
    } finally { clearTimeout(timer); setLoading(false); setRefreshing(false); pending.current = false; }
  }, [code, failure, path]);
  React.useEffect(() => { void load(); return onVisible(() => void load()); }, [load]);
  React.useEffect(() => { if (!seconds) return; const timer = setTimeout(() => setSeconds(value => Math.max(0, value - 1)), 1000); return () => clearTimeout(timer); }, [seconds]);
  async function subscribe() {
    if (notify === 'loading' || seconds) return;
    setNotify('loading');
    try {
      const result = subscription.current ? 'alreadyAgreed' : await requestAgreement(import.meta.env.VITE_NOTIFICATION_TEMPLATE_CODE || '');
      const outcome = await withConsent(result, async () => {
        let retriedCode = false; let retriedIdentity = false;
        for (;;) {
          if (!subscription.current) {
            const code = await authCode();
            subscription.current = client.operation(`${path}/notification-subscription`, { method: 'POST', idempotent: true, body: { authCode: code }, onStatus: value => { subscriptionStatus.current = value; } });
          }
          try { await subscription.current(); return subscriptionStatus.current; }
          catch (err) {
            if (err instanceof ApiError && err.problem.code === 'auth_code_invalid' && !retriedCode) { retriedCode = true; subscription.current = undefined; continue; }
            if (err instanceof ApiError && err.problem.code === 'identity_mismatch' && !retriedIdentity) { retriedIdentity = true; await refreshSession(); subscription.current = undefined; continue; }
            throw err;
          }
        }
      });
      if (outcome === 'unsupported') setNotify('update');
      else if (outcome === 'rejected') setNotify('idle');
      else setNotify(outcome === 200 ? 'already' : 'done');
    } catch (err) {
      if (err instanceof ApiError && err.problem.code === 'room_closed') { setNotify('idle'); await load(); }
      else if (err instanceof ApiError && ['origin_not_allowed', 'not_participant', 'response_required', 'room_not_found'].includes(err.problem.code)) { setNotify('idle'); failure(err); }
      else if (err instanceof ApiError && ['unauthenticated', 'reauthentication_failed'].includes(err.problem.code)) { setNotify('idle'); failure(err); }
      else { if (err instanceof ApiError) setSeconds(err.retryAfter); setNotify('error'); }
    }
  }
  if (permission) return <main className="entry"><section className="entry-content"><h1>지금은 쓸 수 없어요</h1></section></main>;
  if (missing) return <main className="create">{room?.status === 'closed' && <div className="room-notice"><p>방이 마감됐어요</p></div>}<h1>이 방은 없거나 보관 기간이 지났어요</h1><Button display="block" onClick={() => navigate('/rooms/new')}>방 만들기</Button></main>;
  return <main className="create">{room?.status === 'closed' && <div className="room-notice"><p>방이 마감됐어요</p></div>}<h1>{roomContext.nicknameRoom === code && roomContext.nickname ? `${roomContext.nickname} 님의 모임 성향` : '내 모임 성향'}</h1>{alreadySubmitted && <p role="status">이미 답했어요</p>}
    {error !== undefined && <div role="alert"><p>잠시 뒤 다시 해 주세요</p>{error && <p>오류 번호 {error}</p>}<button className="link-button" onClick={() => void load()}>다시 시도</button></div>}
    {!profile && loading && <div className="skeletons" role="status"><span /><span /><span /><span className="sr-only">불러오고 있어요</span></div>}
    {profile && <><p>{profile.summary}</p>{profile.axes.map(axis => <section className="profile-axis" key={axis.axis}><h2>{labels[axis.axis]}</h2><div className="axis" role="group" aria-label={`${labels[axis.axis]}: ${{ low: '낮음', balanced: '균형', high: '높음' }[axis.band]}`} >{(['low', 'balanced', 'high'] as const).map((band, i) => <span className={axis.band === band ? 'axis-selected' : ''} key={band}>{['낮음', '균형', '높음'][i]}</span>)}</div></section>)}</>}
    {room && <><div className="as-of"><span>{room.partySize}명 중 {room.submittedCount}명 답했어요 · {formatAsOf(room.asOf)}{refreshing && <> · 다시 불러오는 중 <span aria-hidden="true" className="refresh-spinner" /></>}</span>{!refreshing && <button className="link-button" onClick={() => void load()}>새로고침</button>}</div><Button display="block" onClick={() => navigate(room.status === 'closed' ? '/room/final' : '/room/card')}>{room.status === 'closed' ? '최종 카드 보기' : '카드 보기'}</Button>
    {room.status === 'open' && isNotificationConfigured() && <>{notify === 'done' || notify === 'already' ? <div className="room-notice"><p>{notify === 'already' ? '이미 알림을 신청했어요' : '알림을 신청했어요. 친구가 답을 마치면 알려 드려요'}</p></div> : <Button display="block" variant="weak" loading={notify === 'loading'} disabled={notify === 'loading' || seconds > 0} onClick={() => void subscribe()}>알림 받기</Button>}{notify === 'update' && <p>토스 앱을 업데이트하면 알림을 받을 수 있어요</p>}{notify === 'error' && <div role="alert"><p>알림을 신청하지 못했어요</p><button className="link-button" disabled={seconds > 0} onClick={() => void subscribe()}>{seconds ? `다시 시도 (${seconds}초)` : '다시 시도'}</button></div>}</>}</>}
  </main>;
}
