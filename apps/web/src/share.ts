import { Share, getPlatformOS, getTossAppVersion } from '@apps-in-toss/web-framework';
export const OG_IMAGE = 'https://raw.githubusercontent.com/kodonghui/moim-card/main/design/og/share-card.png';
export function supportsOg(version: string, os: 'ios' | 'android'): boolean {
  if (!/^\d+\.\d+\.\d+$/.test(version)) return false;
  const actual = version.split('.').map(Number), minimum = [5, os === 'ios' ? 239 : 240, 0];
  for (let i = 0; i < 3; i++) if (actual[i] !== minimum[i]) return actual[i] > minimum[i];
  return true;
}
export function invitationPath(appName: string, room: string): string {
  if (!/^[a-z][a-z0-9-]*$/.test(appName) || !/^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{10}$/.test(room)) throw new Error('invalid share configuration');
  return `intoss://${appName}/?room=${encodeURIComponent(room)}`;
}
export async function shareRoom(appName: string, room: string): Promise<'update' | 'shared'> {
  let supported = false;
  try { supported = supportsOg(getTossAppVersion(), getPlatformOS()); } catch { /* Treat unknown app versions as unsupported. */ }
  if (!supported) return 'update';
  const path = invitationPath(appName, room);
  const link = await Share.createLink({ path, ogImageUrl: OG_IMAGE });
  await Share.sendMessage({ message: link });
  return 'shared';
}
