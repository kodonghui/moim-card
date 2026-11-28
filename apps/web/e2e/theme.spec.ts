import { test, expect } from '@playwright/test';
test('어두운 기기 설정에서도 배경, 글자, TDS 버튼은 라이트 색을 유지한다', async ({ browser }) => {
  const colors = async (scheme: 'light' | 'dark') => {
    const context = await browser.newContext({ colorScheme: scheme, viewport: { width: 360, height: 800 }, userAgent: `TossApp/5.255.0 TossColorPreference/${scheme}` });
    const page = await context.newPage();
    await page.goto('/e2e/theme.html');
    const value = await page.evaluate(() => {
      const body = getComputedStyle(document.body);
      const text = getComputedStyle(document.querySelector('p')!);
      const button = getComputedStyle(document.querySelector('button')!);
      return { background: body.backgroundColor, color: text.color, buttonBackground: getComputedStyle(document.querySelector('button > div')!).backgroundColor, buttonColor: button.color };
    });
    await context.close();
    return value;
  };
  const light = await colors('light');
  expect(light.background).toBe('rgb(255, 255, 255)');
  expect(light.color).toBe('rgb(25, 31, 40)');
  expect(light.buttonBackground).toBe('rgb(27, 100, 218)');
  expect(light.buttonColor).toBe('rgb(255, 255, 255)');
  expect(await colors('dark')).toEqual(light);
});
