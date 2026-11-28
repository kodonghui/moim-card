import { beforeEach, expect, it, vi } from 'vitest';
const sdk = vi.hoisted(() => {
  const request = Object.assign(vi.fn(), { isSupported: vi.fn() });
  return { request };
});
vi.mock('@apps-in-toss/web-framework', () => ({ Notification: { requestAgreement: sdk.request } }));
import { requestAgreement, withConsent } from './notification';
beforeEach(() => { vi.clearAllMocks(); });
it('미지원 버전은 동의 창과 신청을 부르지 않는다', async () => {
  sdk.request.isSupported.mockReturnValue(false); const submit = vi.fn();
  expect(await withConsent(await requestAgreement('template'), submit)).toBe('unsupported');
  expect(sdk.request).not.toHaveBeenCalled(); expect(submit).not.toHaveBeenCalled();
});
it('거절하면 신청하지 않고 동의하면 신청한다', async () => {
  const submit = vi.fn().mockResolvedValue(201);
  expect(await withConsent('agreementRejected', submit)).toBe('rejected'); expect(submit).not.toHaveBeenCalled();
  expect(await withConsent('newAgreement', submit)).toBe(201); expect(submit).toHaveBeenCalledOnce();
});
it('동의 결과를 받고 SDK 콜백을 정리한다', async () => {
  sdk.request.isSupported.mockReturnValue(true); const cleanup = vi.fn();
  sdk.request.mockImplementation(({ onEvent }) => { queueMicrotask(() => onEvent({ type: 'alreadyAgreed' })); return cleanup; });
  expect(await requestAgreement('template')).toBe('alreadyAgreed'); expect(cleanup).toHaveBeenCalledOnce();
});
