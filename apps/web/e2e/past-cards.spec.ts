import { test, expect, type Page } from '@playwright/test';
test.use({ viewport: { width: 360, height: 800 } });
type Choice = { code: number; example?: string; delay?: number; cursor?: string | null; id?: number; twenty?: boolean };
const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,POST,OPTIONS' };
async function prism(page: Page, choices: Choice[]) {
  let calls = 0; const urls: string[] = [];
  await page.route('**/v1/me/past-cards*', async route => {
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    const choice = choices[Math.min(calls++, choices.length - 1)]; urls.push(route.request().url());
    if (choice.delay) await new Promise(resolve => setTimeout(resolve, choice.delay));
    try {
      const response = await route.fetch({ headers: { ...route.request().headers(), authorization: 'Bearer test-token', prefer: `code=${choice.code}${choice.example ? `, example=${choice.example}` : ''}` } });
      if (choice.code === 200 && (choice.cursor !== undefined || choice.id !== undefined || choice.twenty)) {
        const body = await response.json(); if (choice.cursor !== undefined) body.nextCursor = choice.cursor;
        if (choice.id !== undefined && body.pastCards[0]) { body.pastCards[0].pastCardId = choice.id; body.pastCards[0].gatheringName = `모임 ${choice.id}`; }
        if (choice.twenty && body.pastCards[0]) body.pastCards = Array.from({ length: 20 }, (_, i) => ({ ...body.pastCards[0], pastCardId: i + 1, gatheringName: `모임 ${i + 1}` }));
        return route.fulfill({ response, headers: { ...response.headers(), ...cors }, json: body });
      }
      await route.fulfill({ response, headers: { ...response.headers(), ...cors } });
    } catch { /* Browser may abort a timed-out request. */ }
  });
  return () => urls;
}
test('목록에서 요약을 고르면 요청 없이 자세히 보고 새로 열면 다시 불러오게 한다', async ({ page }) => {
  const calls = await prism(page, [{ code: 200, example: 'one-page' }]); await page.goto('/past-cards');
  await expect(page.getByRole('button', { name: /제주 3박/ })).toBeVisible(); await expect(page.getByText(/11월 28일 · 4명 기준/)).toBeVisible();
  if (process.env.CAPTURE_PAST) await page.screenshot({ path: '../../docs/10-wbs/captures/task-047.png', fullPage: true });
  await page.getByRole('button', { name: /제주 3박/ }).click(); await expect(page).toHaveURL(/\/past-cards\/41$/);
  await expect(page.getByRole('article', { name: '합의 카드' })).toBeVisible(); expect(calls()).toHaveLength(1);
  await page.reload(); await expect(page.getByRole('heading', { name: '지난 카드를 다시 불러와 주세요' })).toBeVisible();
  await page.getByRole('button', { name: '지난 카드 목록으로' }).click(); await expect(page).toHaveURL(/\/past-cards$/);
});
test('빈 목록은 방 만들기를 안내한다', async ({ page }) => {
  await prism(page, [{ code: 200, example: 'empty' }]); await page.goto('/past-cards');
  await expect(page.getByText('아직 지난 카드가 없어요')).toBeVisible(); await expect(page.getByRole('button', { name: '방 만들기' })).toBeVisible();
});
test('느린 요청은 자리 표시 후 오류를 재시도한다', async ({ page }) => {
  await prism(page, [{ code: 500, delay: 4000 }, { code: 200, example: 'one-page' }]); await page.goto('/past-cards');
  await expect(page.getByRole('status')).toBeVisible(); await expect(page.getByText('잠시 뒤 다시 해 주세요')).toBeVisible();
  await page.getByRole('button', { name: '다시 시도' }).click(); await expect(page.getByRole('button', { name: /제주 3박/ })).toBeVisible();
});
test('다음 쪽 오류 뒤 기존 목록과 cursor를 유지해 재시도한다', async ({ page }) => {
  const calls = await prism(page, [{ code: 200, example: 'one-page', cursor: 'next_1', id: 41 }, { code: 500 }, { code: 200, example: 'one-page', cursor: null, id: 42 }]);
  await page.goto('/past-cards'); await page.getByRole('button', { name: '더 보기' }).click();
  await expect(page.getByText('더 불러오지 못했어요')).toBeVisible(); await expect(page.getByRole('button', { name: /모임 41/ })).toBeVisible();
  await page.getByRole('button', { name: '다시 시도' }).click(); await expect(page.getByRole('button', { name: /모임 42/ })).toBeVisible();
  expect(new URL(calls()[1]).searchParams.get('cursor')).toBe('next_1'); expect(new URL(calls()[2]).searchParams.get('cursor')).toBe('next_1');
});
test('한 쪽의 20개를 표시하고 다음 쪽을 이어 붙인다', async ({ page }) => {
  await prism(page, [{ code: 200, example: 'one-page', cursor: 'next_1', twenty: true }, { code: 200, example: 'one-page', cursor: null, id: 41 }]);
  await page.goto('/past-cards'); await expect(page.locator('.room-list li')).toHaveCount(20);
  await page.getByRole('button', { name: '더 보기' }).click(); await expect(page.locator('.room-list li')).toHaveCount(21);
});
test('잘못된 cursor는 첫 쪽부터 다시 불러온다', async ({ page }) => {
  const calls = await prism(page, [{ code: 200, example: 'one-page', cursor: 'bad', id: 41 }, { code: 400, example: 'bad-cursor' }, { code: 200, example: 'one-page', cursor: null, id: 42 }]);
  await page.goto('/past-cards'); await page.getByRole('button', { name: '더 보기' }).click();
  await expect(page.getByRole('button', { name: /모임 42/ })).toBeVisible(); await expect(page.getByRole('button', { name: /모임 41/ })).toHaveCount(0);
  expect(new URL(calls()[2]).searchParams.has('cursor')).toBe(false);
});
test('Origin 거부는 권한 안내를 표시한다', async ({ page }) => {
  await prism(page, [{ code: 403, example: 'origin-not-allowed' }]); await page.goto('/past-cards'); await expect(page.getByRole('heading', { name: '지금은 쓸 수 없어요' })).toBeVisible();
});
test('재인증 실패는 확인 오류 화면으로 돌아간다', async ({ page }) => {
  await prism(page, [{ code: 401 }]); await page.goto('/past-cards'); await expect(page).toHaveURL(/\/$/); await expect(page.getByRole('heading', { name: '확인하지 못했어요' })).toBeVisible();
});
