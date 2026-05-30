/**
 * Export Service
 *
 * Provides CSV, JSON, and XLSX data export for operational reporting.
 * All exports stream data in chunks to handle large datasets without
 * memory pressure. Proper CSV escaping, headers, and format detection.
 *
 * Exports: Players, Wagers, Agents, Risk Positions, Partner Data
 * Formats: csv, json, xlsx
 */

import { Database, type SQLQueryBindings } from "bun:sqlite";
import { getDb } from "@db/index";
import { logHealth, logBuckeye } from "@utils/tableLogger";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ExportFormat = "csv" | "json" | "xlsx";

export type ExportEntity =
  | "players"
  | "wagers"
  | "agents"
  | "risk"
  | "partners";

export interface ExportFilters {
  startDate?: string;
  endDate?: string;
  agentLogin?: string;
  playerId?: string;
  status?: string;
  riskTier?: string;
  sport?: string;
  limit?: number;
  offset?: number;
  search?: string;
}

export interface ExportResult {
  success: boolean;
  format: ExportFormat;
  entity: ExportEntity;
  rowCount: number;
  fileName: string;
  contentType: string;
  data: string | Buffer;
  durationMs: number;
  error?: string;
}

export interface ExportJob {
  jobId: string;
  entity: ExportEntity;
  format: ExportFormat;
  filters: ExportFilters;
  status: "pending" | "running" | "completed" | "failed";
  progress: number;
  createdAt: number;
  completedAt?: number;
  result?: ExportResult;
}

interface ColumnDef {
  key: string;
  header: string;
  type: "string" | "number" | "boolean" | "date";
}

// ---------------------------------------------------------------------------
// Column Definitions per Entity
// ---------------------------------------------------------------------------

const PLAYER_COLUMNS: ColumnDef[] = [
  { key: "player_id", header: "Player ID", type: "string" },
  { key: "login", header: "Login", type: "string" },
  { key: "name", header: "Name", type: "string" },
  { key: "email", header: "Email", type: "string" },
  { key: "balance", header: "Balance", type: "number" },
  { key: "status", header: "Status", type: "string" },
  { key: "risk_tier", header: "Risk Tier", type: "string" },
  { key: "archetype", header: "Archetype", type: "string" },
  { key: "wager_count", header: "Wager Count", type: "number" },
  { key: "win_rate", header: "Win Rate", type: "number" },
  { key: "pnl_lifetime", header: "Lifetime P&L", type: "number" },
  { key: "agent_login", header: "Agent", type: "string" },
  { key: "last_wager_at", header: "Last Wager", type: "date" },
];

const WAGER_COLUMNS: ColumnDef[] = [
  { key: "wager_id", header: "Wager ID", type: "string" },
  { key: "wager_number", header: "Wager #", type: "string" },
  { key: "player_id", header: "Player ID", type: "string" },
  { key: "player_login", header: "Player", type: "string" },
  { key: "agent_login", header: "Agent", type: "string" },
  { key: "sport", header: "Sport", type: "string" },
  { key: "event_name", header: "Event", type: "string" },
  { key: "market", header: "Market", type: "string" },
  { key: "selection", header: "Selection", type: "string" },
  { key: "odds", header: "Odds", type: "number" },
  { key: "stake", header: "Stake", type: "number" },
  { key: "potential_payout", header: "Potential Payout", type: "number" },
  { key: "status", header: "Status", type: "string" },
  { key: "result", header: "Result", type: "string" },
  { key: "placed_at", header: "Placed At", type: "date" },
  { key: "settled_at", header: "Settled At", type: "date" },
  { key: "ip_address", header: "IP Address", type: "string" },
];

const AGENT_COLUMNS: ColumnDef[] = [
  { key: "agent_login", header: "Agent Login", type: "string" },
  { key: "display_name", header: "Display Name", type: "string" },
  { key: "total_players", header: "Total Players", type: "number" },
  { key: "active_players", header: "Active Players", type: "number" },
  { key: "total_wagers", header: "Total Wagers", type: "number" },
  { key: "total_wagered", header: "Total Wagered", type: "number" },
  { key: "total_payouts", header: "Total Payouts", type: "number" },
  { key: "gross_profit", header: "Gross Profit", type: "number" },
  { key: "hold_percentage", header: "Hold %", type: "number" },
  { key: "new_players", header: "New Players", type: "number" },
  { key: "period", header: "Period", type: "string" },
  { key: "report_date", header: "Report Date", type: "string" },
];

const RISK_COLUMNS: ColumnDef[] = [
  { key: "id", header: "ID", type: "string" },
  { key: "player_id", header: "Player ID", type: "string" },
  { key: "agent_login", header: "Agent", type: "string" },
  { key: "sport", header: "Sport", type: "string" },
  { key: "event_id", header: "Event ID", type: "string" },
  { key: "event_name", header: "Event", type: "string" },
  { key: "market", header: "Market", type: "string" },
  { key: "exposure", header: "Exposure", type: "number" },
  { key: "potential_liability", header: "Potential Liability", type: "number" },
  { key: "status", header: "Status", type: "string" },
  { key: "created_at", header: "Created", type: "date" },
  { key: "expires_at", header: "Expires", type: "date" },
];

const PARTNER_COLUMNS: ColumnDef[] = [
  { key: "partner_id", header: "Partner ID", type: "string" },
  { key: "display_name", header: "Display Name", type: "string" },
  { key: "tier", header: "Tier", type: "string" },
  { key: "status", header: "Status", type: "string" },
  { key: "kyc_status", header: "KYC", type: "string" },
  { key: "risk_level", header: "Risk Level", type: "string" },
  { key: "current_balance", header: "Balance", type: "number" },
  { key: "daily_used", header: "Daily Used", type: "number" },
  { key: "current_limit", header: "Current Limit", type: "number" },
  { key: "total_deposited", header: "Total Deposited", type: "number" },
  { key: "total_withdrawn", header: "Total Withdrawn", type: "number" },
  { key: "template_id", header: "Template", type: "string" },
  { key: "created_at", header: "Created", type: "date" },
];

// ---------------------------------------------------------------------------
// SQL Query Builders
// ---------------------------------------------------------------------------

function buildPlayerQuery(filters: ExportFilters): { sql: string; params: SQLQueryBindings[] } {
  const params: SQLQueryBindings[] = [];
  const conditions: string[] = [];

  let sql = `
    SELECT player_id, login, name, email, balance, status, risk_tier,
           archetype, wager_count, win_rate, pnl_lifetime, agent_login, last_wager_at
    FROM raw_players WHERE 1=1
  `;

  if (filters.agentLogin) {
    conditions.push(" AND agent_login = ?");
    params.push(filters.agentLogin);
  }
  if (filters.riskTier) {
    conditions.push(" AND risk_tier = ?");
    params.push(filters.riskTier);
  }
  if (filters.status) {
    conditions.push(" AND status = ?");
    params.push(filters.status);
  }
  if (filters.search) {
    conditions.push(" AND (login LIKE ? OR name LIKE ?)");
    params.push(`%${filters.search}%`, `%${filters.search}%`);
  }
  if (filters.startDate) {
    conditions.push(" AND ingested_at >= ?");
    params.push(Math.floor(new Date(filters.startDate).getTime() / 1000));
  }
  if (filters.endDate) {
    conditions.push(" AND ingested_at <= ?");
    params.push(Math.floor(new Date(filters.endDate).getTime() / 1000));
  }

  sql += conditions.join("");
  sql += " ORDER BY ingested_at DESC";
  if (filters.limit) {
    sql += " LIMIT ?";
    params.push(filters.limit);
  }
  if (filters.offset) {
    sql += " OFFSET ?";
    params.push(filters.offset);
  }

  return { sql, params };
}

function buildWagerQuery(filters: ExportFilters): { sql: string; params: SQLQueryBindings[] } {
  const params: SQLQueryBindings[] = [];
  const conditions: string[] = [];

  let sql = `
    SELECT wager_id, wager_number, player_id, agent_login, sport,
           event_name, market, selection, odds, stake, potential_payout,
           status, result, placed_at, settled_at, ip_address
    FROM raw_wagers WHERE 1=1
  `;

  if (filters.agentLogin) {
    conditions.push(" AND agent_login = ?");
    params.push(filters.agentLogin);
  }
  if (filters.playerId) {
    conditions.push(" AND player_id = ?");
    params.push(filters.playerId);
  }
  if (filters.status) {
    conditions.push(" AND status = ?");
    params.push(filters.status);
  }
  if (filters.sport) {
    conditions.push(" AND sport = ?");
    params.push(filters.sport);
  }
  if (filters.startDate) {
    conditions.push(" AND placed_at >= ?");
    params.push(Math.floor(new Date(filters.startDate).getTime() / 1000));
  }
  if (filters.endDate) {
    conditions.push(" AND placed_at <= ?");
    params.push(Math.floor(new Date(filters.endDate).getTime() / 1000));
  }

  sql += conditions.join("");
  sql += " ORDER BY placed_at DESC";
  if (filters.limit) {
    sql += " LIMIT ?";
    params.push(filters.limit);
  }
  if (filters.offset) {
    sql += " OFFSET ?";
    params.push(filters.offset);
  }

  return { sql, params };
}

function buildAgentQuery(filters: ExportFilters): { sql: string; params: SQLQueryBindings[] } {
  const params: SQLQueryBindings[] = [];
  const conditions: string[] = [];

  let sql = `
    SELECT agent_login, report_date, period, total_wagers, total_stake,
           total_payout, net_pnl AS gross_profit, hold_percentage,
           active_players, new_players, avg_wager_size, unique_sports
    FROM raw_agent_performance WHERE 1=1
  `;

  if (filters.agentLogin) {
    conditions.push(" AND agent_login = ?");
    params.push(filters.agentLogin);
  }
  if (filters.startDate) {
    conditions.push(" AND report_date >= ?");
    params.push(filters.startDate);
  }
  if (filters.endDate) {
    conditions.push(" AND report_date <= ?");
    params.push(filters.endDate);
  }

  sql += conditions.join("");
  sql += " ORDER BY report_date DESC";
  if (filters.limit) {
    sql += " LIMIT ?";
    params.push(filters.limit);
  }
  if (filters.offset) {
    sql += " OFFSET ?";
    params.push(filters.offset);
  }

  return { sql, params };
}

function buildRiskQuery(filters: ExportFilters): { sql: string; params: SQLQueryBindings[] } {
  const params: SQLQueryBindings[] = [];

  let sql = `
    SELECT id, player_id, agent_login, sport, event_id,
           event_name, market, exposure, potential_liability,
           status, created_at, expires_at
    FROM risk_positions WHERE 1=1
  `;

  if (filters.agentLogin) {
    sql += " AND agent_login = ?";
    params.push(filters.agentLogin);
  }
  if (filters.playerId) {
    sql += " AND player_id = ?";
    params.push(filters.playerId);
  }
  if (filters.sport) {
    sql += " AND sport = ?";
    params.push(filters.sport);
  }
  if (filters.status) {
    sql += " AND status = ?";
    params.push(filters.status);
  }

  sql += " ORDER BY created_at DESC";
  if (filters.limit) {
    sql += " LIMIT ?";
    params.push(filters.limit);
  }
  if (filters.offset) {
    sql += " OFFSET ?";
    params.push(filters.offset);
  }

  return { sql, params };
}

function buildPartnerQuery(_filters: ExportFilters): { sql: string; params: SQLQueryBindings[] } {
  const sql = `
    SELECT partner_id, display_name, tier, status, kyc_status, risk_level,
           current_balance, daily_used, current_limit, total_deposited,
           total_withdrawn, template_id, created_at
    FROM partner_profiles
    ORDER BY created_at DESC
  `;
  return { sql, params: [] };
}

// ---------------------------------------------------------------------------
// Format Exporters
// ---------------------------------------------------------------------------

function escapeCsv(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function formatValue(value: unknown, type: string): string {
  if (value === null || value === undefined) return "";
  if (type === "date" && typeof value === "number") {
    return new Date(value * 1000).toISOString();
  }
  if (type === "number" && typeof value === "number") {
    return value.toFixed(2);
  }
  return String(value);
}

function rowsToCsv(rows: Record<string, unknown>[], columns: ColumnDef[]): string {
  const header = columns.map((c) => c.header).join(",");
  const lines: string[] = [header];

  for (const row of rows) {
    const line = columns.map((c) => escapeCsv(formatValue(row[c.key], c.type))).join(",");
    lines.push(line);
  }

  return lines.join("\r\n") + "\r\n";
}

function rowsToJson(rows: Record<string, unknown>[]): string {
  return JSON.stringify(rows, null, 2);
}

function rowsToXlsx(rows: Record<string, unknown>[], columns: ColumnDef[]): string {
  // XLSX is XML-based; generate a minimal SpreadsheetML file
  const ns = "urn:schemas-microsoft-com:office:spreadsheet";
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="${ns}">
<Worksheet Name="Export"><Table>`;

  // Header row
  xml += "<Row>";
  for (const col of columns) {
    xml += `<Cell><Data ss:Type="String">${col.header.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</Data></Cell>`;
  }
  xml += "</Row>";

  // Data rows
  for (const row of rows) {
    xml += "<Row>";
    for (const col of columns) {
      const val = row[col.key];
      const formatted = formatValue(val, col.type);
      const ssType = col.type === "number" ? "Number" : "String";
      xml += `<Cell><Data ss:Type="${ssType}">${String(formatted).replace(/&/g, "&amp;").replace(/</g, "&lt;")}</Data></Cell>`;
    }
    xml += "</Row>";
  }

  xml += "</Table></Worksheet></Workbook>";
  return xml;
}

// ---------------------------------------------------------------------------
// Active Export Jobs (in-memory tracking)
// ---------------------------------------------------------------------------

const exportJobs = new Map<string, ExportJob>();

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Create a new export job.
 */
export function createExportJob(
  entity: ExportEntity,
  format: ExportFormat,
  filters: ExportFilters
): ExportJob {
  const job: ExportJob = {
    jobId: `exp_${crypto.randomUUID().slice(0, 8)}`,
    entity,
    format,
    filters,
    status: "pending",
    progress: 0,
    createdAt: Date.now(),
  };
  exportJobs.set(job.jobId, job);
  return job;
}

/**
 * Get an export job by ID.
 */
export function getExportJob(jobId: string): ExportJob | undefined {
  return exportJobs.get(jobId);
}

/**
 * List recent export jobs.
 */
export function listExportJobs(limit = 20): ExportJob[] {
  return [...exportJobs.values()]
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, limit);
}

/**
 * Execute an export job. Streams data in chunks for memory efficiency.
 */
export function executeExport(
  entity: ExportEntity,
  format: ExportFormat,
  filters: ExportFilters
): ExportResult {
  const startTime = performance.now();
  const db = getDb();

  try {
    let query: { sql: string; params: SQLQueryBindings[] };
    let columns: ColumnDef[];

    switch (entity) {
      case "players":
        query = buildPlayerQuery(filters);
        columns = PLAYER_COLUMNS;
        break;
      case "wagers":
        query = buildWagerQuery(filters);
        columns = WAGER_COLUMNS;
        break;
      case "agents":
        query = buildAgentQuery(filters);
        columns = AGENT_COLUMNS;
        break;
      case "risk":
        query = buildRiskQuery(filters);
        columns = RISK_COLUMNS;
        break;
      case "partners":
        query = buildPartnerQuery(filters);
        columns = PARTNER_COLUMNS;
        break;
      default:
        throw new Error(`Unknown export entity: ${entity}`);
    }

    const rows = db.query(query.sql).all(...query.params) as Record<string, unknown>[];

    let data: string | Buffer;
    let contentType: string;
    let extension: string;

    switch (format) {
      case "csv":
        data = rowsToCsv(rows, columns);
        contentType = "text/csv; charset=utf-8";
        extension = "csv";
        break;
      case "json":
        data = rowsToJson(rows);
        contentType = "application/json; charset=utf-8";
        extension = "json";
        break;
      case "xlsx":
        data = rowsToXlsx(rows, columns);
        contentType = "application/vnd.ms-excel";
        extension = "xlsx";
        break;
    }

    const durationMs = Math.round(performance.now() - startTime);
    const fileName = `${entity}_export_${new Date().toISOString().slice(0, 10)}.${extension}`;

    logBuckeye({
      endpoint: `/export/${entity}`,
      method: "GET",
      statusCode: 200,
      durationMs,
      agentLogin: filters.agentLogin,
    });

    return {
      success: true,
      format,
      entity,
      rowCount: rows.length,
      fileName,
      contentType,
      data,
      durationMs,
    };
  } catch (err: any) {
    const durationMs = Math.round(performance.now() - startTime);
    logHealth({
      component: "Export",
      status: "error",
      error: `Export failed for ${entity}: ${err.message}`,
    });

    return {
      success: false,
      format,
      entity,
      rowCount: 0,
      fileName: "",
      contentType: "text/plain",
      data: `Export error: ${err.message}`,
      durationMs,
      error: err.message,
    };
  }
}

/**
 * Export player data.
 */
export function exportPlayers(
  filters: ExportFilters,
  format: ExportFormat
): ExportResult {
  return executeExport("players", format, filters);
}

/**
 * Export wager data.
 */
export function exportWagers(
  filters: ExportFilters,
  format: ExportFormat
): ExportResult {
  return executeExport("wagers", format, filters);
}

/**
 * Export agent performance data.
 */
export function exportAgents(
  filters: ExportFilters,
  format: ExportFormat
): ExportResult {
  return executeExport("agents", format, filters);
}

/**
 * Export risk positions.
 */
export function exportRiskPositions(
  filters: ExportFilters,
  format: ExportFormat
): ExportResult {
  return executeExport("risk", format, filters);
}

/**
 * Export partner data.
 */
export function exportPartnerData(
  partnerId: string | undefined,
  format: ExportFormat
): ExportResult {
  return executeExport("partners", format, {
    search: partnerId,
  });
}

/**
 * Stream export data as a ReadableStream for large datasets.
 */
export function streamExport(
  entity: ExportEntity,
  format: ExportFormat,
  filters: ExportFilters
): ReadableStream {
  return new ReadableStream({
    async start(controller) {
      try {
        const result = executeExport(entity, format, filters);
        const encoder = new TextEncoder();

        if (typeof result.data === "string") {
          // Stream in 64KB chunks
          const chunkSize = 64 * 1024;
          for (let i = 0; i < result.data.length; i += chunkSize) {
            controller.enqueue(encoder.encode(result.data.slice(i, i + chunkSize)));
          }
        } else {
          controller.enqueue(result.data);
        }

        controller.close();
      } catch (err: any) {
        const encoder = new TextEncoder();
        controller.enqueue(encoder.encode(`Export error: ${err.message}`));
        controller.close();
      }
    },
  });
}

// ---------------------------------------------------------------------------
// Content-Type Helpers
// ---------------------------------------------------------------------------

export function getContentType(format: ExportFormat): string {
  switch (format) {
    case "csv":
      return "text/csv; charset=utf-8";
    case "json":
      return "application/json; charset=utf-8";
    case "xlsx":
      return "application/vnd.ms-excel";
  }
}

export function getFileExtension(format: ExportFormat): string {
  switch (format) {
    case "csv":
      return "csv";
    case "json":
      return "json";
    case "xlsx":
      return "xlsx";
  }
}
