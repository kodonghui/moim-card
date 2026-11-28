import { test, expect } from '@playwright/test';
const room = { gatheringName: '제주 3박', theme: { name: '여행' }, status: 'open', myRole: 'host', submittedCount: 3, partySize: 4, asOf: '2026-11-28T09:30:00Z' };
const card = { stage: 'interim', basedOnCount: 3, partySize: 4, asOf: room.asOf, nextAction: '함께 정해요', items: Array.from({ length: 8 }, (_, i) => ({ position: i + 1, prompt: `질문 ${i + 1}`, optionA: 'A', optionB: 'B', category: 'open', countA: 0, countB: 0, countNone: 3, text: '누구나 괜찮아요' })) };
test('카드만 1080px PNG로 만들고 저장 실패를 안내한다', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.route('**/v1/rooms/**', route => route.fulfill({ headers: { 'Access-Control-Allow-Origin': '*' }, json: route.request().url().endsWith('/card') ? card : room }));
  await page.goto('/room/card?room=ABCDEFGH23'); const target = page.getByRole('article', { name: '합의 카드' }); await expect(target).toBeVisible();
  const text = await target.innerText(); expect(text).not.toContain('ABCDEFGH23'); expect(text).not.toContain('바다');
  const width = await page.evaluate(async () => {
    const { captureCard } = await import('/src/save-card.ts');
    const data = await captureCard(document.querySelector('article')!);
    const img = new Image(); img.src = `data:image/png;base64,${data}`; await img.decode(); return img.naturalWidth;
  });
  expect(width).toBe(1080);
  await page.getByRole('button', { name: '카드 저장' }).click(); await expect(page.getByText('저장하지 못했어요')).toBeVisible();
  await expect(page.getByRole('button', { name: '다시 시도' })).toBeVisible();
  if (process.env.CAPTURE_SAVE) await page.screenshot({ path: '../../docs/10-wbs/captures/task-045.png' });
});
