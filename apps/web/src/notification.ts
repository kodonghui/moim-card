import { Notification } from '@apps-in-toss/web-framework';
export type Agreement = 'newAgreement' | 'alreadyAgreed' | 'agreementRejected';
export function requestAgreement(templateCode: string): Promise<Agreement | 'unsupported'> {
  if (!Notification.requestAgreement.isSupported()) return Promise.resolve('unsupported');
  if (!templateCode) return Promise.reject(new Error('template unavailable'));
  return new Promise((resolve, reject) => {
    let cleanup: (() => void) | undefined;
    let settled = false;
    const finish = (fn: () => void) => { if (settled) return; settled = true; fn(); cleanup?.(); };
    cleanup = Notification.requestAgreement({ options: { templateCode }, onEvent: ({ type }) => finish(() => resolve(type)), onError: error => finish(() => reject(error)) });
    if (settled) cleanup();
  });
}

export async function withConsent<T>(agreement: Agreement | 'unsupported', subscribe: () => Promise<T>): Promise<T | 'unsupported' | 'rejected'> {
  if (agreement === 'unsupported') return 'unsupported';
  if (agreement === 'agreementRejected') return 'rejected';
  return subscribe();
}
