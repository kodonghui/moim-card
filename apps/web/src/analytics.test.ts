import { expect, it, vi } from 'vitest';
const { log } = vi.hoisted(() => ({ log: vi.fn().mockResolvedValue(undefined) }));
vi.mock('@apps-in-toss/web-framework', () => ({ Analytics: { log } }));
import { logInterimCard } from './analytics';
it('전환 이벤트에 앱의 추가 파라미터를 넣지 않는다', () => {
  logInterimCard();
  expect(log).toHaveBeenCalledOnce();
  expect(log).toHaveBeenCalledWith({ log_name: 'interim_card_created', log_type: 'event', params: {} });
});
