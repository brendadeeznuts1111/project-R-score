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
 *   GET  /auth/export   Authorization: Bearer <token> → JSON attachment (own data;
 *                       ?node=<TreeNodeId> for another node requires admin|superadmin)
 *   POST /auth/impersonate     Bearer (superadmin) + { nodeId } → { token, expiresAt }
 *   POST /auth/impersonate/end Bearer (the impersonated token) → { ok: true }
 *
 * Responses to session-resolving routes (session, export, impersonate/end)
 * carry `X-Impersonator: <nodeId>` when the resolved session is impersonated.
 */

import { asTokenId, tryTreeNodeId } from '../types/branded.ts';
import { exportData } from './export.ts';
import {
  AccountLockedError,
  AnomalyBlockedError,
  IdentityError,
  InvalidCredentialsError,
  type IdentitySystem,
  type SessionInfo,
} from './identity.ts';
import { endImpersonation, impersonate } from './impersonate.ts';

interface LoginBody {
  slug: string;
  password: string;
}

function isLoginBody(value: unknown): value is LoginBody {
  if (typeof value !== 'object' || value === null) return false;
  const body = value as Record<string, unknown>;
  return typeof body.slug === 'string' && typeof body.password === 'string';
}

interface ImpersonateBody {
  nodeId: string; // brand-ok — raw wire body, branded via tryTreeNodeId at this boundary
}

function isImpersonateBody(value: unknown): value is ImpersonateBody {
  if (typeof value !== 'object' || value === null) return false;
  const body = value as Record<string, unknown>;
  return typeof body.nodeId === 'string';
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

/** Stamps `X-Impersonator` when the resolved session is impersonated. */
function withImpersonatorHeader(res: Response, session: SessionInfo): Response {
  if (session.impersonatorId) {
    res.headers.set('X-Impersonator', session.impersonatorId as string);
  }
  return res;
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
        if (err instanceof AnomalyBlockedError) return jsonError(403, err.reason);
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
      return withImpersonatorHeader(
        Response.json({
          sessionId: session.sessionId as string,
          nodeId: session.nodeId as string,
          role: session.role,
        }),
        session
      );
    }

    if (url.pathname === '/auth/export' && req.method === 'GET') {
      const token = bearerToken(req);
      if (!token) return jsonError(401, 'Missing bearer token');
      const session = identity.resolveSession(asTokenId(token));
      if (!session) return jsonError(401, 'Invalid or expired session');

      let targetNode = session.nodeId;
      const nodeParam = url.searchParams.get('node');
      if (nodeParam !== null && nodeParam !== (session.nodeId as string)) {
        if (!identity.requireRole(session.nodeId, 'admin')) {
          return jsonError(403, 'Admin role required to export another node');
        }
        const parsed = tryTreeNodeId(nodeParam);
        if (!parsed) return jsonError(400, 'Invalid node id');
        targetNode = parsed;
      }

      const data = exportData(identity, targetNode);
      return withImpersonatorHeader(
        new Response(JSON.stringify(data, null, 2), {
          status: 200,
          headers: {
            'content-type': 'application/json; charset=utf-8',
            'content-disposition': `attachment; filename="export-${targetNode as string}.json"`,
          },
        }),
        session
      );
    }

    if (url.pathname === '/auth/impersonate' && req.method === 'POST') {
      const token = bearerToken(req);
      if (!token) return jsonError(401, 'Missing bearer token');
      const session = identity.resolveSession(asTokenId(token));
      if (!session) return jsonError(401, 'Invalid or expired session');
      if (!identity.requireRole(session.nodeId, 'superadmin')) {
        return jsonError(403, 'Superadmin role required to impersonate');
      }

      const body = await parseJsonBody(req);
      if (!isImpersonateBody(body)) return jsonError(400, 'Invalid request body');
      const targetNodeId = tryTreeNodeId(body.nodeId);
      if (!targetNodeId) return jsonError(400, 'Invalid node id');

      try {
        const result = await impersonate(identity, session.nodeId, targetNodeId);
        return Response.json({
          token: result.token as string,
          expiresAt: result.expiresAt,
        });
      } catch (err) {
        if (err instanceof IdentityError) {
          if (err.message === 'Target node not found') return jsonError(404, err.message);
          if (err.message.includes('superadmin')) return jsonError(403, err.message);
          return jsonError(400, err.message);
        }
        throw err;
      }
    }

    if (url.pathname === '/auth/impersonate/end' && req.method === 'POST') {
      const token = bearerToken(req);
      if (!token) return jsonError(401, 'Missing bearer token');
      const session = identity.resolveSession(asTokenId(token));
      if (!session) return jsonError(401, 'Invalid or expired session');
      endImpersonation(identity, asTokenId(token));
      return withImpersonatorHeader(Response.json({ ok: true }), session);
    }

    return jsonError(404, 'Not found');
  };
}
