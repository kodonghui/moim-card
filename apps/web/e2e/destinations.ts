import type { Page } from '@playwright/test';

// Later screens load their own data after navigation; these defaults keep earlier
// screen tests focused on their own API responses, and each test may override them.
export async function mockDestinations(page: Page) {
  const headers = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,POST,OPTIONS' };
  await page.route(/\/v1\/rooms\/[^/]+\/(?:questions|my-profile|card)$/, route => {
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
    if (route.request().url().endsWith('/questions')) return route.fulfill({ headers, json: { questions: Array.from({ length: 8 }, (_, i) => ({ position: i + 1, prompt: `질문 ${i + 1}`, optionA: '선택 A', optionB: '선택 B' })) } });
    if (route.request().url().endsWith('/card')) return route.fulfill({ headers, json: { stage: 'final', basedOnCount: 2, partySize: 4, items: [], nextAction: null, asOf: '2026-11-28T09:30:00Z' } });
    return route.fulfill({ headers, json: { summary: '차근차근 정해요', axes: [{ axis: 'plan_speed', band: 'balanced' }] } });
  });
}
