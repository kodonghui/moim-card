import { test, expect } from '@playwright/test';
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization,content-type,idempotency-key', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS' };
test('테마를 골라 이름과 인원을 적고 방을 만든다', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.route('**/v1/themes', route => route.fulfill({ json: { themes: [{ themeId: 'travel', name: '여행', questionSetVersion: 1 }] }, headers: cors }));
  await page.route('**/v1/rooms', route => route.request().method() === 'OPTIONS' ? route.fulfill({ status: 204, headers: cors }) : route.fulfill({ status: 201, headers: cors, json: { roomCode: 'ABCDEFGH23', gatheringName: '제주 3박', partySize: 4, theme: { themeId: 'travel', name: '여행' } } }));
  await page.goto('/rooms/new');
  await page.getByRole('button', { name: '여행' }).click();
  await expect(page.getByRole('heading', { name: '모임 정보를 적어 주세요' })).toBeVisible();
  await expect(page.getByRole('group', { name: '인원' })).toContainText('4명');
  await expect(page.getByLabel('모임 이름')).toHaveAttribute('aria-describedby', 'gathering-help');
  const submit = page.getByRole('button', { name: '방 만들기' });
  await expect(submit).toBeDisabled();
  await page.getByLabel('모임 이름').fill('제주 3박');
  await page.getByLabel('내 닉네임').fill('바다');
  await expect(submit).toBeEnabled();
  if (process.env.CAPTURE_CREATE) { await page.waitForTimeout(400); await page.screenshot({ path: '../../docs/10-wbs/captures/task-039.png', fullPage: true }); }
  await submit.click();
  await expect(page).toHaveURL(/\/room\/questions$/);
  await expect(page.getByText('ABCDEFGH23')).toHaveCount(0);
});
test('서버의 칸별 오류를 표시하고 입력을 보존한다', async ({ page }) => {
  await page.route('**/v1/themes', route => route.fulfill({ json: { themes: [{ themeId: 'travel', name: '여행', questionSetVersion: 1 }] }, headers: cors }));
  await page.route('**/v1/rooms', route => route.request().method() === 'OPTIONS' ? route.fulfill({ status: 204, headers: cors }) : route.fulfill({ status: 400, headers: cors, json: { status: 400, code: 'validation_failed', errors: [{ field: 'gatheringName', reason: 'too_long' }] } }));
  await page.goto('/rooms/new'); await page.getByRole('button', { name: '여행' }).click();
  await page.getByLabel('모임 이름').fill('제주 3박'); await page.getByLabel('내 닉네임').fill('바다');
  await page.getByRole('button', { name: '방 만들기' }).click();
  await expect(page.getByRole('alert')).toContainText('모임 이름은 1~20자로 적어 주세요');
  await expect(page.getByLabel('모임 이름')).toHaveCSS('border-top-color', 'rgb(185, 28, 28)');
  await expect(page.getByRole('alert')).toHaveCSS('color', 'rgb(185, 28, 28)');
  await expect(page.getByLabel('모임 이름')).toHaveValue('제주 3박');
  await expect(page.getByLabel('내 닉네임')).toHaveValue('바다');
});
test('표시할 칸이 없는 서버 오류는 일반 오류로 안내한다', async ({ page }) => {
  await page.route('**/v1/themes', route => route.fulfill({ json: { themes: [{ themeId: 'travel', name: '여행', questionSetVersion: 1 }] }, headers: cors }));
  await page.route('**/v1/rooms', route => route.request().method() === 'OPTIONS' ? route.fulfill({ status: 204, headers: cors }) : route.fulfill({ status: 400, headers: cors, json: { status: 400, code: 'validation_failed', errors: [{ field: 'themeId', reason: 'invalid' }] } }));
  await page.goto('/rooms/new'); await page.getByRole('button', { name: /여행/ }).click();
  await page.getByLabel('모임 이름').fill('제주 3박'); await page.getByLabel('내 닉네임').fill('바다'); await page.getByRole('button', { name: '방 만들기' }).click();
  await expect(page.getByRole('alert')).toContainText('잠시 뒤 다시 해 주세요');
});
