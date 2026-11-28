import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { OG_IMAGE } from './share';
it('공유 이미지의 크기와 권리 증빙 해시가 일치한다', () => {
  const png = readFileSync('../../design/og/share-card.png');
  const rights = JSON.parse(readFileSync('../../design/og/share-card.rights.json', 'utf8'));
  expect(png.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
  expect(png.readUInt32BE(16)).toBe(1200); expect(png.readUInt32BE(20)).toBe(600);
  expect(createHash('sha256').update(png).digest('hex')).toBe(rights.sha256);
  expect(new URL(OG_IMAGE).protocol).toBe('https:');
});
