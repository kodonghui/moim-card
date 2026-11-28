import type { Answer } from './card';

const AXES = ['plan_speed', 'spending_priority', 'schedule_change'] as const;
export type Axis = typeof AXES[number];
export type ProfileQuestion = { axis: Axis | null; highChoice: 'A' | 'B' | null };
export type ProfilePhrases = Record<`${Axis}_low` | `${Axis}_high` | 'balanced', string>;
type Band = 'low' | 'balanced' | 'high';

/** SPEC-012, DEC-039. Cross multiplication keeps boundary and tie comparisons exact. */
export function calculateProfile(questions: readonly ProfileQuestion[], answers: readonly Answer[], phrases: ProfilePhrases): { summary: string; axes: { axis: Axis; band: Band }[] } {
  if (questions.length !== 8 || answers.length !== 8 || answers.some(a => !['A', 'B', 'N'].includes(a)) ||
    questions.some(q => (q.axis === null) !== (q.highChoice === null) || (q.axis !== null && !AXES.includes(q.axis)) || (q.highChoice !== null && !['A', 'B'].includes(q.highChoice)))) {
    throw new Error('Invalid profile inputs');
  }
  const totals = AXES.flatMap(axis => {
    let sum = 0; let count = 0;
    questions.forEach((q, i) => {
      if (q.axis !== axis) return;
      count++;
      if (answers[i] !== 'N') sum += answers[i] === q.highChoice ? 1 : -1;
    });
    if (!count) return [];
    const band: Band = sum * 3 <= -count ? 'low' : sum * 3 >= count ? 'high' : 'balanced';
    return [{axis, sum, count, band}];
  });
  let strongest = totals.find(row => row.band !== 'balanced');
  for (const row of totals) {
    if (row.band !== 'balanced' && strongest && Math.abs(row.sum) * strongest.count > Math.abs(strongest.sum) * row.count) strongest = row;
  }
  return { summary: strongest ? phrases[`${strongest.axis}_${strongest.band as 'low' | 'high'}`] : phrases.balanced, axes: totals.map(({axis, band}) => ({axis, band})) };
}
