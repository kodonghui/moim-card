/** Common HTTP behavior for API-001 through API-016 (G-1–G-10). */
export type Problem = { status: number; code: string; traceId?: string; errors?: Array<{ field: string; reason: string }> };
export class ApiError extends Error {
  constructor(readonly problem: Problem, readonly retryAfter: number = 0) { super(problem.code); }
}
type Options = { baseUrl: string; reauthenticate: () => Promise<string>; fetcher?: typeof fetch; onLoading?: (loading: boolean) => void };
type RequestOptions = { method?: 'GET' | 'POST' | 'DELETE'; body?: unknown; idempotent?: boolean; authenticated?: boolean; retryAuthentication?: boolean };
export class ApiClient {
  private token: string | undefined;
  private readonly fetcher: typeof fetch;
  constructor(private readonly options: Options) { this.fetcher = options.fetcher ?? globalThis.fetch.bind(globalThis); }
  setToken(token: string): void { this.token = token; }
  clearToken(): void { this.token = undefined; }

  /** Keep this operation for retries: a timeout must reuse its idempotency key. */
  operation<T>(path: string, request: RequestOptions = {}): () => Promise<T> {
    const key = { value: request.idempotent ? crypto.randomUUID() : undefined };
    let inFlight: Promise<T> | undefined;
    const run = (): Promise<T> => {
      if (inFlight) return inFlight;
      inFlight = this.execute<T>(path, request, key).finally(() => { inFlight = undefined; });
      return inFlight;
    };
    return run;
  }
  private async execute<T>(path: string, request: RequestOptions, key: { value?: string }): Promise<T> {
    let refreshed = false;
    let conflicted = false;
    while (true) {
      try {
        return await this.once<T>(path, request, key.value);
      } catch (error) {
        if (!(error instanceof ApiError)) throw error;
        if (error.problem.status === 401 && error.problem.code === 'unauthenticated' && request.authenticated !== false && request.retryAuthentication !== false && !refreshed) {
          refreshed = true;
          try { this.token = await this.options.reauthenticate(); }
          catch { this.clearToken(); throw new ApiError({ status: 401, code: 'reauthentication_failed' }); }
          continue;
        }
        if (error.problem.code === 'idempotency_conflict' && key.value && !conflicted) {
          conflicted = true;
          key.value = crypto.randomUUID();
          continue;
        }
        throw error;
      }
    }
  }
  private async once<T>(path: string, request: RequestOptions, key?: string): Promise<T> {
    const abort = new AbortController();
    const headers = new Headers();
    if (request.authenticated !== false && this.token) headers.set('Authorization', `Bearer ${this.token}`);
    if (key) headers.set('Idempotency-Key', key);
    if (request.body !== undefined) headers.set('Content-Type', 'application/json');
    const isRead = (request.method ?? 'GET') === 'GET';
    if (!isRead) this.options.onLoading?.(true);
    const loading = isRead ? setTimeout(() => this.options.onLoading?.(true), 1000) : undefined;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      const { response, data } = await Promise.race([
        this.fetcher(new URL(path, this.options.baseUrl), { method: request.method ?? 'GET', headers, body: request.body === undefined ? undefined : JSON.stringify(request.body), signal: abort.signal }).then(async response => ({ response, data: response.status === 204 ? undefined : await response.json() })),
        new Promise<never>((_, reject) => { timeout = setTimeout(() => { abort.abort(); reject(new ApiError({ status: 0, code: 'timeout' })); }, 10000); }),
      ]);
      if (!response.ok) {
        const problem = data as Problem;
        if (['invalid_request', 'route_not_found', 'method_not_allowed'].includes(problem.code)) console.error('client request error');
        throw new ApiError(problem, Number(response.headers.get('Retry-After')) || 0);
      }
      return data as T;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError({ status: 0, code: 'network_error' });
    } finally {
      if (loading) clearTimeout(loading);
      if (timeout) clearTimeout(timeout);
      this.options.onLoading?.(false);
    }
  }
}
export function onVisible(refresh: () => void): () => void {
  const listener = () => { if (document.visibilityState === 'visible') refresh(); };
  document.addEventListener('visibilitychange', listener);
  return () => document.removeEventListener('visibilitychange', listener);
}
export function formatAsOf(value: string): string {
  return `${new Intl.DateTimeFormat('ko-KR', { hour: 'numeric', minute: '2-digit' }).format(new Date(value))} 기준`;
}

export function retrySeconds(retryAfter: number, receivedAt: number, now = Date.now()): number {
  return Math.max(0, Math.ceil((receivedAt + retryAfter * 1000 - now) / 1000));
}
