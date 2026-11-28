import { entryContext } from './entry-context';
export const roomContext: { origin: 'invite' | 'home'; name: string; closedNotice: boolean } = { origin: entryContext.room ? 'invite' : 'home', name: '', closedNotice: false };
