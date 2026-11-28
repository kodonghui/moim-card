import { User } from '@apps-in-toss/web-framework';
import { ApiClient } from './api';
export async function authCode(): Promise<string> { return (await User.createAnonymousKeyAuthCode()).code; }
export const client: ApiClient = new ApiClient({
  baseUrl: import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:4010',
  reauthenticate: async (): Promise<string> => {
    const code = await authCode();
    return (await client.operation<{ sessionToken: string }>('/v1/sessions', { method: 'POST', authenticated: false, body: { authCode: code } })()).sessionToken;
  },
});
