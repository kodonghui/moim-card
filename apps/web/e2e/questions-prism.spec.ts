import { test, expect, type Page } from '@playwright/test';
import { mockDestinations } from './destinations';
test.beforeEach(async ({ page }) => { await mockDestinations(page); });

test.use({ viewport: { width: 360, height: 800 } });
type Selection = { code: number; example?: string; delay?: number };
const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,POST,OPTIONS' };
async function prism(page: Page, endpoint: 'questions' | 'responses', choices: Selection[]) {
  let count = 0; const keys: string[] = [];
  await page.route(new RegExp(`/v1/rooms/[^/]+/${endpoint}$`), async route => {
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    const choice = choices[Math.min(count++, choices.length - 1)]; const original = route.request().headers();
    if (original['idempotency-key']) keys.push(original['idempotency-key']);
    if (choice.delay) await new Promise(resolve => setTimeout(resolve, choice.delay));
    try {
      const response = await route.fetch({ headers: { ...original, authorization: 'Bearer test-token', prefer: `code=${choice.code}${choice.example ? `, example=${choice.example}` : ''}` } });
      await route.fulfill({ response, headers: { ...response.headers(), ...cors } });
    } catch { /* The browser may abort a timed-out request. */ }
  });
  return () => keys;
}
async function enter(page: Page) {
  await page.route(/\/v1\/rooms\/[^/]+(?:\/participants)?$/, route => {
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    if (route.request().method() === 'POST') return route.fulfill({ status: 201, headers: cors, json: { mySubmitted: false } });
    return route.fulfill({ headers: cors, json: { gatheringName: '제주 3박', theme: { name: '여행' }, partySize: 4, submittedCount: 1, isFull: false, status: page.url().endsWith('/room/final') ? 'closed' : 'open', myRole: 'none', mySubmitted: false, asOf: '2026-11-28T09:30:00Z' } });
  });
  await page.goto('/room?room=ABCDEFGH23'); await page.getByRole('button', { name: '참여하기' }).click();
  await page.getByLabel('닉네임').fill('바다'); await page.getByRole('button', { name: '들어가기' }).click();
}
async function chooseAll(page: Page) {
  await expect(page.locator('.questions fieldset')).toHaveCount(8);
  for (const field of await page.locator('.questions fieldset').all()) await field.getByRole('button').first().click();
}
test('Prism 문항 여덟 개와 빠진 문항 안내', async ({ page }) => {
  await prism(page, 'questions', [{ code: 200, example: 'travel-v1' }]); await enter(page);
  await expect(page.locator('.questions fieldset')).toHaveCount(8); await expect(page.getByText('바다 님으로 참여 중')).toBeVisible(); await page.getByRole('button', { name: '남은 문항으로 가기' }).click();
  await expect(page.locator('#question-1').getByText('아직 고르지 않았어요')).toBeVisible();
  await page.locator('#question-1 button').first().click(); await expect(page.getByText('아직 고르지 않았어요')).toHaveCount(0);
});
test('느린 문항 요청의 자리 표시와 오류 뒤 재시도', async ({ page }) => {
  await prism(page, 'questions', [{ code: 500, delay: 4000 }, { code: 200, example: 'travel-v1' }]); await enter(page);
  await expect(page.getByRole('status')).toBeVisible(); await expect(page.getByText('잠시 뒤 다시 해 주세요')).toBeVisible();
  await page.getByRole('button', { name: '다시 시도' }).click(); await expect(page.locator('.questions fieldset')).toHaveCount(8);
});
for (const [code, example, heading] of [[403, 'origin-not-allowed', '지금은 쓸 수 없어요'], [404, 'room-not-found', '이 방은 없거나 보관 기간이 지났어요']] as const) test(`문항 ${code} 안내`, async ({ page }) => {
  await prism(page, 'questions', [{ code, example }]); await enter(page); await expect(page.getByRole('heading', { name: heading })).toBeVisible();
});
for (const [example, target] of [['room-closed', 'final'], ['already-submitted', 'result']] as const) test(`문항 ${example} 이동`, async ({ page }) => {
  await prism(page, 'questions', [{ code: 409, example }]); await enter(page); await expect(page).toHaveURL(new RegExp(`/room/${target}$`));
});
test('제출 입력 오류가 서버가 지정한 문항에 표시된다', async ({ page }) => {
  await prism(page, 'questions', [{ code: 200, example: 'travel-v1' }]); await prism(page, 'responses', [{ code: 400, example: 'invalid-choice' }]);
  await enter(page); await chooseAll(page); await page.getByRole('button', { name: '제출하기' }).click();
  await expect(page.locator('#question-3').getByText('아직 고르지 않았어요')).toBeVisible();
  await expect(page.locator('#question-3 button').first()).toHaveAttribute('aria-pressed', 'true');
});
test('제출 실패 뒤 답과 요청 ID를 보존한다', async ({ page }) => {
  await prism(page, 'questions', [{ code: 200, example: 'travel-v1' }]); const keys = await prism(page, 'responses', [{ code: 500 }, { code: 201, example: 'solo-first' }]);
  await enter(page); await chooseAll(page); await page.getByRole('button', { name: '제출하기' }).click();
  await expect(page.getByText('제출하지 못했어요. 고른 답은 그대로예요')).toBeVisible(); await page.getByRole('button', { name: '다시 시도' }).click();
  await expect(page).toHaveURL(/\/room\/result$/); expect(keys()).toHaveLength(2); expect(keys()[0]).toBe(keys()[1]);
});
for (const [example, target] of [['room-closed', 'final'], ['already-submitted', 'result']] as const) test(`제출 ${example} 이동`, async ({ page }) => {
  await prism(page, 'questions', [{ code: 200, example: 'travel-v1' }]); await prism(page, 'responses', [{ code: 409, example }]);
  await enter(page); await chooseAll(page); await page.getByRole('button', { name: '제출하기' }).click(); await expect(page).toHaveURL(new RegExp(`/room/${target}$`));
});
test('제출 429는 답을 유지하고 남은 시간 동안 막는다', async ({ page }) => {
  await prism(page, 'questions', [{ code: 200, example: 'travel-v1' }]); await prism(page, 'responses', [{ code: 429 }]);
  await enter(page); await chooseAll(page); await page.getByRole('button', { name: '제출하기' }).click();
  await expect(page.getByRole('button', { name: /다시 시도/ })).toBeDisabled(); await expect(page.locator('#question-1 button').first()).toHaveAttribute('aria-pressed', 'true');
});
test('재인증 실패는 확인 오류 화면으로 돌아간다', async ({ page }) => {
  await prism(page, 'questions', [{ code: 401 }]); await enter(page);
  await expect(page).toHaveURL(/\/$/); await expect(page.getByRole('heading', { name: '확인하지 못했어요' })).toBeVisible();
});
test('참여자가 아니면 방 소개로 돌아간다', async ({ page }) => {
  await prism(page, 'questions', [{ code: 403, example: 'not-participant' }]); await enter(page);
  await expect(page).toHaveURL(/\/room$/); await expect(page.getByRole('button', { name: '참여하기' })).toBeVisible();
});
test('제출 중 시간 초과 뒤 같은 요청 ID로 재시도한다', async ({ page }) => {
  await prism(page, 'questions', [{ code: 200, example: 'travel-v1' }]);
  const keys = await prism(page, 'responses', [{ code: 201, example: 'solo-first', delay: 11000 }, { code: 201, example: 'solo-first' }]);
  await enter(page); await chooseAll(page); await page.getByRole('button', { name: '제출하기' }).click();
  await expect(page.getByText('제출하지 못했어요. 고른 답은 그대로예요')).toBeVisible({ timeout: 15000 });
  await page.getByRole('button', { name: '다시 시도' }).click(); await expect(page).toHaveURL(/\/room\/result$/);
  expect(keys()).toHaveLength(2); expect(keys()[0]).toBe(keys()[1]);
});
