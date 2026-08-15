// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/glob#quickstart — Bun.Glob
/**
 * partner-surface-domain-lint.ts — Layer D: brand domain isolation.
 *
 * Inventory brands declare `brand.domain`. Files outside each brand's home
 * path globs must not reference that branded type (unless domain is
 * `cross-domain`). Default severity is warn; `--strict` promotes to error.
 *
 * @see docs/design/partner-surface-inventory.md
 * @see lib/docs/partner-surface-brand-check.ts
 */
import { BRAND_LINK_CROSS_DOMAIN } from './partner-surface-brand-check.ts';
import type { PartnerSurfaceRow } from './partner-surface-inventory.ts';
import { pathMatchesAnyGlob, shouldScanPath } from './partner-surface-wire-lint.ts';

export type DomainLintLevel = 'error' | 'warn';

export type DomainLintIssue = {
  readonly level: DomainLintLevel;
  readonly message: string;
  readonly file?: string;
  readonly line?: number;
  readonly brand?: string;
  readonly brandDomain?: string;
};

export type BrandHomeRule = {
  readonly brandType: string;
  readonly domain: string;
  readonly category: string;
  readonly rowIds: readonly string[];
  readonly homeGlobs: readonly string[];
  readonly regex: RegExp;
};

function moduleDirGlob(modulePath: string): string {
  const cleaned = modulePath.replace(/^\.\//, '').replace(/\/$/, '');
  if (cleaned.endsWith('.ts') || cleaned.endsWith('.tsx')) {
    const dir = cleaned.replace(/\/[^/]+$/, '');
    return dir ? `${dir}/**` : '**';
  }
  return cleaned.includes('*') ? cleaned : `${cleaned.replace(/\/?$/, '')}/**`;
}

/** Default home trees for partner operations brands. */
const OPERATIONS_HOME = [
  'lib/operations/**',
  'lib/telegram/**',
  'lib/partner-profile/**',
  'lib/channels/**', // outbox / partner onboard package events
  'packages/partners/**',
  'scripts/**',
  'tools/**',
] as const;

const ALWAYS_HOME = [
  'lib/types/branded/**',
  'lib/docs/partner-surface*.ts',
  'tests/**',
  'docs/**',
] as const;

export function homeGlobsForBrandBag(bag: {
  readonly domain: string;
  readonly category: string;
  readonly module: string;
}): readonly string[] {
  if (bag.domain === BRAND_LINK_CROSS_DOMAIN) {
    return ['**'];
  }
  const globs = new Set<string>([...ALWAYS_HOME, moduleDirGlob(bag.module)]);
  if (bag.domain === 'operations') {
    for (const g of OPERATIONS_HOME) globs.add(g);
  }
  if (bag.category === 'node') {
    // TreeNodeId is ops-tree PK used across experiments / channels / accounts.
    globs.add('lib/**');
  }
  if (bag.category === 'profile' || bag.category === 'template') {
    globs.add('lib/operations/**');
    globs.add('lib/partner-profile/**');
    globs.add('packages/partners/**');
  }
  return [...globs].sort();
}

export function buildBrandHomeRules(rows: readonly PartnerSurfaceRow[]): readonly BrandHomeRule[] {
  const byType = new Map<
    string,
    {
      domain: string;
      category: string;
      rowIds: string[];
      homeGlobs: Set<string>;
    }
  >();

  for (const row of rows) {
    if (row.aspect !== 'brand' || !row.brand) continue;
    const brandType = row.typeOrExport?.trim() || row.token;
    if (!/^[A-Z][A-Za-z0-9]*$/.test(brandType)) continue;
    const existing = byType.get(brandType);
    const homes = homeGlobsForBrandBag(row.brand);
    if (!existing) {
      byType.set(brandType, {
        domain: row.brand.domain,
        category: row.brand.category,
        rowIds: [row.id],
        homeGlobs: new Set(homes),
      });
      continue;
    }
    existing.rowIds.push(row.id);
    for (const g of homes) existing.homeGlobs.add(g);
    // Prefer non-cross-domain if mixed (should not happen).
    if (
      existing.domain === BRAND_LINK_CROSS_DOMAIN &&
      row.brand.domain !== BRAND_LINK_CROSS_DOMAIN
    ) {
      existing.domain = row.brand.domain;
    }
  }

  return [...byType.entries()]
    .map(([brandType, v]) => ({
      brandType,
      domain: v.domain,
      category: v.category,
      rowIds: v.rowIds,
      homeGlobs: [...v.homeGlobs].sort(),
      regex: new RegExp(`\\b${brandType}\\b`),
    }))
    .sort((a, b) => a.brandType.localeCompare(b.brandType));
}

export function brandAllowedInFile(file: string, rule: BrandHomeRule): boolean {
  if (rule.domain === BRAND_LINK_CROSS_DOMAIN) return true;
  return pathMatchesAnyGlob(file, rule.homeGlobs);
}

function maskNonCode(line: string): string {
  // Strip strings + comments enough to avoid doc false positives.
  return line
    .replace(/\/\/.*$/, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(['"`])(?:\\.|(?!\1).)*\1/g, '""');
}

export function findBrandTypeHits(
  file: string,
  source: string,
  rule: BrandHomeRule
): readonly { file: string; line: number; brand: string }[] {
  const hits: { file: string; line: number; brand: string }[] = [];
  const lines = source.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i] ?? '';
    const trimmed = raw.trim();
    if (trimmed.startsWith('*') || trimmed.startsWith('/**') || trimmed.startsWith('*/')) continue;
    if (/^\s*\/\//.test(raw)) continue;
    const masked = maskNonCode(raw);
    if (rule.regex.test(masked)) {
      hits.push({ file, line: i + 1, brand: rule.brandType });
    }
  }
  return hits;
}

export type ScanDomainIsolationResult = {
  readonly rules: readonly BrandHomeRule[];
  readonly issues: readonly DomainLintIssue[];
  readonly scannedFiles: number;
};

export async function scanDomainIsolation(options: {
  readonly root: string;
  readonly rows: readonly PartnerSurfaceRow[];
  /** Promote out-of-home hits to error. Default: warn. */
  readonly strict?: boolean;
  /** Explicit repository-relative files to scan (for staged/diff gates). */
  readonly files?: readonly string[];
}): Promise<ScanDomainIsolationResult> {
  const rules = buildBrandHomeRules(options.rows);
  const issues: DomainLintIssue[] = [];
  const root = options.root.replace(/\/$/, '');
  const level: DomainLintLevel = options.strict ? 'error' : 'warn';

  const explicitFiles = options.files
    ? [...new Set(options.files.map(file => file.replace(/\\/g, '/').replace(/^\.\//, '')))]
    : undefined;
  const discoveredFiles = explicitFiles ?? [];
  if (!explicitFiles) {
    for await (const file of new Bun.Glob('**/*.{ts,tsx}').scan({
      cwd: root,
      onlyFiles: true,
      dot: false,
    })) {
      discoveredFiles.push(file);
    }
  }

  let scannedFiles = 0;
  for (const rel of discoveredFiles) {
    if (!shouldScanPath(rel)) continue;
    // Skip nested product trees + foreign lanes for Layer D v1.
    if (rel.startsWith('projects/') || rel.startsWith('Kalshi-bot/')) continue;
    scannedFiles++;
    const abs = `${root}/${rel}`;
    const source = await Bun.file(abs).text();

    for (const rule of rules) {
      if (brandAllowedInFile(rel, rule)) continue;
      for (const hit of findBrandTypeHits(rel, source, rule)) {
        issues.push({
          level,
          file: hit.file,
          line: hit.line,
          brand: hit.brand,
          brandDomain: rule.domain,
          message: `${hit.file}:${hit.line}: \`${hit.brand}\` (domain ${rule.domain}) outside home globs`,
        });
      }
    }
  }

  return { rules, issues, scannedFiles };
}
