#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/file-io — Bun.file
/**
 * Concept health — vocabulary status totals, provenance coverage, usage,
 * and lifecycle activity over a rolling period.
 *
 *   bun scripts/concept-health.ts [--period <days>] [--output json|table]
 *
 * Env: CONCEPT_HEALTH_PERIOD_DAYS (default 30) · CONCEPT_HEALTH_OUTPUT.
 *
 * Verdict ok = concept metadata validation passes AND no deprecated concept
 * still has usage. Exit 1 when not ok.
 *
 * The lifecycle store (scripts/concept-lifecycle.json) is owned by the
 * concept-lifecycle lane (lib/portal/concept-lifecycle.ts); this script reads
 * the JSON directly and tolerates the file being absent (treated as empty).
 */
import { cliOut, colorize, logTable } from '../lib/console/index.ts';
import {
  applyUnknownLongOptionGuardFor,
  CONCEPT_HEALTH_ALLOWED_LONG,
} from '../lib/docs/ref-id-tool-flags.ts';

export { CONCEPT_HEALTH_ALLOWED_LONG };
import { countPortalConceptUsages } from '../lib/portal/concept-usage.ts';
import { PORTAL_SEMANTIC_CONCEPTS } from '../lib/portal/semantic-vocabulary.ts';
import {
  conceptStatusOf,
  type ConceptLifecycleStatus,
  type DomainConceptInput,
} from './concept-domain-list.ts';
import { runConceptMetadataValidation } from './validate-concept-metadata.ts';

export const LIFECYCLE_STORE_PATH = `${import.meta.dir}/concept-lifecycle.json`;

const DAY_MS = 86_400_000;

// ─── lifecycle store ────────────────────────────────────────────────────────

export type ConceptLifecycleAction = 'propose' | 'approve' | 'reject' | 'deprecate' | 'archive';

export type ConceptLifecycleEvent = {
  at: string; // ISO timestamp
  action: ConceptLifecycleAction;
  id: string; // brand-ok — glossary concept key
  actor: string;
  reason: string | null;
  replaceBy: string | null; // brand-ok — replacement glossary concept key
};

export type ConceptLifecycleProposal = {
  status?: string;
} & Record<string, unknown>;

export type ConceptLifecycleStore = {
  version: number;
  proposals: ConceptLifecycleProposal[];
  history: ConceptLifecycleEvent[];
};

export const EMPTY_LIFECYCLE_STORE: ConceptLifecycleStore = {
  version: 1,
  proposals: [],
  history: [],
};

/** Read the lifecycle store; absent or unreadable file → empty store. */
export async function loadLifecycleStore(
  path = LIFECYCLE_STORE_PATH
): Promise<ConceptLifecycleStore> {
  try {
    const file = Bun.file(path);
    if (!(await file.exists())) return EMPTY_LIFECYCLE_STORE;
    const raw = (await file.json()) as Partial<ConceptLifecycleStore>;
    return {
      version: typeof raw.version === 'number' ? raw.version : 1,
      proposals: Array.isArray(raw.proposals) ? raw.proposals : [],
      history: Array.isArray(raw.history) ? raw.history : [],
    };
  } catch {
    return EMPTY_LIFECYCLE_STORE;
  }
}

/** Proposals still awaiting a decision (missing status counts as pending). */
export function countPendingProposals(proposals: readonly ConceptLifecycleProposal[]): number {
  return proposals.filter(p => p.status === undefined || p.status === 'pending').length;
}

/** History events within the trailing `periodDays` window ending at `now`. */
export function eventsWithinPeriod(
  history: readonly ConceptLifecycleEvent[],
  periodDays: number,
  now: Date = new Date()
): ConceptLifecycleEvent[] {
  const windowMs = Math.max(0, periodDays) * DAY_MS;
  const nowMs = now.getTime();
  return history.filter(event => {
    const at = Date.parse(event.at);
    if (!Number.isFinite(at)) return false;
    const age = nowMs - at;
    return age >= 0 && age <= windowMs;
  });
}

// ─── health report ──────────────────────────────────────────────────────────

export type ConceptHealthMetadata = {
  ok: boolean;
  total: number;
  withProvenance: number;
  issues: readonly unknown[];
};

export type ConceptHealthInput = {
  concepts: readonly DomainConceptInput[];
  usageCounts: ReadonlyMap<string, number>;
  metadata: ConceptHealthMetadata;
  lifecycle?: ConceptLifecycleStore;
  periodDays?: number;
  now?: Date;
};

export type ConceptHealthReport = {
  ok: boolean;
  generatedAt: string;
  periodDays: number;
  totals: {
    total: number;
    active: number;
    deprecated: number;
    archived: number;
  };
  provenance: {
    withProvenance: number;
    coveragePct: number;
  };
  usage: {
    usedConcepts: number;
    /** Concepts with zero usage, excluding page.* catalog ids. */
    zeroUsageIds: string[]; // brand-ok — glossary concept keys
  };
  /** Deprecated concepts that still have usage > 0 — fails the verdict. */
  deprecatedWithUsage: string[]; // brand-ok — glossary concept keys
  lifecycle: {
    eventsInPeriod: number;
    byAction: Partial<Record<ConceptLifecycleAction, number>>;
    pendingProposals: number;
  };
};

export function buildHealthReport(input: ConceptHealthInput): ConceptHealthReport {
  const now = input.now ?? new Date();
  const periodDays = input.periodDays ?? 30;
  const lifecycle = input.lifecycle ?? EMPTY_LIFECYCLE_STORE;

  let active = 0;
  let deprecated = 0;
  let archived = 0;
  let usedConcepts = 0;
  const zeroUsageIds: string[] = [];
  const deprecatedWithUsage: string[] = [];

  for (const concept of input.concepts) {
    const status: ConceptLifecycleStatus = conceptStatusOf(concept);
    if (status === 'deprecated') deprecated += 1;
    else if (status === 'archived') archived += 1;
    else active += 1;

    const usage = input.usageCounts.get(concept.id) ?? 0;
    if (usage > 0) {
      usedConcepts += 1;
      if (status === 'deprecated') deprecatedWithUsage.push(concept.id);
    } else if (!concept.id.startsWith('page.')) {
      zeroUsageIds.push(concept.id);
    }
  }

  const events = eventsWithinPeriod(lifecycle.history, periodDays, now);
  const byAction: Partial<Record<ConceptLifecycleAction, number>> = {};
  for (const event of events) {
    byAction[event.action] = (byAction[event.action] ?? 0) + 1;
  }

  const total = input.concepts.length;
  return {
    ok: input.metadata.ok && deprecatedWithUsage.length === 0,
    generatedAt: now.toISOString(),
    periodDays,
    totals: { total, active, deprecated, archived },
    provenance: {
      withProvenance: input.metadata.withProvenance,
      coveragePct:
        input.metadata.total === 0
          ? 0
          : Math.round((input.metadata.withProvenance / input.metadata.total) * 100),
    },
    usage: { usedConcepts, zeroUsageIds: zeroUsageIds.sort() },
    deprecatedWithUsage: deprecatedWithUsage.sort(),
    lifecycle: {
      eventsInPeriod: events.length,
      byAction,
      pendingProposals: countPendingProposals(lifecycle.proposals),
    },
  };
}

/** Concepts whose addedAt falls inside the trailing `periodDays` window. */
export function addedWithinPeriod(
  concepts: readonly DomainConceptInput[],
  periodDays: number,
  now: Date = new Date()
): string[] {
  // brand-ok — returns glossary concept keys
  const windowMs = Math.max(0, periodDays) * DAY_MS;
  const nowMs = now.getTime();
  return concepts
    .filter(c => {
      if (!c.addedAt) return false;
      const at = Date.parse(c.addedAt);
      if (!Number.isFinite(at)) return false;
      const age = nowMs - at;
      return age >= 0 && age <= windowMs;
    })
    .map(c => c.id);
}

// ─── CLI ────────────────────────────────────────────────────────────────────

function resolveStr(argv: readonly string[], flag: string, envKey: string): string | undefined {
  const eq = argv.find(a => a.startsWith(`${flag}=`));
  const i = argv.indexOf(flag);
  const fromFlag = (eq ? eq.slice(flag.length + 1) : i !== -1 ? argv[i + 1] : undefined)?.trim();
  if (fromFlag) return fromFlag;
  return Bun.env[envKey]?.trim() || undefined;
}

function resolveInt(
  argv: readonly string[],
  flag: string,
  envKey: string,
  defaultValue: number
): number {
  const raw = resolveStr(argv, flag, envKey);
  if (raw === undefined) return defaultValue;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) ? n : defaultValue;
}

export async function runConceptHealth(opts: { periodDays: number }): Promise<ConceptHealthReport> {
  const [metadata, usageCounts, lifecycle] = await Promise.all([
    runConceptMetadataValidation(),
    countPortalConceptUsages(),
    loadLifecycleStore(),
  ]);
  return buildHealthReport({
    concepts: PORTAL_SEMANTIC_CONCEPTS,
    usageCounts,
    metadata,
    lifecycle,
    periodDays: opts.periodDays,
  });
}

async function main(): Promise<void> {
  const argv = applyUnknownLongOptionGuardFor('concept:health', Bun.argv.slice(2));
  const periodDays = resolveInt(argv, '--period', 'CONCEPT_HEALTH_PERIOD_DAYS', 30);
  const output =
    resolveStr(argv, '--output', 'CONCEPT_HEALTH_OUTPUT') === 'json' ? 'json' : 'table';
  const report = await runConceptHealth({ periodDays });

  if (output === 'json') {
    cliOut(report, { json: true });
  } else {
    logTable(
      [
        {
          total: report.totals.total,
          active: report.totals.active,
          deprecated: report.totals.deprecated,
          archived: report.totals.archived,
          provenancePct: report.provenance.coveragePct,
          used: report.usage.usedConcepts,
          zeroUsage: report.usage.zeroUsageIds.length,
          deprecatedUsed: report.deprecatedWithUsage.length,
        },
      ],
      [
        'total',
        'active',
        'deprecated',
        'archived',
        'provenancePct',
        'used',
        'zeroUsage',
        'deprecatedUsed',
      ]
    );

    const actionRows = Object.entries(report.lifecycle.byAction).map(([action, count]) => ({
      action,
      count,
    }));
    if (actionRows.length > 0) {
      console.log(colorize(`lifecycle events (last ${report.periodDays}d)`, '#8b949e'));
      logTable(actionRows, ['action', 'count']);
    }
    if (report.lifecycle.pendingProposals > 0) {
      console.log(`pending proposals · ${report.lifecycle.pendingProposals}`);
    }
    if (report.deprecatedWithUsage.length > 0) {
      console.error(colorize('deprecated concepts still in use:', '#f85149'));
      for (const id of report.deprecatedWithUsage.slice(0, 20)) console.error(`  ✗ ${id}`);
    }
    console.log(
      report.ok
        ? colorize('✅ concept health: OK', '#3fb950')
        : colorize('❌ concept health: FAIL', '#f85149')
    );
  }

  if (!report.ok) process.exit(1);
}

if (import.meta.main) {
  await main();
}
