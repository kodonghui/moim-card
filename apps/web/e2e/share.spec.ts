import { test, expect } from '@playwright/test';
const room = { gatheringName: '제주 3박', theme: { name: '여행' }, status: 'open', myRole: 'host', submittedCount: 1, partySize: 4, asOf: '2026-11-28T09:30:00Z' };
const card = { stage: 'none', basedOnCount: 1, partySize: 4, asOf: room.asOf, nextAction: null, items: [] };
test('지원 여부를 확인할 수 없으면 업데이트를 안내하고 화면에 남는다', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.route('**/v1/rooms/**', route => route.fulfill({ headers: { 'Access-Control-Allow-Origin': '*' }, json: route.request().url().endsWith('/card') ? card : room }));
  await page.goto('/room/card?room=ABCDEFGH23');
  await page.getByRole('button', { name: '친구 부르기' }).click();
  await expect(page.getByText('토스 앱을 업데이트하면 링크를 보낼 수 있어요')).toBeVisible();
  await expect(page).toHaveURL(/\/room\/card$/);
  if (process.env.CAPTURE_SHARE) await page.screenshot({ path: '../../docs/10-wbs/captures/task-046.png' });
});
