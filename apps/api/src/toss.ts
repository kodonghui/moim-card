type FetchBinding = { fetch(input: Request): Promise<Response> };
type Failure = { ok: false; reason: 'invalid_auth' | 'rate_limited' | 'unavailable' };
type Success<T> = { ok: true; value: T };
const BASE = 'https://apps-in-toss-api.toss.im';
const PREFIX = '/api-partner/v1/apps-in-toss';

/** Pass a Workers mTLS binding; tests pass an in-memory server with the same fetch interface. */
export function createTossClient(binding: FetchBinding) {
  async function call(path: string, body: unknown, anonKey?: string, timeoutMs = 5000): Promise<Success<unknown> | Failure> {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const request = new Request(BASE + PREFIX + path, {
        method: 'POST', headers: { 'content-type': 'application/json', ...(anonKey ? { 'x-anon-key': anonKey } : {}) },
        body: JSON.stringify(body), signal: controller.signal,
      });
      const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(() => { controller.abort(); reject(new Error('timeout')); }, timeoutMs);
      });
      const response = await Promise.race([binding.fetch(request), timeout]);
      if (!response.ok) return {ok: false, reason: 'unavailable'};
      const data: unknown = await Promise.race([response.json(), timeout]);
      if (!data || typeof data !== 'object') return {ok: false, reason: 'unavailable'};
      const result = data as { resultType?: unknown; success?: unknown; error?: {errorCode?: unknown} };
      if (result.resultType === 'SUCCESS') return {ok: true, value: result.success};
      const errorCode = String(result.error?.errorCode ?? '');
      if (errorCode === '4011') return {ok: false, reason: 'invalid_auth'};
      if (errorCode === '4095') return {ok: false, reason: 'rate_limited'};
      return {ok: false, reason: 'unavailable'};
    } catch {
      return {ok: false, reason: 'unavailable'};
    } finally {
      if (timer !== undefined) clearTimeout(timer);
    }
  }
  return {
    async exchange(code: string): Promise<Success<string> | Failure> {
      const result = await call('/users/anon-key/exchange', {code});
      if (!result.ok) return result;
      const value = result.value as { anonKey?: unknown } | null;
      return typeof value?.anonKey === 'string' && value.anonKey.length > 0 ? {ok: true, value: value.anonKey} : {ok: false, reason: 'unavailable'};
    },
    async sendMessage(anonKey: string, templateSetCode: string, context: Record<string, string>, timeoutMs = 5000): Promise<Success<void> | Failure> {
      const result = await call('/messenger/send-message', {templateSetCode, context}, anonKey, timeoutMs);
      return result.ok ? {ok: true, value: undefined} : result;
    },
  };
}
