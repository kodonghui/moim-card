import React from 'react';
import { Button } from '@toss/tds-mobile';
import { closeMiniApp } from './delete-native';
import { activateDeleteBack, deactivateDeleteBack } from './delete-back';
import { ApiError } from './api';
import { clearAllAnswers } from './answer-storage';
import { entryContext } from './entry-context';
import { clearPastCard } from './PastCards';
import { navigate } from './routes';
import { roomContext } from './room-context';
import { client, sessionState } from './session';

type Summary = { responseCount: number; nicknameCount: number; notificationSubscriptionCount: number; pastCardCount: number; openHostedRoomCount: number; retainedFinalCardCount: number };
function clearLocalSession() {
  client.clearToken(); clearAllAnswers(); clearPastCard();
  entryContext.room = null; entryContext.referrerKind = 'other'; sessionState.reauthenticationFailed = false;
  Object.assign(roomContext, { origin: 'home', name: '', role: undefined, nickname: '', nicknameRoom: undefined, profile: undefined, profileRoom: undefined, finalCard: undefined, finalRoom: undefined, closedNotice: false, alreadySubmitted: false });
}
export function DeleteData() {
  const [summary, setSummary] = React.useState<Summary>(); const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string>(); const [deleteError, setDeleteError] = React.useState(false); const [permission, setPermission] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false); const [seconds, setSeconds] = React.useState(0); const [done, setDone] = React.useState(false);
  const operation = React.useRef<(() => Promise<void>)>(); const dialog = React.useRef<HTMLDialogElement>(null);
  async function load() {
    setError(undefined); const timer = setTimeout(() => setLoading(true), 1000);
    try { setSummary(await client.operation<Summary>('/v1/me/data-summary')()); }
    catch (err) {
      if (err instanceof ApiError && err.problem.code === 'origin_not_allowed') setPermission(true);
      else if (err instanceof ApiError && ['unauthenticated', 'reauthentication_failed'].includes(err.problem.code)) { sessionState.reauthenticationFailed = true; navigate('/', true); }
      else setError(err instanceof ApiError ? err.problem.traceId || '' : '');
    } finally { clearTimeout(timer); setLoading(false); }
  }
  React.useEffect(() => { void load(); }, []);
  React.useEffect(() => { if (!seconds) return; const timer = setTimeout(() => setSeconds(value => Math.max(0, value - 1)), 1000); return () => clearTimeout(timer); }, [seconds]);
  async function erase() {
    if (deleting || seconds) return; setDeleting(true); setDeleteError(false);
    try {
      operation.current ??= client.operation<void>('/v1/me', { method: 'DELETE', idempotent: true });
      await operation.current(); dialog.current?.close(); clearLocalSession();
      window.history.replaceState({ ...window.history.state, deleted: true }, '', '/me/delete'); activateDeleteBack(); setDone(true);
    } catch (err) {
      dialog.current?.close();
      if (err instanceof ApiError && err.problem.code === 'origin_not_allowed') setPermission(true);
      else if (err instanceof ApiError && ['unauthenticated', 'reauthentication_failed'].includes(err.problem.code)) { sessionState.reauthenticationFailed = true; navigate('/', true); }
      else { if (err instanceof ApiError) setSeconds(err.retryAfter); setDeleteError(true); }
    } finally { setDeleting(false); }
  }
  if (permission) return <main className="entry"><section className="entry-content"><h1>지금은 쓸 수 없어요</h1></section></main>;
  if (done) return <main className="entry"><section className="entry-content"><h1>지웠어요</h1><p>다시 쓰면 새 사용자로 시작해요</p></section><div className="entry-actions"><Button display="block" onClick={() => { deactivateDeleteBack(); void closeMiniApp(); }}>미니앱 닫기</Button><Button display="block" variant="weak" onClick={() => { deactivateDeleteBack(); navigate('/', true); }}>처음 화면으로</Button></div></main>;
  const empty = summary && summary.responseCount === 0 && summary.notificationSubscriptionCount === 0 && summary.pastCardCount === 0;
  return <main className="create"><h1>내 데이터 지우기</h1>
    {loading && !summary && <div className="skeletons" role="status"><span /><span /><span /><span className="sr-only">불러오고 있어요</span></div>}
    {error !== undefined && <div role="alert"><p>잠시 뒤 다시 해 주세요</p>{error && <p>오류 번호 {error}</p>}<button className="link-button" onClick={() => void load()}>다시 시도</button></div>}
    {summary && <>{empty ? <p>지울 응답과 알림 신청이 없어요. 사용자 ID는 지워요</p> : <section><h2>지우면 이것들이 사라져요</h2><ul><li>응답 {summary.responseCount}개</li><li>닉네임 {summary.nicknameCount}개</li><li>알림 신청 {summary.notificationSubscriptionCount}개</li><li>지난 카드 {summary.pastCardCount}개</li><li>사용자 ID</li></ul></section>}
      <section><h2>남는 것</h2><p>확정된 최종 카드 {summary.retainedFinalCardCount}개의 이름 없는 수</p></section>
      {summary.openHostedRoomCount > 0 && <div className="room-notice"><p>내가 만든 열린 방 {summary.openHostedRoomCount}개는 바로 마감돼요</p></div>}
      {deleteError && <div role="alert"><p>지우지 못했어요. 아무것도 지우지 않았어요</p><button className="link-button" disabled={seconds > 0} onClick={() => void erase()}>{seconds ? `다시 시도 (${seconds}초)` : '다시 시도'}</button></div>}
      <div className="create-action"><Button display="block" disabled={deleting || seconds > 0} onClick={() => dialog.current?.showModal()}>지우기</Button></div>
      <dialog ref={dialog} aria-labelledby="delete-confirm-title"><h2 id="delete-confirm-title">내 데이터를 지울까요?</h2><p>지운 것은 되돌릴 수 없어요</p><Button loading={deleting} disabled={deleting} onClick={() => void erase()}>지우기</Button><Button variant="weak" disabled={deleting} onClick={() => dialog.current?.close()}>취소</Button></dialog></>}
  </main>;
}
