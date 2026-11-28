import { beforeEach, expect, it, vi } from 'vitest';
const sdk = vi.hoisted(() => ({ createLink: vi.fn(), sendMessage: vi.fn(), version: vi.fn(), os: vi.fn() }));
vi.mock('@apps-in-toss/web-framework', () => ({ Share: { createLink: sdk.createLink, sendMessage: sdk.sendMessage }, getTossAppVersion: sdk.version, getPlatformOS: sdk.os }));
import { invitationPath, OG_IMAGE, shareRoom, supportsOg } from './share';
beforeEach(() => { vi.clearAllMocks(); sdk.version.mockReturnValue('5.240.0'); sdk.os.mockReturnValue('android'); sdk.createLink.mockResolvedValue('https://toss.example/link'); sdk.sendMessage.mockResolvedValue(undefined); });
it('링크 경로에는 방 코드만 넣고 HTTPS OG를 사용한다', async () => {
  expect(invitationPath('moim-card', 'ABCDEFGH23')).toBe('intoss://moim-card/?room=ABCDEFGH23');
  await expect(shareRoom('moim-card', 'ABCDEFGH23')).resolves.toBe('shared');
  expect(sdk.createLink).toHaveBeenCalledWith({ path: 'intoss://moim-card/?room=ABCDEFGH23', ogImageUrl: OG_IMAGE });
  expect(OG_IMAGE.startsWith('https://')).toBe(true); expect(sdk.sendMessage).toHaveBeenCalledWith({ message: 'https://toss.example/link' });
  expect(() => invitationPath('bad/path', 'ABCDEFGH23')).toThrow();
});
it('OG 미지원 버전은 공유 호출 없이 업데이트를 안내한다', async () => {
  sdk.version.mockReturnValue('5.239.0');
  await expect(shareRoom('moim-card', 'ABCDEFGH23')).resolves.toBe('update');
  expect(sdk.createLink).not.toHaveBeenCalled(); expect(supportsOg('5.239.0', 'ios')).toBe(true);
});
it('공유 시트 종료는 화면 상태를 바꾸지 않는다', async () => {
  sdk.sendMessage.mockResolvedValue(undefined);
  await expect(shareRoom('moim-card', 'ABCDEFGH23')).resolves.toBe('shared');
});
