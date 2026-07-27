/**
 * HTTP wire boundary for the identity subsystem (Phase 0).
 *
 * This is the ONLY place `unknown` enters: request bodies are parsed and
 * type-guarded here, then branded/typed values flow inward. Returns `null`
 * for non-`/auth/` paths so hosts can chain handlers.
 *
 * Routes:
 *   POST /auth/login    { slug, password } → { token, sessionId, expiresAt }
 *   POST /auth/logout   Authorization: Bearer <token>
 *   GET  /auth/session  Authorization: Bearer <token> → { sessionId, nodeId, role }
 */

import { asTokenId } from '../types/branded.ts';
import {
  AccountLockedError,
  IdentityError,
  InvalidCredentialsError,
  type IdentitySystem,
} from './identity.ts';

interface LoginBody {
  slug: string;
  password: string;
}

function isLoginBody(value: unknown): value is LoginBody {
  if (typeof value !== 'object' || value === null) return false;
  const body = value as Record<string, unknown>;
  return typeof body.slug === 'string' && typeof body.password === 'string';
}

async function parseJsonBody(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    return null;
  }
}

function bearerToken(req: Request): string | null {
  const header = req.headers.get('authorization');
  if (!header?.startsWith('Bearer ')) return null;
  const token = header.slice('Bearer '.length).trim();
  return token.length > 0 ? token : null;
}

function clientIp(req: Request): string | undefined {
  return (
    req.headers.get('cf-connecting-ip') ??
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    undefined
  );
}

function jsonError(status: number, error: string): Response {
  return Response.json({ error }, { status });
}

export function createIdentityHandler(
  identity: IdentitySystem
): (req: Request) => Promise<Response | null> {
  return async (req: Request): Promise<Response | null> => {
    const url = new URL(req.url);
    if (!url.pathname.startsWith('/auth/')) return null;

    if (url.pathname === '/auth/login' && req.method === 'POST') {
      const body = await parseJsonBody(req);
      if (!isLoginBody(body)) return jsonError(400, 'Invalid request body');

      try {
        const result = await identity.login(body.slug, body.password, {
          ip: clientIp(req),
          userAgent: req.headers.get('user-agent') ?? undefined,
        });
        return Response.json({
          token: result.token as string,
          sessionId: result.sessionId as string,
          expiresAt: result.expiresAt,
        });
      } catch (err) {
        if (err instanceof AccountLockedError) return jsonError(423, 'Account is locked');
        if (err instanceof InvalidCredentialsError) return jsonError(401, 'Invalid credentials');
        if (err instanceof IdentityError) return jsonError(400, err.message);
        throw err;
      }
    }

    if (url.pathname === '/auth/logout' && req.method === 'POST') {
      const token = bearerToken(req);
      if (!token) return jsonError(401, 'Missing bearer token');
      identity.logout(asTokenId(token));
      return Response.json({ ok: true });
    }

    if (url.pathname === '/auth/session' && req.method === 'GET') {
      const token = bearerToken(req);
      if (!token) return jsonError(401, 'Missing bearer token');
      const session = identity.resolveSession(asTokenId(token));
      if (!session) return jsonError(401, 'Invalid or expired session');
      return Response.json({
        sessionId: session.sessionId as string,
        nodeId: session.nodeId as string,
        role: session.role,
      });
    }

    return jsonError(404, 'Not found');
  };
}
