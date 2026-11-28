import { test, expect, type Page } from '@playwright/test';
test.use({ viewport: { width: 360, height: 800 } });
type Selection = { code: number; example?: string; delay?: number };
async function mockPrism(page: Page, path: string, selections: Selection[]) {
  let calls = 0;
  const keys: string[] = [];
  await page.route(`**/v1/${path}`, async route => {
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,POST,OPTIONS' } });
    const selection = selections[Math.min(calls++, selections.length - 1)];
    const requestHeaders = route.request().headers();
    if (requestHeaders['idempotency-key']) keys.push(requestHeaders['idempotency-key']);
    if (selection.delay) await new Promise(resolve => setTimeout(resolve, selection.delay));
    try {
      const headers = { ...requestHeaders, authorization: 'Bearer test-token', prefer: `code=${selection.code}${selection.example ? `, example=${selection.example}` : ''}` };
      const response = await route.fetch({ headers });
      await route.fulfill({ response, headers: { ...response.headers(), 'access-control-allow-origin': '*' } });
    } catch { /* A timed-out browser request has already been aborted. */ }
  });
  return () => keys;
}
async function fillDetails(page: Page) {
  await page.goto('/rooms/new'); await page.getByRole('button', { name: '여행', exact: true }).click();
  await page.getByLabel('모임 이름').fill('제주 3박'); await page.getByLabel('내 닉네임').fill('바다');
}
test('Prism 테마 목록과 빈 목록을 표시한다', async ({ page }) => {
  await mockPrism(page, 'themes', [{ code: 200, example: 'three-themes' }, { code: 200, example: 'empty' }]);
  await page.goto('/rooms/new'); await expect(page.getByRole('button', { name: '여행', exact: true })).toBeVisible();
  await page.reload(); await expect(page.getByText('지금은 만들 수 있는 테마가 없어요')).toBeVisible();
});
test('느린 테마 요청의 자리 표시와 오류·재시도를 확인한다', async ({ page }) => {
  await mockPrism(page, 'themes', [{ code: 500, delay: 4000 }, { code: 200, example: 'three-themes' }]);
  await page.goto('/rooms/new', { waitUntil: 'domcontentloaded' }); await expect(page.getByRole('status')).toBeVisible();
  await expect(page.getByText('잠시 뒤 다시 해 주세요')).toBeVisible(); await page.getByRole('button', { name: '다시 시도' }).click();
  await expect(page.getByRole('button', { name: '여행', exact: true })).toBeVisible();
});
test('테마 Origin 거부는 권한 안내만 표시한다', async ({ page }) => {
  await mockPrism(page, 'themes', [{ code: 403 }]); await page.goto('/rooms/new');
  await expect(page.getByRole('heading', { name: '지금은 쓸 수 없어요' })).toBeVisible(); await expect(page.getByRole('button')).toHaveCount(0);
});
test('Prism 생성 성공은 문항으로 이동하고 코드를 노출하지 않는다', async ({ page }) => {
  await mockPrism(page, 'themes', [{ code: 200, example: 'three-themes' }]); await mockPrism(page, 'rooms', [{ code: 201, example: 'created' }]);
  await fillDetails(page); await page.getByRole('button', { name: '방 만들기' }).click();
  await expect(page).toHaveURL(/\/room\/questions$/); expect(page.url()).not.toContain('ABCDEFGH23');
});
test('Prism 400은 필드별 오류와 입력값을 유지한다', async ({ page }) => {
  await mockPrism(page, 'themes', [{ code: 200, example: 'three-themes' }]); await mockPrism(page, 'rooms', [{ code: 400, example: 'name-blank-and-nickname-banned' }]);
  await fillDetails(page); await page.getByRole('button', { name: '방 만들기' }).click();
  await expect(page.getByText('모임 이름은 1~20자로 적어 주세요')).toBeVisible(); await expect(page.getByText('닉네임은 1~10자로, 쓸 수 없는 말이 있어요')).toBeVisible();
  await expect(page.getByLabel('모임 이름')).toHaveValue('제주 3박'); await expect(page.getByLabel('내 닉네임')).toHaveValue('바다');
});
test('Prism 409는 테마를 다시 고르도록 안내한다', async ({ page }) => {
  await mockPrism(page, 'themes', [{ code: 200, example: 'three-themes' }]); await mockPrism(page, 'rooms', [{ code: 409, example: 'theme-unavailable' }]);
  await fillDetails(page); await page.getByRole('button', { name: '방 만들기' }).click();
  await expect(page.getByText('이 테마는 지금 쓸 수 없어요')).toBeVisible(); await page.getByRole('button', { name: '테마 다시 고르기' }).click();
  await expect(page).toHaveURL(/\/rooms\/new$/);
});
test('Prism 429는 남은 초 동안 다시 시도를 막는다', async ({ page }) => {
  await mockPrism(page, 'themes', [{ code: 200, example: 'three-themes' }]); await mockPrism(page, 'rooms', [{ code: 429 }]);
  await fillDetails(page); await page.getByRole('button', { name: '방 만들기' }).click();
  await expect(page.getByText('잠시 뒤 다시 해 주세요')).toBeVisible(); await expect(page.getByRole('button', { name: /다시 시도/ })).toBeDisabled();
});
test('Prism 403은 입력 대신 권한 안내만 표시한다', async ({ page }) => {
  await mockPrism(page, 'themes', [{ code: 200, example: 'three-themes' }]); await mockPrism(page, 'rooms', [{ code: 403 }]);
  await fillDetails(page); await page.getByRole('button', { name: '방 만들기' }).click();
  await expect(page.getByRole('heading', { name: '지금은 쓸 수 없어요' })).toBeVisible(); await expect(page.getByRole('button')).toHaveCount(0);
});
test('시간 초과 뒤 같은 요청 ID로 다시 시도한다', async ({ page }) => {
  await mockPrism(page, 'themes', [{ code: 200, example: 'three-themes' }]); const keys = await mockPrism(page, 'rooms', [{ code: 201, example: 'created', delay: 11000 }, { code: 201, example: 'created' }]);
  await fillDetails(page); await page.getByRole('button', { name: '방 만들기' }).click();
  await expect(page.getByText('잠시 뒤 다시 해 주세요')).toBeVisible({ timeout: 15000 });
  await expect(page.getByLabel('모임 이름')).toHaveValue('제주 3박'); await page.getByRole('button', { name: '방 만들기' }).click();
  await expect(page).toHaveURL(/\/room\/questions$/); expect(keys()).toHaveLength(2); expect(keys()[0]).toBe(keys()[1]);
});

test('서버 오류 뒤 입력과 요청 ID를 보존해 다시 시도한다', async ({ page }) => {
  await mockPrism(page, 'themes', [{ code: 200, example: 'three-themes' }]); const keys = await mockPrism(page, 'rooms', [{ code: 500 }, { code: 201, example: 'created' }]);
  await fillDetails(page); await page.getByRole('button', { name: '방 만들기' }).click();
  await expect(page.getByText('잠시 뒤 다시 해 주세요')).toBeVisible(); await expect(page.getByLabel('내 닉네임')).toHaveValue('바다');
  await page.getByRole('button', { name: '방 만들기' }).click(); await expect(page).toHaveURL(/\/room\/questions$/);
  expect(keys()).toHaveLength(2); expect(keys()[0]).toBe(keys()[1]);
});
test('재인증 실패는 확인 오류 화면으로 돌아간다', async ({ page }) => {
  await mockPrism(page, 'themes', [{ code: 200, example: 'three-themes' }]); await mockPrism(page, 'rooms', [{ code: 401 }]);
  await fillDetails(page); await page.getByRole('button', { name: '방 만들기' }).click();
  await expect(page).toHaveURL(/\/$/); await expect(page.getByRole('heading', { name: '확인하지 못했어요' })).toBeVisible();
});
test('꺼진 생성 버튼은 터치 크기와 토큰 대비를 유지한다', async ({ page }) => {
  await mockPrism(page, 'themes', [{ code: 200, example: 'three-themes' }]);
  await page.goto('/rooms/new'); await page.getByRole('button', { name: '여행', exact: true }).click();
  const button = page.getByRole('button', { name: '방 만들기' }); await expect(button).toBeDisabled();
  const box = await button.boundingBox(); expect(box!.width).toBeGreaterThanOrEqual(44); expect(box!.height).toBeGreaterThanOrEqual(44);
  const style = await button.evaluate(e => ({ opacity: getComputedStyle(e).opacity, background: getComputedStyle(e.querySelector('div')!).backgroundColor, color: getComputedStyle(e.querySelector('span')!).color }));
  expect(style).toEqual({ opacity: '1', background: 'rgb(229, 232, 235)', color: 'rgb(78, 89, 104)' });
});

test('인원은 기본 4명이고 2명과 8명에서 멈춘다', async ({ page }) => {
  await mockPrism(page, 'themes', [{ code: 200, example: 'three-themes' }]);
  await page.goto('/rooms/new'); await page.getByRole('button', { name: '여행', exact: true }).click();
  await expect(page.getByText('4명', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '인원 줄이기' }).click({ clickCount: 2 });
  await expect(page.getByText('2명', { exact: true })).toBeVisible(); await expect(page.getByRole('button', { name: '인원 줄이기' })).toBeDisabled();
  for (let i = 0; i < 6; i++) await page.getByRole('button', { name: '인원 늘리기' }).click();
  await expect(page.getByText('8명', { exact: true })).toBeVisible(); await expect(page.getByRole('button', { name: '인원 늘리기' })).toBeDisabled();
});
