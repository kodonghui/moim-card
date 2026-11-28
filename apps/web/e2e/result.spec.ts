import { test, expect } from '@playwright/test';
const cors = { 'Access-Control-Allow-Origin': '*' };
test('결과를 표시하고 템플릿 미설정 시 신청하지 않는다', async ({ page }) => {
  let subscriptions = 0;
  await page.setViewportSize({ width: 360, height: 800 });
  await page.route('**/v1/rooms/**', route => {
    const url = route.request().url();
    if (url.endsWith('/notification-subscription')) subscriptions++;
    return route.fulfill({ headers: cors, json: url.endsWith('/my-profile') ? { summary: '차근차근 정해요', axes: [{ axis: 'plan_speed', band: 'balanced' }, { axis: 'schedule_change', band: 'high' }] } : { status: 'open', submittedCount: 2, partySize: 4, asOf: '2026-11-28T09:30:00Z' } });
  });
  await page.goto('/room/result?room=ABCDEFGH23');
  await expect(page.getByText('차근차근 정해요')).toBeVisible();
  await expect(page.getByText('균형 · 선택됨')).toBeVisible();
  if (process.env.CAPTURE_RESULT) await page.screenshot({ path: '../../docs/10-wbs/captures/task-042.png', fullPage: true });
  await page.getByRole('button', { name: '알림 받기' }).click();
  await expect(page.getByText('알림을 신청하지 못했어요')).toBeVisible();
  expect(subscriptions).toBe(0);
});
