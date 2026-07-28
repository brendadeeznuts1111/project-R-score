#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/glob — Bun.Glob
/**
 * Workspace Validator — homebase hybrid model
 *
 * Root workspaces intentionally cover only:
 *   packages/* · projects/active/sports-terminal-os · lib/*
 *
 * Nested monorepos under projects/** (registry, experimental, archive, etc.)
 * are separate install roots and must NOT be required as root workspace members.
 *
 * This gate checks:
 *   1. Every homebase package.json matches a root workspace glob.
 *   2. Root workspace globs resolve to existing package.json files (no ghosts).
 *
 * Preferred:
 *   bun run validate:workspaces
 *   bun run validate:workspaces --verbose
 */

/** Repo-relative join + normalize `..` / `.` segments (avoid node:path). */
function joinPath(...parts: string[]): string {
  const joined = parts.join('/').replace(/\/+/g, '/');
  const abs = joined.startsWith('/');
  const segs = joined.split('/').filter(s => s.length > 0 && s !== '.');
  const out: string[] = [];
  for (const s of segs) {
    if (s === '..') {
      if (out.length > 0 && out[out.length - 1] !== '..') out.pop();
      else if (!abs) out.push('..');
    } else {
      out.push(s);
    }
  }
  return (abs ? '/' : '') + out.join('/');
}

function relativeFrom(root: string, file: string): string {
  const r = joinPath(root);
  const f = joinPath(file);
  const prefix = r.endsWith('/') ? r : `${r}/`;
  if (f.startsWith(prefix)) return f.slice(prefix.length);
  if (f === r) return '';
  return f;
}

const args = Bun.argv.slice(2);
const verbose = args.includes('--verbose') || Bun.env.VERBOSE === '1';

/** Paths that may contain package.json but are never root workspace members. */
const IGNORE_GLOBS = [
  '**/node_modules/**',
  '**/.git/**',
  '**/dist/**',
  '**/build/**',
  '**/coverage/**',
  '**/.next/**',
  '**/out/**',
  'scratch/**',
  'archive/**',
  'projects/archive/**',
  'projects/experimental/**',
  // Nested product monorepos / own remotes (not root workspaces)
  'projects/active/factorywager/**',
  'projects/active/kimiremote/**',
  'projects/active/f402-openapi/**',
  'projects/active/enterprise/**',
  'projects/active/utilities/**',
  'projects/active/development/**',
  'projects/active/analysis/**',
  'projects/active/automation/**',
  'projects/active/playwriter-skill/**',
  // Top-level tool/sandbox trees outside monorepo spine
  'plannator/**',
  'bradley-terry/**',
  'test-api-wrapper/**',
  '**/test/**',
  '**/__tests__/**',
  '**/examples/**',
  '**/template/**',
];

/**
 * Explicit homebase package.json paths that are scanned even if under projects/.
 * (Sports Terminal is the only projects/* root workspace member today.)
 */
const HOMEBASE_SCAN_GLOBS = [
  'packages/*/package.json',
  'lib/*/package.json',
  'projects/active/sports-terminal-os/package.json',
];

/** Allowed non-workspace package.json at specific roots (if any). */
const EXEMPT_PATHS = new Set(['tools/package.json', 'lib/package.json', 'examples/package.json']);

const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
};

const rootDir = joinPath(import.meta.dir, '..');
let rootPkg: { workspaces?: string[] | { packages?: string[] } };
try {
  rootPkg = require(joinPath(rootDir, 'package.json'));
} catch (err) {
  console.error(`${colors.red}❌ Failed to parse root package.json${colors.reset}`);
  console.error(err);
  process.exit(1);
}

let workspaceGlobs: string[] = [];
if (Array.isArray(rootPkg.workspaces)) {
  workspaceGlobs = rootPkg.workspaces;
} else if (
  rootPkg.workspaces &&
  typeof rootPkg.workspaces === 'object' &&
  'packages' in rootPkg.workspaces
) {
  workspaceGlobs = rootPkg.workspaces.packages ?? [];
}

if (workspaceGlobs.length === 0) {
  console.error(`${colors.red}❌ No 'workspaces' field found in root package.json${colors.reset}`);
  process.exit(1);
}

const normalizedGlobs = workspaceGlobs.map((g: string) => g.replace(/^\.\//, ''));

function matchesWorkspaceGlob(relPkgJsonPath: string): boolean {
  // Bun.Glob("packages/*") matches packages/foo, not packages/foo/package.json
  const dirPath = relPkgJsonPath.replace(/\/package\.json$/, '').replace(/\/$/, '');
  let isMatch = false;
  for (const pattern of normalizedGlobs) {
    const isNegation = pattern.startsWith('!');
    const cleanPattern = isNegation ? pattern.slice(1) : pattern;
    const glob = new Bun.Glob(cleanPattern);
    if (glob.match(dirPath)) {
      if (isNegation) isMatch = false;
      else isMatch = true;
    }
  }
  return isMatch;
}

function isIgnored(rel: string): boolean {
  for (const ignorePattern of IGNORE_GLOBS) {
    if (new Bun.Glob(ignorePattern).match(rel)) return true;
  }
  return false;
}

// ---------- Collect homebase package.json files ----------
const homebasePackages: string[] = [];

for (const pattern of HOMEBASE_SCAN_GLOBS) {
  const glob = new Bun.Glob(pattern);
  for await (const pkgFile of glob.scan({ cwd: rootDir, absolute: true })) {
    const rel = relativeFrom(rootDir, pkgFile).replace(/\\/g, '/');
    if (isIgnored(rel)) continue;
    homebasePackages.push(pkgFile);
  }
}

// ---------- Coverage ----------
const covered: string[] = [];
const orphaned: string[] = [];

for (const pkgFile of homebasePackages) {
  const relPath = relativeFrom(rootDir, pkgFile).replace(/\\/g, '/');
  if (EXEMPT_PATHS.has(relPath)) {
    covered.push(pkgFile);
    continue;
  }
  if (matchesWorkspaceGlob(relPath)) {
    covered.push(pkgFile);
  } else {
    orphaned.push(pkgFile);
  }
}

// ---------- Ghost workspace members (glob resolves empty / missing package.json) ----------
const ghostDirs: string[] = [];
for (const pattern of normalizedGlobs) {
  if (pattern.startsWith('!')) continue;
  const g = new Bun.Glob(pattern);
  let found = 0;
  for await (const entry of g.scan({ cwd: rootDir, onlyFiles: false })) {
    const abs = joinPath(rootDir, entry);
    const pkgJson = joinPath(abs, 'package.json');
    // entry may be a directory or a file depending on glob
    const tryPkg = (await Bun.file(pkgJson).exists())
      ? pkgJson
      : (await Bun.file(abs).exists()) && abs.endsWith('package.json')
        ? abs
        : null;
    if (tryPkg) {
      found++;
    } else if (await Bun.file(joinPath(rootDir, entry, 'package.json')).exists()) {
      found++;
    }
  }
  // Explicit path (no wildcards) must exist
  if (!pattern.includes('*') && !pattern.includes('?') && !pattern.includes('[')) {
    const pkgJson = joinPath(rootDir, pattern, 'package.json');
    if (!(await Bun.file(pkgJson).exists())) {
      ghostDirs.push(pattern);
    }
  }
  void found;
}

// ---------- Output ----------
console.info(`${colors.bold}\n📦 Workspace Coverage Report (homebase)\n${colors.reset}`);
console.info(
  `  Root workspaces globs: ${colors.cyan}${normalizedGlobs.join(', ')}${colors.reset}\n`
);
console.info(
  `  ${colors.dim}Nested monorepos under projects/** are out of scope (separate install roots).${colors.reset}\n`
);

console.info(`${colors.green}✅ Homebase packages covered: ${covered.length}${colors.reset}`);
if (covered.length > 0 && verbose) {
  covered.forEach(f => console.info(`   ${relativeFrom(rootDir, f)}`));
}

let failed = false;

if (orphaned.length > 0) {
  failed = true;
  console.info(
    `${colors.red}\n❌ Homebase packages not matching workspaces: ${orphaned.length}${colors.reset}`
  );
  orphaned.forEach(f => console.info(`   ${colors.red}${relativeFrom(rootDir, f)}${colors.reset}`));
  console.info(
    `${colors.yellow}\n💡 Add to root workspaces.packages or move out of packages/* / lib/* / STO.${colors.reset}`
  );
} else {
  console.info(`${colors.green}\n✅ No orphaned homebase packages.${colors.reset}`);
}

if (ghostDirs.length > 0) {
  failed = true;
  console.info(`${colors.red}\n❌ Workspace globs point at missing package.json:${colors.reset}`);
  ghostDirs.forEach(d => console.info(`   ${colors.red}${d}${colors.reset}`));
}

if (failed) {
  console.error(`${colors.red}\n❌ Workspace validation failed.\n${colors.reset}`);
  process.exit(1);
}

console.info(`${colors.green}\n✅ Homebase workspace graph is consistent.\n${colors.reset}`);
process.exit(0);
