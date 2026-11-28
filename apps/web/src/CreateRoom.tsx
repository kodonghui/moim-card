import React from 'react';
import { Button } from '@toss/tds-mobile';
import { ApiError } from './api';
import { entryContext } from './entry-context';
import { roomContext } from './room-context';
import { validateGatheringName, validateNickname } from './names';
import { roomDraft, type Theme } from './room-draft';
import { navigate } from './routes';
import { client, sessionState } from './session';

export function Themes() {
  const [themes, setThemes] = React.useState<Theme[]>();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string>();
  const [permission, setPermission] = React.useState(false);
  const load = React.useCallback(async () => {
    setError(undefined); const timer = setTimeout(() => setLoading(true), 1000);
    try { setThemes((await client.operation<{ themes: Theme[] }>('/v1/themes')()).themes); }
    catch (err) { if (err instanceof ApiError && err.problem.code === 'origin_not_allowed') setPermission(true); else if (err instanceof ApiError && ['unauthenticated', 'reauthentication_failed'].includes(err.problem.code)) { sessionState.reauthenticationFailed = true; navigate('/', true); } else setError(err instanceof ApiError ? err.problem.traceId || '' : ''); }
    finally { clearTimeout(timer); setLoading(false); }
  }, []);
  React.useEffect(() => { void load(); }, [load]);
  if (permission) return <main className="entry"><section className="entry-content"><h1>지금은 쓸 수 없어요</h1></section></main>;
  return <main className="create"><h1>어떤 모임인가요?</h1><p>테마마다 문항 8개가 정해져 있어요</p>
    {error !== undefined && <div role="alert"><p>잠시 뒤 다시 해 주세요</p>{error && <p>오류 번호 {error}</p>}<button className="link-button" onClick={() => void load()}>다시 시도</button></div>}
    {loading && !themes && <div className="skeletons" role="status"><span /><span /><span /><span className="sr-only">불러오고 있어요</span></div>}
    {themes && (themes.length ? <ul className="room-list">{themes.map(theme => <li key={theme.themeId}><button className="menu-button" onClick={() => { roomDraft.theme = theme; navigate('/rooms/new/details', true); }}>{theme.name}<span aria-hidden="true">›</span></button></li>)}</ul> : <div><p>지금은 만들 수 있는 테마가 없어요</p><p>테마가 준비되면 여기에 보여요</p></div>)}
  </main>;
}
type FieldErrors = Partial<Record<'gatheringName' | 'partySize' | 'hostNickname', string>>;
const messages = { gatheringName: '모임 이름은 1~20자로 적어 주세요', partySize: '인원은 2~8명이에요', hostNickname: '닉네임은 1~10자로, 쓸 수 없는 말이 있어요' };
export function RoomDetails() {
  const [name, setName] = React.useState(''); const [nickname, setNickname] = React.useState(''); const [size, setSize] = React.useState(4);
  const [errors, setErrors] = React.useState<FieldErrors>({}); const [error, setError] = React.useState<string>();
  const [permission, setPermission] = React.useState(false); const [unavailable, setUnavailable] = React.useState(false);
  const [loading, setLoading] = React.useState(false); const [seconds, setSeconds] = React.useState(0);
  const operation = React.useRef<(() => Promise<{ roomCode: string }>)>();
  React.useEffect(() => { if (!roomDraft.theme) navigate('/rooms/new', true); }, []);
  React.useEffect(() => { operation.current = undefined; }, [name, nickname, size]);
  React.useEffect(() => { if (!seconds) return; const timer = setTimeout(() => setSeconds(s => Math.max(0, s - 1)), 1000); return () => clearTimeout(timer); }, [seconds]);
  const nameValid = validateGatheringName(name); const nickValid = validateNickname(nickname);
  async function submit() {
    if (!nameValid.valid || !nickValid.valid || !roomDraft.theme || loading || seconds) return;
    setLoading(true); setError(undefined); setErrors({});
    try {
      operation.current ??= client.operation<{ roomCode: string }>('/v1/rooms', { method: 'POST', idempotent: true, body: { themeId: roomDraft.theme.themeId, gatheringName: nameValid.value, partySize: size, hostNickname: nickValid.value } });
      const result = await operation.current(); entryContext.room = result.roomCode; roomContext.nickname = nickValid.value; roomContext.nicknameRoom = result.roomCode; navigate('/room/questions', true);
    } catch (err) {
      if (err instanceof ApiError && err.problem.code === 'origin_not_allowed') setPermission(true);
      else if (err instanceof ApiError && ['unauthenticated', 'reauthentication_failed'].includes(err.problem.code)) { sessionState.reauthenticationFailed = true; navigate('/', true); }
      else if (err instanceof ApiError && err.problem.code === 'theme_unavailable') setUnavailable(true);
      else if (err instanceof ApiError && err.problem.code === 'validation_failed') {
        const fields: FieldErrors = {}; for (const item of err.problem.errors || []) if (item.field in messages) fields[item.field as keyof FieldErrors] = messages[item.field as keyof FieldErrors]; setErrors(fields); if (!Object.keys(fields).length) setError(err.problem.traceId || '');
      } else { setError(err instanceof ApiError ? err.problem.traceId || '' : ''); if (err instanceof ApiError) setSeconds(err.retryAfter); }
    } finally { setLoading(false); }
  }
  if (!roomDraft.theme) return <main />;
  if (permission) return <main className="entry"><section className="entry-content"><h1>지금은 쓸 수 없어요</h1></section></main>;
  return <main className="create"><p><span className="room-tag theme-badge">{roomDraft.theme.name}</span></p><h1>모임 정보를 적어 주세요</h1>
    <fieldset disabled={loading}><label htmlFor="gathering">모임 이름</label><input id="gathering" aria-describedby="gathering-help" value={name} maxLength={40} onChange={e => setName(e.target.value)} onBlur={() => setErrors(e => ({ ...e, gatheringName: nameValid.valid ? undefined : messages.gatheringName }))} aria-invalid={Boolean(errors.gatheringName)} /><p id="gathering-help">예: 제주 3박 · {[...name.trim()].length}/20</p>{errors.gatheringName && <p role="alert">{errors.gatheringName}</p>}
    <span id="party-size-label">인원</span><div className="counter" role="group" aria-labelledby="party-size-label"><button aria-label="인원 줄이기" onClick={() => setSize(s => Math.max(2, s - 1))} disabled={size === 2}>-</button><output aria-live="polite">{size}명</output><button aria-label="인원 늘리기" onClick={() => setSize(s => Math.min(8, s + 1))} disabled={size === 8}>+</button></div><p>나를 포함해 2~8명이에요. 이만큼 답하면 마감돼요</p>{errors.partySize && <p role="alert">{errors.partySize}</p>}
    <label htmlFor="nickname">내 닉네임</label><input id="nickname" aria-describedby="nickname-help" value={nickname} maxLength={30} onChange={e => setNickname(e.target.value)} onBlur={() => setErrors(e => ({ ...e, hostNickname: nickValid.valid ? undefined : messages.hostNickname }))} aria-invalid={Boolean(errors.hostNickname)} /><p id="nickname-help">닉네임은 이 방에서 나만 봐요 · {[...nickname.trim()].length}/10</p>{errors.hostNickname && <p role="alert">{errors.hostNickname}</p>}</fieldset>
    {unavailable && <div role="alert"><p>이 테마는 지금 쓸 수 없어요</p><button className="link-button" onClick={() => navigate('/rooms/new', true)}>테마 다시 고르기</button></div>}
    {error !== undefined && <div role="alert"><p>잠시 뒤 다시 해 주세요</p>{error && <p>오류 번호 {error}</p>}</div>}
    <div className="create-action"><Button display="block" loading={loading} disabled={!nameValid.valid || !nickValid.valid || loading || seconds > 0 || unavailable} onClick={() => void submit()}>{seconds ? `다시 시도 (${seconds}초)` : '방 만들기'}</Button></div>
  </main>;
}
