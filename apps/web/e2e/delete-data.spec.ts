import { test, expect, type Page } from '@playwright/test';
test.use({ viewport: { width: 360, height: 800 } });
type Choice = { code: number; example?: string; delay?: number };
const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,DELETE,OPTIONS' };
async function prism(page: Page, endpoint: 'data-summary' | 'delete', choices: Choice[]) {
  let calls = 0; const keys: string[] = [];
  await page.route(endpoint === 'delete' ? /\/v1\/me$/ : /\/v1\/me\/data-summary$/, async route => {
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    const choice = choices[Math.min(calls++, choices.length - 1)]; const original = route.request().headers();
    if (original['idempotency-key']) keys.push(original['idempotency-key']);
    if (choice.delay) await new Promise(resolve => setTimeout(resolve, choice.delay));
    try {
      const override = process.env.MOIM_PRISM_URL;
      const response = await route.fetch({ ...(override ? { url: new URL(new URL(route.request().url()).pathname, override).toString() } : {}), headers: { ...original, authorization: 'Bearer test-token', prefer: `code=${choice.code}${choice.example ? `, example=${choice.example}` : ''}` } });
      await route.fulfill({ response, headers: { ...response.headers(), ...cors } });
    } catch { /* Browser may abort a timed-out request. */ }
  });
  return () => keys;
}
async function mockNative(page: Page) {
  await page.route('**/src/delete-native.ts*', route => route.fulfill({ contentType: 'application/javascript', body: 'export async function closeMiniApp() { window.__closeCount = (window.__closeCount || 0) + 1; sessionStorage.setItem("closeCount", String(window.__closeCount)); } export function onNativeBack(close) { window.__nativeBack = close; return () => {}; }' }));
}
async function confirm(page: Page) {
  await page.getByRole('button', { name: '지우기', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: '지우기', exact: true }).click();
}
test('현황과 확인 창을 표시하고 취소하면 요청하지 않는다', async ({ page }) => {
  await prism(page, 'data-summary', [{ code: 200, example: 'host-of-open-room' }]); const calls = await prism(page, 'delete', [{ code: 204 }]); await page.goto('/me/delete');
  await expect(page.getByText('응답 2개')).toBeVisible(); await expect(page.getByText('내가 만든 열린 방 1개는 바로 마감돼요')).toBeVisible();
  if (process.env.CAPTURE_DELETE) await page.screenshot({ path: '../../docs/10-wbs/captures/task-048.png', fullPage: true });
  await page.getByRole('button', { name: '지우기', exact: true }).click(); await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: '취소' }).click(); await expect(page.getByRole('dialog')).not.toBeVisible(); expect(calls()).toHaveLength(0);
});
test('빈 현황에서도 사용자 ID를 지운다고 안내한다', async ({ page }) => {
  await prism(page, 'data-summary', [{ code: 200, example: 'nothing' }]); await page.goto('/me/delete'); await expect(page.getByText('지울 응답과 알림 신청이 없어요. 사용자 ID는 지워요')).toBeVisible();
});
test('느린 현황은 자리 표시 후 실패하면 재시도한다', async ({ page }) => {
  await prism(page, 'data-summary', [{ code: 500, delay: 4000 }, { code: 200, example: 'nothing' }]); await page.goto('/me/delete');
  await expect(page.getByRole('status')).toBeVisible(); await expect(page.getByText('잠시 뒤 다시 해 주세요')).toBeVisible();
  await page.getByRole('button', { name: '다시 시도' }).click(); await expect(page.getByText('지울 응답과 알림 신청이 없어요. 사용자 ID는 지워요')).toBeVisible();
});
test('지우기 성공은 저장된 답과 세션을 비우고 자동 진입하지 않는다', async ({ page }) => {
  await mockNative(page); await prism(page, 'data-summary', [{ code: 200, example: 'nothing' }]); await prism(page, 'delete', [{ code: 204 }]);
  await page.goto('/me/delete'); await page.evaluate(() => { localStorage.setItem('answers:test', '{"1":"A"}'); localStorage.setItem('unrelated', 'keep'); });
  await confirm(page); await expect(page.getByRole('heading', { name: '지웠어요' })).toBeVisible(); await expect(page).toHaveURL(/\/me\/delete$/);
  expect(await page.evaluate(() => [localStorage.getItem('answers:test'), localStorage.getItem('unrelated')])).toEqual([null, 'keep']);
  expect(await page.evaluate(async () => (await import('/src/session.ts')).client['token'])).toBeUndefined();
  await page.getByRole('button', { name: '처음 화면으로' }).click(); await expect(page).toHaveURL(/\/$/);
  expect(await page.evaluate(() => (window as Window & { __closeCount?: number }).__closeCount)).toBeUndefined();
});
test('지운 뒤 시스템 뒤로가기는 닫기를 호출한다', async ({ page }) => {
  await mockNative(page); await prism(page, 'data-summary', [{ code: 200, example: 'nothing' }]); await prism(page, 'delete', [{ code: 204 }]);
  await page.goto('/me/delete'); await confirm(page); await expect(page.getByRole('heading', { name: '지웠어요' })).toBeVisible();
  await expect.poll(() => page.evaluate(() => typeof (window as Window & { __nativeBack?: () => void }).__nativeBack)).toBe('function');
  await page.evaluate(() => (window as Window & { __nativeBack: () => void }).__nativeBack());
  expect(await page.evaluate(() => (window as Window & { __closeCount: number }).__closeCount)).toBe(1);
});
test('지우기 실패 후 같은 요청 ID로 재시도한다', async ({ page }) => {
  await prism(page, 'data-summary', [{ code: 200, example: 'nothing' }]); const keys = await prism(page, 'delete', [{ code: 500 }, { code: 204 }]);
  await page.goto('/me/delete'); await confirm(page); await expect(page.getByText('지우지 못했어요. 아무것도 지우지 않았어요')).toBeVisible();
  await page.getByRole('button', { name: '다시 시도' }).click(); await expect(page.getByRole('heading', { name: '지웠어요' })).toBeVisible();
  expect(keys()).toHaveLength(2); expect(keys()[0]).toBe(keys()[1]);
});
test('요청 ID 충돌은 새 ID로 한 번 다시 시도한다', async ({ page }) => {
  await prism(page, 'data-summary', [{ code: 200, example: 'nothing' }]); const keys = await prism(page, 'delete', [{ code: 409, example: 'idempotency-conflict' }, { code: 204 }]);
  await page.goto('/me/delete'); await confirm(page); await expect(page.getByRole('heading', { name: '지웠어요' })).toBeVisible();
  expect(keys()).toHaveLength(2); expect(keys()[0]).not.toBe(keys()[1]);
});
test('429는 기다리는 동안 재시도를 끈다', async ({ page }) => {
  await prism(page, 'data-summary', [{ code: 200, example: 'nothing' }]); await prism(page, 'delete', [{ code: 429 }]);
  await page.goto('/me/delete'); await confirm(page); await expect(page.getByRole('button', { name: /다시 시도/ })).toBeDisabled();
});
for (const [code, heading] of [[403, '지금은 쓸 수 없어요'], [401, '확인하지 못했어요']] as const) test(`현황 ${code} 안내`, async ({ page }) => {
  await prism(page, 'data-summary', [{ code }]); await page.goto('/me/delete'); await expect(page.getByRole('heading', { name: heading })).toBeVisible();
});
test('시간 초과 뒤 같은 요청 ID로 다시 시도한다', async ({ page }) => {
  await prism(page, 'data-summary', [{ code: 200, example: 'nothing' }]); const keys = await prism(page, 'delete', [{ code: 204, delay: 11000 }, { code: 204 }]);
  await page.goto('/me/delete'); await confirm(page); await expect(page.getByText('지우지 못했어요. 아무것도 지우지 않았어요')).toBeVisible({ timeout: 15000 });
  await page.getByRole('button', { name: '다시 시도' }).click(); await expect(page.getByRole('heading', { name: '지웠어요' })).toBeVisible();
  expect(keys()).toHaveLength(2); expect(keys()[0]).toBe(keys()[1]);
});
for (const [code, heading] of [[403, '지금은 쓸 수 없어요'], [401, '확인하지 못했어요']] as const) test(`지우기 ${code} 안내`, async ({ page }) => {
  await prism(page, 'data-summary', [{ code: 200, example: 'nothing' }]); await prism(page, 'delete', [{ code }]);
  await page.goto('/me/delete'); await confirm(page); await expect(page.getByRole('heading', { name: heading })).toBeVisible();
});
test('지운 뒤 닫기 버튼은 미니앱 닫기를 호출한다', async ({ page }) => {
  await mockNative(page); await prism(page, 'data-summary', [{ code: 200, example: 'nothing' }]); await prism(page, 'delete', [{ code: 204 }]);
  await page.goto('/me/delete'); await confirm(page); await page.getByRole('button', { name: '미니앱 닫기' }).click();
  expect(await page.evaluate(() => (window as Window & { __closeCount: number }).__closeCount)).toBe(1);
});
test('완료 화면의 브라우저 뒤로가기도 닫기를 호출한다', async ({ page }) => {
  await mockNative(page); await prism(page, 'data-summary', [{ code: 200, example: 'nothing' }]); await prism(page, 'delete', [{ code: 204 }]);
  await page.route('**/v1/me/rooms', route => route.fulfill({ headers: cors, json: { rooms: [], asOf: '2026-11-28T09:30:00Z' } }));
  await page.goto('/me/delete'); await page.evaluate(() => { history.replaceState(null, '', '/home'); history.pushState(null, '', '/me/delete'); });
  await confirm(page); await expect(page.getByRole('heading', { name: '지웠어요' })).toBeVisible();
  await expect.poll(() => page.evaluate(() => typeof (window as Window & { __nativeBack?: () => void }).__nativeBack)).toBe('function');
  await page.evaluate(() => window.addEventListener('popstate', () => sessionStorage.setItem('pop', 'yes'), true)); await page.goBack();
  expect(await page.evaluate(() => ({ pop: sessionStorage.getItem('pop'), path: location.pathname }))).toEqual({ pop: 'yes', path: '/home' });
  await expect.poll(() => page.evaluate(() => sessionStorage.getItem('closeCount'))).toBe('1');
});
