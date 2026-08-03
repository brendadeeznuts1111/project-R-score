#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/file-io — Bun.file
// @see https://bun.com/docs/runtime/glob — Bun.Glob
/**
 * Unified concept audit — inventory + metadata + surface coverage.
 *
 *   bun run concept:audit
 *   bun run concept:audit -- --strict
 *   bun run concept:audit -- --watch
 *   bun run concept:audit -- --output json --quiet
 *
 * Strict fails when metadata or surface-coverage gates fail, when used
 * concepts lack provenance, or when deprecated concepts still appear in
 * board HTML/JS. Unused / surface-only chrome are reported always;
 * `--strict-unused` also fails on portal concepts with zero UI hits
 * (excluding page.* catalog ids).
 *
 * Watch mode uses Bun.file mtime polling (no node:fs) — `--watch-poll` is
 * an alias kept for CLI compatibility.
 */
import { colorize, jsonOut, logTable } from '../lib/console-depth.ts';
import {
  countPortalConceptUsagesDetailed,
  type ConceptUsageBreakdown,
} from '../lib/portal/concept-usage.ts';
import {
  ACCOUNT_DOSSIER_SURFACE_CONCEPTS,
  LIMIT_FIELD_CONCEPTS,
  LIMIT_SURFACE_CONCEPTS,
  PARTNER_HISTORY_SURFACE_CONCEPTS,
  PARTNERS_SURFACE_CONCEPTS,
  PORTAL_SEMANTIC_CONCEPTS,
} from '../lib/portal/semantic-vocabulary.ts';
import { parseConceptInventoryOptions, runConceptInventory } from '../tools/concept-inventory.ts';
import { runConceptMetadataValidation } from './validate-concept-metadata.ts';
import { scanSurfaceCoverage } from './validate-surface-coverage.ts';

const ROOT = `${import.meta.dir}/..`;

const DEFAULT_WATCH_PATHS = [
  `${ROOT}/lib/portal/semantic-vocabulary.ts`,
  `${ROOT}/lib/portal/concept-usage.ts`,
  `${ROOT}/scripts/concept-metadata-baseline.json`,
  `${ROOT}/public/registry/domain-glossary.json`,
  `${ROOT}/public/portal`,
];

export type ConceptAuditOptions = {
  watch: boolean;
  watchPoll: boolean;
  watchPaths: string[];
  strict: boolean;
  strictUnused: boolean;
  output: 'table' | 'json';
  quiet: boolean;
  unusedOnly: boolean;
  status?: string;
  board?: string;
  group?: string;
  category?: string;
  correlationId?: string; // brand-ok — work-item provenance ref, not CorrelationId UUID
  help: boolean;
};

export type ConceptAuditReport = {
  ok: boolean;
  strict: boolean;
  generatedAt: string;
  summary: {
    totalPortal: number;
    withProvenance: number;
    provenanceCoverage: number;
    usedUi: number;
    unusedUi: number;
    surfaceOnly: number;
    metadataIssues: number;
    surfaceOrphans: number;
    inventoryMisses: number;
    deprecatedUsed: number;
    bakeDrift: number;
  };
  boards: Array<{
    board: string;
    files: number;
    usages: number;
    allowlist: number;
  }>;
  metadataIssues: Array<{
    id: string; // brand-ok — glossary concept key
    reason: string;
  }>;
  surfaceOrphans: Array<{ board: string; file: string; concept: string; via: string }>;
  inventoryMisses: string[];
  unused: string[]; // brand-ok — portal concept ids with no html/href/map hits
  surfaceOnly: string[]; // brand-ok — on a surface map but no html/href/map hits
  deprecatedUsed: string[]; // brand-ok — deprecated ids still referenced in UI
  bakeDrift: string[]; // brand-ok — SSOT vs bake provenance mismatch
  failures: string[];
};

function argValue(argv: readonly string[], flag: string): string | undefined {
  const eq = argv.find(a => a.startsWith(`${flag}=`));
  if (eq) return eq.slice(flag.length + 1);
  const i = argv.indexOf(flag);
  if (i !== -1) return argv[i + 1];
  return undefined;
}

function resolveWatchPaths(argv: readonly string[]): string[] {
  const fromFlag = argValue(argv, '--watch-paths');
  const fromEnv = Bun.env.WATCH_PATHS?.trim();
  const raw = fromFlag || fromEnv;
  if (!raw) return DEFAULT_WATCH_PATHS;
  return raw
    .split(',')
    .map(p => p.trim())
    .filter(Boolean)
    .map(p => (p.startsWith('/') ? p : `${ROOT}/${p}`));
}

export function parseConceptAuditOptions(argv: readonly string[] = Bun.argv): ConceptAuditOptions {
  const outputRaw = argValue(argv, '--output');
  return {
    watch: argv.includes('--watch'),
    watchPoll: argv.includes('--watch-poll'),
    watchPaths: resolveWatchPaths(argv),
    strict: argv.includes('--strict'),
    strictUnused: argv.includes('--strict-unused'),
    output: outputRaw === 'json' ? 'json' : 'table',
    quiet: argv.includes('--quiet'),
    unusedOnly: argv.includes('--unused'),
    status: argValue(argv, '--status')?.trim() || undefined,
    board: argValue(argv, '--board')?.trim() || undefined,
    group: argValue(argv, '--group')?.trim() || undefined,
    category: argValue(argv, '--category')?.trim() || undefined,
    correlationId: argValue(argv, '--correlation-id')?.trim() || undefined,
    help: argv.includes('--help') || argv.includes('-h'),
  };
}

function conceptStatus(concept: (typeof PORTAL_SEMANTIC_CONCEPTS)[number]): string {
  return 'status' in concept && typeof concept.status === 'string' ? concept.status : 'active';
}

function conceptCorrelation(concept: (typeof PORTAL_SEMANTIC_CONCEPTS)[number]): string {
  return 'correlationId' in concept && typeof concept.correlationId === 'string'
    ? concept.correlationId.trim()
    : '';
}

function allSurfaceIds(): Set<string> {
  return new Set<string>([
    ...Object.values(PARTNER_HISTORY_SURFACE_CONCEPTS),
    ...Object.values(PARTNERS_SURFACE_CONCEPTS),
    ...Object.values(LIMIT_SURFACE_CONCEPTS),
    ...Object.values(ACCOUNT_DOSSIER_SURFACE_CONCEPTS),
    ...Object.values(LIMIT_FIELD_CONCEPTS),
  ]);
}

function uiHits(row: ConceptUsageBreakdown | undefined): number {
  if (!row) return 0;
  return row.html + row.href + row.map;
}

async function bakeProvenanceDrift(): Promise<string[]> {
  const path = `${ROOT}/public/registry/domain-glossary.json`;
  if (!(await Bun.file(path).exists())) return ['domain-glossary.json missing'];
  const bake = (await Bun.file(path).json()) as {
    concepts?: Array<{
      id?: string; // brand-ok — glossary concept key from bake
      source?: string | null;
      correlationId?: string | null; // brand-ok — work-item provenance ref
    }>;
  };
  const byId = new Map(
    (bake.concepts ?? [])
      .filter(c => c.source === 'lib/portal/semantic-vocabulary.ts' && typeof c.id === 'string')
      .map(c => [c.id!, (c.correlationId ?? '').trim()] as const)
  );
  const drift: string[] = [];
  for (const concept of PORTAL_SEMANTIC_CONCEPTS) {
    const live = conceptCorrelation(concept);
    const baked = byId.get(concept.id);
    if (baked === undefined) {
      drift.push(`${concept.id}: missing-from-bake`);
      continue;
    }
    if (live !== baked) drift.push(`${concept.id}: live=${live || '∅'} bake=${baked || '∅'}`);
  }
  return drift;
}

export async function runConceptAudit(opts: ConceptAuditOptions): Promise<ConceptAuditReport> {
  const [metadata, surface, usages, bakeDrift] = await Promise.all([
    runConceptMetadataValidation(),
    scanSurfaceCoverage({ includeMetadata: true }),
    countPortalConceptUsagesDetailed(),
    bakeProvenanceDrift(),
  ]);

  // Keep inventory path warm / filterable (also validates bake load).
  await runConceptInventory(
    parseConceptInventoryOptions([
      'bun',
      'tools/concept-inventory.ts',
      ...(opts.group ? ['--group', opts.group] : []),
      ...(opts.category ? ['--category', opts.category] : []),
      ...(opts.correlationId ? ['--correlation-id', opts.correlationId] : []),
      '--output',
      'json',
    ])
  );

  const surfaceIds = allSurfaceIds();
  const unused: string[] = [];
  const surfaceOnly: string[] = [];
  const deprecatedUsed: string[] = [];

  for (const concept of PORTAL_SEMANTIC_CONCEPTS) {
    const status = conceptStatus(concept);
    if (opts.status && status !== opts.status) continue;

    const row = usages.get(concept.id);
    const ui = uiHits(row);
    const onSurface = surfaceIds.has(concept.id);

    if (ui === 0 && !concept.id.startsWith('page.')) {
      if (onSurface) surfaceOnly.push(concept.id);
      else unused.push(concept.id);
    }

    if (status === 'deprecated' && ui > 0) {
      deprecatedUsed.push(concept.id);
    }
  }

  let boards = surface.boards.map(b => ({
    board: b.board,
    files: b.files,
    usages: b.usages,
    allowlist: b.allowlist,
  }));
  if (opts.board) {
    boards = boards.filter(b => b.board === opts.board);
  }

  const surfaceOk = surface.orphans.length === 0 && surface.inventoryMisses.length === 0;
  const failures: string[] = [];
  if (!metadata.ok) failures.push(`metadata:${metadata.issues.length}`);
  if (!surfaceOk) {
    failures.push(`surface-orphans:${surface.orphans.length}`);
    failures.push(`inventory-misses:${surface.inventoryMisses.length}`);
  }
  if (surface.missingCorrelationIds.length > 0) {
    failures.push(`used-missing-provenance:${surface.missingCorrelationIds.length}`);
  }
  if (deprecatedUsed.length > 0) failures.push(`deprecated-used:${deprecatedUsed.length}`);
  if (bakeDrift.length > 0) failures.push(`bake-drift:${bakeDrift.length}`);
  if (opts.strictUnused) {
    const unusedFail = unused.filter(id => !id.startsWith('page.'));
    if (unusedFail.length > 0) failures.push(`unused:${unusedFail.length}`);
  }

  const usedUi = PORTAL_SEMANTIC_CONCEPTS.filter(c => uiHits(usages.get(c.id)) > 0).length;
  const withProvenance = metadata.withProvenance;
  const totalPortal = PORTAL_SEMANTIC_CONCEPTS.length;

  const governanceOk =
    metadata.ok &&
    surfaceOk &&
    surface.missingCorrelationIds.length === 0 &&
    deprecatedUsed.length === 0 &&
    bakeDrift.length === 0 &&
    (!opts.strictUnused || unused.filter(id => !id.startsWith('page.')).length === 0);

  return {
    ok: opts.strict ? governanceOk : metadata.ok && surfaceOk,
    strict: opts.strict,
    generatedAt: new Date().toISOString(),
    summary: {
      totalPortal,
      withProvenance,
      provenanceCoverage: totalPortal === 0 ? 0 : withProvenance / totalPortal,
      usedUi,
      unusedUi: unused.length,
      surfaceOnly: surfaceOnly.length,
      metadataIssues: metadata.issues.length,
      surfaceOrphans: surface.orphans.length,
      inventoryMisses: surface.inventoryMisses.length,
      deprecatedUsed: deprecatedUsed.length,
      bakeDrift: bakeDrift.length,
    },
    boards,
    metadataIssues: metadata.issues,
    surfaceOrphans: surface.orphans,
    inventoryMisses: surface.inventoryMisses,
    unused: unused.sort(),
    surfaceOnly: surfaceOnly.sort(),
    deprecatedUsed: deprecatedUsed.sort(),
    bakeDrift,
    failures,
  };
}

function printHelp(): void {
  console.log(`concept:audit — unified inventory + metadata + surface coverage

Usage:
  bun run concept:audit [--strict] [--watch] [--output json|table]

Modes:
  (default)       One-shot report; exit 1 if metadata or surface coverage fail
  --strict        Also fail on used-missing-provenance, deprecated-used, bake drift
  --strict-unused Also fail on unused non-page portal concepts (no html/href/map)
  --watch         Re-run on file changes (Bun.file mtime poll, 1s)
  --watch-poll    Alias of --watch (mtime poll)
  --quiet         Summary + failures only
  --unused        Print unused concept ids only
  --output json   Machine JSON

Filters:
  --group --category --correlation-id   Forwarded to inventory load
  --status active|deprecated            Filter unused/surfaceOnly lists
  --board partner-history|partners|…    Filter board table
  --watch-paths a,b,c                   Override WATCH_PATHS / defaults

Examples:
  bun run concept:audit -- --strict
  bun run concept:audit -- --watch --quiet
  bun run concept:audit -- --unused --output json
`);
}

function printReport(report: ConceptAuditReport, opts: ConceptAuditOptions): void {
  if (opts.output === 'json') {
    if (opts.unusedOnly) {
      jsonOut({ unused: report.unused, surfaceOnly: report.surfaceOnly });
    } else {
      jsonOut(report);
    }
    return;
  }

  if (opts.unusedOnly) {
    logTable(
      [...report.unused, ...report.surfaceOnly].map(id => ({
        id,
        kind: report.unused.includes(id) ? 'unused' : 'surface-only',
      })),
      ['id', 'kind']
    );
    return;
  }

  console.log(
    colorize(
      `concept:audit · portal=${report.summary.totalPortal} · provenance=${report.summary.withProvenance} · ${report.ok ? 'OK' : 'FAIL'}`,
      report.ok ? '#3fb950' : '#f85149'
    )
  );

  logTable(
    [
      {
        total: report.summary.totalPortal,
        provenance: report.summary.withProvenance,
        usedUi: report.summary.usedUi,
        unused: report.summary.unusedUi,
        surfaceOnly: report.summary.surfaceOnly,
        orphans: report.summary.surfaceOrphans,
        drift: report.summary.bakeDrift,
      },
    ],
    ['total', 'provenance', 'usedUi', 'unused', 'surfaceOnly', 'orphans', 'drift']
  );

  if (!opts.quiet) {
    logTable(report.boards, ['board', 'files', 'usages', 'allowlist']);
  }

  if (report.failures.length > 0) {
    console.error(colorize(`failures · ${report.failures.join(' · ')}`, '#f85149'));
  }

  if (!opts.quiet) {
    if (report.metadataIssues.length > 0) {
      console.error(colorize('missing provenance:', '#f85149'));
      for (const issue of report.metadataIssues.slice(0, 20)) {
        console.error(`  ✗ ${issue.id} (${issue.reason})`);
      }
    }
    if (report.surfaceOrphans.length > 0) {
      console.error(colorize('surface orphans:', '#f85149'));
      for (const o of report.surfaceOrphans.slice(0, 20)) {
        console.error(`  ✗ ${o.concept} in ${o.file} (${o.via}) [${o.board}]`);
      }
    }
    if (report.bakeDrift.length > 0) {
      console.error(colorize('bake drift (run bun run glossary:portal):', '#f85149'));
      for (const d of report.bakeDrift.slice(0, 20)) console.error(`  ✗ ${d}`);
    }
    if (report.unused.length > 0) {
      console.log(
        colorize(`unused (no UI hits, not on surface) · ${report.unused.length}`, '#8b949e')
      );
      if (!opts.quiet) {
        for (const id of report.unused.slice(0, 15)) console.log(`  · ${id}`);
      }
    }
    if (report.surfaceOnly.length > 0) {
      console.log(
        colorize(
          `surface-only (inventory chrome, no HTML bind) · ${report.surfaceOnly.length} — expected for partner-history collapse`,
          '#8b949e'
        )
      );
    }
  }
}

async function collectWatchTargets(paths: readonly string[]): Promise<string[]> {
  const out: string[] = [];
  for (const p of paths) {
    const file = Bun.file(p);
    if (await file.exists()) {
      out.push(p);
      continue;
    }
    const glob = new Bun.Glob('**/*.{html,js,ts,json}');
    try {
      for await (const rel of glob.scan({ cwd: p, onlyFiles: true })) {
        out.push(`${p}/${rel}`);
      }
    } catch {
      /* path missing */
    }
  }
  return out;
}

async function watchLoop(opts: ConceptAuditOptions): Promise<void> {
  let running = false;
  let queued = false;

  const rerun = async (reason: string) => {
    if (running) {
      queued = true;
      return;
    }
    running = true;
    try {
      console.log(colorize(`\n↻ concept:audit · ${reason}`, '#58a6ff'));
      const report = await runConceptAudit(opts);
      printReport(report, opts);
    } catch (err) {
      console.error(colorize(`audit error: ${String(err)}`, '#f85149'));
    } finally {
      running = false;
      if (queued) {
        queued = false;
        await rerun('queued');
      }
    }
  };

  await rerun('initial');

  const mtimes = new Map<string, number>();
  const tick = async () => {
    const targets = await collectWatchTargets(opts.watchPaths);
    let changed = false;
    for (const full of targets) {
      const t = Bun.file(full).lastModified;
      const prev = mtimes.get(full);
      if (prev !== undefined && prev !== t) changed = true;
      mtimes.set(full, t);
    }
    if (changed) await rerun('mtime');
  };

  await tick();
  console.log(
    colorize(
      `watching ${opts.watchPaths.length} path(s) via Bun.file mtime poll (1s) · Ctrl-C to stop`,
      '#8b949e'
    )
  );
  const handle = setInterval(() => {
    void tick();
  }, 1000);
  process.on('SIGINT', () => {
    clearInterval(handle);
    process.exit(0);
  });
  await new Promise(() => {});
}

async function main(): Promise<void> {
  const opts = parseConceptAuditOptions();
  if (opts.help) {
    printHelp();
    return;
  }

  if (opts.watch || opts.watchPoll) {
    await watchLoop({ ...opts, watch: true });
    return;
  }

  const report = await runConceptAudit(opts);
  printReport(report, opts);
  if (!report.ok) process.exit(1);
}

if (import.meta.main) {
  await main();
}
