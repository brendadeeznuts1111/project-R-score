import { HEADERS, LIMITS, AUTH } from 'stuff-a/config';
import { Errors, errorResponse } from 'stuff-a/errors';
import { checkRateLimit } from './rate-limit';

export function withCors(res: Response): Response {
  for (const [key, value] of Object.entries(HEADERS.CORS)) {
    res.headers.set(key, value);
  }
  return res;
}

export function corsPreflightResponse(): Response {
  return withCors(new Response(null, { status: 204 }));
}

export interface RequestLog {
  method: string;
  path: string;
  status: number;
  durationMs: number;
  ts: number;
  requestId: string;
}

const logs: RequestLog[] = [];

export function logRequest(entry: RequestLog): void {
  logs.push(entry);
  if (logs.length > LIMITS.MAX_REQUEST_LOGS) logs.shift();
}

export function getRequestLogs(limit = LIMITS.DEFAULT_LOG_LIMIT): RequestLog[] {
  return logs.slice(-limit);
}

export async function withTiming(
  handler: () => Response | Promise<Response>,
  method: string,
  path: string,
): Promise<Response> {
  const requestId = crypto.randomUUID();
  const t0 = Bun.nanoseconds();
  const res = await handler();
  const durationMs = (Bun.nanoseconds() - t0) / 1e6;
  logRequest({ method, path, status: res.status, durationMs, ts: Date.now(), requestId });
  res.headers.set(HEADERS.RESPONSE_TIME, `${durationMs.toFixed(2)}ms`);
  res.headers.set('X-Request-Id', requestId);
  return withCors(res);
}

export async function checkAuth(req: Request): Promise<boolean> {
  if (!AUTH.API_TOKEN) return true; // no token configured = open access
  const header = req.headers.get(HEADERS.AUTH);
  if (!header?.startsWith(AUTH.BEARER_PREFIX)) return false;
  const token = header.slice(AUTH.BEARER_PREFIX.length);
  return await Bun.password.verify(token, AUTH.API_TOKEN);
}

export async function hashToken(plaintext: string): Promise<string> {
  return await Bun.password.hash(plaintext, { algorithm: 'bcrypt', cost: AUTH.BCRYPT_COST });
}

export function withRateLimit(req: Request): Response | null {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim()
    ?? req.headers.get('x-real-ip')
    ?? 'unknown';
  const result = checkRateLimit(ip);
  if (!result.allowed) {
    const res = errorResponse(Errors.rateLimited());
    res.headers.set('Retry-After', '60');
    return res;
  }
  return null;
}
