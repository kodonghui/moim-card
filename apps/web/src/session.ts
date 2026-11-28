import { User } from '@apps-in-toss/web-framework';
import { ApiClient } from './api';
export const sessionState = { reauthenticationFailed: false };
export async function authCode(): Promise<string> { return (await User.createAnonymousKeyAuthCode()).code; }
export async function refreshSession(): Promise<string> {
  const code = await authCode();
  const token = (await client.operation<{ sessionToken: string }>('/v1/sessions', { method: 'POST', authenticated: false, body: { authCode: code } })()).sessionToken;
  client.setToken(token); return token;
}
export const client: ApiClient = new ApiClient({
  baseUrl: import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://127.0.0.1:4010' : ''),
  reauthenticate: refreshSession,
});
