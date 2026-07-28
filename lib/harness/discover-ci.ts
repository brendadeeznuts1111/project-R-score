// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/glob — Bun.Glob (dot: true required for .github on Bun ≤1.3.6)
/**
 * Discover CI / deploy / migrate jobs and require a CI runbook or exemption.
 *
 * Sibling to discover-scheduled.ts (cron perimeter). This covers:
 * - package.json scripts: ci:* · build:* · deploy:* · migrate:*
 * - .github/workflows with push / pull_request / workflow_dispatch
 *
 * @see ./ci-deploy.ts
 * @see ../../docs/harness/ci-deploy.md
 */
import { CI_RUNBOOKS } from './ci-deploy';

export type DiscoveredCiJob = {
  source: 'package-script' | 'gha-workflow';
  path: string;
  detail: string;
};

export type CiJobExemption = {
  id: string; // brand-ok — opaque exemption catalog key
  source: DiscoveredCiJob['source'];
  match: string;
  reason: string;
};

/** package script name or workflow basename → CI runbook id */
export const CI_JOB_OWNERS: Readonly<Record<string, string>> = {
  'ci:core': 'ci-core',
  'ci:harness': 'ci-core',
  'ci:harness:fast': 'ci-core',
  'ci:validate': 'ci-core',
  'ci:bun:check': 'ci-core',
  'ci:r2:version:check': 'ci-core',
  'build:affected': 'ci-core',
  'build:defines': 'ci-core',
  'build:defines:dev': 'ci-core',
  'build:defines:compile': 'ci-core',
  'build:portal-cli': 'ci-core',
  'type-check:ci': 'typescript-ci',
  'type-check:full': 'typescript-ci',
  'deploy:production': 'deploy-production',
  'deploy:staging': 'deploy-staging',
  'migrate:inventory': 'bun-migrate',
  'migrate:status': 'bun-migrate',
  'harness-gates.yml': 'ci-core',
  'typescript-checks.yml': 'typescript-ci',
  'repo-hygiene.yml': 'ci-core',
};

/**
 * Workflows / scripts that are CI-adjacent but not maintenance runbook tenants.
 */
export const CI_JOB_EXEMPTIONS: readonly CiJobExemption[] = [
  {
    id: 'gha-brand-bench',
    source: 'gha-workflow',
    match: 'brand-bench.yml',
    reason: 'Brand bench gate — specialized; not a deploy/ci-core tenant',
  },
  {
    id: 'gha-search-governance',
    source: 'gha-workflow',
    match: 'search-governance.yml',
    reason: 'Search governance journey — own claim search-governance-basic',
  },
  {
    id: 'gha-p0-security',
    source: 'gha-workflow',
    match: 'p0-security-check.yml',
    reason: 'Security audit workflow — separate security claim surface',
  },
  {
    id: 'gha-url-validation',
    source: 'gha-workflow',
    match: 'url-validation.yml',
    reason: 'URL validation — docs operate, not deploy tenant',
  },
  {
    id: 'gha-micro-enhancements',
    source: 'gha-workflow',
    match: 'micro-enhancements.yml',
    reason: 'Optional enhancement smoke — not required CI envelope',
  },
  {
    id: 'gha-har-performance',
    source: 'gha-workflow',
    match: 'har-performance.yml',
    reason: 'Perf bench workflow — covered by schedule discovery exemption',
  },
  {
    id: 'gha-cache-lifecycle',
    source: 'gha-workflow',
    match: 'cache-lifecycle.yml',
    reason: 'Cache prune schedule — schedule discovery exemption',
  },
  {
    id: 'gha-metrics-dashboard',
    source: 'gha-workflow',
    match: 'metrics-dashboard.yml',
    reason: 'Metrics refresh — schedule discovery exemption',
  },
  {
    id: 'gha-issue-automation',
    source: 'gha-workflow',
    match: 'issue-automation.yml',
    reason: 'Issue metrics — schedule discovery exemption',
  },
  {
    id: 'gha-test-sharded',
    source: 'gha-workflow',
    match: 'test-sharded.yml',
    reason: 'Sharded tests/ matrix — signal only (continue-on-error); not deploy tenant',
  },
  {
    id: 'gha-verify-bun-apis',
    source: 'gha-workflow',
    match: 'verify-bun-apis.yml',
    reason: 'Bun API proof schedule — schedule discovery exemption',
  },
  {
    id: 'gha-cloudflare-pages-smoke',
    source: 'gha-workflow',
    match: 'cloudflare-pages-smoke.yml',
    reason: 'Pages smoke — cloudflare-pages tenant, not ci-core envelope',
  },
  {
    id: 'pkg-build-doc-index',
    source: 'package-script',
    match: 'build:doc-index',
    reason: 'Docs index bake — docs-integrity / Bun docs operate, not ci-core deploy',
  },
];

const PKG_CI_RE = /^(?:ci|build|deploy|migrate):/;

async function discoverPackageCiScripts(root: string): Promise<DiscoveredCiJob[]> {
  const pkg = (await Bun.file(`${root}/package.json`).json()) as {
    scripts?: Record<string, string>;
  };
  const out: DiscoveredCiJob[] = [];
  for (const name of Object.keys(pkg.scripts ?? {})) {
    if (!PKG_CI_RE.test(name)) continue;
    out.push({ source: 'package-script', path: 'package.json', detail: name });
  }
  return out;
}

function workflowHasCiTrigger(text: string): boolean {
  // Heuristic: workflow file mentions push / pull_request / workflow_dispatch under on:
  return (
    /\bpush\s*:/.test(text) ||
    /\bpull_request\s*:/.test(text) ||
    /\bworkflow_dispatch\s*:/.test(text) ||
    /\bschedule\s*:/.test(text)
  );
}

async function discoverGhaWorkflows(root: string): Promise<DiscoveredCiJob[]> {
  const out: DiscoveredCiJob[] = [];
  // Bun ≤1.3.6 skips dotdirs (`.github`) unless `dot: true`. Bun 1.4+ matches either way.
  const glob = new Bun.Glob('.github/workflows/*.{yml,yaml}');
  for await (const rel of glob.scan({ cwd: root, onlyFiles: true, dot: true })) {
    const text = await Bun.file(`${root}/${rel}`).text();
    if (!workflowHasCiTrigger(text)) continue;
    const base = rel.split('/').pop() ?? rel;
    out.push({
      source: 'gha-workflow',
      path: rel,
      detail: base,
    });
  }
  return out;
}

export async function discoverCiJobs(root: string): Promise<DiscoveredCiJob[]> {
  const [pkg, gha] = await Promise.all([
    discoverPackageCiScripts(root),
    discoverGhaWorkflows(root),
  ]);
  return [...pkg, ...gha];
}

function exemptionFor(job: DiscoveredCiJob): CiJobExemption | undefined {
  return CI_JOB_EXEMPTIONS.find(ex => {
    if (ex.source !== job.source) return false;
    if (job.source === 'package-script') return ex.match === job.detail;
    const base = job.path.split('/').pop() ?? job.path;
    return ex.match === base || ex.match === job.path;
  });
}

function ownerFor(job: DiscoveredCiJob): string | undefined {
  if (job.source === 'package-script') return CI_JOB_OWNERS[job.detail];
  const base = job.path.split('/').pop() ?? job.path;
  return CI_JOB_OWNERS[base] ?? CI_JOB_OWNERS[job.path];
}

/**
 * Fail closed: every discovered CI/deploy job maps to a CI_RUNBOOKS id or exemption.
 */
export async function assertCICoverage(root: string): Promise<string[]> {
  const catalog = new Set(CI_RUNBOOKS.map(r => r.id));
  const jobs = await discoverCiJobs(root);
  const failures: string[] = [];

  for (const job of jobs) {
    const loc = `${job.path} · ${job.detail}`;
    if (exemptionFor(job)) continue;
    const owner = ownerFor(job);
    if (owner) {
      if (!catalog.has(owner)) {
        failures.push(`${loc} owned by "${owner}" but no CI_RUNBOOKS entry`);
      }
      continue;
    }
    failures.push(
      `unclassified CI job ${loc} (${job.source}) — add CI_JOB_OWNERS → runbook or CI_JOB_EXEMPTIONS`
    );
  }

  return failures;
}

/** Reverse: every CI_RUNBOOKS id appears ≥1 in CI_JOB_OWNERS values. */
export function assertEveryRunbookHasJobOwner(): string[] {
  const owned = new Set(Object.values(CI_JOB_OWNERS));
  const missing: string[] = [];
  for (const r of CI_RUNBOOKS) {
    if (!owned.has(r.id)) missing.push(`CI_RUNBOOKS ${r.id} has no CI_JOB_OWNERS entry`);
  }
  return missing;
}
