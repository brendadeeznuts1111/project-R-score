/**
 * partner-surface-wire-lint.ts — Layer C: inventory-aware naked partnerId traps.
 *
 * Allowlist = wire-field rows with resolvesTo=ExternalPartnerRef and
 * non-empty `boundaryPathGlobs`. Trap rows (empty globs) document unregistered
 * adapters. Suppress with `// wire-ok` / `// brand-ok` (same / prev / next line).
 *
 * @see https://bun.com/docs/runtime/glob — Bun.Glob
 * @see https://bun.com/docs/runtime/utils#bun-stringwidth — Bun.stringWidth
 */

import { stringWidth } from 'bun';
import type { PartnerSurfaceRow, PartnerSurfaceWireFieldBag } from './partner-surface-inventory.ts';

export type WireTrapLevel = 'error' | 'warn';

export type WireTrapHit = {
  readonly file: string;
  readonly line: number;
  readonly match: string;
  readonly text: string;
};

export type WireTrapIssue = {
  readonly level: WireTrapLevel;
  readonly message: string;
  readonly file?: string;
  readonly line?: number;
  readonly match?: string;
  readonly fix?: string;
};

export type WireAllowEntry = {
  readonly rowId: string;
  readonly token: string;
  readonly globs: readonly string[];
  readonly strict: boolean;
  readonly requireReason: boolean;
};

/** Naked wire annotations we ban outside allowlisted boundary paths. */
export const NAKED_PARTNER_ID_RE = /\b(partnerId|partner_id)\s*\??\s*:\s*string\b/g;

const SUPPRESS_RE = /\/\/\s*(brand-ok|wire-ok)(?:\s*[:—-]\s*(.+))?/;

const DEFAULT_IGNORE_DIR_PARTS = [
  'node_modules',
  'dist',
  '.git',
  '.worktrees',
  'coverage',
  'scratch',
  '.turbo',
  'artifacts',
  '.next',
] as const;

/** Nested products not yet on the partner-surface inventory wire map. */
const DEFAULT_SKIP_PREFIXES = ['projects/active/enterprise/'] as const;

export function collectWireAllowEntries(
  rows: readonly PartnerSurfaceRow[]
): readonly WireAllowEntry[] {
  const out: WireAllowEntry[] = [];
  for (const row of rows) {
    if (row.aspect !== 'wire-field' || !row.wireField) continue;
    if (row.wireField.resolvesTo !== 'ExternalPartnerRef') continue;
    const globs = (row.wireField.boundaryPathGlobs ?? [])
      .map(g => g.replace(/^\/+/, ''))
      .filter(Boolean);
    if (globs.length === 0) continue;
    out.push({
      rowId: row.id,
      token: row.token,
      globs,
      strict: row.wireField.strict ?? true,
      requireReason: row.wireField.requireReason ?? false,
    });
  }
  return out;
}

export function collectWireAllowPathGlobs(rows: readonly PartnerSurfaceRow[]): readonly string[] {
  return [...new Set(collectWireAllowEntries(rows).flatMap(e => e.globs))].sort();
}

export function collectTrapRowTokens(rows: readonly PartnerSurfaceRow[]): readonly string[] {
  const tokens: string[] = [];
  for (const row of rows) {
    if (row.aspect !== 'wire-field' || !row.wireField) continue;
    if (row.wireField.resolvesTo !== 'ExternalPartnerRef') continue;
    if ((row.wireField.boundaryPathGlobs?.length ?? 0) === 0) {
      tokens.push(row.token);
    }
  }
  return tokens;
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
        fix: 'Set wireField.boundaryPathGlobs on this inventory row when the adapter lands',
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

export function findAllowEntryForFile(
  file: string,
  entries: readonly WireAllowEntry[]
): WireAllowEntry | undefined {
  return entries.find(e => pathMatchesAnyGlob(file, e.globs));
}

/** Glob prefix used to decide missing vs stale (empty nested checkout). */
export function globRootPrefix(globPattern: string): string {
  const g = globPattern.replace(/\\/g, '/').replace(/^\.\//, '');
  if (g.endsWith('/**')) return g.slice(0, -3);
  const star = g.indexOf('*');
  if (star === -1) return g;
  const slash = g.lastIndexOf('/', star);
  return slash === -1 ? g.slice(0, star) : g.slice(0, slash);
}

async function pathHasAnyFile(root: string, prefix: string): Promise<boolean> {
  const abs = `${root.replace(/\/$/, '')}/${prefix}`;
  const dir = Bun.file(abs);
  // Bun.file on a directory: exists may be true; probe with a shallow glob
  const probe = new Bun.Glob(`${prefix.replace(/\/$/, '')}/**/*`);
  for await (const _ of probe.scan({ cwd: root, onlyFiles: true, followSymlinks: false })) {
    return true;
  }
  void dir;
  return false;
}

async function globMatchCount(root: string, globPattern: string, limit = 1): Promise<number> {
  const glob = new Bun.Glob(globPattern);
  let n = 0;
  for await (const _ of glob.scan({ cwd: root, onlyFiles: true, followSymlinks: false })) {
    n += 1;
    if (n >= limit) break;
  }
  return n;
}

/**
 * Prove each allowlist glob matches ≥1 file.
 * - 0 matches + empty/missing tree → warn (optional nested checkout)
 * - 0 matches + tree has files → error (stale glob)
 * - `--strict-globs` / strictGlobs: empty tree also errors
 */
export async function validateWireGlobCoverage(options: {
  readonly root: string;
  readonly rows: readonly PartnerSurfaceRow[];
  readonly strictGlobs?: boolean;
}): Promise<readonly WireTrapIssue[]> {
  const issues: WireTrapIssue[] = [];
  const entries = collectWireAllowEntries(options.rows);
  for (const entry of entries) {
    for (const globPattern of entry.globs) {
      const count = await globMatchCount(options.root, globPattern, 1);
      if (count > 0) continue;
      const prefix = globRootPrefix(globPattern);
      const hasFiles = prefix ? await pathHasAnyFile(options.root, prefix) : false;
      if (!hasFiles && !options.strictGlobs) {
        issues.push({
          level: 'warn',
          message: `${entry.rowId}: glob "${globPattern}" matches 0 files (tree "${prefix}" missing or empty — optional checkout)`,
          fix: `Checkout/populate ${prefix} or remove obsolete boundaryPathGlobs`,
        });
        continue;
      }
      issues.push({
        level: 'error',
        message: `${entry.rowId}: glob "${globPattern}" for token "${entry.token}" matches 0 files`,
        fix: 'Fix boundaryPathGlobs or delete the obsolete wire-field allowlist entry',
      });
    }
  }
  return issues;
}

export type WireSuppression = {
  readonly kind: 'wire-ok' | 'brand-ok';
  readonly reason: string;
};

export function findLineSuppression(
  lines: readonly string[],
  index: number
): WireSuppression | undefined {
  for (const offset of [0, -1, 1] as const) {
    const idx = index + offset;
    if (idx < 0 || idx >= lines.length) continue;
    const line = lines[idx] ?? '';
    const m = line.match(SUPPRESS_RE);
    if (!m) continue;
    return {
      kind: m[1] === 'brand-ok' ? 'brand-ok' : 'wire-ok',
      reason: (m[2] ?? '').trim(),
    };
  }
  return undefined;
}

/** @deprecated use findLineSuppression */
export function lineIsSuppressed(lines: readonly string[], index: number): boolean {
  return findLineSuppression(lines, index) !== undefined;
}

/**
 * Strip line comments and quoted/template string spans so regex does not
 * fire on docs examples or JSDoc prose.
 */
export function maskNonCodeSpans(line: string): string {
  let out = '';
  let i = 0;
  while (i < line.length) {
    // line comment
    if (line[i] === '/' && line[i + 1] === '/') {
      out += ' '.repeat(line.length - i);
      break;
    }
    // block comment start on this line (/* … */)
    if (line[i] === '/' && line[i + 1] === '*') {
      const end = line.indexOf('*/', i + 2);
      if (end === -1) {
        out += ' '.repeat(line.length - i);
        break;
      }
      out += ' '.repeat(end + 2 - i);
      i = end + 2;
      continue;
    }
    const q = line[i];
    if (q === "'" || q === '"' || q === '`') {
      let j = i + 1;
      while (j < line.length) {
        if (line[j] === '\\') {
          j += 2;
          continue;
        }
        if (line[j] === q) {
          j += 1;
          break;
        }
        j += 1;
      }
      out += ' '.repeat(j - i);
      i = j;
      continue;
    }
    out += line[i];
    i += 1;
  }
  return out;
}

export function findNakedPartnerIdHits(file: string, source: string): readonly WireTrapHit[] {
  const lines = source.split(/\r?\n/);
  const hits: WireTrapHit[] = [];
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i] ?? '';
    const trimmed = raw.trim();
    // JSDoc / block-comment continuations
    if (trimmed.startsWith('*') || trimmed.startsWith('/**') || trimmed.startsWith('*/')) {
      continue;
    }
    if (/^\s*\/\//.test(raw)) continue;

    const masked = maskNonCodeSpans(raw);
    NAKED_PARTNER_ID_RE.lastIndex = 0;
    const m = NAKED_PARTNER_ID_RE.exec(masked);
    if (!m) continue;
    hits.push({
      file,
      line: i + 1,
      match: m[0] ?? '',
      text: trimmed,
    });
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
  readonly allowEntries: readonly WireAllowEntry[];
  readonly trapTokens: readonly string[];
  readonly hits: readonly WireTrapHit[];
  readonly issues: readonly WireTrapIssue[];
  readonly scannedFiles: number;
};

/**
 * Scan TypeScript sources for naked partnerId/partner_id: string outside
 * inventory allowlisted boundary paths. Also validates glob coverage.
 */
export async function scanWireTraps(options: {
  readonly root: string;
  readonly rows: readonly PartnerSurfaceRow[];
  readonly globPattern?: string;
  readonly strictGlobs?: boolean;
}): Promise<ScanWireTrapsResult> {
  const allowEntries = collectWireAllowEntries(options.rows);
  const allowGlobs = collectWireAllowPathGlobs(options.rows);
  const trapTokens = collectTrapRowTokens(options.rows);
  const issues: WireTrapIssue[] = [
    ...warnMissingWireBoundaryGlobs(options.rows),
    ...(await validateWireGlobCoverage({
      root: options.root,
      rows: options.rows,
      strictGlobs: options.strictGlobs,
    })),
  ];
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

    const allow = findAllowEntryForFile(rel, allowEntries);
    const abs = `${options.root.replace(/\/$/, '')}/${rel}`;
    const source = await Bun.file(abs).text();
    const fileHits = findNakedPartnerIdHits(rel, source);
    if (fileHits.length === 0) {
      if (!allow) scannedFiles += 1;
      continue;
    }

    scannedFiles += 1;
    const lines = source.split(/\r?\n/);

    for (const hit of fileHits) {
      const suppression = findLineSuppression(lines, hit.line - 1);
      if (suppression) {
        if (
          allow?.requireReason &&
          suppression.kind === 'wire-ok' &&
          suppression.reason.length === 0
        ) {
          issues.push({
            level: 'warn',
            file: hit.file,
            line: hit.line,
            match: hit.match,
            message: `${hit.file}:${hit.line}: // wire-ok missing reason (requireReason on ${allow.rowId})`,
            fix: 'Use // wire-ok: <why this wire parse is raw string>',
          });
        }
        continue;
      }

      if (allow) {
        // Allowlisted adapter path — naked wire id is expected.
        // strict:false → still surface as warn so the edge stays visible.
        if (!allow.strict) {
          issues.push({
            level: 'warn',
            file: hit.file,
            line: hit.line,
            match: hit.match,
            message: `${hit.file}:${hit.line}: naked \`${hit.match}\` in non-strict allowlist (${allow.rowId})`,
            fix: 'Prefer ExternalPartnerRef at the boundary, or set strict:true once migrated',
          });
        }
        continue;
      }

      const trapHint =
        trapTokens.length > 0
          ? `No wire-field allowlist matches this path (trap tokens: ${trapTokens.join(', ')}). Add a wire-field row with boundaryPathGlobs to register this adapter.`
          : 'Naked partnerId/partner_id: string outside any wire-field allowlist. Add a wire-field row or suppress with // wire-ok: <reason>.';

      hits.push(hit);
      issues.push({
        level: 'error',
        file: hit.file,
        line: hit.line,
        match: hit.match,
        message: `${hit.file}:${hit.line}: naked \`${hit.match}\``,
        fix: trapHint,
      });
    }
  }

  return { allowGlobs, allowEntries, trapTokens, hits, issues, scannedFiles };
}

/** Exported for tests — bag shape helper. */
export function wireBagAllowsBoundary(bag: PartnerSurfaceWireFieldBag, file: string): boolean {
  if (bag.resolvesTo !== 'ExternalPartnerRef') return false;
  return pathMatchesAnyGlob(file, bag.boundaryPathGlobs ?? []);
}

/** Visible width helper re-export for CLI table layout. */
export function visibleWidth(text: string): number {
  return stringWidth(text);
}
