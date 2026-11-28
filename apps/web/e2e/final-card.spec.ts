import { test, expect } from '@playwright/test';
const cors = { 'Access-Control-Allow-Origin': '*' };
const room = { gatheringName: '제주 3박', theme: { name: '여행' }, status: 'closed', mySubmitted: false };
const card = { stage: 'final', basedOnCount: 2, partySize: 4, asOf: '2026-11-28T09:30:00Z', finalizedAt: '2026-11-28T09:30:00Z', nextAction: '함께 정해요', items: Array.from({ length: 8 }, (_, i) => ({ position: i + 1, prompt: `질문 ${i + 1}`, optionA: 'A', optionB: 'B', category: 'open', countA: 0, countB: 0, countNone: 2, text: '누구나 괜찮아요' })) };
test('비참여자는 최종 카드를 읽고 우리도 해 보기로 이동한다', async ({ page }) => {
  await page.route('**/v1/themes', route => route.fulfill({ headers: cors, json: { themes: [] } }));
  await page.setViewportSize({ width: 360, height: 800 });
  await page.route('**/v1/rooms/**', route => route.fulfill({ headers: cors, json: route.request().url().endsWith('/card') ? card : room }));
  await page.goto('/room/final?room=ABCDEFGH23');
  await expect(page.getByRole('article', { name: '합의 카드' })).toBeVisible();
  await expect(page.getByText(/마감됐어요 · 2명 기준/)).toBeVisible();
  for (const label of ['참여하기', '들어가기', '제출하기', '카드 저장', '단톡방에 보내기']) await expect(page.getByRole('button', { name: label })).toHaveCount(0);
  if (process.env.CAPTURE_FINAL) await page.screenshot({ path: '../../docs/10-wbs/captures/task-044.png', fullPage: true });
  await page.getByRole('button', { name: '우리도 해 보기' }).click(); await expect(page).toHaveURL(/\/rooms\/new$/);
});
test('카드 없이 마감한 방은 빈 상태를 보여 준다', async ({ page }) => {
  await page.route('**/v1/rooms/**', route => route.fulfill({ headers: cors, json: route.request().url().endsWith('/card') ? { ...card, stage: 'none', items: [], nextAction: null } : room }));
  await page.goto('/room/final?room=ABCDEFGH23');
  await expect(page.getByRole('heading', { name: '답한 사람이 적어 카드 없이 마감됐어요' })).toBeVisible();
});
