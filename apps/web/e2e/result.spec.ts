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
  await expect(page.getByRole('group', { name: '계획 속도: 균형' })).toBeVisible();
  const sizes = await page.evaluate(() => ({ title: parseFloat(getComputedStyle(document.querySelector('h1')!).fontSize), axis: parseFloat(getComputedStyle(document.querySelector('.profile-axis h2')!).fontSize) }));
  expect(sizes.axis).toBeLessThan(sizes.title);
  if (process.env.CAPTURE_RESULT) await page.screenshot({ path: '../../docs/10-wbs/captures/task-042.png', fullPage: true });
  await expect(page.getByRole('button', { name: '알림 받기' })).toHaveCount(0);
  expect(subscriptions).toBe(0);
});
