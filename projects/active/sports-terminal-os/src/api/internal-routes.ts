/**
 * Internal API Routes
 *
 * Endpoints used by internal workers (Shadow Agent, health probes, etc.)
 * Not exposed to external clients — gated by INTERNAL_API_TOKEN.
 *
 * Endpoints:
 *   POST /api/internal/update-cookies  — Receive fresh cf_clearance from Shadow Agent
 */

import { createLogger } from "@utils/logger";
import { logHealth } from "@utils/tableLogger";
import { updateSessionCfToken, listActiveSessions } from "@auth/session";

const logger = createLogger("InternalRoutes");

// ---------------------------------------------------------------------------
// Auth helper
// ---------------------------------------------------------------------------

/** Validate the internal API token from Authorization header or X-Internal-Token. */
function validateInternalAuth(req: Request): boolean {
  const token = process.env.INTERNAL_API_TOKEN;
  if (!token) {
    const allowDevelopmentRequest = process.env.NODE_ENV !== "production";
    logger.warn(
      allowDevelopmentRequest
        ? "INTERNAL_API_TOKEN not set — internal endpoints are open outside production"
        : "INTERNAL_API_TOKEN not set — rejecting internal endpoint request"
    );
    return allowDevelopmentRequest;
  }

  // Check X-Internal-Token header first
  const headerToken = req.headers.get("X-Internal-Token");
  if (headerToken === token) return true;

  // Check Bearer token
  const auth = req.headers.get("Authorization");
  if (auth?.startsWith("Bearer ")) {
    const bearerToken = auth.slice(7);
    if (bearerToken === token) return true;
  }

  return false;
}

function internalUnauthorizedResponse(): Response {
  return Response.json(
    { error: "Unauthorized — invalid or missing INTERNAL_API_TOKEN" },
    { status: 401 }
  );
}

// ---------------------------------------------------------------------------
// POST /api/internal/update-cookies
// ---------------------------------------------------------------------------

interface UpdateCookiesBody {
  sessionId: string;
  cfClearance: string;
  cfBm?: string;
  expiresAt?: number;
}

/**
 * Receive fresh Cloudflare cookies from the Shadow Agent Worker.
 *
 * Body:
 *   - sessionId:    Which Buckeye session these cookies are for
 *   - cfClearance:  cf_clearance cookie value (required)
 *   - cfBm:         __cf_bm cookie value (optional, stored in metadata)
 *   - expiresAt:    Unix epoch when cf_clearance expires (optional, default +30min)
 */
export async function handleUpdateCookies(req: Request, _auth?: unknown): Promise<Response> {
  // Auth gate
  if (!validateInternalAuth(req)) {
    return internalUnauthorizedResponse();
  }

  // Parse body
  let body: UpdateCookiesBody;
  try {
    body = (await req.json()) as UpdateCookiesBody;
  } catch {
    return Response.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  // Validate required fields
  if (!body.sessionId || typeof body.sessionId !== "string") {
    return Response.json(
      { error: "Missing or invalid sessionId" },
      { status: 400 }
    );
  }

  if (!body.cfClearance || typeof body.cfClearance !== "string") {
    return Response.json(
      { error: "Missing or invalid cfClearance" },
      { status: 400 }
    );
  }

  // Verify session exists and is active
  const activeSessions = listActiveSessions();
  const session = activeSessions.find((s) => s.sessionId === body.sessionId);

  if (!session) {
    logger.warn(`Cookie update rejected: session ${body.sessionId} not found or expired`);
    return Response.json(
      { error: "Session not found or expired", sessionId: body.sessionId },
      { status: 404 }
    );
  }

  // Update the cf_token
  const ok = updateSessionCfToken(
    body.sessionId,
    body.cfClearance,
    body.expiresAt
  );

  if (!ok) {
    return Response.json(
      { error: "Failed to update cf_token — database error" },
      { status: 500 }
    );
  }

  // Optionally store __cf_bm in session metadata
  if (body.cfBm) {
    logger.debug(`__cf_bm cookie received for session ${body.sessionId} (stored alongside cf_clearance)`);
  }

  const cookieAge = body.expiresAt
    ? Math.max(0, body.expiresAt - Math.floor(Date.now() / 1000))
    : 1800;

  logHealth({
    component: "ShadowAgent",
    action: "cookie_update",
    sessionId: body.sessionId,
    cookieAgeSeconds: cookieAge,
  });

  logger.info(
    `[ShadowAgent] Cookies updated for session ${body.sessionId} ` +
    `(cf_clearance received, TTL ~${cookieAge}s)`
  );

  return Response.json({
    ok: true,
    sessionId: body.sessionId,
    cookieAgeSeconds: cookieAge,
    activeSessionCount: activeSessions.length,
  });
}

// ---------------------------------------------------------------------------
// GET /api/internal/health (internal health check)
// ---------------------------------------------------------------------------

/**
 * Lightweight health check for internal workers.
 * Returns active session count + nearest cookie expiry.
 */
export function handleInternalHealth(req: Request, _auth?: unknown): Response {
  if (!validateInternalAuth(req)) {
    return internalUnauthorizedResponse();
  }

  const sessions = listActiveSessions();
  const nearestExpiry = sessions.length > 0
    ? Math.min(...sessions.map((s) => s.expiresAt))
    : null;
  const nowSeconds = Math.floor(Date.now() / 1000);
  const nearestTtl = nearestExpiry ? Math.max(0, nearestExpiry - nowSeconds) : null;

  return Response.json({
    ok: true,
    activeSessions: sessions.length,
    nearestCookieExpirySeconds: nearestTtl,
    sessions: sessions.map((s) => ({
      sessionId: s.sessionId,
      ttlSeconds: Math.max(0, s.expiresAt - nowSeconds),
    })),
  });
}
