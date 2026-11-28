import { test, expect, type Page } from '@playwright/test';
test.use({ viewport: { width: 360, height: 800 } });
type Selection = { code: number; example?: string; delay?: number };
async function mockPrism(page: Page, method: 'GET' | 'POST', choices: Selection[]) {
  let calls = 0; const keys: string[] = [];
  await page.route(/\/v1\/rooms\/[^/]+(?:\/participants)?$/, async route => {
    if (route.request().method() !== method) return route.fallback();
    const choice = choices[Math.min(calls++, choices.length - 1)]; const original = route.request().headers();
    if (original['idempotency-key']) keys.push(original['idempotency-key']);
    if (choice.delay) await new Promise(resolve => setTimeout(resolve, choice.delay));
    try {
      const response = await route.fetch({ headers: { ...original, authorization: 'Bearer test-token', prefer: `code=${choice.code}${choice.example ? `, example=${choice.example}` : ''}` } });
      await route.fulfill({ response, headers: { ...response.headers(), 'access-control-allow-origin': '*' } });
    } catch { /* A timed-out browser request was aborted. */ }
  });
  return () => keys;
}
async function joinForm(page: Page) {
  await page.goto('/room?room=ABCDEFGH23'); await page.getByRole('button', { name: '참여하기' }).click();
  await page.getByLabel('닉네임').fill('바다');
}
test('Prism 방 소개 정상과 가득 찬 방', async ({ page }) => {
  await mockPrism(page, 'GET', [{ code: 200, example: 'open-newcomer' }, { code: 200, example: 'open-full' }]);
  await page.goto('/room?room=ABCDEFGH23'); await expect(page.getByRole('button', { name: '참여하기' })).toBeVisible();
  await expect(page.getByText('ABCDEFGH23')).toHaveCount(0); await page.getByRole('button', { name: '새로고침' }).click();
  await expect(page.getByText('이 방은 8명이 다 찼어요')).toBeVisible(); await expect(page.getByRole('button', { name: '방 만들기' })).toBeVisible();
});
test('새로고침 중 기존 방 정보를 유지하고 진행 상태를 보여준다', async ({ page }) => {
  await mockPrism(page, 'GET', [{ code: 200, example: 'open-newcomer' }, { code: 200, example: 'open-newcomer', delay: 1500 }]);
  await page.goto('/room?room=ABCDEFGH23'); await expect(page.getByRole('button', { name: '참여하기' })).toBeVisible();
  await page.getByRole('button', { name: '새로고침' }).click();
  await expect(page.getByText(/다시 불러오는 중/)).toBeVisible(); await expect(page.getByRole('button', { name: '참여하기' })).toBeVisible();
  await expect(page.getByRole('button', { name: '새로고침' })).toBeVisible();
});
test('느린 방 조회는 자리 표시를 보이고 오류 뒤 재시도한다', async ({ page }) => {
  await mockPrism(page, 'GET', [{ code: 500, delay: 4000 }, { code: 200, example: 'open-newcomer' }]);
  await page.goto('/room?room=ABCDEFGH23', { waitUntil: 'domcontentloaded' }); await expect(page.getByRole('status')).toBeVisible();
  await expect(page.getByText('잠시 뒤 다시 해 주세요')).toBeVisible(); await page.getByRole('button', { name: '다시 시도' }).click();
  await expect(page.getByRole('button', { name: '참여하기' })).toBeVisible();
});
for (const [code, heading] of [[403, '지금은 쓸 수 없어요'], [404, '이 방은 없거나 보관 기간이 지났어요']] as const) test(`방 조회 ${code} 안내`, async ({ page }) => {
  await mockPrism(page, 'GET', [{ code }]); await page.goto('/room?room=ABCDEFGH23'); await expect(page.getByRole('heading', { name: heading })).toBeVisible();
});
test('마감된 방과 이미 응답한 참여자는 정의된 화면으로 이동한다', async ({ page }) => {
  await mockPrism(page, 'GET', [{ code: 200, example: 'closed' }]); await page.goto('/room?room=ABCDEFGH23'); await expect(page).toHaveURL(/\/room\/final$/);
  await page.unrouteAll(); await mockPrism(page, 'GET', [{ code: 200, example: 'open-host' }]);
  await page.goto('/room?room=ABCDEFGH23'); await expect(page).toHaveURL(/\/room\/result$/);
});
test('Prism 201 입장은 문항으로 이동한다', async ({ page }) => {
  await mockPrism(page, 'GET', [{ code: 200, example: 'open-newcomer' }]); await mockPrism(page, 'POST', [{ code: 201, example: 'joined' }]);
  await joinForm(page); await page.getByRole('button', { name: '들어가기' }).click(); await expect(page).toHaveURL(/\/room\/questions$/);
});
test('이미 참여하고 응답한 사람은 결과로 이동한다', async ({ page }) => {
  await mockPrism(page, 'GET', [{ code: 200, example: 'open-newcomer' }]); await mockPrism(page, 'POST', [{ code: 200, example: 'already-member' }]);
  await joinForm(page); await page.getByRole('button', { name: '들어가기' }).click(); await expect(page).toHaveURL(/\/room\/result$/);
});
test('Prism 400은 닉네임을 보존하고 이유를 표시한다', async ({ page }) => {
  await mockPrism(page, 'GET', [{ code: 200, example: 'open-newcomer' }]); await mockPrism(page, 'POST', [{ code: 400, example: 'nickname-too-long' }]);
  await joinForm(page); await page.getByRole('button', { name: '들어가기' }).click();
  await expect(page.getByText('닉네임은 1~10자로, 쓸 수 없는 말이 있어요')).toBeVisible(); await expect(page.getByLabel('닉네임')).toHaveValue('바다');
});
for (const [code, example, heading] of [[403, undefined, '지금은 쓸 수 없어요'], [404, 'room-not-found', '이 방은 없거나 보관 기간이 지났어요'], [409, 'room-full', '이 방은 8명이 다 찼어요']] as const) test(`입장 ${code} ${example || ''} 안내`, async ({ page }) => {
  await mockPrism(page, 'GET', [{ code: 200, example: 'open-newcomer' }]); await mockPrism(page, 'POST', [{ code, example }]);
  await joinForm(page); await page.getByRole('button', { name: '들어가기' }).click(); await expect(page.getByRole('heading', { name: heading })).toBeVisible();
});
test('입장 중 방이 마감되면 최종 카드로 이동한다', async ({ page }) => {
  await mockPrism(page, 'GET', [{ code: 200, example: 'open-newcomer' }]); await mockPrism(page, 'POST', [{ code: 409, example: 'room-closed' }]);
  await joinForm(page); await page.getByRole('button', { name: '들어가기' }).click(); await expect(page).toHaveURL(/\/room\/final$/);
});
test('Prism 429는 기다리는 동안 버튼을 끄고 닉네임을 보존한다', async ({ page }) => {
  await mockPrism(page, 'GET', [{ code: 200, example: 'open-newcomer' }]); await mockPrism(page, 'POST', [{ code: 429 }]);
  await joinForm(page); await page.getByRole('button', { name: '들어가기' }).click();
  await expect(page.getByRole('button', { name: /다시 시도/ })).toBeDisabled(); await expect(page.getByLabel('닉네임')).toHaveValue('바다');
});
test('오류 뒤 같은 요청 ID로 입장을 다시 시도한다', async ({ page }) => {
  await mockPrism(page, 'GET', [{ code: 200, example: 'open-newcomer' }]); const keys = await mockPrism(page, 'POST', [{ code: 500 }, { code: 201, example: 'joined' }]);
  await joinForm(page); await page.getByRole('button', { name: '들어가기' }).click(); await expect(page.getByText('잠시 뒤 다시 해 주세요')).toBeVisible();
  await expect(page.getByLabel('닉네임')).toHaveValue('바다'); await page.getByRole('button', { name: '들어가기' }).click();
  await expect(page).toHaveURL(/\/room\/questions$/); expect(keys()).toHaveLength(2); expect(keys()[0]).toBe(keys()[1]);
});
