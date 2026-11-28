import { test, expect, type Page } from '@playwright/test';

test.use({ viewport: { width: 360, height: 800 } });
type Selection = { code: number; example?: string; delay?: number; member?: boolean; submittedCount?: number };
const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,POST,OPTIONS' };
async function prism(page: Page, endpoint: string, choices: Selection[]) {
  let count = 0; const keys: string[] = [];
  await page.route(new RegExp(`/v1/rooms/[^/]+${endpoint}$`), async route => {
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    const choice = choices[Math.min(count++, choices.length - 1)]; const original = route.request().headers();
    if (original['idempotency-key']) keys.push(original['idempotency-key']);
    if (choice.delay) await new Promise(resolve => setTimeout(resolve, choice.delay));
    try {
      const response = await route.fetch({ headers: { ...original, authorization: 'Bearer test-token', prefer: `code=${choice.code}${choice.example ? `, example=${choice.example}` : ''}` } });
      if (!endpoint && page.url().endsWith('/room/final') && response.ok()) return route.fulfill({ response, headers: { ...response.headers(), ...cors }, json: { ...await response.json(), status: 'closed' } });
      if (choice.member || choice.submittedCount !== undefined) return route.fulfill({ response, headers: { ...response.headers(), ...cors }, json: { ...await response.json(), ...(choice.member ? { myRole: 'member' } : {}), ...(choice.submittedCount !== undefined ? { submittedCount: choice.submittedCount } : {}) } });
      await route.fulfill({ response, headers: { ...response.headers(), ...cors } });
    } catch { /* Browser may abort a timed-out request. */ }
  });
  return () => keys;
}
async function enter(page: Page) { await page.goto('/room/card?room=ABCDEFGH23'); }
async function setup(page: Page) { await prism(page, '', [{ code: 200, example: 'open-host' }]); await prism(page, '/card', [{ code: 200, example: 'interim' }]); }
async function confirm(page: Page) { await page.getByRole('button', { name: '지금 마감하기' }).click(); await page.getByRole('button', { name: '마감하기', exact: true }).click(); }
test('중간 카드의 분류·문구와 방장 마감 확인을 보여준다', async ({ page }) => {
  await setup(page); await enter(page); const card = page.getByRole('article', { name: '합의 카드' });
  await expect(card.getByText('조율해요', { exact: false })).toBeVisible(); await expect(card.getByText('모두 좋아요', { exact: false })).toBeVisible();
  await expect(card.getByText('누구나 괜찮아요', { exact: false }).first()).toBeVisible(); await expect(page.getByRole('button', { name: '지금 마감하기' })).toBeVisible();
  await page.getByRole('button', { name: '지금 마감하기' }).click(); await expect(page.getByRole('dialog').getByText(/마감하면 더 답할 수 없어요/)).toBeVisible();
  await page.getByRole('button', { name: '취소' }).click(); await expect(page.getByRole('dialog')).not.toBeVisible();
});
test('한 명의 응답은 빈 카드 안내와 꺼진 마감 버튼을 보인다', async ({ page }) => {
  await prism(page, '', [{ code: 200, example: 'open-host', submittedCount: 1 }]); await prism(page, '/card', [{ code: 200, example: 'one-response' }]); await enter(page);
  await expect(page.getByText('친구를 부르면 카드가 생겨요')).toBeVisible(); await expect(page.getByRole('button', { name: '지금 마감하기' })).toBeDisabled();
});
test('참여자에게 마감 버튼을 보이지 않는다', async ({ page }) => {
  await prism(page, '', [{ code: 200, example: 'open-host', member: true }]); await prism(page, '/card', [{ code: 200, example: 'interim' }]); await enter(page);
  await expect(page.getByRole('article', { name: '합의 카드' })).toBeVisible(); await expect(page.getByRole('button', { name: '지금 마감하기' })).toHaveCount(0);
});
test('느린 카드 요청은 자리 표시 후 오류를 재시도한다', async ({ page }) => {
  await prism(page, '', [{ code: 200, example: 'open-host' }]); await prism(page, '/card', [{ code: 500, delay: 4000 }, { code: 200, example: 'interim' }]); await enter(page);
  await expect(page.getByRole('status')).toBeVisible(); await expect(page.getByText('잠시 뒤 다시 해 주세요')).toBeVisible();
  await page.getByRole('button', { name: '다시 시도' }).click(); await expect(page.getByRole('article', { name: '합의 카드' })).toBeVisible();
});
for (const [code, example, heading] of [[403, 'origin-not-allowed', '지금은 쓸 수 없어요'], [404, 'room-not-found', '이 방은 없거나 보관 기간이 지났어요']] as const) test(`카드 ${code} 안내`, async ({ page }) => {
  await prism(page, '', [{ code: 200, example: 'open-host' }]); await prism(page, '/card', [{ code, example }]); await enter(page); await expect(page.getByRole('heading', { name: heading })).toBeVisible();
});
test('이미 최종 카드가 만들어졌으면 최종 화면으로 간다', async ({ page }) => {
  await prism(page, '', [{ code: 200, example: 'open-host' }]); await prism(page, '/card', [{ code: 200, example: 'final' }]); await enter(page); await expect(page).toHaveURL(/\/room\/final$/);
});
test('방장 마감 성공은 최종 화면으로 간다', async ({ page }) => {
  await setup(page); await prism(page, '/close', [{ code: 200, example: 'closed-now' }]); await enter(page); await confirm(page); await expect(page).toHaveURL(/\/room\/final$/);
});
test('방장 권한이 없으면 버튼을 감추고 안내한다', async ({ page }) => {
  await setup(page); await prism(page, '/close', [{ code: 403, example: 'not-host' }]); await enter(page); await confirm(page);
  await expect(page.getByText('방장만 마감할 수 있어요')).toBeVisible(); await expect(page.getByRole('button', { name: '지금 마감하기' })).toHaveCount(0);
});
test('2명 미만 마감 거절은 안내하고 현황을 새로 불러온다', async ({ page }) => {
  await setup(page); await prism(page, '/close', [{ code: 409, example: 'not-enough' }]); await enter(page); await confirm(page);
  await expect(page.getByText('2명 이상이 답해야 마감할 수 있어요')).toBeVisible(); await expect(page.getByRole('dialog')).not.toBeVisible();
});
test('마감 서버 오류는 확인 창에 보이고 같은 요청 ID로 재시도한다', async ({ page }) => {
  await setup(page); const keys = await prism(page, '/close', [{ code: 500 }, { code: 200, example: 'closed-now' }]); await enter(page); await confirm(page);
  await expect(page.getByRole('dialog').getByText('잠시 뒤 다시 해 주세요')).toBeVisible(); await page.getByRole('dialog').getByRole('button', { name: '다시 시도' }).click();
  await expect(page).toHaveURL(/\/room\/final$/); expect(keys()).toHaveLength(2); expect(keys()[0]).toBe(keys()[1]);
});
test('마감 한도는 확인 창에서 남은 시간 동안 재시도를 막는다', async ({ page }) => {
  await setup(page); await prism(page, '/close', [{ code: 429 }]); await enter(page); await confirm(page);
  await expect(page.getByRole('dialog').getByRole('button', { name: /다시 시도/ })).toBeDisabled();
});
test('새로고침 중 카드를 유지하며 진행 상태를 보여준다', async ({ page }) => {
  await prism(page, '', [{ code: 200, example: 'open-host' }, { code: 200, example: 'open-host', delay: 1500 }]); await prism(page, '/card', [{ code: 200, example: 'interim' }]); await enter(page);
  await page.getByRole('button', { name: '새로고침' }).click(); await expect(page.getByText(/다시 불러오는 중/)).toBeVisible();
  await expect(page.getByRole('article', { name: '합의 카드' })).toBeVisible(); await expect(page.getByRole('button', { name: '새로고침' })).toBeVisible();
});
test('재인증 실패는 확인 오류 화면으로 돌아간다', async ({ page }) => {
  await prism(page, '', [{ code: 200, example: 'open-host' }]); await prism(page, '/card', [{ code: 401 }]); await enter(page);
  await expect(page).toHaveURL(/\/$/); await expect(page.getByRole('heading', { name: '확인하지 못했어요' })).toBeVisible();
});
