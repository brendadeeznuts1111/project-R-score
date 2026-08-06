#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io — Bun.file
// @see https://bun.com/docs/runtime/glob — Bun.Glob
// @see https://bun.com/docs/runtime/child-process — Bun.spawn
/**
 * lib-area-map-check.ts — validate Area / Ownership map clusters under lib/.
 *
 * Contract v2:
 *  - Accept ## Area map or ## Ownership map
 *  - Extensionless stems resolve to name.ts under the domain
 *  - Orphan globs match full relative paths (not bare * basename)
 *  - Mega allowlist: require map; warn top-level orphans by default
 *  - Verified stamp: warn if missing/stale on megas
 *
 * Usage:
 *   bun tools/lib-area-map-check.ts
 *   bun tools/lib-area-map-check.ts --json
 *   bun tools/lib-area-map-check.ts --orphans
 *   bun tools/lib-area-map-check.ts --orphans --strict
 *   bun tools/lib-area-map-check.ts --require-mega
 *   bun tools/lib-area-map-check.ts --strict-verified
 *   bun tools/lib-area-map-check.ts --domain=operations
 *   bun run lib:area-maps:check
 */
import { joinPath, resolvePath } from '../lib/path-bun';

const REPO = resolvePath(import.meta.dir, '..');
const LIB = joinPath(REPO, 'lib');

/** Default max files a single map glob may match (too broad = bad cluster). */
const DEFAULT_MAX_GLOB = 15;

/** Domains that must have a map (size / agent traffic). */
export const MEGA_DOMAINS = [
  'operations',
  'telegram',
  'operator-research',
  'docs',
  'http',
  'harness',
  'verification',
  'portal',
] as const;

export type MegaDomain = (typeof MEGA_DOMAINS)[number];

const MEGA_SET = new Set<string>(MEGA_DOMAINS);

/** Days after which area-map-verified is considered stale (warn). */
const VERIFIED_MAX_AGE_DAYS = 30;

type IssueKind =
  | 'missing-path'
  | 'empty-glob'
  | 'broad-glob'
  | 'orphan-top-level'
  | 'no-area-map'
  | 'stale-verified'
  | 'missing-verified'
  | 'parse';

type Issue = {
  kind: IssueKind;
  domain: string;
  path?: string;
  detail?: string;
  matches?: number;
};

type DomainResult = {
  domain: string;
  hasMap: boolean;
  paths: string[];
  issues: Issue[];
  verified?: string;
  isMega: boolean;
};

function parseArgs(argv: string[]) {
  const asJson = argv.includes('--json');
  const orphans = argv.includes('--orphans');
  const strictOrphans = argv.includes('--strict');
  const requireMap = argv.includes('--require-map');
  const requireMega = argv.includes('--require-mega') || !argv.includes('--no-require-mega');
  const strictVerified = argv.includes('--strict-verified');
  // Default: mega orphans always computed as warnings; --orphans forces all domains
  const megaOrphans = !argv.includes('--no-mega-orphans');
  let maxGlob = DEFAULT_MAX_GLOB;
  let domainFilter: string | null = null;
  for (const a of argv) {
    if (a.startsWith('--max-glob=')) {
      const n = Number(a.slice('--max-glob='.length));
      if (Number.isFinite(n) && n > 0) maxGlob = Math.floor(n);
    }
    if (a.startsWith('--domain=')) {
      domainFilter = a.slice('--domain='.length).trim() || null;
    }
  }
  return {
    asJson,
    orphans,
    strictOrphans,
    requireMap,
    requireMega,
    strictVerified,
    megaOrphans,
    maxGlob,
    domainFilter,
  };
}

async function isDir(abs: string): Promise<boolean> {
  const p = Bun.spawn(['test', '-d', abs], { stdout: 'ignore', stderr: 'ignore' });
  return (await p.exited) === 0;
}

async function listDomainDirs(): Promise<string[]> {
  const out: string[] = [];
  for await (const name of new Bun.Glob('*').scan({ cwd: LIB, onlyFiles: false })) {
    if (name.includes('/') || name.startsWith('.') || name === 'node_modules') continue;
    const child = joinPath(LIB, name);
    if (await isDir(child)) out.push(name);
  }
  return out.sort();
}

const MAP_HEADING_RE = /^## (?:Area map|Ownership map)\s*$/m;

/** Slice README from ## Area map / Ownership map until next ## / ###. */
export function extractAreaMapSection(readme: string): string | null {
  const m = readme.match(MAP_HEADING_RE);
  if (!m || m.index === undefined) return null;
  const start = m.index;
  const after = readme.slice(start);
  const bodyStart = after.indexOf('\n');
  if (bodyStart < 0) return '';
  const rest = after.slice(bodyStart + 1);
  const stop = rest.search(/^#{2,3} /m);
  return stop < 0 ? rest : rest.slice(0, stop);
}

export function extractVerifiedDate(readme: string): string | undefined {
  const m = readme.match(/<!--\s*area-map-verified:\s*(\d{4}-\d{2}-\d{2})\s*-->/i);
  return m?.[1];
}

/** Age in days of YYYY-MM-DD stamp, or null if invalid. */
export function verifiedAgeDays(stamp: string, now = new Date()): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(stamp);
  if (!m) return null;
  const then = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.floor((today - then) / (24 * 60 * 60 * 1000));
}

const FILE_EXT = /\.(ts|tsx|md|toml|json|js|jsonc)$/i;

/**
 * True if token is a path-like map entry (not prose / API names).
 * Extensionless stems (portal-cors) are allowed — resolved later to .ts.
 */
export function isPathToken(raw: string): boolean {
  const t = raw.trim();
  if (!t || t.length > 160) return false;
  if (/\s/.test(t)) return false;
  if (/^https?:\/\//i.test(t)) return false;
  if (t.startsWith('#')) return false;
  if (t.includes(':') && !t.includes('/')) return false; // CLI verbs
  // Bun.serve · Schema.org · req.formData · api.github.com
  if (/^[A-Za-z][\w-]*\.[A-Za-z]/.test(t) && !FILE_EXT.test(t)) return false;
  if (/^[A-Z]\/[A-Z]$/i.test(t)) return false; // I/O

  const isFile = FILE_EXT.test(t);
  const isDir = t.endsWith('/') && /^[\w@./-]+$/.test(t);
  const isGlob = t.includes('*') && (t.includes('.') || t.includes('/'));
  // Extensionless kebab/snake stem only: portal-cors, url-planes (not Title Case prose)
  const isStem =
    !isFile &&
    !isDir &&
    !isGlob &&
    !t.includes('/') &&
    /^[a-z][a-z0-9]*[-_][a-z0-9][-a-z0-9_]*$/.test(t);

  if (!isFile && !isDir && !isGlob && !isStem) return false;

  // path with slash but no file ext and not dir/glob: Request/response
  if (t.includes('/') && !isFile && !isDir && !isGlob) return false;
  // single-slash word/word without dots → prose or org/repo
  if (/^[\w.-]+\/[\w.-]+$/.test(t) && !isFile && !isGlob) return false;

  return true;
}

/** External to the domain tree (docs, other packages, absolute registry). */
export function isExternalPath(token: string): boolean {
  const t = token.trim();
  if (t.startsWith('../') || t.startsWith('..\\')) return true;
  if (t.startsWith('/')) return true;
  if (t.startsWith('config/')) return true;
  if (t.startsWith('tools/') || t.startsWith('scripts/')) return true;
  if (t.startsWith('functions/') || t === 'functions/') return true;
  if (t.startsWith('lib/')) return true;
  if (t.startsWith('docs/') || t.includes('/docs/')) return true;
  if (t.startsWith('public/')) return true;
  if (t.startsWith('spine/')) return true;
  if (/^[a-z0-9][a-z0-9._-]*\.json$/i.test(t) && !t.includes('/')) return true;
  return false;
}

export function extractPathTokens(section: string): string[] {
  const found = new Set<string>();

  for (const m of section.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
    const href = m[1]!.trim();
    if (isPathToken(href)) found.add(href);
  }
  for (const m of section.matchAll(/`([^`]+)`/g)) {
    const inner = m[1]!.trim();
    if (isPathToken(inner)) found.add(inner);
  }
  const stripped = section
    .replace(/\[[^\]]*\]\(([^)]+)\)/g, ' $1 ')
    .replace(/`([^`]+)`/g, ' $1 ')
    .replace(/\*\*/g, ' ');
  for (const part of stripped.split(/[·|]/)) {
    const t = part.trim().split(/\s+/)[0] ?? '';
    if (t && isPathToken(t)) found.add(t);
  }

  return [...found].sort();
}

async function expandGlob(domainAbs: string, pattern: string): Promise<string[]> {
  const hits: string[] = [];
  for await (const rel of new Bun.Glob(pattern).scan({ cwd: domainAbs, onlyFiles: false })) {
    hits.push(rel);
  }
  return hits.sort();
}

/** Glob pattern → RegExp that matches relative paths. */
export function globToRegExp(pattern: string): RegExp {
  const esc = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
  return new RegExp(`^${esc}$`);
}

async function validatePath(
  domain: string,
  domainAbs: string,
  token: string,
  maxGlob: number
): Promise<Issue | null> {
  if (isExternalPath(token)) return null;

  if (token.endsWith('/')) {
    const rel = token.replace(/\/+$/, '');
    const abs = joinPath(domainAbs, rel);
    if (!(await isDir(abs))) {
      return { kind: 'missing-path', domain, path: token, detail: 'directory not found' };
    }
    return null;
  }

  if (token.includes('*')) {
    const matches = await expandGlob(domainAbs, token);
    const files = matches.filter(m => !m.endsWith('/'));
    const count = files.length > 0 ? files.length : matches.length;
    if (count === 0) {
      return { kind: 'empty-glob', domain, path: token, detail: 'matched 0 paths', matches: 0 };
    }
    if (count > maxGlob) {
      return {
        kind: 'broad-glob',
        domain,
        path: token,
        detail: `matched ${count} paths (max ${maxGlob})`,
        matches: count,
      };
    }
    return null;
  }

  // Exact file or path
  const abs = joinPath(domainAbs, token);
  if (await Bun.file(abs).exists()) return null;
  if (await isDir(abs)) return null;

  // Extensionless stem → name.ts (if missing, treat as prose — do not fail)
  if (!token.includes('/') && !FILE_EXT.test(token)) {
    const asTs = joinPath(domainAbs, `${token}.ts`);
    if (await Bun.file(asTs).exists()) return null;
    const asIndex = joinPath(domainAbs, token, 'index.ts');
    if (await Bun.file(asIndex).exists()) return null;
    return null;
  }

  // Non-TS map artifacts (theme.jsonc, etc.) optional if absent
  if (FILE_EXT.test(token) && !/\.tsx?$/i.test(token) && !/\.md$/i.test(token)) {
    return null;
  }

  return { kind: 'missing-path', domain, path: token, detail: 'not found under domain' };
}

/**
 * Whether top-level file basename is covered by a map path/glob.
 * Globs with `/` match full relative path only (basename alone never uses path-glob basenames like `*`).
 * Globs without `/` match basename (e.g. seat-desk-*.ts).
 */
export function coversTopLevel(basename: string, tokens: string[]): boolean {
  for (const t of tokens) {
    if (isExternalPath(t)) continue;
    if (t.endsWith('/')) continue; // dirs don't cover top-level siblings

    // Exact
    if (t === basename) return true;
    const base = t.split('/').pop() ?? t;
    if (base === basename && !t.includes('*')) return true;

    // Stem token portal-cors covers portal-cors.ts
    if (!t.includes('/') && !t.includes('*') && !FILE_EXT.test(t) && basename === `${t}.ts`) {
      return true;
    }

    if (t.includes('*')) {
      if (t.includes('/')) {
        // Path glob: only match if basename alone could not be confused —
        // require full rel path; top-level file has no slash so only match
        // patterns like `foo*.ts` without slash, not `flows/cards/*`
        // Top-level relative path IS the basename
        if (globToRegExp(t).test(basename)) return true;
      } else {
        // Basename glob: seat-desk-*.ts
        if (globToRegExp(t).test(basename)) return true;
      }
    }
  }
  return false;
}

async function listTopLevelTs(domainAbs: string): Promise<string[]> {
  const out: string[] = [];
  for await (const name of new Bun.Glob('*.ts').scan({ cwd: domainAbs, onlyFiles: true })) {
    if (name.includes('/')) continue;
    if (name.endsWith('.test.ts') || name.endsWith('.d.ts')) continue;
    out.push(name);
  }
  return out.sort();
}

async function checkDomain(
  domain: string,
  opts: {
    orphans: boolean;
    megaOrphans: boolean;
    maxGlob: number;
    requireMap: boolean;
    requireMega: boolean;
    strictVerified: boolean;
  }
): Promise<DomainResult> {
  const domainAbs = joinPath(LIB, domain);
  const readmeAbs = joinPath(domainAbs, 'README.md');
  const issues: Issue[] = [];
  const isMega = MEGA_SET.has(domain);

  if (!(await Bun.file(readmeAbs).exists())) {
    if (opts.requireMega && isMega) {
      issues.push({
        kind: 'no-area-map',
        domain,
        detail: 'mega domain missing README.md',
      });
    }
    return { domain, hasMap: false, paths: [], issues, isMega };
  }

  const readme = await Bun.file(readmeAbs).text();
  const verified = extractVerifiedDate(readme);
  const section = extractAreaMapSection(readme);

  if (section == null) {
    if (opts.requireMap || (opts.requireMega && isMega)) {
      issues.push({
        kind: 'no-area-map',
        domain,
        detail: isMega
          ? 'mega domain missing ## Area map or ## Ownership map'
          : 'README missing ## Area map or ## Ownership map',
      });
    }
    return { domain, hasMap: false, paths: [], issues, verified, isMega };
  }

  const paths = extractPathTokens(section);
  for (const token of paths) {
    const issue = await validatePath(domain, domainAbs, token, opts.maxGlob);
    if (issue) issues.push(issue);
  }

  const wantOrphans = opts.orphans || (opts.megaOrphans && isMega);
  if (wantOrphans) {
    const top = await listTopLevelTs(domainAbs);
    for (const file of top) {
      if (!coversTopLevel(file, paths)) {
        issues.push({
          kind: 'orphan-top-level',
          domain,
          path: file,
          detail: 'top-level .ts not listed in Area map paths/globs',
        });
      }
    }
  }

  if (isMega) {
    if (!verified) {
      issues.push({
        kind: 'missing-verified',
        domain,
        detail: 'missing <!-- area-map-verified: YYYY-MM-DD -->',
      });
    } else {
      const age = verifiedAgeDays(verified);
      if (age !== null && age > VERIFIED_MAX_AGE_DAYS) {
        issues.push({
          kind: 'stale-verified',
          domain,
          detail: `verified stamp ${verified} is ${age}d old (max ${VERIFIED_MAX_AGE_DAYS}d)`,
        });
      }
    }
  }

  return { domain, hasMap: true, paths, issues, verified, isMega };
}

function isWarnOnly(
  issue: Issue,
  opts: { strictOrphans: boolean; strictVerified: boolean; requireMega: boolean }
): boolean {
  if (issue.kind === 'orphan-top-level') return !opts.strictOrphans;
  if (issue.kind === 'missing-verified' || issue.kind === 'stale-verified') {
    return !opts.strictVerified;
  }
  // no-area-map on mega is fail when requireMega
  if (issue.kind === 'no-area-map') return false;
  return false;
}

async function main(): Promise<void> {
  const opts = parseArgs(Bun.argv.slice(2));
  let domains = await listDomainDirs();
  if (opts.domainFilter) {
    domains = domains.filter(d => d === opts.domainFilter);
    if (domains.length === 0) {
      console.error(`Unknown domain: ${opts.domainFilter}`);
      process.exitCode = 1;
      return;
    }
  }

  const results: DomainResult[] = [];
  for (const d of domains) {
    results.push(
      await checkDomain(d, {
        orphans: opts.orphans,
        megaOrphans: opts.megaOrphans,
        maxGlob: opts.maxGlob,
        requireMap: opts.requireMap,
        requireMega: opts.requireMega,
        strictVerified: opts.strictVerified,
      })
    );
  }

  const mapped = results.filter(r => r.hasMap);
  const allIssues = results.flatMap(r => r.issues);
  const failing = allIssues.filter(i => !isWarnOnly(i, opts));
  const warnings = allIssues.filter(i => isWarnOnly(i, opts));

  if (opts.asJson) {
    process.stdout.write(
      `${JSON.stringify(
        {
          domains: domains.length,
          withMaps: mapped.length,
          megas: MEGA_DOMAINS,
          issueCount: allIssues.length,
          failCount: failing.length,
          warnCount: warnings.length,
          results,
        },
        null,
        2
      )}\n`
    );
  } else {
    if (failing.length === 0 && warnings.length === 0) {
      console.info(
        `✅ lib-area-map-check: ${mapped.length}/${domains.length} domains with maps, paths OK`
      );
    } else {
      if (failing.length > 0) {
        console.info(
          `\n❌ lib-area-map-check: ${failing.length} fail(s), ${warnings.length} warn(s) (${mapped.length} maps)\n`
        );
      } else {
        console.info(
          `\n⚠️  lib-area-map-check: ${warnings.length} warning(s) (${mapped.length} maps)\n`
        );
      }
      for (const i of allIssues) {
        const tag = isWarnOnly(i, opts) ? 'warn' : 'fail';
        console.info(
          `  [${tag}/${i.kind}] ${i.domain}${i.path ? ` · ${i.path}` : ''}${i.detail ? ` — ${i.detail}` : ''}`
        );
      }
      console.info('');
      console.info('  Fix: update lib/<domain>/README.md map entry paths, or narrow globs.');
      console.info('  Mega orphans/stamp: warn by default; --strict / --strict-verified to fail.');
      console.info('');
    }
  }

  if (failing.length > 0) process.exitCode = 1;
}

if (import.meta.path === Bun.main || import.meta.main) {
  await main();
}
