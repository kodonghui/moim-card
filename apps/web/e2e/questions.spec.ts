import { test, expect, type Page } from '@playwright/test';
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization,content-type,idempotency-key', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS' };
const code = 'ABCDEFGH23';
const room = { roomCode: code, gatheringName: '제주 3박', theme: { themeId: 'travel', name: '여행' }, partySize: 4, submittedCount: 1, isFull: false, status: 'open', myRole: 'member', mySubmitted: false, asOf: '2026-11-28T09:30:00Z' };
const questions = Array.from({ length: 8 }, (_, i) => ({ position: i + 1, prompt: `질문 ${i + 1}`, optionA: `선택 A ${i + 1}`, optionB: `선택 B ${i + 1}` }));
async function enter(page: Page, conversion = false) {
  await page.route('**/v1/me/rooms', route => route.fulfill({ headers: cors, json: { rooms: [room], asOf: room.asOf } }));
  await page.route('**/v1/rooms/**', route => {
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    if (route.request().method() === 'POST') return route.fulfill({ status: 201, headers: cors, json: { logConversion: conversion, roomStatus: 'open' } });
    if (route.request().url().endsWith('/my-profile')) return route.fulfill({ headers: cors, json: { summary: '차근차근 정해요', axes: [{ axis: 'plan_speed', band: 'balanced' }] } });
    return route.fulfill({ headers: cors, json: route.request().url().endsWith('/questions') ? { questionSetVersion: 1, questions } : room });
  });
  await page.goto('/home'); await page.getByRole('button', { name: /제주 3박/ }).click();
  await expect(page.getByRole('heading', { name: '8개 중 0개 골랐어요' })).toBeVisible();
}
test('답을 저장하고 다시 열어 나머지를 고른 뒤 제출한다', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 }); await enter(page);
  await page.getByRole('button', { name: '선택 A 1', exact: true }).click();
  await expect(page.getByRole('heading', { name: '8개 중 1개 골랐어요' })).toBeVisible();
  await expect(page.getByRole('progressbar', { name: '문항 선택 진행' })).toHaveAttribute('aria-valuenow', '1');
  await page.evaluate(() => window.scrollTo(0, 500)); await expect(page.locator('.questions header')).toHaveCSS('position', 'sticky');
  await expect(page.getByRole('button', { name: '제출하기' })).toBeDisabled();
  const disabled = await page.getByRole('button', { name: '제출하기' }).evaluate(e => ({ opacity: getComputedStyle(e).opacity, background: getComputedStyle(e.querySelector('div')!).backgroundColor, color: getComputedStyle(e.querySelector('span')!).color }));
  expect(disabled).toEqual({ opacity: '1', background: 'rgb(229, 232, 235)', color: 'rgb(78, 89, 104)' });
  if (process.env.CAPTURE_QUESTIONS) await page.screenshot({ path: '../../docs/10-wbs/captures/task-041.png' });
  await page.goto('/home'); await page.getByRole('button', { name: /제주 3박/ }).click();
  await expect(page.getByRole('button', { name: '선택 A 1', exact: true })).toHaveAttribute('aria-pressed', 'true');
  for (let n = 2; n <= 8; n++) await page.getByRole('button', { name: `선택 A ${n}`, exact: true }).click();
  await expect(page.getByRole('button', { name: '제출하기' })).toBeEnabled();
  await page.getByRole('button', { name: '제출하기' }).click(); await expect(page).toHaveURL(/\/room\/result$/);
  expect(await page.evaluate(() => Object.keys(localStorage).some(k => k.includes('ABCDEFGH23')))).toBe(false);
});
for (const blocked of ['all', 'remove'] as const) test(`기기 저장소 ${blocked} 오류에도 답을 제출한다`, async ({ page }) => {
  await page.addInitScript(mode => {
    if (mode === 'all') Object.defineProperty(window, 'localStorage', { configurable: true, get() { throw new DOMException('blocked', 'SecurityError'); } });
    else Storage.prototype.removeItem = () => { throw new DOMException('blocked', 'SecurityError'); };
  }, blocked);
  await page.route('**/src/analytics.ts*', route => route.fulfill({ contentType: 'application/javascript', body: 'export function logInterimCard() { window.__conversionCount = (window.__conversionCount || 0) + 1; }' }));
  await enter(page, true);
  for (let n = 1; n <= 8; n++) await page.getByRole('button', { name: `선택 A ${n}`, exact: true }).click();
  await expect(page.getByRole('progressbar', { name: '문항 선택 진행' })).toHaveAttribute('aria-valuenow', '8');
  await page.getByRole('button', { name: '제출하기' }).click(); await expect(page).toHaveURL(/\/room\/result$/);
  expect(await page.evaluate(() => (window as Window & { __conversionCount?: number }).__conversionCount)).toBe(1);
});
