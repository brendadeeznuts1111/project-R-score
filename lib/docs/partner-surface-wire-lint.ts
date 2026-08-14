// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @updated Bun.write · fixed v0.4.0 · 2022-12-23 · https://bun.com/blog/bun-v0.4.0
// @updated Bun.write · fixed v0.6.10 · 2023-06-26 · https://bun.com/blog/bun-v0.6.10
// @updated Bun.write · fixed v0.7.2 · 2023-08-03 · https://bun.com/blog/bun-v0.7.2
// @updated Bun.write · fixed v1.0.7 · 2023-10-20 · https://bun.com/blog/bun-v1.0.7
// @updated Bun.write · changed v1.0.16 · 2023-12-10 · https://bun.com/blog/bun-v1.0.16
// @updated Bun.write · fixed v1.0.21 · 2024-01-02 · https://bun.com/blog/bun-v1.0.21
// @updated Bun.write · fixed v1.0.23 · 2024-01-16 · https://bun.com/blog/bun-v1.0.23
// @updated Bun.write · fixed v1.0.24 · 2024-01-20 · https://bun.com/blog/bun-v1.0.24
// @updated Bun.write · changed v1.1.0 · 2024-04-01 · https://bun.com/blog/bun-v1.1
// @updated Bun.write · fixed v1.1.6 · 2024-04-28 · https://bun.com/blog/bun-v1.1.6
// @updated Bun.write · fixed v1.1.21 · 2024-07-27 · https://bun.com/blog/bun-v1.1.21
// @updated Bun.write · changed v1.1.37 · 2024-11-26 · https://bun.com/blog/bun-v1.1.37
// @updated Bun.write · changed v1.2.8 · 2025-03-31 · https://bun.com/blog/bun-v1.2.8
// @updated Bun.write · fixed v1.2.8 · 2025-03-31 · https://bun.com/blog/bun-v1.2.8
// @updated Bun.write · fixed v1.2.20 · 2025-08-10 · https://bun.com/blog/bun-v1.2.20
// @updated Bun.write · fixed v1.3.0 · 2025-10-10 · https://bun.com/blog/bun-v1.3
// @updated Bun.write · fixed v1.3.5 · 2025-12-17 · https://bun.com/blog/bun-v1.3.5
// @updated Bun.write · fixed v1.3.6 · 2026-01-13 · https://bun.com/blog/bun-v1.3.6
// @updated Bun.write · fixed v1.3.12 · 2026-04-09 · https://bun.com/blog/bun-v1.3.12
// @verified Bun.write · Bun v1.3.14 · 2026-08-06 · https://bun.com/docs/runtime/file-io#writing-files-bun-write
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
/**
 * partner-surface-wire-lint.ts — Layer C: inventory-driven naked brand traps.
 *
 * Each wire-field row contributes patterns + allowlist globs + a brandedType.
 * ExternalPartnerRef rows are **not** skipped — they define where raw wire
 * strings are correct. Other brands (OutId, …) use the same engine.
 *
 * Suppress with `// wire-ok` / `// brand-ok` (same / prev / next line).
 *
 * @see https://bun.com/docs/runtime/glob — Bun.Glob
 * @see https://bun.com/docs/runtime/utils#bun-stringwidth — Bun.stringWidth
 * @see docs/design/wire-lint.md
 */

import { stringWidth } from 'bun';
import type { PartnerSurfaceRow, PartnerSurfaceWireFieldBag } from './partner-surface-inventory.ts';

export type WireTrapLevel = 'error' | 'warn';

export type WireTrapHit = {
  readonly file: string;
  readonly line: number;
  readonly match: string;
  readonly text: string;
  readonly brandedType: string;
  readonly ruleId: string; // brand-ok — opaque wire-lint rule key (row id / brandedType), not a domain RuleId
};

export type WireTrapIssue = {
  readonly level: WireTrapLevel;
  readonly message: string;
  readonly file?: string;
  readonly line?: number;
  readonly match?: string;
  readonly fix?: string;
};

/** One lint family merged by brandedType (patterns ∪ globs from all contributing rows). */
export type WireLintRule = {
  readonly brandedType: string;
  readonly patterns: readonly string[];
  readonly nakedType: 'string' | 'number';
  readonly globs: readonly string[];
  readonly rowIds: readonly string[];
  readonly trapTokens: readonly string[];
  /** If any contributing row has strict:false → warn (not silent) inside allowlist. */
  readonly strict: boolean;
  /** If any contributing row has requireReason → warn on bare // wire-ok. */
  readonly requireReason: boolean;
  readonly regex: RegExp;
};

/** @deprecated use WireLintRule — kept for callers expecting allow-entry shape */
export type WireAllowEntry = {
  readonly rowId: string; // brand-ok — inventory row key, not a domain entity id
  readonly token: string;
  readonly globs: readonly string[];
  readonly strict: boolean;
  readonly requireReason: boolean;
  readonly brandedType: string;
};

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

const DEFAULT_SKIP_PREFIXES = ['projects/active/enterprise/'] as const;

export function isSimpleIdent(name: string): boolean {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(name);
}

export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function buildNakedAnnotationRegex(
  patterns: readonly string[],
  nakedType: 'string' | 'number' = 'string'
): RegExp {
  const alts = patterns.filter(isSimpleIdent).map(escapeRegex);
  if (alts.length === 0) {
    return /(?!)/g; // never matches
  }
  return new RegExp(`\\b(?:${alts.join('|')})\\s*\\??\\s*:\\s*${nakedType}\\b`, 'g');
}

/** Patterns declared on a wire-field row (explicit pattern/patterns, else simple wireName/token). */
export function patternsForWireRow(row: PartnerSurfaceRow): readonly string[] {
  const bag = row.wireField;
  if (!bag) return [];
  const out = new Set<string>();
  if (bag.patterns) {
    for (const p of bag.patterns) {
      if (isSimpleIdent(p)) out.add(p);
    }
  }
  if (bag.pattern && isSimpleIdent(bag.pattern)) out.add(bag.pattern);
  if (isSimpleIdent(bag.wireName)) out.add(bag.wireName);
  if (isSimpleIdent(row.token)) out.add(row.token);
  return [...out].sort();
}

export function brandedTypeForWireRow(row: PartnerSurfaceRow): string {
  const bag = row.wireField;
  if (!bag) return '';
  return bag.brandedType ?? bag.resolvesTo;
}

/**
 * Build lint rules: one per brandedType, merging patterns and allowlist globs.
 * Rows with only complex wireNames (e.g. partners[].id) still contribute globs.
 */
export function buildWireLintRules(rows: readonly PartnerSurfaceRow[]): readonly WireLintRule[] {
  type Acc = {
    brandedType: string;
    patterns: Set<string>;
    nakedType: 'string' | 'number';
    globs: Set<string>;
    rowIds: string[];
    trapTokens: string[];
    strict: boolean;
    requireReason: boolean;
  };
  const byBrand = new Map<string, Acc>();

  for (const row of rows) {
    if (row.aspect !== 'wire-field' || !row.wireField) continue;
    const bag = row.wireField;
    const brandedType = brandedTypeForWireRow(row);
    if (!brandedType) continue;

    let acc = byBrand.get(brandedType);
    if (!acc) {
      acc = {
        brandedType,
        patterns: new Set(),
        nakedType: bag.nakedType ?? 'string',
        globs: new Set(),
        rowIds: [],
        trapTokens: [],
        strict: true,
        requireReason: false,
      };
      byBrand.set(brandedType, acc);
    }

    acc.rowIds.push(row.id);
    for (const p of patternsForWireRow(row)) acc.patterns.add(p);
    for (const g of bag.boundaryPathGlobs ?? []) {
      const trimmed = g.replace(/^\/+/, '');
      if (trimmed) acc.globs.add(trimmed);
    }
    if ((bag.boundaryPathGlobs?.length ?? 0) === 0) {
      acc.trapTokens.push(row.token);
    }
    // Only rows that contribute globs affect allowlist severity (trap rows must
    // not flip the whole brand family to non-strict).
    if ((bag.boundaryPathGlobs?.length ?? 0) > 0 && bag.strict === false) {
      acc.strict = false;
    }
    if (bag.requireReason === true) acc.requireReason = true;
    if (bag.nakedType) acc.nakedType = bag.nakedType;
  }

  const rules: WireLintRule[] = [];
  for (const acc of byBrand.values()) {
    const patterns = [...acc.patterns].sort();
    if (patterns.length === 0 && acc.globs.size === 0) continue;
    // Glob-only rows (complex wireName) still need a sibling pattern on the brand —
    // if this brand has no patterns at all, skip (cannot scan).
    if (patterns.length === 0) continue;
    rules.push({
      brandedType: acc.brandedType,
      patterns,
      nakedType: acc.nakedType,
      globs: [...acc.globs].sort(),
      rowIds: acc.rowIds,
      trapTokens: acc.trapTokens,
      strict: acc.strict,
      requireReason: acc.requireReason,
      regex: buildNakedAnnotationRegex(patterns, acc.nakedType),
    });
  }
  return rules.sort((a, b) => a.brandedType.localeCompare(b.brandedType));
}

export function collectWireAllowEntries(
  rows: readonly PartnerSurfaceRow[]
): readonly WireAllowEntry[] {
  const rules = buildWireLintRules(rows);
  const out: WireAllowEntry[] = [];
  for (const rule of rules) {
    if (rule.globs.length === 0) continue;
    out.push({
      rowId: rule.rowIds[0] ?? rule.brandedType,
      token: rule.patterns[0] ?? rule.brandedType,
      globs: rule.globs,
      strict: rule.strict,
      requireReason: rule.requireReason,
      brandedType: rule.brandedType,
    });
  }
  return out;
}

export function collectWireAllowPathGlobs(rows: readonly PartnerSurfaceRow[]): readonly string[] {
  return [...new Set(buildWireLintRules(rows).flatMap(r => r.globs))].sort();
}

export function collectTrapRowTokens(rows: readonly PartnerSurfaceRow[]): readonly string[] {
  return [...new Set(buildWireLintRules(rows).flatMap(r => r.trapTokens))].sort();
}

/** Warn when a brand family has patterns but no globs (except unqualified traps). */
export function warnMissingWireBoundaryGlobs(
  rows: readonly PartnerSurfaceRow[]
): readonly WireTrapIssue[] {
  const issues: WireTrapIssue[] = [];
  for (const row of rows) {
    if (row.aspect !== 'wire-field' || !row.wireField) continue;
    if (row.wireField.sourceSystemId === 'unqualified') continue;
    if ((row.wireField.boundaryPathGlobs?.length ?? 0) === 0) {
      issues.push({
        level: 'warn',
        message: `${row.id}: wire-field missing boundaryPathGlobs — add adapter paths so lint-wires can allowlist them`,
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

export function findRuleForFile(
  file: string,
  rules: readonly WireLintRule[]
): WireLintRule | undefined {
  return rules.find(r => r.globs.length > 0 && pathMatchesAnyGlob(file, r.globs));
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
  const probe = new Bun.Glob(`${prefix.replace(/\/$/, '')}/**/*`);
  for await (const _ of probe.scan({ cwd: root, onlyFiles: true, followSymlinks: false })) {
    return true;
  }
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

export async function validateWireGlobCoverage(options: {
  readonly root: string;
  readonly rows: readonly PartnerSurfaceRow[];
  readonly strictGlobs?: boolean;
}): Promise<readonly WireTrapIssue[]> {
  const issues: WireTrapIssue[] = [];
  const rules = buildWireLintRules(options.rows);
  for (const rule of rules) {
    for (const globPattern of rule.globs) {
      const count = await globMatchCount(options.root, globPattern, 1);
      if (count > 0) continue;
      const prefix = globRootPrefix(globPattern);
      const hasFiles = prefix ? await pathHasAnyFile(options.root, prefix) : false;
      if (!hasFiles && !options.strictGlobs) {
        issues.push({
          level: 'warn',
          message: `${rule.brandedType}: glob "${globPattern}" matches 0 files (tree "${prefix}" missing or empty — optional checkout)`,
          fix: `Checkout/populate ${prefix} or remove obsolete boundaryPathGlobs`,
        });
        continue;
      }
      issues.push({
        level: 'error',
        message: `${rule.brandedType}: glob "${globPattern}" matches 0 files`,
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

export function lineIsSuppressed(lines: readonly string[], index: number): boolean {
  return findLineSuppression(lines, index) !== undefined;
}

export function maskNonCodeSpans(line: string): string {
  let out = '';
  let i = 0;
  while (i < line.length) {
    if (line[i] === '/' && line[i + 1] === '/') {
      out += ' '.repeat(line.length - i);
      break;
    }
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

export function findNakedHitsForRule(
  file: string,
  source: string,
  rule: WireLintRule
): readonly WireTrapHit[] {
  const lines = source.split(/\r?\n/);
  const hits: WireTrapHit[] = [];
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i] ?? '';
    const trimmed = raw.trim();
    if (trimmed.startsWith('*') || trimmed.startsWith('/**') || trimmed.startsWith('*/')) {
      continue;
    }
    if (/^\s*\/\//.test(raw)) continue;

    const masked = maskNonCodeSpans(raw);
    for (const m of masked.matchAll(rule.regex)) {
      hits.push({
        file,
        line: i + 1,
        match: m[0] ?? '',
        text: trimmed,
        brandedType: rule.brandedType,
        ruleId: rule.rowIds[0] ?? rule.brandedType,
      });
    }
  }
  return hits;
}

/** Append `// wire-ok: <reason>` to a source line (idempotent if already present). */
export function appendWireOkComment(line: string, reason: string): string {
  if (/(?:brand-ok|wire-ok)\b/.test(line)) return line;
  const trimmedRight = line.replace(/\s+$/, '');
  const reasonText = reason.trim() || 'boundary';
  return `${trimmedRight} // wire-ok: ${reasonText}`;
}

export type WireOkFixResult = {
  readonly file: string;
  readonly line: number;
  readonly before: string;
  readonly after: string;
};

/**
 * Auto-insert `// wire-ok` on allowlisted naked hits (never on trap/outside-allowlist errors).
 */
export async function applyWireOkFixes(options: {
  readonly root: string;
  readonly fixes: readonly { file: string; line: number; reason: string }[];
  readonly dryRun?: boolean;
}): Promise<readonly WireOkFixResult[]> {
  const byFile = new Map<string, { line: number; reason: string }[]>();
  for (const f of options.fixes) {
    const list = byFile.get(f.file) ?? [];
    list.push({ line: f.line, reason: f.reason });
    byFile.set(f.file, list);
  }

  const results: WireOkFixResult[] = [];
  for (const [rel, entries] of byFile) {
    const abs = `${options.root.replace(/\/$/, '')}/${rel}`;
    const text = await Bun.file(abs).text();
    const lines = text.split(/\r?\n/);
    const sorted = [...entries].sort((a, b) => b.line - a.line);
    let wrote = false;
    for (const e of sorted) {
      const idx = e.line - 1;
      if (idx < 0 || idx >= lines.length) continue;
      const before = lines[idx] ?? '';
      const after = appendWireOkComment(before, e.reason);
      if (after === before) continue;
      lines[idx] = after;
      results.push({ file: rel, line: e.line, before, after });
      wrote = true;
    }
    if (!options.dryRun && wrote) {
      await Bun.write(abs, lines.join('\n'));
    }
  }
  return results;
}

/** @deprecated use findNakedHitsForRule with buildWireLintRules */
export function findNakedPartnerIdHits(file: string, source: string): readonly WireTrapHit[] {
  const rule: WireLintRule = {
    brandedType: 'ExternalPartnerRef',
    patterns: ['partnerId', 'partner_id'],
    nakedType: 'string',
    globs: [],
    rowIds: ['legacy'],
    trapTokens: [],
    strict: true,
    requireReason: false,
    regex: buildNakedAnnotationRegex(['partnerId', 'partner_id'], 'string'),
  };
  return findNakedHitsForRule(file, source, rule);
}

/** Legacy regex — prefer buildNakedAnnotationRegex from inventory rules. */
export const NAKED_PARTNER_ID_RE = buildNakedAnnotationRegex(['partnerId', 'partner_id'], 'string');

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
  readonly rules: readonly WireLintRule[];
  readonly trapTokens: readonly string[];
  readonly hits: readonly WireTrapHit[];
  /** Allowlisted naked hits lacking suppression (candidates for --fix). */
  readonly fixable: readonly WireTrapHit[];
  readonly issues: readonly WireTrapIssue[];
  readonly scannedFiles: number;
};

/**
 * Scan TypeScript sources for naked brand annotations outside inventory
 * allowlisted boundary paths. Also validates glob coverage.
 */
export async function scanWireTraps(options: {
  readonly root: string;
  readonly rows: readonly PartnerSurfaceRow[];
  readonly globPattern?: string;
  readonly strictGlobs?: boolean;
  /** Explicit repository-relative files to scan (for staged/diff gates). */
  readonly files?: readonly string[];
  /** Validate inventory glob coverage. Defaults to true for full scans. */
  readonly validateGlobs?: boolean;
}): Promise<ScanWireTrapsResult> {
  const rules = buildWireLintRules(options.rows);
  const allowEntries = collectWireAllowEntries(options.rows);
  const allowGlobs = collectWireAllowPathGlobs(options.rows);
  const trapTokens = collectTrapRowTokens(options.rows);
  const validateGlobs = options.validateGlobs ?? options.files === undefined;
  const issues: WireTrapIssue[] = validateGlobs
    ? [
        ...warnMissingWireBoundaryGlobs(options.rows),
        ...(await validateWireGlobCoverage({
          root: options.root,
          rows: options.rows,
          strictGlobs: options.strictGlobs,
        })),
      ]
    : [];
  const hits: WireTrapHit[] = [];
  const fixable: WireTrapHit[] = [];
  let scannedFiles = 0;

  const explicitFiles = options.files
    ? [...new Set(options.files.map(file => file.replace(/\\/g, '/').replace(/^\.\//, '')))]
    : undefined;
  const discoveredFiles = explicitFiles ?? [];
  if (!explicitFiles) {
    const pattern = options.globPattern ?? '**/*.{ts,tsx}';
    const glob = new Bun.Glob(pattern);
    for await (const file of glob.scan({
      cwd: options.root,
      onlyFiles: true,
      followSymlinks: false,
    })) {
      discoveredFiles.push(file);
    }
  }

  for (const file of discoveredFiles) {
    const rel = file.replace(/\\/g, '/');
    if (!shouldScanPath(rel)) continue;

    const abs = `${options.root.replace(/\/$/, '')}/${rel}`;
    const source = await Bun.file(abs).text();
    const lines = source.split(/\r?\n/);
    let fileHadHit = false;

    for (const rule of rules) {
      const allowedHere = rule.globs.length > 0 && pathMatchesAnyGlob(rel, rule.globs);
      const fileHits = findNakedHitsForRule(rel, source, rule);
      if (fileHits.length === 0) continue;
      fileHadHit = true;

      for (const hit of fileHits) {
        const suppression = findLineSuppression(lines, hit.line - 1);
        if (suppression) {
          if (
            allowedHere &&
            rule.requireReason &&
            suppression.kind === 'wire-ok' &&
            suppression.reason.length === 0
          ) {
            issues.push({
              level: 'warn',
              file: hit.file,
              line: hit.line,
              match: hit.match,
              message: `${hit.file}:${hit.line}: // wire-ok missing reason (requireReason for ${rule.brandedType})`,
              fix: `Use // wire-ok: <why this ${hit.match} is raw at the boundary>`,
            });
          }
          continue;
        }

        if (allowedHere) {
          // Only non-strict allowlists surface + accept --fix (strict = silent OK).
          if (!rule.strict) {
            fixable.push(hit);
            issues.push({
              level: 'warn',
              file: hit.file,
              line: hit.line,
              match: hit.match,
              message: `${hit.file}:${hit.line}: naked \`${hit.match}\` in non-strict allowlist (${rule.brandedType})`,
              fix: `Prefer ${rule.brandedType}, // wire-ok: <reason>, or --fix`,
            });
          }
          continue;
        }

        const trapHint =
          rule.trapTokens.length > 0 || trapTokens.length > 0
            ? `Expected type "${rule.brandedType}" but found naked "${hit.match}". Register boundaryPathGlobs on a wire-field row (trap tokens: ${[...new Set([...rule.trapTokens, ...trapTokens])].join(', ')}) or add // wire-ok: <reason>.`
            : `Expected type "${rule.brandedType}" but found naked "${hit.match}". Use "${rule.brandedType}" or add // wire-ok if this is an external boundary.`;

        hits.push(hit);
        issues.push({
          level: 'error',
          file: hit.file,
          line: hit.line,
          match: hit.match,
          message: `${hit.file}:${hit.line}: naked \`${hit.match}\` — want ${rule.brandedType}`,
          fix: trapHint,
        });
      }
    }

    if (fileHadHit || !findRuleForFile(rel, rules)) {
      scannedFiles += 1;
    }
  }

  return { allowGlobs, allowEntries, rules, trapTokens, hits, fixable, issues, scannedFiles };
}

export function wireBagAllowsBoundary(bag: PartnerSurfaceWireFieldBag, file: string): boolean {
  return pathMatchesAnyGlob(file, bag.boundaryPathGlobs ?? []);
}

export function visibleWidth(text: string): number {
  return stringWidth(text);
}
