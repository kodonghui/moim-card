import { test, expect } from '@playwright/test';
const harness = '/e2e/entry-prism.html';
test('구버전은 서버를 부르지 않고 업데이트만 안내한다', async ({ page }) => {
  const requests: string[] = []; page.on('request', r => { if (r.url().includes(':4010/v1/')) requests.push(r.url()); });
  await page.goto(`${harness}?version=5.231.0`);
  await expect(page.getByRole('heading', { name: '토스 앱을 업데이트하면 쓸 수 있어요' })).toBeVisible();
  expect(requests).toEqual([]);
});
test('느린 요청은 1초 뒤 확인 중을 보이고 성공하면 홈으로 간다', async ({ page }) => {
  await page.goto(`${harness}?delay=yes`);
  await expect(page.getByText('확인하고 있어요')).toBeVisible();
  await expect(page).toHaveURL(/\/home$/, { timeout: 10000 });
});
for (const status of [400, 401, 403, 429, 500]) test(`Prism ${status} 응답을 화면 상태로 보여 준다`, async ({ page }) => {
  await page.goto(`${harness}?status=${status}`);
  if (status === 403) {
    await expect(page.getByRole('heading', { name: '지금은 쓸 수 없어요' })).toBeVisible();
    await expect(page.getByRole('button')).toHaveCount(0);
  } else if (status === 429) {
    await expect(page.getByRole('heading', { name: '잠시 뒤 다시 해 주세요' })).toBeVisible();
    const retry = page.getByRole('button', { name: /다시 시도/ }); await expect(retry).toBeDisabled();
    const style = await retry.evaluate(e => ({ opacity: getComputedStyle(e).opacity, background: getComputedStyle(e.querySelector('div')!).backgroundColor, color: getComputedStyle(e.querySelector('span')!).color }));
    expect(style).toEqual({ opacity: '1', background: 'rgb(229, 232, 235)', color: 'rgb(78, 89, 104)' });
    const box = await retry.boundingBox(); expect(box!.width).toBeGreaterThanOrEqual(44); expect(box!.height).toBeGreaterThanOrEqual(44);
  } else {
    await expect(page.getByRole('heading', { name: '확인하지 못했어요' })).toBeVisible();
    await expect(page.getByRole('button', { name: '다시 시도' })).toBeVisible();
  }
});

test('인증 실패 뒤 재시도는 새 인증 코드를 요청한다', async ({ page }) => {
  await page.goto(`${harness}?status=401`);
  await expect(page.getByRole('button', { name: '다시 시도' })).toBeVisible();
  await expect(page.locator('body')).toHaveAttribute('data-auth-calls', '1');
  await page.getByRole('button', { name: '다시 시도' }).click();
  await expect(page.locator('body')).toHaveAttribute('data-auth-calls', '2');
});
