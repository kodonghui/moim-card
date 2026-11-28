import { entryContext } from './entry-context';
export type Profile = { summary: string; axes: Array<{ axis: 'plan_speed' | 'spending_priority' | 'schedule_change'; band: 'low' | 'balanced' | 'high' }> };
export const roomContext: { origin: 'invite' | 'home'; name: string; closedNotice: boolean; alreadySubmitted: boolean; nickname: string; nicknameRoom?: string; profile?: Profile; profileRoom?: string } = { origin: entryContext.room ? 'invite' : 'home', name: '', closedNotice: false, alreadySubmitted: false, nickname: '' };
