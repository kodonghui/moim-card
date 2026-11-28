import React from 'react';
import { Button } from '@toss/tds-mobile';
import { AgreementCard, type CardData, type CardItem } from './AgreementCard';
import { ApiError } from './api';
import { navigate } from './routes';
import { client, sessionState } from './session';

type PastCard = { pastCardId: number; gatheringName: string; themeName: string; basedOnCount: number; nextAction: string | null; finalizedAt: string; items: CardItem[] };
type Page = { pastCards: PastCard[]; nextCursor: string | null };
let selected: PastCard | undefined;
export function clearPastCard() { selected = undefined; }
function day(value: string) { return new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric' }).format(new Date(value)); }

export function PastCards() {
  const [cards, setCards] = React.useState<PastCard[]>(); const [cursor, setCursor] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false); const [moreLoading, setMoreLoading] = React.useState(false);
  const [error, setError] = React.useState<string>(); const [moreError, setMoreError] = React.useState(false); const [permission, setPermission] = React.useState(false);
  const pending = React.useRef(false);
  async function load(next?: string) {
    if (pending.current) return; pending.current = true;
    setError(undefined); setMoreError(false);
    const timer = next ? undefined : setTimeout(() => setLoading(true), 1000);
    if (next) setMoreLoading(true);
    let reset = false;
    try {
      const query = next ? `?cursor=${encodeURIComponent(next)}` : '';
      const page = await client.operation<Page>(`/v1/me/past-cards${query}`)();
      setCards(previous => next ? [...(previous || []), ...page.pastCards] : page.pastCards); setCursor(page.nextCursor);
    } catch (err) {
      if (err instanceof ApiError && err.problem.code === 'origin_not_allowed') setPermission(true);
      else if (err instanceof ApiError && ['unauthenticated', 'reauthentication_failed'].includes(err.problem.code)) { sessionState.reauthenticationFailed = true; navigate('/', true); }
      else if (next && err instanceof ApiError && err.problem.code === 'validation_failed') { console.error('client request error'); reset = true; }
      else if (next) setMoreError(true);
      else setError(err instanceof ApiError ? err.problem.traceId || '' : '');
    } finally {
      if (timer) clearTimeout(timer); setLoading(false); setMoreLoading(false); pending.current = false;
      if (reset) { setCards(undefined); setCursor(null); void load(); }
    }
  }
  React.useEffect(() => { void load(); }, []);
  if (permission) return <main className="entry"><section className="entry-content"><h1>지금은 쓸 수 없어요</h1></section></main>;
  return <main className="create"><h1>지난 카드</h1><p>마감된 방의 카드는 방이 지워져도 남아요</p>
    {loading && !cards && <div className="skeletons" role="status"><span /><span /><span /><span className="sr-only">불러오고 있어요</span></div>}
    {error !== undefined && <div role="alert"><p>잠시 뒤 다시 해 주세요</p>{error && <p>오류 번호 {error}</p>}<button className="link-button" onClick={() => void load()}>다시 시도</button></div>}
    {cards && (cards.length === 0 ? <div className="empty"><p>아직 지난 카드가 없어요</p><p>방이 마감되면 여기에 남아요</p><Button display="block" onClick={() => navigate('/rooms/new')}>방 만들기</Button></div> : <ul className="room-list">{cards.map(card => <li key={card.pastCardId}><button className="room-button" onClick={() => { selected = card; navigate(`/past-cards/${card.pastCardId}`); }}><span className="room-top"><strong>{card.gatheringName}</strong></span><span className="room-detail">{card.themeName} · {day(card.finalizedAt)} · {card.basedOnCount}명 기준</span>{card.nextAction && <span>{card.nextAction}</span>}</button></li>)}</ul>)}
    {moreError && <div role="alert"><p>더 불러오지 못했어요</p><button className="link-button" onClick={() => cursor && void load(cursor)}>다시 시도</button></div>}
    {cursor && !moreError && <Button display="block" loading={moreLoading} disabled={moreLoading} onClick={() => void load(cursor)}>더 보기</Button>}
  </main>;
}

export function PastCardDetail({ id }: { id: string }) {
  if (!selected || String(selected.pastCardId) !== id) return <main className="create"><h1>지난 카드를 다시 불러와 주세요</h1><Button display="block" onClick={() => navigate('/past-cards')}>지난 카드 목록으로</Button></main>;
  const card: CardData = { stage: 'final', basedOnCount: selected.basedOnCount, partySize: selected.basedOnCount, items: selected.items, nextAction: selected.nextAction, asOf: selected.finalizedAt, finalizedAt: selected.finalizedAt };
  return <main className="create"><h1 className="sr-only">지난 카드 자세히</h1><AgreementCard card={card} name={selected.gatheringName} theme={selected.themeName} /></main>;
}
