import { describe, expect, it } from 'vitest';
import { calculateCard, type Answer, type CardQuestion } from './card';

const questions: CardQuestion[] = Array.from({length: 8}, (_, i) => ({ position: i + 1, prompt: `q${i + 1}`, optionA: 'a', optionB: 'b', splitSuggestion: `discuss${i + 1}`, agreedTextA: `a${i + 1}`, agreedTextB: `b${i + 1}` }));
const row = (first: Answer, second: Answer = 'N', third: Answer = 'N'): Answer[] => [first, second, third, 'N', 'N', 'N', 'N', 'N'];

describe('TASK-009 SPEC-013 card', () => {
  it('classifies split, agreed and open and picks the tightest split', () => {
    const result = calculateCard(questions, [row('A', 'B'), row('A', 'N'), row('B', 'N'), row('B', 'N')], 'default');
    expect(result.items.slice(0, 3).map(x => x.category)).toEqual(['split', 'agreed', 'open']);
    expect(result.items[0]).toMatchObject({ countA: 2, countB: 2, countNone: 0, text: 'discuss1' });
    expect(result.items[1].text).toBe('b2');
    expect(result.nextAction).toBe('discuss1');
  });
  it('uses the earliest split when differences tie', () => {
    const result = calculateCard(questions, [row('A', 'A'), row('B', 'B')], 'default');
    expect(result.nextAction).toBe('discuss1');
  });
  it('falls back to the first agreed text and then the theme default', () => {
    expect(calculateCard(questions, [row('N', 'B'), row('N', 'N')], 'default').nextAction).toBe('b2');
    expect(calculateCard(questions, [row('N'), row('N')], 'default').nextAction).toBe('default');
  });
  it('does not change when response order changes 100 times', () => {
    const rows = [row('A', 'B'), row('A', 'N'), row('B', 'A'), row('N', 'N')];
    const expected = calculateCard(questions, rows, 'default');
    for (let i = 0; i < 100; i++) {
      const shuffled = [...rows].sort((a, b) => ((rows.indexOf(a) * 7 + i * 3) % 11) - ((rows.indexOf(b) * 7 + i * 3) % 11));
      expect(calculateCard(questions, shuffled, 'default')).toEqual(expected);
    }
  });
  it('rejects invalid cardinality and answers', () => {
    expect(() => calculateCard(questions, [row('A')], 'default')).toThrow();
    expect(() => calculateCard(questions, [row('A'), ['X'] as Answer[]], 'default')).toThrow();
  });
});
