import { ApiClient, ApiError } from './api';

export type EntryState = { kind: 'waiting' | 'loading' | 'update-required' | 'permission' } | { kind: 'error'; retryAfter: number; traceId?: string };
export function supported(version: string): boolean {
  if (!/^\d+\.\d+\.\d+$/.test(version)) return false;
  const parts = version.split('.').map(Number);
  const minimum = [5, 232, 0];
  for (let i = 0; i < 3; i++) if (parts[i] !== minimum[i]) return parts[i] > minimum[i];
  return true;
}
export function readEntry(url: string, replace: (url: string) => void): { room: string | null; referrerKind: 'external_share' | 'other' } {
  const parsed = new URL(url);
  const room = parsed.searchParams.get('room');
  const referrerKind = parsed.searchParams.get('referrer') === 'external_share' ? 'external_share' : 'other';
  parsed.searchParams.delete('room');
  if (room !== null) replace(parsed.pathname + parsed.search + parsed.hash);
  return { room, referrerKind };
}
export async function startEntry(deps: {
  version: () => string; authCode: () => Promise<string>; client: ApiClient;
  onState: (state: EntryState) => void; navigate: (path: string) => void;
  room: string | null; referrerKind: 'external_share' | 'other';
}): Promise<void> {
  let version: string;
  try { version = deps.version(); } catch { version = ''; }
  if (!supported(version)) { deps.onState({ kind: 'update-required' }); return; }
  deps.onState({ kind: 'waiting' });
  const loading = setTimeout(() => deps.onState({ kind: 'loading' }), 1000);
  try {
    const authCode = await deps.authCode();
    const session = await deps.client.operation<{ sessionToken: string }>('/v1/sessions', { method: 'POST', authenticated: false, body: { authCode } })();
    deps.client.setToken(session.sessionToken);
    try { await deps.client.operation('/v1/entries', { method: 'POST', retryAuthentication: false, body: { referrerKind: deps.referrerKind } })(); } catch { /* entry analytics must not block the user */ }
    deps.navigate(deps.room ? '/room' : '/home');
  } catch (error) {
    if (error instanceof ApiError && error.problem.status === 403 && error.problem.code === 'origin_not_allowed') deps.onState({ kind: 'permission' });
    else deps.onState({ kind: 'error', retryAfter: error instanceof ApiError ? error.retryAfter : 0, traceId: error instanceof ApiError ? error.problem.traceId : undefined });
  } finally { clearTimeout(loading); }
}
