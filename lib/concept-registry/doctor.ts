// @see https://bun.com/docs/runtime/file-io — Bun.file
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — bun:sqlite
// @see https://bun.com/docs/api/http — fetch
/**
 * Concept registry systems doctor — DB schema, optional live API, CLI surface,
 * concept stats, domain distribution, proposal backlog.
 *
 * Aligns with real tables (concepts · concept_proposals · concept_health · …),
 * not the invented `concept_registry` / `concept-provenance.json` names.
 */
import type { Database } from 'bun:sqlite';
import { joinPath } from '../path-bun.ts';
import { DEFAULT_CONCEPT_REGISTRY_DB_PATH, openConceptRegistryDb } from './db.ts';
import { computeConceptHealth } from './lifecycle.ts';
import type { ConceptHealthSnapshot, ConceptStatus } from './types.ts';
import { isConceptStatus } from './types.ts';

const REPO_ROOT = joinPath(import.meta.dir, '..', '..');

/** Tables required for a healthy registry install. */
export const REQUIRED_REGISTRY_TABLES = [
  'concepts',
  'concept_versions',
  'concept_usage',
  'concept_provenance',
  'concept_review',
  'concept_proposals',
  'concept_health',
] as const;

export const CLI_SURFACE_PATHS = [
  'tools/concept-registry-cli.ts',
  'scripts/concept-registry-serve.ts',
  'lib/concept-registry/index.ts',
] as const;

export type DoctorCheck = {
  id: string; // brand-ok — check identifier (db-schema · api · cli-surface · …)
  ok: boolean;
  detail: string;
};

export type ConceptStats = {
  total: number;
  byStatus: Record<string, number>;
  domains: Record<string, number>;
};

export type ConceptRegistryDoctorReport = {
  ok: boolean;
  generatedAt: string;
  dbPath: string;
  checks: DoctorCheck[];
  conceptStats: ConceptStats;
  proposalBacklog: {
    draft: number;
    proposed: number;
    olderThan7d: number;
  };
  health: ConceptHealthSnapshot | null;
  api: {
    checked: boolean;
    ok: boolean;
    url: string;
    version: string | null;
    detail: string;
  };
};

function dbPathFromEnv(): string {
  const p = Bun.env.CONCEPT_REGISTRY_DB_PATH?.trim();
  return p && p.length > 0 ? p : DEFAULT_CONCEPT_REGISTRY_DB_PATH;
}

function apiBaseUrl(): string {
  const host = Bun.env.CONCEPT_REGISTRY_HOST?.trim() || '127.0.0.1';
  const port = Bun.env.CONCEPT_REGISTRY_PORT?.trim() || '8788';
  const base = Bun.env.CONCEPT_REGISTRY_URL?.trim();
  if (base) return base.replace(/\/+$/, '');
  return `http://${host}:${port}`;
}

export function listSqliteTables(db: Database): string[] {
  const rows = db
    .query(`SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'`)
    .all() as Array<{ name: string }>;
  return rows.map(r => r.name).sort();
}

export function checkRequiredTables(db: Database): {
  ok: boolean;
  missing: string[];
  existing: string[];
} {
  const existing = listSqliteTables(db);
  const set = new Set(existing);
  const missing = REQUIRED_REGISTRY_TABLES.filter(t => !set.has(t));
  return { ok: missing.length === 0, missing: [...missing], existing };
}

export function collectConceptStats(db: Database): ConceptStats {
  const rows = db
    .query(`SELECT status, domain, COUNT(*) AS n FROM concepts GROUP BY status, domain`)
    .all() as Array<{ status: string; domain: string | null; n: number }>;
  const byStatus: Record<string, number> = {};
  const domains: Record<string, number> = {};
  let total = 0;
  for (const r of rows) {
    total += r.n;
    byStatus[r.status] = (byStatus[r.status] ?? 0) + r.n;
    const d = (r.domain ?? 'tbd').trim() || 'tbd';
    domains[d] = (domains[d] ?? 0) + r.n;
  }
  return { total, byStatus, domains };
}

export function collectProposalBacklog(db: Database): {
  draft: number;
  proposed: number;
  olderThan7d: number;
} {
  const counts = db
    .query(
      `SELECT status, COUNT(*) AS n FROM concept_proposals
       WHERE status IN ('draft', 'proposed') GROUP BY status`
    )
    .all() as Array<{ status: string; n: number }>;
  let draft = 0;
  let proposed = 0;
  for (const c of counts) {
    if (c.status === 'draft') draft = c.n;
    if (c.status === 'proposed') proposed = c.n;
  }
  const old = db
    .query(
      `SELECT COUNT(*) AS n FROM concept_proposals
       WHERE status IN ('draft', 'proposed')
         AND julianday('now') - julianday(created_at) > 7`
    )
    .get() as { n: number } | null;
  return { draft, proposed, olderThan7d: old?.n ?? 0 };
}

export async function checkCliSurface(
  repoRoot = REPO_ROOT
): Promise<{ ok: boolean; missing: string[]; found: string[] }> {
  const missing: string[] = [];
  const found: string[] = [];
  for (const rel of CLI_SURFACE_PATHS) {
    const path = joinPath(repoRoot, rel);
    if (await Bun.file(path).exists()) found.push(rel);
    else missing.push(rel);
  }
  return { ok: missing.length === 0, missing, found };
}

export async function checkApiHealth(
  baseUrl = apiBaseUrl(),
  timeoutMs = 1500
): Promise<{ ok: boolean; version: string | null; detail: string }> {
  const url = `${baseUrl}/health`;
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) {
      return { ok: false, version: null, detail: `HTTP ${res.status} from ${url}` };
    }
    const body = (await res.json()) as {
      ok?: boolean;
      service?: string;
      version?: string;
    };
    const version =
      typeof body.version === 'string'
        ? body.version
        : typeof body.service === 'string'
          ? body.service
          : 'ok';
    return {
      ok: body.ok !== false,
      version,
      detail: `${url} · ${version}`,
    };
  } catch (e) {
    return {
      ok: false,
      version: null,
      detail: `not responding (${url}): ${e instanceof Error ? e.message : String(e)}`,
    };
  }
}

export type RunDoctorOpts = {
  /** Open/create DB and ensure schema (default true). Set false for read-only probe. */
  ensureSchema?: boolean;
  /** Probe live API (default true). */
  checkApi?: boolean;
  dbPath?: string;
  apiBaseUrl?: string;
  /** Injected DB (tests). */
  db?: Database;
};

/**
 * Full systems doctor. Prefer this over ad-hoc one-liners — uses real table names
 * and registry helpers.
 */
export async function runConceptRegistryDoctor(
  opts: RunDoctorOpts = {}
): Promise<ConceptRegistryDoctorReport> {
  const path = opts.dbPath ?? dbPathFromEnv();
  const checks: DoctorCheck[] = [];
  let db: Database | null = opts.db ?? null;
  let ownedDb = false;

  // DB file presence (when not injected)
  if (!opts.db) {
    const fileExists = path === ':memory:' ? true : await Bun.file(path).exists();
    checks.push({
      id: 'db-file',
      ok: fileExists || opts.ensureSchema !== false,
      detail: fileExists
        ? path
        : opts.ensureSchema === false
          ? `missing: ${path}`
          : `will create: ${path}`,
    });
  }

  try {
    if (!db) {
      db = openConceptRegistryDb({
        path,
        skipInit: opts.ensureSchema === false,
      });
      ownedDb = true;
    }

    const tables = checkRequiredTables(db);
    checks.push({
      id: 'db-schema',
      ok: tables.ok,
      detail: tables.ok
        ? `${tables.existing.length} tables · all required present`
        : `missing: ${tables.missing.join(', ')}`,
    });

    const cli = await checkCliSurface();
    checks.push({
      id: 'cli-surface',
      ok: cli.ok,
      detail: cli.ok ? cli.found.join(', ') : `missing: ${cli.missing.join(', ')}`,
    });

    let conceptStats: ConceptStats = { total: 0, byStatus: {}, domains: {} };
    let proposalBacklog = { draft: 0, proposed: 0, olderThan7d: 0 };
    let health: ConceptHealthSnapshot | null = null;

    if (tables.ok || tables.existing.includes('concepts')) {
      conceptStats = collectConceptStats(db);
      if (tables.existing.includes('concept_proposals')) {
        proposalBacklog = collectProposalBacklog(db);
      }
      try {
        health = computeConceptHealth(db);
        checks.push({
          id: 'metrics',
          ok: health.alerts.length === 0,
          detail:
            health.alerts.length === 0
              ? `total=${health.total} · usage=${(health.usageRatio * 100).toFixed(0)}% · provenance=${(health.provenanceCoverage * 100).toFixed(0)}%`
              : health.alerts.join('; '),
        });
      } catch (e) {
        checks.push({
          id: 'metrics',
          ok: false,
          detail: e instanceof Error ? e.message : String(e),
        });
      }
    }

    const base = opts.apiBaseUrl ?? apiBaseUrl();
    let api = {
      checked: false,
      ok: false,
      url: `${base}/health`,
      version: null as string | null,
      detail: 'skipped',
    };
    if (opts.checkApi !== false) {
      const probe = await checkApiHealth(base);
      api = {
        checked: true,
        ok: probe.ok,
        url: `${base}/health`,
        version: probe.version,
        detail: probe.detail,
      };
      checks.push({
        id: 'api',
        ok: probe.ok,
        detail: probe.detail,
      });
    }

    // Concept population is informational unless empty after seed expectation
    checks.push({
      id: 'concepts',
      ok: conceptStats.total > 0,
      detail:
        conceptStats.total > 0
          ? `${conceptStats.total} concepts · domains=${Object.keys(conceptStats.domains).length}`
          : 'no concepts — run concept:registry:seed',
    });

    checks.push({
      id: 'proposal-backlog',
      ok: proposalBacklog.olderThan7d === 0,
      detail: `draft=${proposalBacklog.draft} proposed=${proposalBacklog.proposed} olderThan7d=${proposalBacklog.olderThan7d}`,
    });

    // Core systems: schema + CLI. API optional for offline. Empty concepts warn only.
    const coreOk = checks
      .filter(c => c.id === 'db-schema' || c.id === 'cli-surface')
      .every(c => c.ok);

    return {
      ok: coreOk,
      generatedAt: new Date().toISOString(),
      dbPath: path,
      checks,
      conceptStats,
      proposalBacklog,
      health,
      api,
    };
  } finally {
    if (ownedDb && db) db.close();
  }
}

export function formatDoctorReport(report: ConceptRegistryDoctorReport): string {
  const green = (s: string) => `\x1b[32m${s}\x1b[0m`;
  const red = (s: string) => `\x1b[31m${s}\x1b[0m`;
  const yellow = (s: string) => `\x1b[33m${s}\x1b[0m`;
  const blue = (s: string) => `\x1b[34m${s}\x1b[0m`;
  const mark = (ok: boolean) => (ok ? green('✓') : red('✗'));

  const statusCount = (s: ConceptStatus | string) => report.conceptStats.byStatus[s] ?? 0;

  const lines: string[] = ['🔍 Concept Registry Health Check', '', `DB path: ${report.dbPath}`, ''];

  for (const c of report.checks) {
    lines.push(`${mark(c.ok)}  ${c.id.padEnd(18)} ${c.detail}`);
  }

  lines.push('');
  lines.push('📊 Concepts');
  lines.push(`  Total:      ${blue(String(report.conceptStats.total))}`);
  lines.push(`  Active:     ${green(String(statusCount('active')))}`);
  lines.push(`  Proposed:   ${yellow(String(statusCount('proposed')))}`);
  lines.push(`  Draft:      ${yellow(String(statusCount('draft')))}`);
  lines.push(`  Deprecated: ${yellow(String(statusCount('deprecated')))}`);
  lines.push(`  Archived:   ${String(statusCount('archived'))}`);
  const domainBits = Object.entries(report.conceptStats.domains)
    .sort((a, b) => b[1] - a[1])
    .map(([d, n]) => `${d}:${n}`)
    .join(', ');
  lines.push(`  Domains:    ${domainBits || 'none'}`);

  lines.push('');
  lines.push('📋 Proposals');
  const backlog = report.proposalBacklog.draft + report.proposalBacklog.proposed;
  lines.push(
    `  Open:       ${backlog > 0 ? yellow(String(backlog)) : green('0')} (draft=${report.proposalBacklog.draft} proposed=${report.proposalBacklog.proposed})`
  );
  lines.push(
    `  >7 days:    ${
      report.proposalBacklog.olderThan7d > 0
        ? yellow(String(report.proposalBacklog.olderThan7d))
        : green('0')
    }`
  );

  if (report.health) {
    lines.push('');
    lines.push('📈 Metrics');
    lines.push(`  Usage ratio:      ${(report.health.usageRatio * 100).toFixed(0)}%`);
    lines.push(`  Provenance:       ${(report.health.provenanceCoverage * 100).toFixed(0)}%`);
    lines.push(`  Deprec. backlog:  ${report.health.deprecationBacklog}`);
    if (report.health.alerts.length > 0) {
      for (const a of report.health.alerts) lines.push(`  ⚠ ${a}`);
    }
  }

  lines.push('');
  lines.push(
    report.ok
      ? green('✅ Core systems ready (schema + CLI)')
      : red('⚠️  System incomplete — see issues above')
  );
  if (report.api.checked && !report.api.ok) {
    lines.push(
      yellow('   (API offline is OK for offline work — start with: bun run concept:registry:serve)')
    );
  }
  if (report.conceptStats.total === 0) {
    lines.push(yellow('   Seed with: bun run concept:registry:seed'));
  }

  return lines.join('\n');
}

/** Exported for tests — validate status map keys are known when present. */
export function normalizeStatusKey(raw: string): string {
  return isConceptStatus(raw) ? raw : raw;
}
