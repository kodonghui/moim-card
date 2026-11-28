import { test, expect } from '@playwright/test';
test.use({ viewport: { width: 360, height: 800 } });
test('약관은 번들 안에서 변경일과 운영자 자리를 보여 준다', async ({ page }) => {
  let requests = 0; await page.route('**/v1/**', route => { requests++; return route.abort(); });
  await page.goto('/legal/terms'); await expect(page.getByRole('heading', { name: '이용약관' })).toBeVisible();
  await expect(page.getByText('변경일 2026년 11월 28일')).toBeVisible(); await expect(page.getByText('운영자 확인 중')).toBeVisible();
  if (process.env.CAPTURE_LEGAL) await page.screenshot({ path: '../../docs/10-wbs/captures/task-049-terms.png', fullPage: true });
  expect(requests).toBe(0);
});
test('개인정보 방침에 보관·삭제와 통계 안내가 있고 지우기 화면으로 간다', async ({ page }) => {
  let requests = 0; await page.route('**/v1/**', route => { requests++; return route.fulfill({ headers: { 'Access-Control-Allow-Origin': '*' }, json: { responseCount: 0, nicknameCount: 0, notificationSubscriptionCount: 0, pastCardCount: 0, openHostedRoomCount: 0, retainedFinalCardCount: 0 } }); });
  await page.goto('/legal/privacy'); await expect(page.getByRole('heading', { name: '개인정보처리방침' })).toBeVisible();
  await expect(page.getByText(/Cloudflare의 해외 리전/)).toBeVisible(); await expect(page.getByText(/30일이 지나면/)).toBeVisible();
  await expect(page.getByText('앱 이용 통계를 토스에 보내며, 토스가 미니앱별 익명 키를 함께 기록해요')).toBeVisible();
  await expect(page.getByText('운영자 확인 중')).toBeVisible(); expect(requests).toBe(0);
  if (process.env.CAPTURE_LEGAL) await page.screenshot({ path: '../../docs/10-wbs/captures/task-049-privacy.png', fullPage: true });
  await page.getByRole('button', { name: '내 데이터 지우기로 가기' }).click(); await expect(page).toHaveURL(/\/me\/delete$/);
  await expect(page.getByRole('heading', { name: '내 데이터 지우기' })).toBeVisible();
});
