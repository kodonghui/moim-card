import { entryContext } from './entry-context';
export const roomContext: { origin: 'invite' | 'home'; name: string; closedNotice: boolean; alreadySubmitted: boolean } = { origin: entryContext.room ? 'invite' : 'home', name: '', closedNotice: false, alreadySubmitted: false };
