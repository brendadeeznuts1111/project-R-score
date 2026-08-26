// @see https://bun.com/docs/runtime/child-process#spawn-a-process-bun-spawn — Bun.spawn
// @see https://bun.com/docs/runtime/glob#quickstart — Bun.Glob
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
/**
 * Reference discovery for the harness perimeter — unused paths, plane mismatches,
 * and similarly named legacy aliases.
 *
 * Composes doc-map / bun-doc-refs / audit-catalog concerns into one agent-facing report.
 */
import { joinPath, resolvePath } from './path-bun.ts';
import { CANONICAL_TOOLS } from './docs/repo-docs.ts';

const REPO = resolvePath(import.meta.dir, '..');

/** Harness maintenance perimeter (excludes projects/active). */
export const HARNESS_PERIMETER = [
  'lib',
  'tools',
  'docs',
  'config',
  'functions',
  'scripts',
  'tests',
  'public/registry',
  '.agents/skills',
] as const;

export type ReferenceFindingKind =
  | 'plane-mismatch'
  | 'legacy-domain'
  | 'naming-cluster'
  | 'similar-env'
  | 'unused-canonical'
  | 'skill-broken-link';

export type ReferenceSeverity = 'info' | 'warn' | 'error';

export type ReferenceFinding = {
  kind: ReferenceFindingKind;
  severity: ReferenceSeverity;
  id: string; // brand-ok — stable finding key for reports
  title: string;
  detail?: string;
  canonical?: string;
  samples?: Array<{ file: string; line?: number; excerpt?: string }>;
  repair?: string;
};

export type ReferenceDiscoveryReport = {
  generatedAt: string;
  perimeter: readonly string[];
  findings: ReferenceFinding[];
  summary: {
    total: number;
    errors: number;
    warnings: number;
    byKind: Partial<Record<ReferenceFindingKind, number>>;
  };
};

export type ReferenceDiscoveryOptions = {
  /** Fail-closed modes only include error|warn (default: warn). */
  minSeverity?: ReferenceSeverity;
  /** Skip unused-canonical scan (slow on large trees). */
  skipUnused?: boolean;
};

/** SSOT naming clusters — canonical token vs legacy/similar aliases. */
export const NAMING_CLUSTERS = [
  {
    id: 'registry-plane',
    canonical: 'factoryWagerRegistryUrlFromEnv() · REGISTRY_URL · registry.factory-wager.com',
    tokens: [
      'REGISTRY_URL',
      'FACTORY_REGISTRY_URL',
      'factoryWagerRegistryUrlFromEnv',
      'registry.factory-wager.com',
      'registryHost',
    ],
    repair: 'npm registry plane only — see docs/registry-client.md',
  },
  {
    id: 'pages-plane',
    canonical: 'factoryWagerPagesCustomUrl() · ROUTING_PROBE_BASE_URL · score.factory-wager.com',
    tokens: [
      'ROUTING_PROBE_BASE_URL',
      'PAGES_PUBLIC_URL',
      'factoryWagerPagesCustomUrl',
      'score.factory-wager.com',
      'customDomain',
    ],
    repair: 'Pages public / routing probes — not bun publish --registry',
  },
  {
    id: 'registry-bucket',
    canonical: 'factoryRegistryBucketFromEnv() · R2_REGISTRY_BUCKET · factory-wager-registry',
    tokens: [
      'R2_REGISTRY_BUCKET',
      'R2_BUCKET_NAME',
      'R2_BUCKET',
      'factoryRegistryBucketFromEnv',
      'factory-wager-registry',
      'registryDoctorBucket',
    ],
    repair: 'R2 object store bucket — see config/r2-env.ts',
  },
] as const;

const PLANE_MISMATCH_RULES = [
  {
    id: 'registry-url-pages-host',
    re: /REGISTRY_URL\s*[=:]\s*['"`]?https?:\/\/score\.factory-wager\.com/i,
    title: 'REGISTRY_URL points at Pages host',
    repair: 'Use ROUTING_PROBE_BASE_URL or resolveRoutingProbeBaseUrl() for score host',
  },
  {
    id: 'registry-url-localhost',
    re: /REGISTRY_URL\s*[=:]\s*['"`]?https?:\/\/localhost(?::\d+)?/i,
    title: 'REGISTRY_URL hardcoded to localhost in harness code',
    repair: 'Local npm scope uses bunfig.toml; routing probes use serve-public base separately',
  },
  {
    id: 'routing-probe-registry-host',
    re: /ROUTING_PROBE_BASE_URL\s*[=:]\s*['"`]?https?:\/\/registry\.factory-wager\.com/i,
    title: 'ROUTING_PROBE_BASE_URL points at npm registry host',
    repair: 'Use factoryWagerPagesCustomUrl() or score.factory-wager.com',
  },
] as const;

const LEGACY_DOMAIN_RE = /registry\.factory-wager\.co(?!m)/g;

const SEVERITY_RANK: Record<ReferenceSeverity, number> = {
  info: 0,
  warn: 1,
  error: 2,
};

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = Array.from({ length: m + 1 }, () => Array.from({ length: n + 1 }, () => 0));
  for (let i = 0; i <= m; i++) dp[i]![0] = i;
  for (let j = 0; j <= n; j++) dp[0]![j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i]![j] = Math.min(dp[i - 1]![j]! + 1, dp[i]![j - 1]! + 1, dp[i - 1]![j - 1]! + cost);
    }
  }
  return dp[m]![n]!;
}

export function nameSimilarity(a: string, b: string): number {
  const na = a.toLowerCase();
  const nb = b.toLowerCase();
  if (na === nb) return 1;
  const dist = levenshtein(na, nb);
  return 1 - dist / Math.max(na.length, nb.length, 1);
}

async function collectPerimeterFiles(): Promise<string[]> {
  const roots = new Set<string>([
    'AGENTS.md',
    'README.md',
    'STRUCTURE.md',
    '.custom-instructions.md',
    'package.json',
  ]);
  const allowedPrefixes = HARNESS_PERIMETER.map(p => `${p}/`);
  const glob = new Bun.Glob('**/*.{ts,md,json}');
  for await (const rel of glob.scan({ cwd: REPO, onlyFiles: true })) {
    if (rel.includes('node_modules')) continue;
    if (allowedPrefixes.some(prefix => rel.startsWith(prefix))) roots.add(rel);
  }
  return [...roots];
}

function lineNumber(text: string, index: number): number {
  return text.slice(0, index).split('\n').length;
}

async function scanPlaneMismatches(files: string[]): Promise<ReferenceFinding[]> {
  const findings: ReferenceFinding[] = [];
  const codeFiles = files.filter(
    f => f.endsWith('.ts') && !f.endsWith('.test.ts') && !f.endsWith('.test-d.ts')
  );

  for (const rel of codeFiles) {
    const text = await Bun.file(joinPath(REPO, rel)).text();
    for (const rule of PLANE_MISMATCH_RULES) {
      const m = rule.re.exec(text);
      if (!m) continue;
      findings.push({
        kind: 'plane-mismatch',
        severity: 'error',
        id: `${rule.id}:${rel}`,
        title: rule.title,
        detail: rule.re.source,
        samples: [{ file: rel, line: lineNumber(text, m.index), excerpt: m[0].slice(0, 120) }],
        repair: rule.repair,
      });
    }
  }
  return findings;
}

async function scanLegacyDomains(files: string[]): Promise<ReferenceFinding[]> {
  const findings: ReferenceFinding[] = [];
  for (const rel of files) {
    const text = await Bun.file(joinPath(REPO, rel)).text();
    for (const m of text.matchAll(LEGACY_DOMAIN_RE)) {
      findings.push({
        kind: 'legacy-domain',
        severity: 'warn',
        id: `legacy-co:${rel}:${m.index}`,
        title: 'Legacy registry host uses .co TLD (typo)',
        detail: 'Prefer registry.factory-wager.com (npm plane SSOT)',
        samples: [{ file: rel, line: lineNumber(text, m.index!), excerpt: m[0] }],
        repair: 'Replace .co with .com or use factoryWagerRegistryUrlFromEnv()',
      });
    }
  }
  return findings;
}

async function scanNamingClusters(files: string[]): Promise<ReferenceFinding[]> {
  const findings: ReferenceFinding[] = [];
  const corpus = (
    await Promise.all(
      files.map(async rel => ({ rel, text: await Bun.file(joinPath(REPO, rel)).text() }))
    )
  ).filter(row => row.text.length > 0);

  for (const cluster of NAMING_CLUSTERS) {
    const hits = cluster.tokens.map(token => {
      const re = new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      let count = 0;
      const samples: ReferenceFinding['samples'] = [];
      for (const { rel, text } of corpus) {
        for (const m of text.matchAll(re)) {
          count++;
          if (samples!.length < 3) {
            samples!.push({
              file: rel,
              line: lineNumber(text, m.index!),
              excerpt: text.slice(m.index!, m.index! + Math.min(80, token.length + 20)),
            });
          }
        }
      }
      return { token, count, samples };
    });

    const used = hits.filter(h => h.count > 0);
    if (used.length < 2) continue;

    findings.push({
      kind: 'naming-cluster',
      severity: 'info',
      id: `cluster:${cluster.id}`,
      title: `Similar naming cluster: ${cluster.id}`,
      canonical: cluster.canonical,
      detail: used.map(h => `${h.token} (${h.count})`).join(' · '),
      samples: used.flatMap(h => h.samples ?? []).slice(0, 6),
      repair: cluster.repair,
    });
  }
  return findings;
}

const ENV_RE = /\b(?:Bun\.env|process\.env)\.([A-Z][A-Z0-9_]{2,})\b/g;

/** Documented intentional pairs — see docs/harness/tenants/reference-discovery.md */
export function isAllowedSimilarEnvPair(a: string, b: string): boolean {
  // Bun runtime fetch proxy family. These are distinct routing roles, not
  // aliases; lowercase spellings are captured by lib/net/proxy.ts.
  const bunFetchProxyCluster = new Set(['HTTP_PROXY', 'HTTPS_PROXY', 'NO_PROXY']);
  if (bunFetchProxyCluster.has(a) && bunFetchProxyCluster.has(b)) return true;

  const secretsCluster = new Set([
    'FW_INFRA_SECRETS_SERVICE',
    'FW_R2_SECRETS_SERVICE',
    'FW_SECRETS_SERVICE',
  ]);
  if (secretsCluster.has(a) && secretsCluster.has(b)) return true;

  if (
    (a === 'R2_BUCKET_NAME' && b === 'S3_BUCKET_NAME') ||
    (a === 'S3_BUCKET_NAME' && b === 'R2_BUCKET_NAME')
  ) {
    return true;
  }

  if (a.startsWith('SEARCH_BENCH_PIN_') && b.startsWith('SEARCH_BENCH_PIN_')) return true;

  if (
    (a === 'SEARCH_BENCH_PROXY_AUTH' && b === 'SEARCH_BENCH_PROXY_URL') ||
    (a === 'SEARCH_BENCH_PROXY_URL' && b === 'SEARCH_BENCH_PROXY_AUTH')
  ) {
    return true;
  }

  // Cloudflare two-token policy — see docs/registry-client.md §Env naming: similar pairs
  if (
    (a === 'CLOUDFLARE_API_TOKEN' && b === 'CLOUDFLARE_DNS_API_TOKEN') ||
    (a === 'CLOUDFLARE_DNS_API_TOKEN' && b === 'CLOUDFLARE_API_TOKEN')
  ) {
    return true;
  }

  // Compliance mock: server listen port vs client base URL
  if (
    (a === 'COMPLIANCE_MOCK_PORT' && b === 'COMPLIANCE_MOCK_URL') ||
    (a === 'COMPLIANCE_MOCK_URL' && b === 'COMPLIANCE_MOCK_PORT')
  ) {
    return true;
  }

  // Telegram catalog research cron: schedule expression vs job/log title
  if (
    (a === 'TELEGRAM_CATALOG_RESEARCH_CRON_SCHEDULE' &&
      b === 'TELEGRAM_CATALOG_RESEARCH_CRON_TITLE') ||
    (a === 'TELEGRAM_CATALOG_RESEARCH_CRON_TITLE' &&
      b === 'TELEGRAM_CATALOG_RESEARCH_CRON_SCHEDULE')
  ) {
    return true;
  }

  // Telegram catalog research LLM: key vs model vs base URL (lib/telegram/catalog-research/llm-pass.ts)
  const telegramLlmCluster = new Set([
    'TELEGRAM_CATALOG_RESEARCH_LLM_KEY',
    'TELEGRAM_CATALOG_RESEARCH_LLM_MODEL',
    'TELEGRAM_CATALOG_RESEARCH_LLM_URL',
  ]);
  if (telegramLlmCluster.has(a) && telegramLlmCluster.has(b)) return true;

  // Concept audit controls are deliberately symmetric or orthogonal. Their
  // shared command namespace makes the spellings similar, but each key owns a
  // distinct CLI option in scripts/concept-audit.ts.
  const conceptAuditPairs = new Set([
    'CONCEPT_AUDIT_MAX_USAGE|CONCEPT_AUDIT_MIN_USAGE',
    'CONCEPT_AUDIT_SHOW_UNUSED|CONCEPT_AUDIT_SHOW_USED',
    'CONCEPT_AUDIT_SORT|CONCEPT_AUDIT_STRICT',
  ]);
  if (conceptAuditPairs.has([a, b].sort().join('|'))) return true;

  // Concept graph CLI knobs share a CONCEPT_GRAPH_* namespace but each key
  // owns a distinct option (focus, format, hubs, surface, output, ports).
  if (a.startsWith('CONCEPT_GRAPH_') && b.startsWith('CONCEPT_GRAPH_')) return true;

  // Concept metadata fix/strict are complementary toggles, not aliases.
  if (
    (a === 'CONCEPT_METADATA_FIX' && b === 'CONCEPT_METADATA_STRICT') ||
    (a === 'CONCEPT_METADATA_STRICT' && b === 'CONCEPT_METADATA_FIX')
  ) {
    return true;
  }

  // Dashboard listen vs test harness port (orthogonal bind targets).
  if (
    (a === 'DASHBOARD_PORT' && b === 'DASHBOARD_TEST_PORT') ||
    (a === 'DASHBOARD_TEST_PORT' && b === 'DASHBOARD_PORT')
  ) {
    return true;
  }

  // Alert webhook: listen port vs POST URL (orthogonal bind vs sink).
  if (
    (a === 'ALERT_WEBHOOK_PORT' && b === 'ALERT_WEBHOOK_URL') ||
    (a === 'ALERT_WEBHOOK_URL' && b === 'ALERT_WEBHOOK_PORT')
  ) {
    return true;
  }

  // Bun types CI gate vs tip checkout path — deliberate siblings, not aliases.
  if (
    (a === 'BUN_TYPES_CI' && b === 'BUN_TYPES_TIP') ||
    (a === 'BUN_TYPES_TIP' && b === 'BUN_TYPES_CI')
  ) {
    return true;
  }

  // Pre-push profiling: CHILD prevents recursive profiling in the spawned
  // process; KIND selects the parent-requested profile mode.
  if (
    (a === 'PREPUSH_PROFILE_CHILD' && b === 'PREPUSH_PROFILE_KIND') ||
    (a === 'PREPUSH_PROFILE_KIND' && b === 'PREPUSH_PROFILE_CHILD')
  ) {
    return true;
  }

  return false;
}

/** Context-aware repair text for similar-env pairs (avoid R2-only boilerplate). */
export function similarEnvRepair(a: string, b: string): string {
  const pair = `${a}|${b}`;
  if (pair.includes('HTTP_PROXY') || pair.includes('HTTPS_PROXY') || pair.includes('NO_PROXY')) {
    return 'Bun fetch proxy family — verify roles and aliases against lib/net/proxy.ts and docs/guides/bun-fetch-proxy-environment.md';
  }
  if (
    pair.includes('R2_') ||
    pair.includes('S3_') ||
    pair.includes('REGISTRY') ||
    pair.includes('BUCKET')
  ) {
    return 'Consolidate on config/r2-env.ts SSOT helper; document override in docs/registry-client.md';
  }
  if (a.startsWith('CONCEPT_') || b.startsWith('CONCEPT_')) {
    return 'Confirm intentional concept CLI/graph knobs (distinct flags, not aliases); allowlist in isAllowedSimilarEnvPair if deliberate';
  }
  if (a.startsWith('CLOUDFLARE_') || b.startsWith('CLOUDFLARE_')) {
    return 'Cloudflare token/account policy is multi-key by design — see docs/registry-client.md §Env naming';
  }
  if (a.startsWith('TELEGRAM_') || b.startsWith('TELEGRAM_')) {
    return 'Telegram factory env family — verify against lib/telegram/telegram-config.ts; allowlist deliberate pairs';
  }
  if (a.includes('PORT') || b.includes('PORT') || a.includes('URL') || b.includes('URL')) {
    return 'Port/URL pairs are often orthogonal bind targets — document or allowlist if intentional';
  }
  return 'Review whether names are true aliases (collapse) or deliberate siblings (document + allowlist in isAllowedSimilarEnvPair)';
}

async function scanSimilarEnvVars(files: string[]): Promise<ReferenceFinding[]> {
  const counts = new Map<string, number>();
  const tsFiles = files.filter(f => f.endsWith('.ts'));

  for (const rel of tsFiles) {
    const text = await Bun.file(joinPath(REPO, rel)).text();
    for (const m of text.matchAll(ENV_RE)) {
      const key = m[1]!;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }

  const keys = [...counts.keys()].sort();
  const findings: ReferenceFinding[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < keys.length; i++) {
    for (let j = i + 1; j < keys.length; j++) {
      const a = keys[i]!;
      const b = keys[j]!;
      if (
        (a.endsWith('_HOST') && b.endsWith('_PORT')) ||
        (b.endsWith('_HOST') && a.endsWith('_PORT'))
      ) {
        continue;
      }
      const sim = nameSimilarity(a, b);
      if (sim < 0.72 || sim >= 0.999) continue;
      if (isAllowedSimilarEnvPair(a, b)) continue;
      const pairId = [a, b].sort().join('|');
      if (seen.has(pairId)) continue;
      seen.add(pairId);
      findings.push({
        kind: 'similar-env',
        severity: sim >= 0.82 ? 'warn' : 'info',
        id: `similar-env:${pairId}`,
        title: `Similar env var names: ${a} ↔ ${b}`,
        detail: `similarity=${sim.toFixed(2)} · hits ${counts.get(a)} / ${counts.get(b)}`,
        repair: similarEnvRepair(a, b),
      });
    }
  }
  return findings;
}

async function scanUnusedCanonical(files: string[]): Promise<ReferenceFinding[]> {
  const findings: ReferenceFinding[] = [];
  const corpusText = (
    await Promise.all(
      files
        .filter(f => f !== 'lib/docs/repo-docs.ts')
        .map(async rel => ({ rel, text: await Bun.file(joinPath(REPO, rel)).text() }))
    )
  ).map(r => r.text);

  for (const [key, path] of Object.entries(CANONICAL_TOOLS)) {
    if (typeof path !== 'string' || path.startsWith('http')) continue;
    const needle = path.replace(/^\.\//, '');
    const base = needle.split('/').pop() ?? needle;
    let hits = 0;
    for (const text of corpusText) {
      if (text.includes(needle) || (base.length > 8 && text.includes(base))) hits++;
    }
    if (hits === 0) {
      findings.push({
        kind: 'unused-canonical',
        severity: 'warn',
        id: `unused-canonical:${key}`,
        title: `CANONICAL_TOOLS.${key} has no perimeter references`,
        detail: path,
        repair: 'Remove from repo-docs.ts or reference the path from harness docs/tools',
      });
    }
  }
  return findings;
}

const SKILL_LINK_RE = /\[[^\]]+\]\(([^)]+)\)/g;

async function scanSkillBrokenLinks(files: string[]): Promise<ReferenceFinding[]> {
  const findings: ReferenceFinding[] = [];
  const skillFiles = files.filter(f => f.startsWith('.agents/skills/') && f.endsWith('.md'));

  for (const rel of skillFiles) {
    const text = await Bun.file(joinPath(REPO, rel)).text();
    for (const m of text.matchAll(SKILL_LINK_RE)) {
      const target = m[1]!.trim();
      if (!target || target.startsWith('http') || target.startsWith('#')) continue;
      const normalized = target.split('#')[0]!;
      const abs = resolvePath(REPO, rel, '..', normalized);
      const exists =
        (await Bun.file(abs).exists()) ||
        (await Bun.spawn(['test', '-e', abs], { stdout: 'ignore', stderr: 'ignore' }).exited) === 0;
      if (!exists) {
        findings.push({
          kind: 'skill-broken-link',
          severity: 'warn',
          id: `skill-link:${rel}:${normalized}`,
          title: `Broken skill link: ${normalized}`,
          samples: [{ file: rel, excerpt: m[0].slice(0, 100) }],
          repair: 'Fix relative path in SKILL.md or add missing reference file',
        });
      }
    }
  }
  return findings;
}

function summarize(findings: ReferenceFinding[]): ReferenceDiscoveryReport['summary'] {
  const byKind: Partial<Record<ReferenceFindingKind, number>> = {};
  let errors = 0;
  let warnings = 0;
  for (const f of findings) {
    byKind[f.kind] = (byKind[f.kind] ?? 0) + 1;
    if (f.severity === 'error') errors++;
    if (f.severity === 'warn') warnings++;
  }
  return { total: findings.length, errors, warnings, byKind };
}

export async function runReferenceDiscovery(
  opts: ReferenceDiscoveryOptions = {}
): Promise<ReferenceDiscoveryReport> {
  const files = await collectPerimeterFiles();
  const findings: ReferenceFinding[] = [
    ...(await scanPlaneMismatches(files)),
    ...(await scanLegacyDomains(files)),
    ...(await scanNamingClusters(files)),
    ...(await scanSimilarEnvVars(files)),
    ...(await scanSkillBrokenLinks(files)),
  ];

  if (!opts.skipUnused) {
    findings.push(...(await scanUnusedCanonical(files)));
  }

  findings.sort(
    (a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity] || a.id.localeCompare(b.id)
  );

  return {
    generatedAt: new Date().toISOString(),
    perimeter: HARNESS_PERIMETER,
    findings,
    summary: summarize(findings),
  };
}

export function reportPasses(
  report: ReferenceDiscoveryReport,
  minSeverity: ReferenceSeverity = 'warn'
): boolean {
  const min = SEVERITY_RANK[minSeverity];
  return report.findings.every(f => SEVERITY_RANK[f.severity] < min);
}
