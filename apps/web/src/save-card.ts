import { File } from '@apps-in-toss/web-framework';
import { toPng } from 'html-to-image';
export async function captureCard(element: HTMLElement): Promise<string> {
  const width = element.getBoundingClientRect().width;
  if (!width) throw new Error('card has no width');
  const dataUrl = await toPng(element, { pixelRatio: 1080 / width, skipFonts: true });
  if (!dataUrl.startsWith('data:image/png;base64,')) throw new Error('invalid image');
  return dataUrl.slice('data:image/png;base64,'.length);
}
export function cardFilename(now = new Date()): string {
  return `moim-card-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}.png`;
}
export async function saveCard(element: HTMLElement): Promise<void> {
  const data = await captureCard(element);
  await File.saveBase64({ data, fileName: cardFilename(), mimeType: 'image/png' });
}
