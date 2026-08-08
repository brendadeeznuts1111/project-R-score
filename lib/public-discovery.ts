// @see https://bun.com/docs/runtime/glob#quickstart — Bun.Glob
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
/**
 * Public-plane reference discovery — portal chrome, registry refs, static anti-patterns.
 *
 * Composes with harness reference-discovery (lib/) and portal verify (tools/verify-portal.ts).
 */
import { joinPath, resolvePath } from './path-bun.ts';
import { PORTAL_WEAVE_ARTIFACTS } from './http/portal-weave.ts';
import { collectPortalStaticViolations } from './portal-static-checks.ts';

const REPO = resolvePath(import.meta.dir, '..');

/** Pages static artifact tree (excludes projects/active and binary evidence). */
export const PUBLIC_PERIMETER = [
  'public/portal',
  'public/registry',
  'public/monitoring',
  'public/health',
  'public/icons',
  'public/index.html',
  'public/llms.txt',
  'public/llms-full.txt',
  'public/_headers',
  'public/_redirects',
  'public/sitemap.xml',
  'public/sitemap-pages.xml',
  'public/site.webmanifest',
  'public/manifest.json',
] as const;

export type PublicFindingKind =
  | 'legacy-domain'
  | 'broken-registry-ref'
  | 'portal-chrome-missing'
  | 'portal-inline-health'
  | 'portal-process-env'
  | 'portal-typescript-leak'
  | 'orphan-registry-artifact';

export type PublicSeverity = 'info' | 'warn' | 'error';

export type PublicFinding = {
  kind: PublicFindingKind;
  severity: PublicSeverity;
  id: string; // brand-ok — stable finding key for reports
  title: string;
  detail?: string;
  repair?: string;
  samples?: Array<{ file: string; line?: number; excerpt?: string }>;
};

export type PublicDiscoveryReport = {
  generatedAt: string;
  perimeter: readonly string[];
  findings: PublicFinding[];
  summary: {
    total: number;
    errors: number;
    warnings: number;
    byKind: Partial<Record<PublicFindingKind, number>>;
  };
};

export type PublicDiscoveryOptions = {
  minSeverity?: PublicSeverity;
};

const SEVERITY_RANK: Record<PublicSeverity, number> = {
  info: 0,
  warn: 1,
  error: 2,
};

const LEGACY_DOMAIN_RE = /registry\.factory-wager\.co(?!m)/g;

const REGISTRY_REF_RE = /\/registry\/([A-Za-z0-9@._/-]+\.json)/g;

/** Browser `.js` outside portal/ (lander modules). */
const TS_LEAK_RE = /:\s*(?:Array<|[A-Z][A-Za-z0-9_<>,\s|&]*\s*(?:=>|\)))/;

const PORTAL_RULE_TO_KIND: Record<
  import('./portal-static-checks.ts').PortalStaticRule,
  PublicFindingKind
> = {
  'chrome-missing': 'portal-chrome-missing',
  'inline-health': 'portal-inline-health',
  'process-env': 'portal-process-env',
  'typescript-leak': 'portal-typescript-leak',
};

const PORTAL_RULE_REPAIR: Record<import('./portal-static-checks.ts').PortalStaticRule, string> = {
  'chrome-missing':
    'Copy public/portal/_page-template.html or run bun tools/portal-apply-chrome.ts',
  'inline-health': 'Use data.js startDataService() and portal:data (docs/portal-foundation.md)',
  'process-env': 'Expose redacted keys via GET /api/env only',
  'typescript-leak': 'Remove type annotations or move module behind bun build',
};

async function collectPublicFiles(): Promise<string[]> {
  const roots = new Set<string>();
  const allowedPrefixes = PUBLIC_PERIMETER.map(p =>
    p.endsWith('.html') || p.endsWith('.txt') || p.endsWith('.xml') || p.endsWith('.json')
      ? p
      : `${p}/`
  );

  const glob = new Bun.Glob('**/*.{html,js,css,md,json,txt,xml}');
  for await (const rel of glob.scan({ cwd: joinPath(REPO, 'public'), onlyFiles: true })) {
    const full = `public/${rel}`;
    if (rel.startsWith('evidence/')) continue;
    if (allowedPrefixes.some(prefix => full === prefix || full.startsWith(prefix))) {
      roots.add(full);
    }
  }

  for (const leaf of PUBLIC_PERIMETER) {
    if (leaf.includes('.')) {
      const abs = joinPath(REPO, leaf);
      if (await Bun.file(abs).exists()) roots.add(leaf);
    }
  }

  return [...roots].sort();
}

function lineNumber(text: string, index: number): number {
  return text.slice(0, index).split('\n').length;
}

async function scanLegacyDomains(files: string[]): Promise<PublicFinding[]> {
  const findings: PublicFinding[] = [];
  for (const rel of files) {
    const text = await Bun.file(joinPath(REPO, rel)).text();
    for (const m of text.matchAll(LEGACY_DOMAIN_RE)) {
      findings.push({
        kind: 'legacy-domain',
        severity: 'warn',
        id: `legacy-co:${rel}:${m.index}`,
        title: 'Legacy registry host uses .co TLD (typo)',
        detail: 'Prefer registry.factory-wager.com or score.factory-wager.com SSOT',
        samples: [{ file: rel, line: lineNumber(text, m.index!), excerpt: m[0] }],
        repair: 'Replace .co with .com; npm plane vs Pages plane — see config/r2-env.ts',
      });
    }
  }
  return findings;
}

async function scanBrokenRegistryRefs(files: string[]): Promise<PublicFinding[]> {
  const findings: PublicFinding[] = [];
  const seen = new Set<string>();
  const scanFiles = files.filter(
    f => f.endsWith('.html') || f.endsWith('.js') || f.endsWith('.md')
  );

  for (const rel of scanFiles) {
    const text = await Bun.file(joinPath(REPO, rel)).text();
    for (const m of text.matchAll(REGISTRY_REF_RE)) {
      const registryPath = `public/registry/${m[1]!}`;
      const key = `${rel}:${registryPath}`;
      if (seen.has(key)) continue;
      seen.add(key);
      if (await Bun.file(joinPath(REPO, registryPath)).exists()) continue;
      findings.push({
        kind: 'broken-registry-ref',
        severity: 'error',
        id: `broken-registry:${registryPath}`,
        title: `Broken /registry/ reference: ${m[1]}`,
        samples: [
          {
            file: rel,
            line: lineNumber(text, m.index!),
            excerpt: m[0].slice(0, 80),
          },
        ],
        repair: `Add ${registryPath} via ops:snapshot or fix fetch path in portal module`,
      });
    }
  }
  return findings;
}

async function scanPortalStaticChecks(): Promise<PublicFinding[]> {
  const violations = await collectPortalStaticViolations();
  return violations.map(v => ({
    kind: PORTAL_RULE_TO_KIND[v.rule],
    severity: 'error' as const,
    id: `${v.rule}:${v.file}`,
    title: v.message,
    detail: v.rule === 'typescript-leak' ? 'Pages serves public/ without transpile' : undefined,
    repair: PORTAL_RULE_REPAIR[v.rule],
    samples: [{ file: v.file, line: v.line, excerpt: v.excerpt }],
  }));
}

async function scanLanderTypescriptLeaks(files: string[]): Promise<PublicFinding[]> {
  const findings: PublicFinding[] = [];
  const jsFiles = files.filter(
    f => f.startsWith('public/') && f.endsWith('.js') && !f.startsWith('public/portal/')
  );

  for (const rel of jsFiles) {
    const text = await Bun.file(joinPath(REPO, rel)).text();
    const m = TS_LEAK_RE.exec(text);
    if (!m) continue;
    findings.push({
      kind: 'portal-typescript-leak',
      severity: 'error',
      id: `portal-ts-leak:${rel}`,
      title: 'TypeScript annotation in browser-served .js module',
      detail: 'Pages serves public/ without transpile — TS syntax breaks parse',
      samples: [{ file: rel, line: lineNumber(text, m.index!), excerpt: m[0].slice(0, 60) }],
      repair: PORTAL_RULE_REPAIR['typescript-leak'],
    });
  }
  return findings;
}

/** Registry JSON wired via portal-weave SSOT (rebaked to public/registry/portal-weave.json). */
const WEAVE_WIRED_REGISTRY = new Set(
  PORTAL_WEAVE_ARTIFACTS.map(a => a.href.replace(/^\/registry\//, ''))
);

/**
 * Intentional bake orphans — no portal board required.
 * SSOT prose: docs/harness/tenants/public-plane.md (Documented bake orphans).
 * Keep in lockstep when adding/removing documented orphans.
 */
export const DOCUMENTED_ORPHAN_REGISTRY_ARTIFACTS = new Set([
  'partner-profile-coverage.json',
  'stale-anchors.json',
]);

async function scanOrphanRegistryArtifacts(files: string[]): Promise<PublicFinding[]> {
  const findings: PublicFinding[] = [];
  const corpus = (
    await Promise.all(
      files
        .filter(f => !f.startsWith('public/registry/'))
        .map(async rel => ({ rel, text: await Bun.file(joinPath(REPO, rel)).text() }))
    )
  ).map(r => r.text);

  const registryGlob = new Bun.Glob('**/*.json');
  for await (const rel of registryGlob.scan({
    cwd: joinPath(REPO, 'public/registry'),
    onlyFiles: true,
  })) {
    const basename = rel.split('/').pop() ?? rel;
    if (basename.startsWith('verification-') && basename.includes('1.')) continue;
    if (DOCUMENTED_ORPHAN_REGISTRY_ARTIFACTS.has(rel) || DOCUMENTED_ORPHAN_REGISTRY_ARTIFACTS.has(basename)) {
      continue;
    }
    const needle = `/registry/${rel}`;
    const alt = basename;
    let hits = 0;
    for (const text of corpus) {
      if (text.includes(needle) || text.includes(`registry/${rel}`) || text.includes(alt)) hits++;
    }
    if (hits === 0 && !rel.includes('@factorywager/') && !WEAVE_WIRED_REGISTRY.has(rel)) {
      findings.push({
        kind: 'orphan-registry-artifact',
        severity: 'info',
        id: `orphan-registry:${rel}`,
        title: `Registry JSON not referenced from public/portal or lander`,
        detail: rel,
        repair:
          'Wire into portal dashboard, or add to DOCUMENTED_ORPHAN_REGISTRY_ARTIFACTS + docs/harness/tenants/public-plane.md',
      });
    }
  }
  return findings.slice(0, 30);
}

function summarize(findings: PublicFinding[]): PublicDiscoveryReport['summary'] {
  const byKind: Partial<Record<PublicFindingKind, number>> = {};
  let errors = 0;
  let warnings = 0;
  for (const f of findings) {
    byKind[f.kind] = (byKind[f.kind] ?? 0) + 1;
    if (f.severity === 'error') errors++;
    if (f.severity === 'warn') warnings++;
  }
  return { total: findings.length, errors, warnings, byKind };
}

export async function runPublicDiscovery(
  _opts: PublicDiscoveryOptions = {}
): Promise<PublicDiscoveryReport> {
  const files = await collectPublicFiles();
  const findings: PublicFinding[] = [
    ...(await scanLegacyDomains(files)),
    ...(await scanBrokenRegistryRefs(files)),
    ...(await scanPortalStaticChecks()),
    ...(await scanLanderTypescriptLeaks(files)),
    ...(await scanOrphanRegistryArtifacts(files)),
  ];

  findings.sort(
    (a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity] || a.id.localeCompare(b.id)
  );

  return {
    generatedAt: new Date().toISOString(),
    perimeter: PUBLIC_PERIMETER,
    findings,
    summary: summarize(findings),
  };
}

/** Normalize CLI aliases (`warning` → `warn`, `errors` → `error`). */
export function parsePublicSeverity(raw: string): PublicSeverity {
  const key = raw.trim().toLowerCase();
  if (key === 'warning' || key === 'warnings' || key === 'warn') return 'warn';
  if (key === 'errors' || key === 'error') return 'error';
  if (key === 'info' || key === 'infos') return 'info';
  throw new Error(`Unknown public-discovery severity: ${raw} (use info|warn|error)`);
}

export function publicReportPasses(
  report: PublicDiscoveryReport,
  minSeverity: PublicSeverity = 'error'
): boolean {
  const min = SEVERITY_RANK[minSeverity];
  return report.findings.every(f => SEVERITY_RANK[f.severity] < min);
}
