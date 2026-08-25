// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/cron#bun-cron-schedule-handler-in-process — Bun.cron
// @see https://bun.com/docs/runtime/glob — Bun.Glob (dot: true required for .github on Bun ≤1.3.6)
/**
 * Discover scheduled jobs in the harness maintenance perimeter.
 *
 * Fail closed: every discovery must either map to a spine tenant (with a
 * TenantRunbook) or appear in SCHEDULED_JOB_EXEMPTIONS with a reason.
 *
 * Product apps / demos / tests outside the perimeter are out of scope —
 * spine tenants are continuous-maintenance jobs the harness daemon owns.
 *
 * CI / deploy / migrate scripts and GHA push|PR workflows are covered by the
 * sibling module `./discover-ci.ts` (assertCICoverage) — not this file.
 *
 * @see ./discover-ci.ts
 * @see ./maintenance.ts
 * @see ../../docs/harness/spine-tenants.md
 * @see ../../spine/tenants.ts
 */

import { MAINTENANCE_RUNBOOKS } from './maintenance';

export type DiscoveredJob = {
  source: 'code-cron' | 'package-script' | 'gha-cron';
  /** Repo-relative path */
  path: string;
  detail: string;
  line?: number;
};

export type ScheduledJobExemption = {
  /** Stable id for the exemption row */
  id: string; // brand-ok — opaque exemption catalog key
  source: DiscoveredJob['source'];
  /** Exact repo-relative path, package script name, or workflow basename */
  match: string;
  reason: string;
};

/** Path (repo-relative) → spine tenant that owns this schedule entrypoint. */
export const SCHEDULED_JOB_OWNERS: Readonly<Record<string, string>> = {
  'tools/bun-doc-refs.ts': 'docs-integrity',
  'lib/operations/snapshot-cron.ts': 'ops-snapshot',
  'lib/factory/monitoring.ts': 'registry-integrity',
};

/**
 * Known non-tenant schedules inside the discovery perimeter.
 * New GHA crons / package schedule scripts must be listed here or owned.
 */
export const SCHEDULED_JOB_EXEMPTIONS: readonly ScheduledJobExemption[] = [
  {
    id: 'gha-bun-1.4-release-drift',
    source: 'gha-cron',
    match: 'bun-1.4-release-drift.yml',
    reason: 'CI-owned Bun release-source drift proof; ci-core owns its workflow contract',
  },
  {
    id: 'verify-bun-apis-workflow',
    source: 'gha-cron',
    match: 'verify-bun-apis.yml',
    reason: 'GitHub Actions owns this Bun API proof schedule; it is not a spine tenant',
  },
  {
    id: 'harness-cron-api',
    source: 'code-cron',
    match: 'lib/harness/cron.ts',
    reason: 'Bun.cron wrappers (registerOsCron / scheduleInProcess) — not a job',
  },
  {
    id: 'spine-daemon',
    source: 'code-cron',
    match: 'spine/scheduler.ts',
    reason: 'Multi-tenant daemon; schedules SPINE_TENANTS, not a tenant itself',
  },
  {
    id: 'proof-catalog-prose',
    source: 'code-cron',
    match: 'lib/harness/proof.ts',
    reason: 'Claim/evidence strings mention Bun.cron — not a live schedule',
  },
  {
    id: 'pkg-spine-schedule',
    source: 'package-script',
    match: 'spine:schedule',
    reason: 'Daemon entrypoint for SPINE_TENANTS',
  },
  {
    id: 'pkg-spine-schedule-once',
    source: 'package-script',
    match: 'spine:schedule:once',
    reason: 'One-shot entrypoint for SPINE_TENANTS',
  },
  {
    id: 'pkg-docs-cron',
    source: 'package-script',
    match: 'docs:cron',
    reason: 'Renders cron.md — documentation, not a schedule runner',
  },
  {
    id: 'pkg-test-cron',
    source: 'package-script',
    match: 'test:cron',
    reason: 'Unit tests for Bun.cron surface — not a schedule runner',
  },
  {
    id: 'pkg-ops-snapshot-cron',
    source: 'package-script',
    match: 'ops:snapshot:cron',
    reason: 'Daemon entry for spine tenant ops-snapshot (lib/operations/snapshot-cron.ts)',
  },
  {
    id: 'pkg-ops-snapshot-once',
    source: 'package-script',
    match: 'ops:snapshot:once',
    reason: 'One-shot entry for spine tenant ops-snapshot',
  },
  {
    id: 'pkg-anchor-scan-cron-register',
    source: 'package-script',
    match: 'ops:anchor:scan:cron:register',
    reason: 'OS cron registration control for the governed stale-anchor analytics worker',
  },
  {
    id: 'pkg-anchor-scan-cron-remove',
    source: 'package-script',
    match: 'ops:anchor:scan:cron:remove',
    reason: 'OS cron removal control for the governed stale-anchor analytics worker',
  },
  {
    id: 'pkg-anchor-scan-cron-preview',
    source: 'package-script',
    match: 'ops:anchor:scan:cron:preview',
    reason: 'Read-only schedule preview for the governed stale-anchor analytics worker',
  },
  {
    id: 'pkg-sweep-domain-cron',
    source: 'package-script',
    match: 'sweep:domain:cron',
    reason:
      'Domain health sweep daemon (tools/domain-sweep-cron.ts) — operator schedule, not a spine tenant',
  },
  {
    id: 'pkg-portal-snapshot-cron-register',
    source: 'package-script',
    match: 'portal:snapshot:cron:register',
    reason:
      'OS cron register for portal-snapshot data-plane (not a spine tenant; see docs/harness/tenants/portal-snapshot-cron.md)',
  },
  {
    id: 'pkg-portal-snapshot-cron-remove',
    source: 'package-script',
    match: 'portal:snapshot:cron:remove',
    reason: 'OS cron remove for portal-snapshot data-plane (not a spine tenant)',
  },
  {
    id: 'pkg-portal-snapshot-cron-preview',
    source: 'package-script',
    match: 'portal:snapshot:cron:preview',
    reason: 'OS cron preview for portal-snapshot data-plane (not a spine tenant)',
  },
  {
    id: 'pkg-threads-research-cron-preview',
    source: 'package-script',
    match: 'threads:research:cron:preview',
    reason:
      'Read-only schedule preview for Codex weakest-thread research (operator OS cron; not a spine tenant)',
  },
  {
    id: 'pkg-threads-research-cron-register',
    source: 'package-script',
    match: 'threads:research:cron:register',
    reason:
      'OS cron registration for Codex weakest-thread research (tools/thread-research-cron.ts)',
  },
  {
    id: 'pkg-threads-research-cron-remove',
    source: 'package-script',
    match: 'threads:research:cron:remove',
    reason: 'OS cron removal for Codex weakest-thread research (not a spine tenant)',
  },
  {
    id: 'pkg-vault-health-cron-register',
    source: 'package-script',
    match: 'vault:health:cron:register',
    reason: 'OS cron register for vault-health board bake — not a spine maintenance tenant',
  },
  {
    id: 'pkg-bun-channel-cron-preview',
    source: 'package-script',
    match: 'bun:channel:cron:preview',
    reason: 'Read-only preview for the operator-owned Bun channel doctor OS schedule',
  },
  {
    id: 'pkg-bun-channel-cron-register',
    source: 'package-script',
    match: 'bun:channel:cron:register',
    reason:
      'Explicit OS cron registration for the Bun channel doctor; not a spine maintenance tenant',
  },
  {
    id: 'pkg-bun-channel-cron-remove',
    source: 'package-script',
    match: 'bun:channel:cron:remove',
    reason: 'Explicit OS cron removal for the operator-owned Bun channel doctor',
  },
  {
    id: 'pkg-partner-settlement-cron-register',
    source: 'package-script',
    match: 'partner:settlement:cron:register',
    reason:
      'OS cron register for the weekly partner settlement runner — not a spine maintenance tenant; see docs/design/settlement-feed.md',
  },
  {
    id: 'pkg-telegram-daily-report-cron-register',
    source: 'package-script',
    match: 'telegram:daily-report:cron:register',
    reason: 'Operator-owned OS cron registration for partner Telegram capacity reports',
  },
  {
    id: 'pkg-telegram-daily-report-cron-remove',
    source: 'package-script',
    match: 'telegram:daily-report:cron:remove',
    reason: 'Operator-owned OS cron removal for partner Telegram capacity reports',
  },
  {
    id: 'pkg-telegram-daily-report-cron-preview',
    source: 'package-script',
    match: 'telegram:daily-report:cron:preview',
    reason: 'Read-only preview for the partner Telegram capacity report schedule',
  },
  {
    id: 'pkg-telegram-event-alerts-cron-register',
    source: 'package-script',
    match: 'telegram:event-alerts:cron:register',
    reason: 'Operator-owned OS cron registration for partner Telegram event alerts',
  },
  {
    id: 'pkg-telegram-event-alerts-cron-remove',
    source: 'package-script',
    match: 'telegram:event-alerts:cron:remove',
    reason: 'Operator-owned OS cron removal for partner Telegram event alerts',
  },
  {
    id: 'pkg-partner-finance-report-cron-register',
    source: 'package-script',
    match: 'partner:finance-report:cron:register',
    reason: 'Operator-owned OS cron registration for partner finance reports',
  },
  {
    id: 'pkg-partner-finance-report-cron-remove',
    source: 'package-script',
    match: 'partner:finance-report:cron:remove',
    reason: 'Operator-owned OS cron removal for partner finance reports',
  },
  {
    id: 'pkg-partner-finance-report-cron-preview',
    source: 'package-script',
    match: 'partner:finance-report:cron:preview',
    reason: 'Read-only preview for the partner finance report schedule',
  },
  {
    id: 'pkg-partner-settlement-cron-remove',
    source: 'package-script',
    match: 'partner:settlement:cron:remove',
    reason:
      'OS cron remove for the weekly partner settlement runner — not a spine maintenance tenant',
  },
  {
    id: 'pkg-partner-settlement-cron-preview',
    source: 'package-script',
    match: 'partner:settlement:cron:preview',
    reason:
      'OS cron preview for the weekly partner settlement runner — not a spine maintenance tenant',
  },
  {
    id: 'gha-har-performance',
    source: 'gha-cron',
    match: 'har-performance.yml',
    reason: 'CI metrics schedule — not a spine maintenance tenant',
  },
  {
    id: 'gha-cache-lifecycle',
    source: 'gha-cron',
    match: 'cache-lifecycle.yml',
    reason: 'CI cache prune schedule — not a spine maintenance tenant',
  },
  {
    id: 'gha-metrics-dashboard',
    source: 'gha-cron',
    match: 'metrics-dashboard.yml',
    reason: 'CI metrics refresh — not a spine maintenance tenant',
  },
  {
    id: 'gha-issue-automation',
    source: 'gha-cron',
    match: 'issue-automation.yml',
    reason: 'CI issue metrics — not a spine maintenance tenant',
  },
  {
    id: 'pkg-telegram-catalog-research-cron-register',
    source: 'package-script',
    match: 'telegram:catalog:research:cron:register',
    reason: 'OS cron register for catalog research — telegram-factory tenant tooling',
  },
  {
    id: 'pkg-telegram-catalog-research-cron-remove',
    source: 'package-script',
    match: 'telegram:catalog:research:cron:remove',
    reason: 'OS cron remove for catalog research — telegram-factory tenant tooling',
  },
  {
    id: 'pkg-telegram-catalog-research-cron-preview',
    source: 'package-script',
    match: 'telegram:catalog:research:cron:preview',
    reason: 'OS cron preview for catalog research — telegram-factory tenant tooling',
  },
];

const CODE_CRON_RE =
  /\b(?:Bun\.cron|scheduleInProcess|registerOsCron|runInProcessUntilSignal)\s*\(/;

const CODE_SCAN_GLOBS = ['spine/**/*.ts', 'lib/harness/**/*.ts'] as const;
const CODE_SCAN_FILES = ['tools/bun-doc-refs.ts'] as const;

function isCommentLine(line: string): boolean {
  const t = line.trim();
  return t.startsWith('//') || t.startsWith('*') || t.startsWith('/*') || t.startsWith('*/');
}

async function discoverCodeCrons(root: string): Promise<DiscoveredJob[]> {
  const out: DiscoveredJob[] = [];
  const seen = new Set<string>();

  const consider = async (rel: string) => {
    if (seen.has(rel)) return;
    seen.add(rel);
    const abs = `${root}/${rel}`;
    const file = Bun.file(abs);
    if (!(await file.exists())) return;
    const text = await file.text();
    const lines = text.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!;
      if (isCommentLine(line)) continue;
      const m = line.match(CODE_CRON_RE);
      if (!m) continue;
      out.push({
        source: 'code-cron',
        path: rel,
        detail: m[0].trim(),
        line: i + 1,
      });
    }
  };

  for (const pattern of CODE_SCAN_GLOBS) {
    for await (const rel of new Bun.Glob(pattern).scan({ cwd: root, onlyFiles: true })) {
      await consider(rel);
    }
  }
  for (const rel of CODE_SCAN_FILES) {
    await consider(rel);
  }
  return out;
}

async function discoverPackageScripts(root: string): Promise<DiscoveredJob[]> {
  const pkgPath = `${root}/package.json`;
  const pkg = (await Bun.file(pkgPath).json()) as { scripts?: Record<string, string> };
  const out: DiscoveredJob[] = [];
  for (const name of Object.keys(pkg.scripts ?? {})) {
    if (!/(?:^|:)(?:schedule|cron)(?::|$)/i.test(name) && !/^spine:schedule/i.test(name)) {
      continue;
    }
    out.push({
      source: 'package-script',
      path: 'package.json',
      detail: name,
    });
  }
  return out;
}

async function discoverGhaCrons(root: string): Promise<DiscoveredJob[]> {
  const out: DiscoveredJob[] = [];
  // Bun ≤1.3.6 skips dotdirs (`.github`) unless `dot: true`. Bun 1.4+ matches either way.
  const glob = new Bun.Glob('.github/workflows/*.{yml,yaml}');
  for await (const rel of glob.scan({ cwd: root, onlyFiles: true, dot: true })) {
    const text = await Bun.file(`${root}/${rel}`).text();
    const lines = text.split('\n');
    const base = rel.split('/').pop() ?? rel;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!;
      const m = line.match(/^\s*-?\s*cron:\s*['"]([^'"]+)['"]/);
      if (!m) continue;
      out.push({
        source: 'gha-cron',
        path: rel,
        detail: `${base} · ${m[1]}`,
        line: i + 1,
      });
    }
  }
  return out;
}

/** Scan harness perimeter for scheduled jobs. */
export async function discoverScheduledJobs(root: string): Promise<DiscoveredJob[]> {
  const [code, pkg, gha] = await Promise.all([
    discoverCodeCrons(root),
    discoverPackageScripts(root),
    discoverGhaCrons(root),
  ]);
  return [...code, ...pkg, ...gha];
}

function exemptionFor(job: DiscoveredJob): ScheduledJobExemption | undefined {
  return SCHEDULED_JOB_EXEMPTIONS.find(ex => {
    if (ex.source !== job.source) return false;
    if (job.source === 'package-script') return ex.match === job.detail;
    if (job.source === 'gha-cron') {
      const base = job.path.split('/').pop() ?? job.path;
      return ex.match === base || ex.match === job.path;
    }
    return ex.match === job.path;
  });
}

function ownerTenantFor(job: DiscoveredJob): string | undefined {
  if (job.source === 'code-cron') return SCHEDULED_JOB_OWNERS[job.path];
  return undefined;
}

/**
 * Fail closed: every discovered schedule is owned by an active tenant
 * (with a runbook) or explicitly exempted.
 */
export async function assertScheduledJobCoverage(
  root: string,
  activeTenantIds: readonly string[]
): Promise<string[]> {
  const active = new Set(activeTenantIds);
  const runbooks = new Set(MAINTENANCE_RUNBOOKS.map(r => r.tenant));
  const jobs = await discoverScheduledJobs(root);
  const failures: string[] = [];

  for (const job of jobs) {
    const loc = job.line !== undefined ? `${job.path}:${job.line}` : `${job.path} · ${job.detail}`;
    const ex = exemptionFor(job);
    if (ex) continue;

    const tenant = ownerTenantFor(job);
    if (tenant) {
      if (!active.has(tenant)) {
        failures.push(`${loc} owned by tenant "${tenant}" but not in SPINE_TENANTS`);
      }
      if (!runbooks.has(tenant)) {
        failures.push(`${loc} owned by tenant "${tenant}" but no TenantRunbook`);
      }
      continue;
    }

    failures.push(
      `unclassified schedule ${loc} (${job.source} · ${job.detail}) — ` +
        `add SCHEDULED_JOB_OWNERS → tenant or SCHEDULED_JOB_EXEMPTIONS`
    );
  }

  return failures;
}
