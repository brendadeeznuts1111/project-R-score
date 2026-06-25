/**
 * Player API Routes — Player Domain (Desert Rose: #d4a5a5)
 *
 * RESTful routes for Player 360 profiles, search, performance,
 * transactions, wagers, risk profiles, notes, flags, and links.
 *
 * Auth: JWT required for all endpoints
 * Rate limit tier: standard (detail), intensive (search, performance)
 */

import type { AuthContext } from "@utils/types";
import { ValidationError } from "@utils/errors";
import {
  logPlayerNote,
  logTransaction,
  logPlayerFlag,
} from "@utils/tableLogger";
import {
  getPlayer,
  searchPlayers,
  getPlayerPerformance,
  getPlayerTransactions,
  getPlayerWagers,
  getPlayerRiskProfile,
  getPlayerNotes,
  addPlayerNote,
  deletePlayerNote,
  getPlayerFlags,
  addPlayerFlag,
  resolveFlag,
  getPlayerLinks,
  classifyArchetype,
  exportPlayersToCSV,
  type PlayerSearchFilters,
} from "@services/player-service";

// ---------------------------------------------------------------------------
// Route handlers
// ---------------------------------------------------------------------------

/**
 * GET /api/players — Search players with query params
 */
export async function handleListPlayers(
  req: Request,
  _auth: AuthContext
): Promise<Response> {
  const url = new URL(req.url);

  const filters: PlayerSearchFilters = {
    page: parseInt(url.searchParams.get("page") ?? "1", 10),
    limit: parseInt(url.searchParams.get("limit") ?? "25", 10),
    sort: (url.searchParams.get("sort") as PlayerSearchFilters["sort"]) ?? "name",
    order: (url.searchParams.get("order") as "asc" | "desc") ?? "asc",
  };

  const q = url.searchParams.get("q");
  if (q) filters.q = q;

  const sport = url.searchParams.get("sport");
  if (sport) filters.sport = sport;

  const riskTier = url.searchParams.get("risk_tier");
  if (riskTier) filters.riskTier = riskTier as PlayerSearchFilters["riskTier"];

  const archetype = url.searchParams.get("archetype");
  if (archetype) filters.archetype = archetype as PlayerSearchFilters["archetype"];

  const minBalance = url.searchParams.get("min_balance");
  if (minBalance) filters.minBalance = parseInt(minBalance, 10);

  const maxBalance = url.searchParams.get("max_balance");
  if (maxBalance) filters.maxBalance = parseInt(maxBalance, 10);

  const result = searchPlayers(filters);
  return Response.json(result);
}

/**
 * GET /api/players/:id — Player 360 profile
 */
export async function handleGetPlayer(
  _req: Request,
  _auth: AuthContext,
  params?: Record<string, string>
): Promise<Response> {
  const id = params?.id;
  if (!id) throw ValidationError.field("id", "Player ID is required");

  const player = getPlayer(id);
  if (!player) {
    return Response.json({ error: "Player not found", code: "NOT_FOUND" }, { status: 404 });
  }

  // Enrich with counts
  const notes = getPlayerNotes(id);
  const flags = getPlayerFlags(id);
  const links = getPlayerLinks(id);

  return Response.json({
    ...player,
    noteCount: notes.length,
    activeFlagCount: flags.length,
    linkCount: links.length,
  });
}

/**
 * GET /api/players/:id/performance — Performance metrics
 */
export async function handleGetPlayerPerformance(
  _req: Request,
  _auth: AuthContext,
  params?: Record<string, string>
): Promise<Response> {
  const id = params?.id;
  if (!id) throw ValidationError.field("id", "Player ID is required");

  const performance = getPlayerPerformance(id);
  if (!performance) {
    return Response.json({ error: "Player not found", code: "NOT_FOUND" }, { status: 404 });
  }

  return Response.json(performance);
}

/**
 * GET /api/players/:id/transactions — Transaction history
 */
export async function handleGetPlayerTransactions(
  req: Request,
  _auth: AuthContext,
  params?: Record<string, string>
): Promise<Response> {
  const id = params?.id;
  if (!id) throw ValidationError.field("id", "Player ID is required");

  const url = new URL(req.url);
  const limit = parseInt(url.searchParams.get("limit") ?? "50", 10);
  const offset = parseInt(url.searchParams.get("offset") ?? "0", 10);

  const result = getPlayerTransactions(id, limit, offset);
  return Response.json(result);
}

/**
 * GET /api/players/:id/wagers — Wager history
 */
export async function handleGetPlayerWagers(
  req: Request,
  _auth: AuthContext,
  params?: Record<string, string>
): Promise<Response> {
  const id = params?.id;
  if (!id) throw ValidationError.field("id", "Player ID is required");

  const url = new URL(req.url);
  const limit = parseInt(url.searchParams.get("limit") ?? "50", 10);
  const offset = parseInt(url.searchParams.get("offset") ?? "0", 10);

  const result = getPlayerWagers(id, limit, offset);
  return Response.json(result);
}

/**
 * GET /api/players/:id/risk — Risk profile
 */
export async function handleGetPlayerRisk(
  _req: Request,
  _auth: AuthContext,
  params?: Record<string, string>
): Promise<Response> {
  const id = params?.id;
  if (!id) throw ValidationError.field("id", "Player ID is required");

  const riskProfile = getPlayerRiskProfile(id);
  if (!riskProfile) {
    return Response.json({ error: "Player not found", code: "NOT_FOUND" }, { status: 404 });
  }

  return Response.json(riskProfile);
}

/**
 * GET /api/players/:id/notes — Staff notes
 */
export async function handleGetPlayerNotes(
  _req: Request,
  _auth: AuthContext,
  params?: Record<string, string>
): Promise<Response> {
  const id = params?.id;
  if (!id) throw ValidationError.field("id", "Player ID is required");

  const notes = getPlayerNotes(id);
  return Response.json({ playerId: id, notes });
}

/**
 * POST /api/players/:id/notes — Add note
 */
export async function handleAddPlayerNote(
  req: Request,
  auth: AuthContext,
  params?: Record<string, string>
): Promise<Response> {
  const id = params?.id;
  if (!id) throw ValidationError.field("id", "Player ID is required");

  const body = await req.json();
  if (!body.content) throw ValidationError.field("content", "Note content is required");

  const agentLogin = auth.user.login ?? auth.user.id;
  const note = addPlayerNote(id, {
    content: body.content,
    noteType: body.noteType,
    isPinned: body.isPinned,
  }, agentLogin);

  return Response.json(note, { status: 201 });
}

/**
 * DELETE /api/players/:id/notes/:noteId — Delete note
 */
export async function handleDeletePlayerNote(
  _req: Request,
  _auth: AuthContext,
  params?: Record<string, string>
): Promise<Response> {
  const id = params?.id;
  const noteIdStr = params?.noteId;
  if (!id) throw ValidationError.field("id", "Player ID is required");
  if (!noteIdStr) throw ValidationError.field("noteId", "Note ID is required");

  const noteId = parseInt(noteIdStr, 10);
  if (isNaN(noteId)) throw ValidationError.field("noteId", "Invalid note ID");

  const deleted = deletePlayerNote(noteId, id);
  if (!deleted) {
    return Response.json({ error: "Note not found", code: "NOT_FOUND" }, { status: 404 });
  }

  return Response.json({ success: true });
}

/**
 * GET /api/players/:id/flags — Active flags
 */
export async function handleGetPlayerFlags(
  _req: Request,
  _auth: AuthContext,
  params?: Record<string, string>
): Promise<Response> {
  const id = params?.id;
  if (!id) throw ValidationError.field("id", "Player ID is required");

  const flags = getPlayerFlags(id);
  return Response.json({ playerId: id, flags, openCount: flags.length });
}

/**
 * POST /api/players/:id/flags — Add flag
 */
export async function handleAddPlayerFlag(
  req: Request,
  auth: AuthContext,
  params?: Record<string, string>
): Promise<Response> {
  const id = params?.id;
  if (!id) throw ValidationError.field("id", "Player ID is required");

  const body = await req.json();
  if (!body.flagType) throw ValidationError.field("flagType", "Flag type is required");
  if (!body.severity) throw ValidationError.field("severity", "Severity is required");
  if (!body.title) throw ValidationError.field("title", "Flag title is required");

  const flag = addPlayerFlag(id, {
    flagType: body.flagType,
    severity: body.severity,
    title: body.title,
    description: body.description,
    flagSubtype: body.flagSubtype,
    source: body.source ?? auth.user.login ?? auth.user.id,
    sourceRuleId: body.sourceRuleId,
  });

  return Response.json(flag, { status: 201 });
}

/**
 * POST /api/players/:id/flags/:flagId/resolve — Resolve flag
 */
export async function handleResolvePlayerFlag(
  _req: Request,
  auth: AuthContext,
  params?: Record<string, string>
): Promise<Response> {
  const flagIdStr = params?.flagId;
  if (!flagIdStr) throw ValidationError.field("flagId", "Flag ID is required");

  const flagId = parseInt(flagIdStr, 10);
  if (isNaN(flagId)) throw ValidationError.field("flagId", "Invalid flag ID");

  const resolvedBy = auth.user.login ?? auth.user.id;
  const flag = resolveFlag(flagId, resolvedBy, params?.reason);

  if (!flag) {
    return Response.json({ error: "Flag not found", code: "NOT_FOUND" }, { status: 404 });
  }

  return Response.json(flag);
}

/**
 * GET /api/players/:id/links — Linked accounts/devices
 */
export async function handleGetPlayerLinks(
  _req: Request,
  _auth: AuthContext,
  params?: Record<string, string>
): Promise<Response> {
  const id = params?.id;
  if (!id) throw ValidationError.field("id", "Player ID is required");

  const links = getPlayerLinks(id);
  return Response.json({ playerId: id, links });
}

/**
 * POST /api/players/search — Advanced search with body params
 */
export async function handleAdvancedSearch(
  req: Request,
  _auth: AuthContext
): Promise<Response> {
  const body = await req.json();

  const filters: PlayerSearchFilters = {
    page: body.page ?? 1,
    limit: Math.min(body.limit ?? 25, 200),
    sort: body.sort ?? "name",
    order: body.order ?? "asc",
    q: body.q,
    sport: body.sport,
    riskTier: body.risk_tier,
    archetype: body.archetype,
    minBalance: body.min_balance,
    maxBalance: body.max_balance,
    agentLogin: body.agent_id,
    status: body.status,
  };

  const result = searchPlayers(filters);
  return Response.json(result);
}

/**
 * GET /api/players/:id/classify — Archetype classification
 */
export async function handleClassifyPlayer(
  _req: Request,
  _auth: AuthContext,
  params?: Record<string, string>
): Promise<Response> {
  const id = params?.id;
  if (!id) throw ValidationError.field("id", "Player ID is required");

  const classification = classifyArchetype(id);
  if (!classification) {
    return Response.json({ error: "Player not found", code: "NOT_FOUND" }, { status: 404 });
  }

  return Response.json({ playerId: id, ...classification });
}

/**
 * GET /api/players/export/csv — Export players to CSV
 */
export async function handleExportPlayersCSV(
  req: Request,
  _auth: AuthContext
): Promise<Response> {
  const url = new URL(req.url);

  const filters: PlayerSearchFilters = {
    riskTier: (url.searchParams.get("risk_tier") as PlayerSearchFilters["riskTier"]) ?? undefined,
    archetype: (url.searchParams.get("archetype") as PlayerSearchFilters["archetype"]) ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
    agentLogin: url.searchParams.get("agent_id") ?? undefined,
  };

  const csv = exportPlayersToCSV(filters);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="players-${new Date().toISOString().split("T")[0]}.csv"`,
    },
  });
}

// ---------------------------------------------------------------------------
// Route registry
// ---------------------------------------------------------------------------

export interface PlayerRoute {
  method: string;
  pattern: RegExp;
  handler: (req: Request, auth: AuthContext, params?: Record<string, string>) => Promise<Response> | Response;
  auth: "required" | "admin";
}

export const playerRoutes: PlayerRoute[] = [
  // List / search
  { method: "GET", pattern: /^\/api\/players$/, handler: handleListPlayers, auth: "required" },
  { method: "POST", pattern: /^\/api\/players\/search$/, handler: handleAdvancedSearch, auth: "required" },

  // Export
  { method: "GET", pattern: /^\/api\/players\/export\/csv$/, handler: handleExportPlayersCSV, auth: "required" },

  // Detail
  { method: "GET", pattern: /^\/api\/players\/[^\/]+$/, handler: handleGetPlayer, auth: "required" },
  { method: "GET", pattern: /^\/api\/players\/[^\/]+\/performance$/, handler: handleGetPlayerPerformance, auth: "required" },
  { method: "GET", pattern: /^\/api\/players\/[^\/]+\/transactions$/, handler: handleGetPlayerTransactions, auth: "required" },
  { method: "GET", pattern: /^\/api\/players\/[^\/]+\/wagers$/, handler: handleGetPlayerWagers, auth: "required" },
  { method: "GET", pattern: /^\/api\/players\/[^\/]+\/risk$/, handler: handleGetPlayerRisk, auth: "required" },
  { method: "GET", pattern: /^\/api\/players\/[^\/]+\/links$/, handler: handleGetPlayerLinks, auth: "required" },
  { method: "GET", pattern: /^\/api\/players\/[^\/]+\/classify$/, handler: handleClassifyPlayer, auth: "required" },

  // Notes
  { method: "GET", pattern: /^\/api\/players\/[^\/]+\/notes$/, handler: handleGetPlayerNotes, auth: "required" },
  { method: "POST", pattern: /^\/api\/players\/[^\/]+\/notes$/, handler: handleAddPlayerNote, auth: "required" },
  { method: "DELETE", pattern: /^\/api\/players\/[^\/]+\/notes\/[^\/]+$/, handler: handleDeletePlayerNote, auth: "required" },

  // Flags
  { method: "GET", pattern: /^\/api\/players\/[^\/]+\/flags$/, handler: handleGetPlayerFlags, auth: "required" },
  { method: "POST", pattern: /^\/api\/players\/[^\/]+\/flags$/, handler: handleAddPlayerFlag, auth: "required" },
  { method: "POST", pattern: /^\/api\/players\/[^\/]+\/flags\/[^\/]+\/resolve$/, handler: handleResolvePlayerFlag, auth: "required" },
];
