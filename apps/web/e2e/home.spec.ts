import { test, expect, type Page } from '@playwright/test';
const rooms = { rooms: [{ roomCode: 'ABCDEFGH23', gatheringName: '제주 3박', theme: { name: '여행' }, partySize: 4, submittedCount: 3, myRole: 'host', mySubmitted: true }], asOf: '2026-11-28T09:30:00Z' };
async function mock(page: Page, status: number, body: unknown) {
  await page.route('**/v1/me/rooms', route => route.fulfill({ status, json: body, headers: { 'Access-Control-Allow-Origin': '*' } }));
}
test('참여 방과 메뉴를 보여 주고 방 코드를 노출하지 않는다', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await mock(page, 200, rooms);
  await page.goto('/home');
  await expect(page.getByText('제주 3박')).toBeVisible();
  await expect(page.getByText('4명 중 3명 답했어요')).toBeVisible();
  await expect(page.getByText('ABCDEFGH23')).toHaveCount(0);
  for (const label of ['방 만들기', '지난 카드', '내 데이터 지우기', '이용약관', '개인정보처리방침']) await expect(page.getByRole('button', { name: label })).toBeVisible();
  if (process.env.CAPTURE_HOME) await page.screenshot({ path: '../../docs/10-wbs/captures/task-038.png' });
  await page.getByRole('button', { name: /제주 3박/ }).click();
  await expect(page).toHaveURL(/\/room$/);
});
test('빈 목록과 오류 및 Origin 거부를 구분한다', async ({ page }) => {
  await mock(page, 200, { rooms: [], asOf: rooms.asOf });
  await page.goto('/home'); await expect(page.getByText('참여 중인 방이 없어요')).toBeVisible();
  await page.unroute('**/v1/me/rooms'); await mock(page, 500, { status: 500, code: 'internal' });
  await page.reload(); await expect(page.getByText('잠시 뒤 다시 해 주세요')).toBeVisible();
  await expect(page.getByRole('button', { name: '방 만들기' })).toBeVisible();
  await page.unroute('**/v1/me/rooms'); await mock(page, 403, { status: 403, code: 'origin_not_allowed' });
  await page.reload(); await expect(page.getByText('지금은 쓸 수 없어요')).toBeVisible();
  await expect(page.getByRole('button')).toHaveCount(0);
});
