import { test, expect, type Page } from '@playwright/test';
type Selection = { code: number; example?: string; delay?: number };
async function prism(page: Page, selections: Selection[]) {
  let calls = 0;
  await page.route('**/v1/me/rooms', async route => {
    const selection = selections[Math.min(calls++, selections.length - 1)];
    if (selection.delay) await new Promise(resolve => setTimeout(resolve, selection.delay));
    const headers = { ...route.request().headers(), authorization: 'Bearer test-token', prefer: `code=${selection.code}${selection.example ? `, example=${selection.example}` : ''}` };
    const response = await route.fetch({ headers });
    await route.fulfill({ response, headers: { ...response.headers(), 'access-control-allow-origin': '*' } });
  });
  return () => calls;
}
test('Prism 정상 목록과 방 코드 비노출을 확인한다', async ({ page }) => {
  await prism(page, [{ code: 200, example: 'two-rooms' }]); await page.goto('/home');
  await expect(page.getByText('제주 3박')).toBeVisible(); await expect(page.getByText('금요 회식')).toBeVisible();
  await expect(page.getByText('ABCDEFGH23')).toHaveCount(0);
  const markup = await page.locator('body').innerText(); expect(markup).not.toContain('KMNPQRST45');
});
test('Prism 빈 목록을 표시한다', async ({ page }) => {
  await prism(page, [{ code: 200, example: 'empty' }]); await page.goto('/home');
  await expect(page.getByText('참여 중인 방이 없어요')).toBeVisible(); await expect(page.getByRole('button', { name: '방 만들기' })).toBeVisible();
});
test('1초 이상이면 목록 자리에 표시하고 메뉴는 사용할 수 있다', async ({ page }) => {
  await prism(page, [{ code: 200, example: 'empty', delay: 4000 }]); await page.goto('/home', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('status')).toBeVisible(); await expect(page.getByRole('button', { name: '지난 카드' })).toBeEnabled();
  await expect(page.getByText('참여 중인 방이 없어요')).toBeVisible();
});
test('오류에서 다시 시도해 목록을 불러온다', async ({ page }) => {
  await prism(page, [{ code: 500 }, { code: 200, example: 'empty' }]); await page.goto('/home');
  await expect(page.getByText('잠시 뒤 다시 해 주세요')).toBeVisible(); await page.getByRole('button', { name: '다시 시도' }).click();
  await expect(page.getByText('참여 중인 방이 없어요')).toBeVisible();
});
test('Origin 거부 시 다른 버튼 없이 안내한다', async ({ page }) => {
  await prism(page, [{ code: 403 }]); await page.goto('/home');
  await expect(page.getByText('지금은 쓸 수 없어요')).toBeVisible(); await expect(page.getByRole('button')).toHaveCount(0);
});
test('복귀 시 지난 목록을 유지하며 다시 불러온다', async ({ page }) => {
  const calls = await prism(page, [{ code: 200, example: 'two-rooms' }, { code: 200, example: 'empty', delay: 4000 }]);
  await page.goto('/home'); await expect(page.getByText('제주 3박')).toBeVisible();
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await expect(page.getByText('제주 3박')).toBeVisible(); await expect(page.getByText(/불러오는 중/)).toBeVisible();
  await expect(page.getByText('참여 중인 방이 없어요')).toBeVisible(); expect(calls()).toBe(2);
});
test('401 재확인에 실패하면 확인 오류 화면으로 이동한다', async ({ page }) => {
  await prism(page, [{ code: 401 }]); await page.goto('/home');
  await expect(page).toHaveURL(/\/$/); await expect(page.getByRole('heading', { name: '확인하지 못했어요' })).toBeVisible();
});

test('메뉴와 방 만들기는 정의된 화면 경로로 이동한다', async ({ page }) => {
  await prism(page, [{ code: 200, example: 'empty' }]);
  for (const [label, path] of [['방 만들기', '/rooms/new'], ['지난 카드', '/past-cards'], ['내 데이터 지우기', '/me/delete'], ['이용약관', '/legal/terms'], ['개인정보처리방침', '/legal/privacy']]) {
    await page.goto('/home'); await page.getByRole('button', { name: label }).click();
    await expect(page).toHaveURL(new RegExp(path + '$'));
  }
});
