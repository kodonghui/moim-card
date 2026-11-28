import { test, expect, type Page } from '@playwright/test';

test.use({ viewport: { width: 360, height: 800 } });
type Selection = { code: number; example?: string; delay?: number; submitted?: boolean };
const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,POST,OPTIONS' };
async function prism(page: Page, endpoint: string, choices: Selection[]) {
  let count = 0;
  await page.route(new RegExp(`/v1/rooms/[^/]+${endpoint}$`), async route => {
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    const choice = choices[Math.min(count++, choices.length - 1)]; const original = route.request().headers();
    if (choice.delay) await new Promise(resolve => setTimeout(resolve, choice.delay));
    try {
      const response = await route.fetch({ headers: { ...original, authorization: 'Bearer test-token', prefer: `code=${choice.code}${choice.example ? `, example=${choice.example}` : ''}` } });
      if (choice.submitted) return route.fulfill({ response, headers: { ...response.headers(), ...cors }, json: { ...await response.json(), myRole: 'member', mySubmitted: true } });
      await route.fulfill({ response, headers: { ...response.headers(), ...cors } });
    } catch { /* Browser may abort a timed-out request. */ }
  });
}
async function enter(page: Page) { await page.goto('/room/final?room=ABCDEFGH23'); }
test('초대받은 사람에게 최종 카드와 우리도 해 보기만 보여준다', async ({ page }) => {
  await page.route('**/v1/themes', route => route.fulfill({ headers: cors, json: { themes: [] } }));
  await prism(page, '', [{ code: 200, example: 'closed' }]); await prism(page, '/card', [{ code: 200, example: 'final' }]); await enter(page);
  await expect(page.getByRole('article', { name: '합의 카드' })).toBeVisible(); await expect(page.getByRole('button', { name: '우리도 해 보기' })).toBeVisible();
  for (const name of ['참여하기', '제출하기', '카드 저장', '단톡방에 보내기']) await expect(page.getByRole('button', { name })).toHaveCount(0);
  await page.getByRole('button', { name: '우리도 해 보기' }).click(); await expect(page).toHaveURL(/\/rooms\/new$/);
});
test('답한 사람에게 카드 저장과 공유 버튼을 보여준다', async ({ page }) => {
  await prism(page, '', [{ code: 200, example: 'closed', submitted: true }]); await prism(page, '/card', [{ code: 200, example: 'final' }]); await enter(page);
  await expect(page.getByRole('button', { name: '카드 저장' })).toBeVisible(); await expect(page.getByRole('button', { name: '단톡방에 보내기' })).toBeVisible();
  await expect(page.getByRole('button', { name: '참여하기' })).toHaveCount(0);
});
test('카드 없이 마감된 방은 안내를 표시한다', async ({ page }) => {
  await prism(page, '', [{ code: 200, example: 'closed' }]); await prism(page, '/card', [{ code: 200, example: 'closed-without-card' }]); await enter(page);
  await expect(page.getByRole('heading', { name: '답한 사람이 적어 카드 없이 마감됐어요' })).toBeVisible(); await expect(page.getByRole('button', { name: '우리도 해 보기' })).toBeVisible();
});
test('느린 최종 카드는 자리 표시 후 오류를 재시도한다', async ({ page }) => {
  await prism(page, '', [{ code: 200, example: 'closed' }]); await prism(page, '/card', [{ code: 500, delay: 4000 }, { code: 200, example: 'final' }]); await enter(page);
  await expect(page.getByRole('status')).toBeVisible(); await expect(page.getByText('잠시 뒤 다시 해 주세요')).toBeVisible();
  await page.getByRole('button', { name: '다시 시도' }).click(); await expect(page.getByRole('article', { name: '합의 카드' })).toBeVisible();
});
for (const [code, example, heading] of [[403, 'origin-not-allowed', '지금은 쓸 수 없어요'], [404, 'room-not-found', '이 방은 없거나 보관 기간이 지났어요']] as const) test(`최종 카드 ${code} 안내`, async ({ page }) => {
  await prism(page, '', [{ code: 200, example: 'closed' }]); await prism(page, '/card', [{ code, example }]); await enter(page); await expect(page.getByRole('heading', { name: heading })).toBeVisible();
});
test('재인증 실패는 확인 오류 화면으로 돌아간다', async ({ page }) => {
  await prism(page, '', [{ code: 200, example: 'closed' }]); await prism(page, '/card', [{ code: 401 }]); await enter(page);
  await expect(page).toHaveURL(/\/$/); await expect(page.getByRole('heading', { name: '확인하지 못했어요' })).toBeVisible();
});
