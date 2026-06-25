/**
 * Export API Routes
 *
 * Provides streaming data export endpoints for operational reporting.
 * All routes support CSV, JSON, and XLSX formats with proper
 * Content-Type and Content-Disposition headers.
 *
 * Routes:
 *   GET /api/export/players   — Export player data
 *   GET /api/export/wagers    — Export wager data
 *   GET /api/export/agents    — Export agent performance
 *   GET /api/export/risk      — Export risk positions
 *   GET /api/export/partners  — Export partner data
 */

import type { Database } from "bun:sqlite";
import { getDb } from "@db/index";
import {
  exportPlayers,
  exportWagers,
  exportAgents,
  exportRiskPositions,
  exportPartnerData,
  streamExport,
  getContentType,
  getFileExtension,
  listExportJobs,
  createExportJob,
  type ExportFormat,
  type ExportFilters,
  type ExportEntity,
} from "@services/export-service";
import { logBuckeye, logHealth } from "@utils/tableLogger";
import { generateRequestId, createTimer } from "@middleware/security";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ExportRequest {
  format: ExportFormat;
  filters: ExportFilters;
  requestId: string;
  userId?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const VALID_FORMATS: ExportFormat[] = ["csv", "json", "xlsx"];
const STREAM_THRESHOLD = 10000; // Stream if expected rows > this

// ---------------------------------------------------------------------------
// Route Handler
// ---------------------------------------------------------------------------

/**
 * Main export router. Dispatches to entity-specific handlers.
 */
export async function handleExportRequest(
  req: Request,
  pathname: string
): Promise<Response> {
  const requestId = generateRequestId();
  const timer = createTimer();
  const url = new URL(req.url);

  // Extract entity from path: /api/export/{entity}
  const match = pathname.match(/^\/api\/export\/([a-z]+)/);
  if (!match) {
    return jsonError("Invalid export path", 400, requestId);
  }

  const entity = match[1] as ExportEntity;
  const validEntities: ExportEntity[] = ["players", "wagers", "agents", "risk", "partners"];
  if (!validEntities.includes(entity)) {
    return jsonError(`Unknown export entity: ${entity}`, 400, requestId);
  }

  // Parse format from query
  const format = (url.searchParams.get("format") || "csv") as ExportFormat;
  if (!VALID_FORMATS.includes(format)) {
    return jsonError(
      `Invalid format: ${format}. Must be one of: ${VALID_FORMATS.join(", ")}`,
      400,
      requestId
    );
  }

  // Parse filters from query params
  const filters = parseFilters(url);

  try {
    // Check if we should stream
    const shouldStream = url.searchParams.get("stream") === "true";

    if (shouldStream) {
      return handleStreamExport(entity, format, filters, requestId, timer);
    }

    // Standard export
    const result = await performExport(entity, format, filters);

    if (!result.success) {
      logHealth({
        component: "Export",
        status: "error",
        error: result.error,
      });
      return jsonError(result.error || "Export failed", 500, requestId);
    }

    const durationMs = timer();
    logBuckeye({
      endpoint: `/api/export/${entity}`,
      method: "GET",
      statusCode: 200,
      durationMs,
      agentLogin: filters.agentLogin,
    });

    // Track export job
    createExportJob(entity, format, filters);

    // Build response with proper headers
    const headers: Record<string, string> = {
      "Content-Type": result.contentType,
      "Content-Disposition": `attachment; filename="${result.fileName}"`,
      "X-Export-Row-Count": String(result.rowCount),
      "X-Export-Duration-Ms": String(result.durationMs),
      "X-Request-ID": requestId,
    };

    if (format === "csv") {
      headers["Content-Type"] = "text/csv; charset=utf-8";
    } else if (format === "xlsx") {
      headers["Content-Type"] = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    }

    return new Response(result.data as BodyInit, {
      status: 200,
      headers,
    });
  } catch (err: any) {
    const durationMs = timer();
    logHealth({
      component: "Export",
      status: "error",
      error: `Export error: ${err.message}`,
    });
    return jsonError(`Export error: ${err.message}`, 500, requestId);
  }
}

/**
 * Handle streaming export for large datasets.
 */
function handleStreamExport(
  entity: ExportEntity,
  format: ExportFormat,
  filters: ExportFilters,
  requestId: string,
  timer: () => number
): Response {
  const stream = streamExport(entity, format, filters);
  const fileName = `${entity}_export_${new Date().toISOString().slice(0, 10)}.${getFileExtension(format)}`;

  logBuckeye({
    endpoint: `/api/export/${entity}`,
    method: "GET",
    statusCode: 200,
    durationMs: timer(),
    agentLogin: filters.agentLogin,
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": getContentType(format),
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "X-Request-ID": requestId,
      "Transfer-Encoding": "chunked",
    },
  });
}

/**
 * Dispatch export to the correct service function.
 */
function performExport(
  entity: ExportEntity,
  format: ExportFormat,
  filters: ExportFilters
) {
  switch (entity) {
    case "players":
      return exportPlayers(filters, format);
    case "wagers":
      return exportWagers(filters, format);
    case "agents":
      return exportAgents(filters, format);
    case "risk":
      return exportRiskPositions(filters, format);
    case "partners":
      return exportPartnerData(filters.search, format);
    default:
      throw new Error(`Unknown entity: ${entity}`);
  }
}

// ---------------------------------------------------------------------------
// Query Parameter Parsing
// ---------------------------------------------------------------------------

function parseFilters(url: URL): ExportFilters {
  const filters: ExportFilters = {};

  if (url.searchParams.has("startDate")) {
    filters.startDate = url.searchParams.get("startDate")!;
  }
  if (url.searchParams.has("endDate")) {
    filters.endDate = url.searchParams.get("endDate")!;
  }
  if (url.searchParams.has("agentLogin")) {
    filters.agentLogin = url.searchParams.get("agentLogin")!;
  }
  if (url.searchParams.has("playerId")) {
    filters.playerId = url.searchParams.get("playerId")!;
  }
  if (url.searchParams.has("status")) {
    filters.status = url.searchParams.get("status")!;
  }
  if (url.searchParams.has("riskTier")) {
    filters.riskTier = url.searchParams.get("riskTier")!;
  }
  if (url.searchParams.has("sport")) {
    filters.sport = url.searchParams.get("sport")!;
  }
  if (url.searchParams.has("search")) {
    filters.search = url.searchParams.get("search")!;
  }
  if (url.searchParams.has("limit")) {
    filters.limit = parseInt(url.searchParams.get("limit")!, 10);
  }
  if (url.searchParams.has("offset")) {
    filters.offset = parseInt(url.searchParams.get("offset")!, 10);
  }

  return filters;
}

// ---------------------------------------------------------------------------
// Recent Exports
// ---------------------------------------------------------------------------

/**
 * GET /api/export/jobs — List recent export jobs.
 */
export function handleExportJobsRequest(_req: Request): Response {
  const jobs = listExportJobs(50);
  return Response.json({ jobs, total: jobs.length });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function jsonError(message: string, status: number, requestId: string): Response {
  return Response.json(
    {
      error: message,
      code: status === 400 ? "BAD_REQUEST" : "INTERNAL_ERROR",
      timestamp: new Date().toISOString(),
      requestId,
    },
    { status }
  );
}

// ---------------------------------------------------------------------------
// Path matching helpers
// ---------------------------------------------------------------------------

export function isExportPath(pathname: string): boolean {
  return (
    pathname.startsWith("/api/export/") &&
    !pathname.startsWith("/api/export/jobs")
  );
}

export function isExportJobsPath(pathname: string): boolean {
  return pathname === "/api/export/jobs";
}
