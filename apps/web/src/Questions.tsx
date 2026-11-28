import React from 'react';
import { Button } from '@toss/tds-mobile';
import { ShareButton } from './ShareButton';
import { logInterimCard } from './analytics';
import { ApiError } from './api';
import { ANSWER_KEY_PREFIX, readAnswers, writeAnswers, removeAnswers } from './answer-storage';
import { entryContext } from './entry-context';
import { navigate } from './routes';
import { roomContext, type Profile } from './room-context';
import { client, sessionState } from './session';

type Choice = 'A' | 'B' | 'none';
type Question = { position: number; prompt: string; optionA: string; optionB: string };
type Answers = Record<number, Choice>;
async function storageKey(code: string): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(code));
  return ANSWER_KEY_PREFIX + Array.from(new Uint8Array(hash), x => x.toString(16).padStart(2, '0')).join('');
}
export function Questions() {
  const [questions, setQuestions] = React.useState<Question[]>(); const [answers, setAnswers] = React.useState<Answers>({});
  const [key, setKey] = React.useState(''); const [loading, setLoading] = React.useState(false); const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string>(); const [missing, setMissing] = React.useState(false); const [permission, setPermission] = React.useState(false); const [seconds, setSeconds] = React.useState(0);
  const operation = React.useRef<(() => Promise<{ logConversion: boolean; roomStatus: string; profile: Profile }>)>();
  const [invalidPosition, setInvalidPosition] = React.useState<number>();
  const storageRef = React.useRef('');
  const path = `/v1/rooms/${encodeURIComponent(entryContext.room || '')}`;
  const handle = React.useCallback((err: unknown) => {
    if (err instanceof ApiError && err.problem.code === 'origin_not_allowed') setPermission(true);
    else if (err instanceof ApiError && err.problem.code === 'not_participant') navigate('/room', true);
    else if (err instanceof ApiError && err.problem.code === 'room_not_found') setMissing(true);
    else if (err instanceof ApiError && err.problem.code === 'room_closed') { if (storageRef.current) removeAnswers(storageRef.current); roomContext.closedNotice = true; navigate('/room/final', true); }
    else if (err instanceof ApiError && err.problem.code === 'already_submitted') { if (storageRef.current) removeAnswers(storageRef.current); roomContext.alreadySubmitted = true; navigate('/room/result', true); }
    else if (err instanceof ApiError && ['unauthenticated', 'reauthentication_failed'].includes(err.problem.code)) { sessionState.reauthenticationFailed = true; navigate('/', true); }
    else if (err instanceof ApiError && err.problem.code === 'validation_failed') {
      const position = err.problem.errors?.flatMap(item => item.positions || []).find(value => Number.isInteger(value) && value >= 1 && value <= 8);
      if (position) { setInvalidPosition(position); document.getElementById(`question-${position}`)?.scrollIntoView(); }
      else setError(err.problem.traceId || '');
    }
    else { setError(err instanceof ApiError ? err.problem.traceId || '' : ''); if (err instanceof ApiError) setSeconds(err.retryAfter); }
  }, [key]);
  const load = React.useCallback(async () => {
    if (!entryContext.room) { navigate('/home', true); return; }
    const timer = setTimeout(() => setLoading(true), 1000); setError(undefined);
    try {
      const storage = await storageKey(entryContext.room); storageRef.current = storage; setKey(storage);
      setAnswers(readAnswers<Answers>(storage, {}));
      const data = await client.operation<{ questions: Question[] }>(`${path}/questions`)();
      if (data.questions.length !== 8) { console.error('client request error'); throw new Error('invalid question count'); }
      setQuestions(data.questions);
    } catch (err) { handle(err); } finally { clearTimeout(timer); setLoading(false); }
  }, [handle, path]);
  // Load once per mounted screen. The storage key is filled asynchronously.
  React.useEffect(() => { void load(); }, []);
  React.useEffect(() => { if (!seconds) return; const timer = setTimeout(() => setSeconds(s => Math.max(0, s - 1)), 1000); return () => clearTimeout(timer); }, [seconds]);
  const count = questions?.filter(q => answers[q.position]).length || 0;
  function choose(position: number, choice: Choice) {
    if (invalidPosition === position) setInvalidPosition(undefined);
    const next = { ...answers, [position]: choice }; setAnswers(next); operation.current = undefined;
    if (key) writeAnswers(key, next);
  }
  async function submit() {
    if (!questions || count !== 8 || saving || seconds) return;
    setSaving(true); setError(undefined);
    try {
      operation.current ??= client.operation(`${path}/responses`, { method: 'POST', idempotent: true, body: { answers: questions.map(q => ({ position: q.position, choice: answers[q.position] })) } });
      const result = await operation.current();
      if (key) removeAnswers(key);
      roomContext.profile = result.profile; roomContext.profileRoom = entryContext.room || undefined;
      if (result.logConversion) logInterimCard();
      if (result.roomStatus === 'closed') roomContext.closedNotice = true;
      navigate('/room/result', true);
    } catch (err) { handle(err); } finally { setSaving(false); }
  }
  if (permission) return <main className="entry"><section className="entry-content"><h1>지금은 쓸 수 없어요</h1></section></main>;
  if (missing) return <main className="create"><h1>이 방은 없거나 보관 기간이 지났어요</h1><Button display="block" onClick={() => navigate('/rooms/new')}>방 만들기</Button></main>;
  return <main className="questions"><header>{roomContext.name && <p>{roomContext.name}</p>}<h1>8개 중 {count}개 골랐어요</h1><progress role="progressbar" aria-label="문항 선택 진행" aria-valuemin={0} aria-valuemax={8} aria-valuenow={count} value={count} max={8} />{roomContext.nicknameRoom === entryContext.room && roomContext.nickname && <p>{roomContext.nickname} 님으로 참여 중</p>}</header>
    {error !== undefined && <div role="alert"><p>{questions ? '제출하지 못했어요. 고른 답은 그대로예요' : '잠시 뒤 다시 해 주세요'}</p>{error && <p>오류 번호 {error}</p>}{!questions && <button className="link-button" onClick={() => void load()}>다시 시도</button>}</div>}
    {!questions && loading && <div className="skeletons" role="status"><span /><span /><span /><span className="sr-only">불러오고 있어요</span></div>}
    {questions?.map(q => <fieldset disabled={saving} key={q.position} id={`question-${q.position}`}><legend>{q.position} / 8 · {q.prompt}</legend>{invalidPosition === q.position && <p role="alert">아직 고르지 않았어요</p>}{([['A', q.optionA], ['B', q.optionB], ['none', '상관없어요']] as const).map(([choice, label]) => <button type="button" className="choice" aria-pressed={answers[q.position] === choice} key={choice} onClick={() => choose(q.position, choice)}><span className="choice-dot" aria-hidden="true" /><span>{label}</span></button>)}</fieldset>)}
    {questions && <div className="create-action">{roomContext.role === 'host' && <ShareButton label="친구 부르기" />}<p>{8 - count}개 남았어요</p>{count < 8 && <button className="link-button" onClick={() => { const position = questions.find(q => !answers[q.position])?.position; setInvalidPosition(position); document.getElementById(`question-${position}`)?.scrollIntoView(); }}>남은 문항으로 가기</button>}<Button display="block" loading={saving} disabled={count !== 8 || saving || seconds > 0} onClick={() => void submit()}>{seconds ? `다시 시도 (${seconds}초)` : error !== undefined ? '다시 시도' : '제출하기'}</Button></div>}
  </main>;
}
