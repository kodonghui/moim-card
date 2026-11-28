import { test, expect, type Page } from '@playwright/test';

test.use({ viewport: { width: 360, height: 800 } });
type Selection = { code: number; example?: string; delay?: number };
const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,POST,OPTIONS' };
async function prism(page: Page, endpoint: string, choices: Selection[]) {
  let count = 0; const requests: Array<{ key?: string; body?: string }> = [];
  await page.route(new RegExp(`/v1/rooms/[^/]+${endpoint}$`), async route => {
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    const choice = choices[Math.min(count++, choices.length - 1)]; const original = route.request().headers();
    requests.push({ key: original['idempotency-key'], body: route.request().postData() || undefined });
    if (choice.delay) await new Promise(resolve => setTimeout(resolve, choice.delay));
    try {
      const response = await route.fetch({ headers: { ...original, authorization: 'Bearer test-token', prefer: `code=${choice.code}${choice.example ? `, example=${choice.example}` : ''}` } });
      await route.fulfill({ response, headers: { ...response.headers(), ...cors } });
    } catch { /* The browser may abort a timed-out request. */ }
  });
  return () => requests;
}
async function enter(page: Page) { await page.goto('/room/result?room=ABCDEFGH23'); }
async function mockSdk(page: Page) {
  await page.route('**/src/notification.ts*', route => route.fulfill({ contentType: 'application/javascript', body: "export async function requestAgreement() { return 'newAgreement'; } export async function withConsent(result, callback) { return callback(); }" }));
  await page.route('**/src/session.ts*', route => route.fulfill({ contentType: 'application/javascript', body: `import { ApiClient } from '/src/api.ts';
    let count = 0; export const sessionState = { reauthenticationFailed: false };
    export async function authCode() { return String(++count).padStart(32, '0'); }
    export async function refreshSession() { client.setToken('new-session'); return 'new-session'; }
    export const client = new ApiClient({ baseUrl: 'http://127.0.0.1:4010', reauthenticate: refreshSession });` }));
}
test('Prism 성향과 응답 현황을 표시한다', async ({ page }) => {
  await prism(page, '/my-profile', [{ code: 200, example: 'two-axes' }]); await prism(page, '', [{ code: 200, example: 'open-host' }]); await enter(page);
  await expect(page.locator('.axis')).toHaveCount(2); await expect(page.getByText(/4명 중 3명 답했어요/)).toBeVisible();
  await expect(page.getByRole('button', { name: '카드 보기' })).toBeVisible(); await expect(page.getByRole('button', { name: '알림 받기' })).toBeVisible();
});
test('응답 현황 오류에도 불러온 성향을 유지하고 재시도한다', async ({ page }) => {
  await prism(page, '/my-profile', [{ code: 200, example: 'two-axes' }]); await prism(page, '', [{ code: 500 }, { code: 200, example: 'open-host' }]); await enter(page);
  await expect(page.locator('.axis')).toHaveCount(2); await expect(page.getByText('잠시 뒤 다시 해 주세요')).toBeVisible();
  await page.getByRole('button', { name: '다시 시도' }).click(); await expect(page.getByText(/4명 중 3명 답했어요/)).toBeVisible();
});
test('결과 새로고침 중에는 이전 현황과 진행 상태를 함께 표시한다', async ({ page }) => {
  await prism(page, '/my-profile', [{ code: 200, example: 'two-axes' }]); await prism(page, '', [{ code: 200, example: 'open-host' }, { code: 200, example: 'open-host', delay: 1500 }]); await enter(page);
  await page.getByRole('button', { name: '새로고침' }).click(); await expect(page.getByText(/다시 불러오는 중/)).toBeVisible();
  await expect(page.getByText(/4명 중 3명 답했어요/)).toBeVisible(); await expect(page.getByRole('button', { name: '새로고침' })).toBeVisible();
});
test('마감된 방에서는 알림을 표시하지 않고 최종 카드로 간다', async ({ page }) => {
  await prism(page, '/my-profile', [{ code: 200, example: 'three-axes' }]); await prism(page, '', [{ code: 200, example: 'closed' }]); await enter(page);
  await expect(page.getByText('방이 마감됐어요')).toBeVisible(); await expect(page.getByRole('button', { name: '알림 받기' })).toHaveCount(0);
  await page.getByRole('button', { name: '카드 보기' }).click(); await expect(page).toHaveURL(/\/room\/final$/);
});
for (const [code, example, heading] of [[403, 'origin-not-allowed', '지금은 쓸 수 없어요'], [404, 'room-not-found', '이 방은 없거나 보관 기간이 지났어요']] as const) test(`성향 ${code} 안내`, async ({ page }) => {
  await prism(page, '/my-profile', [{ code, example }]); await prism(page, '', [{ code: 200, example: 'open-host' }]); await enter(page);
  await expect(page.getByRole('heading', { name: heading })).toBeVisible();
});
test('알림 인증 코드가 무효면 새 코드로 한 번 다시 보낸다', async ({ page }) => {
  await mockSdk(page); await prism(page, '/my-profile', [{ code: 200, example: 'two-axes' }]); await prism(page, '', [{ code: 200, example: 'open-host' }]);
  const calls = await prism(page, '/notification-subscription', [{ code: 400, example: 'auth-code-invalid' }, { code: 201, example: 'subscribed' }]);
  await enter(page); await page.getByRole('button', { name: '알림 받기' }).click(); await expect(page.getByText('알림을 신청했어요. 친구가 답을 마치면 알려 드려요')).toBeVisible();
  expect(calls()).toHaveLength(2); expect(calls()[0].body).not.toBe(calls()[1].body); expect(calls()[0].key).not.toBe(calls()[1].key);
});
test('알림 식별값 불일치는 세션과 인증 코드를 새로 받아 한 번 재시도한다', async ({ page }) => {
  await mockSdk(page); await prism(page, '/my-profile', [{ code: 200, example: 'two-axes' }]); await prism(page, '', [{ code: 200, example: 'open-host' }]);
  const calls = await prism(page, '/notification-subscription', [{ code: 403, example: 'identity-mismatch' }, { code: 200, example: 'already' }]);
  await enter(page); await page.getByRole('button', { name: '알림 받기' }).click(); await expect(page.getByText('이미 알림을 신청했어요')).toBeVisible();
  expect(calls()).toHaveLength(2); expect(calls()[0].body).not.toBe(calls()[1].body);
});
test('알림 한도는 남은 시간 동안 재시도를 막는다', async ({ page }) => {
  await mockSdk(page); await prism(page, '/my-profile', [{ code: 200, example: 'two-axes' }]); await prism(page, '', [{ code: 200, example: 'open-host' }]);
  await prism(page, '/notification-subscription', [{ code: 429 }]); await enter(page); await page.getByRole('button', { name: '알림 받기' }).click();
  await expect(page.getByText('알림을 신청하지 못했어요')).toBeVisible(); await expect(page.getByRole('button', { name: /다시 시도/ })).toBeDisabled();
});
for (const [example, target] of [['response-required', 'questions'], ['not-participant', 'room']] as const) test(`성향 ${example} 이동`, async ({ page }) => {
  await prism(page, '/my-profile', [{ code: 403, example }]); await prism(page, '', [{ code: 200, example: 'open-newcomer' }]); await prism(page, '/questions', [{ code: 200, example: 'travel-v1' }]); await enter(page);
  await expect(page).toHaveURL(target === 'room' ? /\/room$/ : /\/room\/questions$/);
});
test('알림 코드가 두 번 무효면 오류를 표시하고 멈춘다', async ({ page }) => {
  await mockSdk(page); await prism(page, '/my-profile', [{ code: 200, example: 'two-axes' }]); await prism(page, '', [{ code: 200, example: 'open-host' }]);
  const calls = await prism(page, '/notification-subscription', [{ code: 400, example: 'auth-code-invalid' }]);
  await enter(page); await page.getByRole('button', { name: '알림 받기' }).click(); await expect(page.getByText('알림을 신청하지 못했어요')).toBeVisible(); expect(calls()).toHaveLength(2);
});
test('알림 서버 오류 후 같은 요청 ID로 재시도한다', async ({ page }) => {
  await mockSdk(page); await prism(page, '/my-profile', [{ code: 200, example: 'two-axes' }]); await prism(page, '', [{ code: 200, example: 'open-host' }]);
  const calls = await prism(page, '/notification-subscription', [{ code: 503 }, { code: 201, example: 'subscribed' }]);
  await enter(page); await page.getByRole('button', { name: '알림 받기' }).click(); await expect(page.getByText('알림을 신청하지 못했어요')).toBeVisible();
  await page.getByRole('button', { name: '다시 시도' }).click(); await expect(page.getByText('알림을 신청했어요. 친구가 답을 마치면 알려 드려요')).toBeVisible();
  expect(calls()).toHaveLength(2); expect(calls()[0].key).toBe(calls()[1].key);
});
