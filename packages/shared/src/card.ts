export type Answer = 'A' | 'B' | 'N';
export type CardQuestion = {
  position: number; prompt: string; optionA: string; optionB: string;
  splitSuggestion: string; agreedTextA: string; agreedTextB: string;
};
export type CardItem = {
  position: number; prompt: string; optionA: string; optionB: string;
  category: 'agreed' | 'split' | 'open'; countA: number; countB: number; countNone: number; text: string;
};

export function cardItemText(question: CardQuestion, category: CardItem['category'], countA: number): string {
  return category === 'split' ? question.splitSuggestion : category === 'open' ? '누구나 괜찮아요' : countA ? question.agreedTextA : question.agreedTextB;
}

/** SPEC-013: responses contain one answer per question in position order. */
export function calculateCard(questions: readonly CardQuestion[], responses: readonly (readonly Answer[])[], defaultNextAction: string): {items: CardItem[]; nextAction: string} {
  if (questions.length !== 8 || responses.length < 2 || responses.length > 8 ||
      questions.some((q, i) => q.position !== i + 1) ||
      responses.some(row => row.length !== 8 || row.some(answer => !['A', 'B', 'N'].includes(answer)))) {
    throw new Error('Invalid card inputs');
  }
  const items: CardItem[] = questions.map((question, index) => {
    const countA = responses.filter(row => row[index] === 'A').length;
    const countB = responses.filter(row => row[index] === 'B').length;
    const countNone = responses.length - countA - countB;
    const category = countA && countB ? 'split' : countA || countB ? 'agreed' : 'open';
    const text = cardItemText(question, category, countA);
    return { position: question.position, prompt: question.prompt, optionA: question.optionA, optionB: question.optionB, category, countA, countB, countNone, text };
  });
  const split = items.filter(item => item.category === 'split').sort((a, b) => Math.abs(a.countA - a.countB) - Math.abs(b.countA - b.countB) || a.position - b.position)[0];
  const agreed = items.find(item => item.category === 'agreed');
  return { items, nextAction: split?.text ?? agreed?.text ?? defaultNextAction };
}
