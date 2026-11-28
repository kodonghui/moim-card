import { test, expect } from '@playwright/test';
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization,content-type,idempotency-key', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS' };
const room = { gatheringName: '제주 3박', theme: { name: '여행' }, status: 'open', myRole: 'host', submittedCount: 3, partySize: 4, asOf: '2026-11-28T09:30:00Z' };
const card = { stage: 'interim', basedOnCount: 3, partySize: 4, asOf: room.asOf, nextAction: '서로 이야기해요', items: Array.from({ length: 8 }, (_, i) => ({ position: i + 1, prompt: `질문 ${i + 1}`, optionA: 'A', optionB: 'B', category: i < 2 ? 'split' : i < 5 ? 'agreed' : 'open', countA: 2, countB: 1, countNone: 0, text: '함께 정해요' })) };
test('합의 카드와 방장 마감 확인을 보여 준다', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.route('**/v1/rooms/**', route => {
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    if (route.request().method() === 'POST') return route.fulfill({ headers: cors, json: { roomStatus: 'closed', closeReason: 'host_closed', card: { ...card, stage: 'final' } } });
    return route.fulfill({ headers: cors, json: route.request().url().endsWith('/card') ? card : page.url().endsWith('/room/final') ? { ...room, status: 'closed', mySubmitted: true } : room });
  });
  await page.goto('/room/card?room=ABCDEFGH23');
  await expect(page.getByRole('article', { name: '합의 카드' })).toBeVisible();
  await expect(page.getByText('조율해요 2')).toBeVisible();
  await expect(page.getByText('모두 좋아요 3')).toBeVisible();
  await expect(page.getByText('누구나 괜찮아요 3')).toBeVisible();
  if (process.env.CAPTURE_CARD) await page.screenshot({ path: '../../docs/10-wbs/captures/task-043.png', fullPage: true });
  await page.getByRole('button', { name: '지금 마감하기' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: '마감하기', exact: true }).click();
  await expect(page).toHaveURL(/\/room\/final$/);
});
