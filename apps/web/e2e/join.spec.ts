import { test, expect, type Page } from '@playwright/test';
import { mockDestinations } from './destinations';
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization,content-type,idempotency-key', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS' };
const room = { roomCode: 'ABCDEFGH23', gatheringName: '제주 3박', theme: { themeId: 'travel', name: '여행' }, partySize: 4, submittedCount: 1, isFull: false, status: 'open', myRole: 'none', mySubmitted: false, asOf: '2026-11-28T09:30:00Z' };
async function enter(page: Page) {
  await page.route('**/v1/me/rooms', route => route.fulfill({ headers: cors, json: { rooms: [{ ...room, myRole: 'member' }], asOf: room.asOf } }));
  await page.goto('/home'); await page.getByRole('button', { name: /제주 3박/ }).click();
}
test('방 소개에서 닉네임을 적어 입장한다', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.route('**/v1/rooms/**', route => {
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    if (route.request().method() === 'POST') return route.fulfill({ status: 201, headers: cors, json: { myRole: 'member', mySubmitted: false } });
    return route.fulfill({ headers: cors, json: room });
  });
  await mockDestinations(page);
  await enter(page);
  await expect(page.getByText('인원 4명', { exact: true })).toBeVisible(); await expect(page.getByText('1명 답했어요', { exact: true })).toBeVisible();
  await expect(page.getByText('ABCDEFGH23')).toHaveCount(0);
  if (process.env.CAPTURE_JOIN) await page.screenshot({ path: '../../docs/10-wbs/captures/task-040.png', fullPage: true });
  await page.getByRole('button', { name: '참여하기' }).click();
  await page.getByLabel('닉네임').fill('바다'); await page.getByRole('button', { name: '들어가기' }).click();
  await expect(page).toHaveURL(/\/room\/questions$/);
});
test('8명이 찬 방은 참여 대신 방 만들기를 보여 준다', async ({ page }) => {
  await page.route('**/v1/rooms/**', route => route.fulfill({ headers: cors, json: { ...room, isFull: true } }));
  await enter(page);
  await expect(page.getByText('이 방은 8명이 다 찼어요')).toBeVisible();
  await expect(page.getByRole('button', { name: '참여하기' })).toHaveCount(0);
});
