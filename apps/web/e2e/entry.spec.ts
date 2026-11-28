import { test, expect } from '@playwright/test';
test('버전 정보를 읽지 못하면 서버 요청 없이 업데이트 안내를 보여 준다', async ({ page }) => {
  const apiRequests: string[] = [];
  page.on('request', request => { if (request.url().includes('/v1/')) apiRequests.push(request.url()); });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '토스 앱을 업데이트하면 쓸 수 있어요' })).toBeVisible();
  const button = page.getByRole('button', { name: '닫기' });
  const bounds = await button.boundingBox();
  expect(bounds!.width).toBeGreaterThanOrEqual(44);
  expect(bounds!.height).toBeGreaterThanOrEqual(44);
  expect(apiRequests).toEqual([]);
});
