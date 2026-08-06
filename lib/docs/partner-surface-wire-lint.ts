/**
 * partner-surface-wire-lint.ts — Layer C: inventory-aware naked partnerId traps.
 *
 * Allowlist comes from wire-field rows with resolvesTo=ExternalPartnerRef and
 * `boundaryPathGlobs`. Lines suppressed with `// brand-ok` or `// wire-ok`
 * (same / previous / next line, matching branded-id-check) are skipped.
 */

import type { PartnerSurfaceRow, PartnerSurfaceWireFieldBag } from './partner-surface-inventory.ts';

export type WireTrapHit = {
  readonly file: string;
  readonly line: number;
  readonly text: string;
};

export type WireTrapIssue = {
  readonly level: 'error' | 'warn';
  readonly message: string;
};

/** Naked wire annotations we ban outside allowlisted boundary paths. */
export const NAKED_PARTNER_ID_RE = /\b(partnerId|partner_id)\s*\??\s*:\s*string\b/g;

const SUPPRESS_RE = /(?:brand-ok|wire-ok)\b/;

const DEFAULT_IGNORE_DIR_PARTS = [
  'node_modules',
  'dist',
  '.git',
  '.worktrees',
  'coverage',
  'scratch',
  '.turbo',
  'artifacts',
] as const;

/** Nested products not yet on the partner-surface inventory wire map. */
const DEFAULT_SKIP_PREFIXES = ['projects/active/enterprise/'] as const;

export function collectWireAllowPathGlobs(rows: readonly PartnerSurfaceRow[]): readonly string[] {
  const globs = new Set<string>();
  for (const row of rows) {
    if (row.aspect !== 'wire-field' || !row.wireField) continue;
    if (row.wireField.resolvesTo !== 'ExternalPartnerRef') continue;
    for (const g of row.wireField.boundaryPathGlobs ?? []) {
      const trimmed = g.replace(/^\/+/, '');
      if (trimmed) globs.add(trimmed);
    }
  }
  return [...globs].sort();
}

/** Warn when ExternalPartnerRef rows lack boundary globs (except unqualified trap docs). */
export function warnMissingWireBoundaryGlobs(
  rows: readonly PartnerSurfaceRow[]
): readonly WireTrapIssue[] {
  const issues: WireTrapIssue[] = [];
  for (const row of rows) {
    if (row.aspect !== 'wire-field' || !row.wireField) continue;
    if (row.wireField.resolvesTo !== 'ExternalPartnerRef') continue;
    if (row.wireField.sourceSystemId === 'unqualified') continue;
    if ((row.wireField.boundaryPathGlobs?.length ?? 0) === 0) {
      issues.push({
        level: 'warn',
        message: `${row.id}: ExternalPartnerRef wire-field missing boundaryPathGlobs — add adapter paths so lint-wires can allowlist them`,
      });
    }
  }
  return issues;
}

export function pathMatchesAnyGlob(file: string, globs: readonly string[]): boolean {
  const norm = file.replace(/\\/g, '/').replace(/^\.\//, '');
  for (const raw of globs) {
    const g = raw.replace(/\\/g, '/').replace(/^\.\//, '');
    if (g.endsWith('/**')) {
      const prefix = g.slice(0, -3);
      if (norm === prefix || norm.startsWith(`${prefix}/`)) return true;
      continue;
    }
    if (g.includes('*')) {
      if (new Bun.Glob(g).match(norm)) return true;
      continue;
    }
    if (norm === g || norm.startsWith(`${g}/`)) return true;
  }
  return false;
}

export function lineIsSuppressed(lines: readonly string[], index: number): boolean {
  const line = lines[index] ?? '';
  if (SUPPRESS_RE.test(line)) return true;
  const prev = (lines[index - 1] ?? '').trim();
  if (/^\/\/\s*(?:brand-ok|wire-ok)\b/.test(prev)) return true;
  const next = (lines[index + 1] ?? '').trim();
  if (/^\/\/\s*(?:brand-ok|wire-ok)\b/.test(next)) return true;
  return false;
}

export function findNakedPartnerIdHits(file: string, source: string): readonly WireTrapHit[] {
  const lines = source.split(/\r?\n/);
  const hits: WireTrapHit[] = [];
  for (let i = 0; i < lines.length; i++) {
    const text = lines[i] ?? '';
    // skip pure comment lines
    if (/^\s*\/\//.test(text) || /^\s*\*/.test(text)) continue;
    NAKED_PARTNER_ID_RE.lastIndex = 0;
    if (!NAKED_PARTNER_ID_RE.test(text)) continue;
    if (lineIsSuppressed(lines, i)) continue;
    hits.push({ file, line: i + 1, text: text.trim() });
  }
  return hits;
}

export function shouldScanPath(
  relPath: string,
  ignoreDirParts: readonly string[] = DEFAULT_IGNORE_DIR_PARTS,
  skipPrefixes: readonly string[] = DEFAULT_SKIP_PREFIXES
): boolean {
  const norm = relPath.replace(/\\/g, '/');
  if (!/\.(ts|tsx)$/.test(norm)) return false;
  if (norm.endsWith('.d.ts')) return false;
  for (const prefix of skipPrefixes) {
    if (norm.startsWith(prefix)) return false;
  }
  const parts = norm.split('/');
  for (const part of parts) {
    if (ignoreDirParts.includes(part)) return false;
  }
  return true;
}

export type ScanWireTrapsResult = {
  readonly allowGlobs: readonly string[];
  readonly hits: readonly WireTrapHit[];
  readonly issues: readonly WireTrapIssue[];
  readonly scannedFiles: number;
};

/**
 * Scan TypeScript sources for naked partnerId/partner_id: string outside
 * inventory allowlisted boundary paths.
 */
export async function scanWireTraps(options: {
  readonly root: string;
  readonly rows: readonly PartnerSurfaceRow[];
  readonly globPattern?: string;
}): Promise<ScanWireTrapsResult> {
  const allowGlobs = collectWireAllowPathGlobs(options.rows);
  const issues: WireTrapIssue[] = [...warnMissingWireBoundaryGlobs(options.rows)];
  const hits: WireTrapHit[] = [];
  let scannedFiles = 0;

  const pattern = options.globPattern ?? '**/*.{ts,tsx}';
  const glob = new Bun.Glob(pattern);
  for await (const file of glob.scan({
    cwd: options.root,
    onlyFiles: true,
    followSymlinks: false,
  })) {
    const rel = file.replace(/\\/g, '/');
    if (!shouldScanPath(rel)) continue;
    if (pathMatchesAnyGlob(rel, allowGlobs)) continue;

    scannedFiles += 1;
    const abs = `${options.root.replace(/\/$/, '')}/${rel}`;
    const source = await Bun.file(abs).text();
    hits.push(...findNakedPartnerIdHits(rel, source));
  }

  for (const hit of hits) {
    issues.push({
      level: 'error',
      message: `${hit.file}:${hit.line}: naked \`${hit.text}\` — use PartnerCode / ExternalPartnerRef, add // wire-ok with reason, or extend wire-field boundaryPathGlobs in partner-surface-inventory`,
    });
  }

  return { allowGlobs, hits, issues, scannedFiles };
}

/** Exported for tests — bag shape helper. */
export function wireBagAllowsBoundary(bag: PartnerSurfaceWireFieldBag, file: string): boolean {
  if (bag.resolvesTo !== 'ExternalPartnerRef') return false;
  return pathMatchesAnyGlob(file, bag.boundaryPathGlobs ?? []);
}
