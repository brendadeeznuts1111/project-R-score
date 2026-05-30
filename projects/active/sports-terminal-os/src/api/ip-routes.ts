/**
 * IP Surveillance API Routes
 *
 * Provides IP tracking, denylist management, flag retrieval, and reputation
 * checking. The denylist is checked at middleware level for immediate
 * blocking. Auto-flagging runs every 15 minutes via cron.
 *
 * Routes:
 *   GET    /api/ip/tracking        — IP tracking data
 *   POST   /api/ip/track           — Track an IP
 *   GET    /api/ip/denylist        — Denylist entries
 *   POST   /api/ip/denylist        — Add to denylist
 *   DELETE /api/ip/denylist/:ip    — Remove from denylist
 *   GET    /api/ip/flags/:playerId — IP flags for player
 *   GET    /api/ip/reputation/:ip  — IP reputation score
 *   POST   /api/ip/flag-shared    — Trigger shared IP flagging
 */

import {
  trackIP,
  checkIPReputation,
  addToDenylist,
  removeFromDenylist,
  listDenylist,
  listTrackedIPs,
  getIPFlags,
  flagSharedIPs,
  shouldBlockIP,
  type TrackIPInput,
  type AddToDenylistInput,
} from "@services/ip-surveillance-service";
import { logHealth, logBuckeye } from "@utils/tableLogger";
import { generateRequestId, createTimer } from "@middleware/security";

// ---------------------------------------------------------------------------
// Route Router
// ---------------------------------------------------------------------------

export async function handleIPRequest(
  req: Request,
  pathname: string
): Promise<Response> {
  const requestId = generateRequestId();
  const timer = createTimer();

  try {
    // GET /api/ip/tracking — IP tracking data
    if (pathname === "/api/ip/tracking" && req.method === "GET") {
      return handleListTracking(req, requestId, timer);
    }

    // POST /api/ip/track — Track an IP
    if (pathname === "/api/ip/track" && req.method === "POST") {
      return handleTrackIP(req, requestId, timer);
    }

    // GET /api/ip/denylist — Denylist entries
    if (pathname === "/api/ip/denylist" && req.method === "GET") {
      return handleListDenylist(req, requestId, timer);
    }

    // POST /api/ip/denylist — Add to denylist
    if (pathname === "/api/ip/denylist" && req.method === "POST") {
      return handleAddToDenylist(req, requestId, timer);
    }

    // DELETE /api/ip/denylist/:ip — Remove from denylist
    const denylistDeleteMatch = pathname.match(/^\/api\/ip\/denylist\/(.+)$/);
    if (denylistDeleteMatch && req.method === "DELETE") {
      return handleRemoveFromDenylist(denylistDeleteMatch[1]!, requestId, timer);
    }

    // GET /api/ip/flags/:playerId — IP flags for player
    const flagsMatch = pathname.match(/^\/api\/ip\/flags\/([^/]+)$/);
    if (flagsMatch && req.method === "GET") {
      return handleGetIPFlags(flagsMatch[1]!, requestId, timer);
    }

    // GET /api/ip/reputation/:ip — IP reputation score
    const reputationMatch = pathname.match(/^\/api\/ip\/reputation\/(.+)$/);
    if (reputationMatch && req.method === "GET") {
      return handleGetReputation(reputationMatch[1]!, requestId, timer);
    }

    // POST /api/ip/flag-shared — Trigger shared IP flagging
    if (pathname === "/api/ip/flag-shared" && req.method === "POST") {
      return handleFlagSharedIPs(requestId, timer);
    }

    // GET /api/ip/check-block/:ip — Quick block check
    const checkBlockMatch = pathname.match(/^\/api\/ip\/check-block\/(.+)$/);
    if (checkBlockMatch && req.method === "GET") {
      return handleCheckBlock(checkBlockMatch[1]!, requestId, timer);
    }

    return jsonError("IP surveillance endpoint not found", 404, requestId);
  } catch (err: any) {
    logHealth({
      component: "IPSurveillance",
      status: "error",
      error: `IP route error: ${err.message}`,
    });
    return jsonError(err.message, 500, requestId);
  }
}

// ---------------------------------------------------------------------------
// Tracking Handlers
// ---------------------------------------------------------------------------

async function handleListTracking(
  req: Request,
  requestId: string,
  timer: () => number
): Promise<Response> {
  const url = new URL(req.url);
  const ip = url.searchParams.get("ip") || undefined;
  const playerId = url.searchParams.get("playerId") || undefined;
  const flagged = url.searchParams.has("flagged")
    ? url.searchParams.get("flagged") === "true"
    : undefined;
  const limit = url.searchParams.has("limit")
    ? parseInt(url.searchParams.get("limit")!, 10)
    : 50;
  const offset = url.searchParams.has("offset")
    ? parseInt(url.searchParams.get("offset")!, 10)
    : 0;

  const result = listTrackedIPs({ ip, playerId, flagged, limit, offset });

  return Response.json(
    {
      success: true,
      ips: result.items,
      total: result.total,
      requestId,
      durationMs: timer(),
    },
    { status: 200 }
  );
}

async function handleTrackIP(
  req: Request,
  requestId: string,
  timer: () => number
): Promise<Response> {
  const body = await req.json();

  const input: TrackIPInput = {
    ip: body.ip,
    playerId: body.playerId,
    agentLogin: body.agentLogin,
    wagerId: body.wagerId,
    userAgent: body.userAgent,
    countryCode: body.countryCode,
    city: body.city,
    isp: body.isp,
    isVpn: body.isVpn,
    isProxy: body.isProxy,
    isTor: body.isTor,
    context: body.context,
  };

  if (!input.ip || !input.playerId || !input.agentLogin) {
    return jsonError("ip, playerId, and agentLogin are required", 400, requestId);
  }

  const record = trackIP(input);

  // Check if IP should be blocked
  const blockCheck = shouldBlockIP(input.ip);

  return Response.json(
    {
      success: true,
      tracking: record,
      blockCheck,
      requestId,
      durationMs: timer(),
    },
    { status: 201 }
  );
}

// ---------------------------------------------------------------------------
// Denylist Handlers
// ---------------------------------------------------------------------------

async function handleListDenylist(
  req: Request,
  requestId: string,
  timer: () => number
): Promise<Response> {
  const url = new URL(req.url);
  const active = url.searchParams.has("active")
    ? url.searchParams.get("active") === "true"
    : undefined;
  const listType = url.searchParams.get("listType") || undefined;
  const limit = url.searchParams.has("limit")
    ? parseInt(url.searchParams.get("limit")!, 10)
    : 50;
  const offset = url.searchParams.has("offset")
    ? parseInt(url.searchParams.get("offset")!, 10)
    : 0;

  const result = listDenylist({ active, listType, limit, offset });

  return Response.json(
    {
      success: true,
      entries: result.items,
      total: result.total,
      requestId,
      durationMs: timer(),
    },
    { status: 200 }
  );
}

async function handleAddToDenylist(
  req: Request,
  requestId: string,
  timer: () => number
): Promise<Response> {
  const body = await req.json();

  const input: AddToDenylistInput = {
    ip: body.ip,
    reason: body.reason,
    listType: body.listType || "manual",
    source: body.source,
    blockedBy: body.blockedBy,
    expiryAt: body.expiryAt ? Math.floor(new Date(body.expiryAt).getTime() / 1000) : undefined,
  };

  if (!input.ip || !input.reason) {
    return jsonError("ip and reason are required", 400, requestId);
  }

  const entry = addToDenylist(input);

  logHealth({
    component: "IPSurveillance",
    status: "ok",
    table: "ip_denylist",
    count: 1,
  });

  return Response.json(
    {
      success: true,
      entry,
      requestId,
      durationMs: timer(),
    },
    { status: 201 }
  );
}

async function handleRemoveFromDenylist(
  ip: string,
  requestId: string,
  timer: () => number
): Promise<Response> {
  const removed = removeFromDenylist(ip);

  if (!removed) {
    return jsonError(`IP not found on denylist: ${ip}`, 404, requestId);
  }

  return Response.json(
    {
      success: true,
      message: `IP ${ip} removed from denylist`,
      requestId,
      durationMs: timer(),
    },
    { status: 200 }
  );
}

// ---------------------------------------------------------------------------
// Flag Handlers
// ---------------------------------------------------------------------------

async function handleGetIPFlags(
  playerId: string,
  requestId: string,
  timer: () => number
): Promise<Response> {
  const flags = getIPFlags(playerId);

  return Response.json(
    {
      success: true,
      playerId,
      flags,
      count: flags.length,
      requestId,
      durationMs: timer(),
    },
    { status: 200 }
  );
}

// ---------------------------------------------------------------------------
// Reputation Handlers
// ---------------------------------------------------------------------------

async function handleGetReputation(
  ip: string,
  requestId: string,
  timer: () => number
): Promise<Response> {
  const reputation = checkIPReputation(ip);

  return Response.json(
    {
      success: true,
      ip,
      reputation,
      requestId,
      durationMs: timer(),
    },
    { status: 200 }
  );
}

async function handleCheckBlock(
  ip: string,
  requestId: string,
  timer: () => number
): Promise<Response> {
  const blockCheck = shouldBlockIP(ip);

  return Response.json(
    {
      success: true,
      ip,
      blocked: blockCheck.blocked,
      reason: blockCheck.reason,
      requestId,
      durationMs: timer(),
    },
    { status: 200 }
  );
}

// ---------------------------------------------------------------------------
// Cron Trigger
// ---------------------------------------------------------------------------

async function handleFlagSharedIPs(
  requestId: string,
  timer: () => number
): Promise<Response> {
  const result = flagSharedIPs();

  return Response.json(
    {
      success: true,
      flagged: result.flagged,
      errors: result.errors,
      requestId,
      durationMs: timer(),
    },
    { status: 200 }
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function jsonError(message: string, status: number, requestId: string): Response {
  return Response.json(
    {
      success: false,
      error: message,
      code: status === 404 ? "NOT_FOUND" : status === 400 ? "BAD_REQUEST" : "INTERNAL_ERROR",
      timestamp: new Date().toISOString(),
      requestId,
    },
    { status }
  );
}

// ---------------------------------------------------------------------------
// Path matching
// ---------------------------------------------------------------------------

export function isIPPath(pathname: string): boolean {
  return pathname.startsWith("/api/ip/");
}
