import { Analytics } from '@apps-in-toss/web-framework';
export function logInterimCard(): void {
  void Analytics.log({ log_name: 'interim_card_created', log_type: 'event', params: {} }).catch(() => {});
}
