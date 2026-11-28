import { describe, expect, it } from 'vitest';
import { calculateProfile, type Axis, type ProfileQuestion, type ProfilePhrases } from './profile';
import type { Answer } from './card';

const phrases: ProfilePhrases = {plan_speed_low: 'plan low', plan_speed_high: 'plan high', spending_priority_low: 'spend low', spending_priority_high: 'spend high', schedule_change_low: 'schedule low', schedule_change_high: 'schedule high', balanced: 'balanced'};
const empty: ProfileQuestion = {axis: null, highChoice: null};
const q = (axis: Axis, highChoice: 'A' | 'B' = 'A'): ProfileQuestion => ({axis, highChoice});
const fill = (items: ProfileQuestion[]) => [...items, ...Array.from({length: 8 - items.length}, () => empty)];
const answers = (...items: Answer[]): Answer[] => [...items, ...Array<Answer>(8 - items.length).fill('N')];

describe('TASK-009 SPEC-012 personal profile', () => {
  it('includes the -1/3 and +1/3 boundaries in low and high', () => {
    const qs = fill([q('plan_speed'), q('plan_speed'), q('plan_speed')]);
    expect(calculateProfile(qs, answers('B', 'N', 'N'), phrases)).toEqual({summary: 'plan low', axes: [{axis: 'plan_speed', band: 'low'}]});
    expect(calculateProfile(qs, answers('A', 'N', 'N'), phrases)).toEqual({summary: 'plan high', axes: [{axis: 'plan_speed', band: 'high'}]});
  });
  it('breaks equal absolute averages by axis order', () => {
    const qs = fill([q('plan_speed'), q('plan_speed'), q('spending_priority'), q('spending_priority'), q('schedule_change')]);
    expect(calculateProfile(qs, answers('A', 'N', 'B', 'N', 'N'), phrases)).toEqual({summary: 'plan high', axes: [{axis: 'plan_speed', band: 'high'}, {axis: 'spending_priority', band: 'low'}, {axis: 'schedule_change', band: 'balanced'}]});
  });
  it('selects the strongest absolute average and accounts for high choice B', () => {
    const qs = fill([q('plan_speed'), q('plan_speed'), q('spending_priority', 'B')]);
    const result = calculateProfile(qs, answers('A', 'N', 'A'), phrases);
    expect(result.summary).toBe('spend low');
  });
  it('uses balanced phrase when all visible axes are balanced or absent', () => {
    expect(calculateProfile(fill([q('plan_speed')]), answers('N'), phrases)).toEqual({summary: 'balanced', axes: [{axis: 'plan_speed', band: 'balanced'}]});
    expect(calculateProfile(fill([]), answers(), phrases)).toEqual({summary: 'balanced', axes: []});
  });
  it('is deterministic and exposes no numeric score or type name', () => {
    const qs = fill([q('plan_speed')]);
    const first = calculateProfile(qs, answers('A'), phrases);
    expect(calculateProfile(qs, answers('A'), phrases)).toEqual(first);
    expect(JSON.stringify(first)).not.toMatch(/\d|score|type/i);
  });
  it('rejects mismatched axis metadata and invalid answers', () => {
    expect(() => calculateProfile(fill([{axis: 'plan_speed', highChoice: null}]), answers(), phrases)).toThrow();
    expect(() => calculateProfile(fill([]), ['X'] as Answer[], phrases)).toThrow();
  });
});
