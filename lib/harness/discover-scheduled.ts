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
    id: 'pkg-vault-health-cron-register',
    source: 'package-script',
    match: 'vault:health:cron:register',
    reason: 'OS cron register for vault-health board bake — not a spine maintenance tenant',
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
