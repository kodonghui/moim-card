import { Hono } from 'hono';
import { errorCatalog, type ErrorCode } from './errors';

type Route = { method: string; path: string; handler: (request: Request) => Response | Promise<Response> };
type Log = (entry: { traceId: string; code: ErrorCode; user?: string }) => void;

/** User identifiers are hashed before logging, and raw request data is never accepted. */
export async function userLogId(userId: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(userId));
  return Array.from(new Uint8Array(digest).slice(0, 4), b => b.toString(16).padStart(2, '0')).join('');
}

function matches(pattern: string, path: string): boolean {
  const a = pattern.split('/'); const b = path.split('/');
  return a.length === b.length && a.every((part, i) => part.startsWith(':') ? b[i].length > 0 : part === b[i]);
}

export function problemResponse(code: ErrorCode, log: Log = entry => console.error(JSON.stringify(entry)), headers: Record<string, string> = {}): Response {
    const bytes = crypto.getRandomValues(new Uint8Array(8));
    const traceId = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
    const { status, title } = errorCatalog[code];
    log({ traceId, code });
    return new Response(JSON.stringify({ type: 'about:blank', title, status, code, traceId }), {
      status, headers: { 'content-type': 'application/problem+json', ...headers },
    });
}

export function createApi(origins: readonly [string, string], routes: Route[] = [], log: Log = entry => console.error(JSON.stringify(entry))) {
  const app = new Hono();
  const problem = (code: ErrorCode, headers: Record<string, string> = {}) => problemResponse(code, log, headers);
  app.use('*', async (c, next) => {
    const origin = c.req.header('Origin');
    if (!origin || !origins.includes(origin)) return problem('origin_not_allowed');
    if (c.req.method === 'OPTIONS' && c.req.header('Access-Control-Request-Method')) {
      const allowed = [...new Set(routes.filter(route => matches(route.path, c.req.path)).map(route => route.method.toUpperCase()))];
      if (!allowed.length) return problem('route_not_found');
      if (!allowed.includes(c.req.header('Access-Control-Request-Method')!.toUpperCase())) return problem('method_not_allowed', { Allow: allowed.join(', ') });
      return new Response(null, { status: 204, headers: { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Methods': allowed.join(', '), 'Access-Control-Allow-Headers': 'Authorization, Content-Type, Idempotency-Key', 'Vary': 'Origin' } });
    }
    await next();
    c.header('Access-Control-Allow-Origin', origin);
    c.header('Access-Control-Expose-Headers', 'Retry-After');
    c.header('Vary', 'Origin');
  });
  for (const route of routes) app.on(route.method.toUpperCase(), route.path, c => route.handler(c.req.raw));
  app.notFound(c => {
    const allowed = [...new Set(routes.filter(route => matches(route.path, c.req.path)).map(route => route.method.toUpperCase()))];
    return allowed.length ? problem('method_not_allowed', { Allow: allowed.join(', ') }) : problem('route_not_found');
  });
  app.onError(() => problem('internal'));
  return app;
}
