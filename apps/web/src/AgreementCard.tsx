import React from 'react';
import tokens from '../../../design/base.tokens.json';
export type CardItem = { position: number; prompt: string; optionA: string; optionB: string; category: 'split' | 'agreed' | 'open'; countA: number; countB: number; countNone: number; text: string };
export type CardData = { stage: 'none' | 'interim' | 'final'; basedOnCount: number; partySize: number; items: CardItem[]; nextAction: string | null; asOf: string; finalizedAt?: string | null };
const colors = tokens.color.card;
const groups = [ ['split', '조율해요'], ['agreed', '모두 좋아요'], ['open', '누구나 괜찮아요'] ] as const;
export const AgreementCard = React.forwardRef<HTMLElement, { card: CardData; name: string; theme: string }>(function AgreementCard({ card, name, theme }, ref) {
  return <article ref={ref} aria-label="합의 카드" style={{ background: colors.surface.$value.hex, border: `1px solid ${colors.border.$value.hex}`, borderRadius: 'var(--radius-card)', overflow: 'hidden' }}>
    <header style={{ background: colors.header.$value.hex, padding: 'var(--space-5)' }}><h2>{name}</h2><p>{theme} · {card.stage === 'final' ? '마감됐어요 · ' : ''}{card.basedOnCount}명 기준 {card.stage === 'final' ? '최종' : '중간'} 카드{card.stage === 'final' && card.finalizedAt ? ` · ${new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric' }).format(new Date(card.finalizedAt))} 확정` : ''}</p></header>
    <div style={{ padding: 'var(--space-5)' }}>
      {card.nextAction && <section style={{ background: colors['next-bg'].$value.hex, padding: 'var(--space-4)', borderRadius: 'var(--radius-box)' }}><strong style={{ color: colors['next-label'].$value.hex }}>다음 행동</strong><p>{card.nextAction}</p></section>}
      {groups.map(([category, label]) => { const items = card.items.filter(item => item.category === category); return <section key={category} style={{ marginTop: 'var(--space-6)' }}><h3 style={{ color: colors.category[category].$value.hex }}>{label} {items.length}</h3>{items.map(item => <div key={item.position} style={{ marginTop: 'var(--space-4)' }}><strong>{item.prompt}</strong><p>{item.optionA} {item.countA} · {item.optionB} {item.countB} · 상관없어요 {item.countNone}</p><p>{item.text}</p></div>)}</section>; })}
    </div>
  </article>;
});
