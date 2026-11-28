import { beforeEach, expect, it, vi } from 'vitest';
const mocked = vi.hoisted(() => ({ toPng: vi.fn(), save: vi.fn() }));
vi.mock('html-to-image', () => ({ toPng: mocked.toPng }));
vi.mock('@apps-in-toss/web-framework', () => ({ File: { saveBase64: mocked.save } }));
import { captureCard, cardFilename, saveCard } from './save-card';
beforeEach(() => { vi.clearAllMocks(); mocked.toPng.mockResolvedValue('data:image/png;base64,QUJD'); mocked.save.mockResolvedValue(undefined); });
const element = { getBoundingClientRect: () => ({ width: 360 }) } as HTMLElement;
it('카드만 1080px 너비 PNG로 만들어 SDK에 저장한다', async () => {
  vi.useFakeTimers(); vi.setSystemTime(new Date(2026, 10, 28));
  await saveCard(element);
  expect(mocked.toPng).toHaveBeenCalledWith(element, { pixelRatio: 3, skipFonts: true });
  expect(mocked.save).toHaveBeenCalledWith({ data: 'QUJD', fileName: 'moim-card-20261128.png', mimeType: 'image/png' });
  expect(cardFilename()).toBe('moim-card-20261128.png'); vi.useRealTimers();
});
it('저장 실패를 호출자에게 전달한다', async () => {
  mocked.save.mockRejectedValue(new Error('denied'));
  await expect(saveCard(element)).rejects.toThrow('denied');
  await expect(captureCard({ getBoundingClientRect: () => ({ width: 0 }) } as HTMLElement)).rejects.toThrow();
});
