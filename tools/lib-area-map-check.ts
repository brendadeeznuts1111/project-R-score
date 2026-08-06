#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io — Bun.file
// @see https://bun.com/docs/runtime/glob — Bun.Glob
// @see https://bun.com/docs/runtime/child-process — Bun.spawn
/**
 * lib-area-map-check.ts — validate ## Area map clusters under lib domain READMEs.
 *
 * When a domain README has an Area map:
 *  1. Extract entry paths (markdown links, backticks, path-like tokens).
 *  2. Resolve paths under that domain (skip external parent/docs/absolute URLs).
 *  3. Fail if a path is missing, a glob matches 0 files, or a glob matches >max.
 *  4. Optional orphans: top-level domain .ts files not covered by map paths/globs.
 *
 * Usage:
 *   bun tools/lib-area-map-check.ts
 *   bun tools/lib-area-map-check.ts --json
 *   bun tools/lib-area-map-check.ts --orphans
 *   bun tools/lib-area-map-check.ts --orphans --strict
 *   bun tools/lib-area-map-check.ts --domain=operations
 *   bun run lib:area-maps:check
 */
import { joinPath, resolvePath } from '../lib/path-bun';

const REPO = resolvePath(import.meta.dir, '..');
const LIB = joinPath(REPO, 'lib');

/** Default max files a single map glob may match (too broad = bad cluster). */
const DEFAULT_MAX_GLOB = 15;

type IssueKind =
  'missing-path' | 'empty-glob' | 'broad-glob' | 'orphan-top-level' | 'no-area-map' | 'parse';

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
};

function parseArgs(argv: string[]) {
  const asJson = argv.includes('--json');
  const orphans = argv.includes('--orphans');
  const strictOrphans = argv.includes('--strict');
  const requireMap = argv.includes('--require-map');
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
  return { asJson, orphans, strictOrphans, requireMap, maxGlob, domainFilter };
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

/** Slice README from ## Area map until next ## / ### section (not table separators). */
export function extractAreaMapSection(readme: string): string | null {
  const start = readme.search(/^## Area map\s*$/m);
  if (start < 0) return null;
  const after = readme.slice(start);
  // Drop the heading line
  const bodyStart = after.indexOf('\n');
  if (bodyStart < 0) return '';
  const rest = after.slice(bodyStart + 1);
  // Stop at next AT2/H3 (### Maintainability, ## Entities, …)
  const stop = rest.search(/^#{2,3} /m);
  return stop < 0 ? rest : rest.slice(0, stop);
}

export function extractVerifiedDate(readme: string): string | undefined {
  const m = readme.match(/<!--\s*area-map-verified:\s*(\d{4}-\d{2}-\d{2})\s*-->/i);
  return m?.[1];
}

const FILE_EXT = /\.(ts|tsx|md|toml|json|js|jsonc)$/i;

/** True if token is a path-like map entry (not prose / API names). */
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
  if (!isFile && !isDir && !isGlob) return false;

  // org/repo single segment (oven-sh/bun) — no extension, not a dir, not a glob
  if (isFile === false && isDir === false && isGlob === false) return false;
  if (!isDir && !isGlob && !isFile) return false;
  // path with slash but no file ext and not dir/glob: Request/response, CI/deploy
  if (t.includes('/') && !isFile && !isDir && !isGlob) return false;
  // single-slash "word/word" without dots → prose or org/repo
  if (/^[\w.-]+\/[\w.-]+$/.test(t) && !isFile && !isGlob) return false;

  return true;
}

/** External to the domain tree (docs, other packages, absolute registry). */
export function isExternalPath(token: string): boolean {
  const t = token.trim();
  if (t.startsWith('../') || t.startsWith('..\\')) return true;
  if (t.startsWith('/')) return true; // /registry/, /verifydod
  if (t.startsWith('config/')) return true; // monorepo root config
  if (t.startsWith('tools/') || t.startsWith('scripts/')) return true;
  if (t.startsWith('functions/') || t === 'functions/') return true; // Pages Functions plane
  if (t.startsWith('lib/')) return true; // other lib domains
  if (t.startsWith('docs/') || t.includes('/docs/')) return true;
  if (t.startsWith('public/')) return true;
  // Registry artifact basenames mentioned in Role prose (not domain files)
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
  // Segments between middots / pipes (after collapsing link markup) — catches
  // bare `seat-desk-*.ts` · `flows/cards/*` without eating bold area titles.
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
  // Bun.Glob is relative to cwd
  for await (const rel of new Bun.Glob(pattern).scan({ cwd: domainAbs, onlyFiles: false })) {
    hits.push(rel);
  }
  return hits.sort();
}

async function validatePath(
  domain: string,
  domainAbs: string,
  token: string,
  maxGlob: number
): Promise<Issue | null> {
  if (isExternalPath(token)) return null;

  // Directory marker
  if (token.endsWith('/')) {
    const rel = token.replace(/\/+$/, '');
    const abs = joinPath(domainAbs, rel);
    if (!(await isDir(abs))) {
      return { kind: 'missing-path', domain, path: token, detail: 'directory not found' };
    }
    return null;
  }

  // Glob
  if (token.includes('*')) {
    const matches = await expandGlob(domainAbs, token);
    // Prefer files when both dirs and files match
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
  return { kind: 'missing-path', domain, path: token, detail: 'not found under domain' };
}

/** Whether top-level file basename is covered by a map path/glob. */
export function coversTopLevel(basename: string, tokens: string[]): boolean {
  for (const t of tokens) {
    if (isExternalPath(t)) continue;
    const base = t.split('/').pop() ?? t;
    if (base === basename || t === basename) return true;
    if (t.includes('*')) {
      // Convert simple globs to RegExp on basename or full relative
      const re = new RegExp(
        `^${t
          .split('/')
          .pop()!
          .replace(/[.+^${}()|[\]\\]/g, '\\$&')
          .replace(/\*/g, '.*')}$`
      );
      if (re.test(basename)) return true;
    }
    // Directory entry does not cover top-level siblings
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
  opts: { orphans: boolean; maxGlob: number; requireMap: boolean }
): Promise<DomainResult> {
  const domainAbs = joinPath(LIB, domain);
  const readmeAbs = joinPath(domainAbs, 'README.md');
  const issues: Issue[] = [];

  if (!(await Bun.file(readmeAbs).exists())) {
    return { domain, hasMap: false, paths: [], issues };
  }

  const readme = await Bun.file(readmeAbs).text();
  const verified = extractVerifiedDate(readme);
  const section = extractAreaMapSection(readme);

  if (section == null) {
    if (opts.requireMap) {
      issues.push({
        kind: 'no-area-map',
        domain,
        detail: 'README missing ## Area map',
      });
    }
    return { domain, hasMap: false, paths: [], issues, verified };
  }

  const paths = extractPathTokens(section);
  for (const token of paths) {
    const issue = await validatePath(domain, domainAbs, token, opts.maxGlob);
    if (issue) issues.push(issue);
  }

  if (opts.orphans) {
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

  return { domain, hasMap: true, paths, issues, verified };
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
        maxGlob: opts.maxGlob,
        requireMap: opts.requireMap,
      })
    );
  }

  const mapped = results.filter(r => r.hasMap);
  const allIssues = results.flatMap(r => r.issues);
  // Orphans only fail when --strict; path/glob issues always fail
  const failing = allIssues.filter(i => {
    if (i.kind === 'orphan-top-level') return opts.strictOrphans;
    return true;
  });
  const orphanOnly = allIssues.filter(i => i.kind === 'orphan-top-level');

  if (opts.asJson) {
    process.stdout.write(
      `${JSON.stringify(
        {
          domains: domains.length,
          withMaps: mapped.length,
          issueCount: allIssues.length,
          failCount: failing.length,
          orphanCount: orphanOnly.length,
          results,
        },
        null,
        2
      )}\n`
    );
  } else {
    if (failing.length === 0 && orphanOnly.length === 0) {
      console.info(
        `✅ lib-area-map-check: ${mapped.length}/${domains.length} domains with Area maps, paths OK`
      );
    } else {
      if (failing.length > 0) {
        console.info(
          `\n❌ lib-area-map-check: ${failing.length} issue(s) (${mapped.length} maps)\n`
        );
      } else {
        console.info(
          `\n⚠️  lib-area-map-check: ${orphanOnly.length} orphan warning(s) (use --strict to fail)\n`
        );
      }
      for (const i of allIssues) {
        const tag = i.kind === 'orphan-top-level' && !opts.strictOrphans ? 'warn' : 'fail';
        console.info(
          `  [${tag}/${i.kind}] ${i.domain}${i.path ? ` · ${i.path}` : ''}${i.detail ? ` — ${i.detail}` : ''}`
        );
      }
      console.info('');
      console.info(
        '  Fix: update lib/<domain>/README.md ## Area map entry paths, or narrow globs.'
      );
      console.info('');
    }
  }

  if (failing.length > 0) process.exitCode = 1;
}

if (import.meta.path === Bun.main || import.meta.main) {
  await main();
}
