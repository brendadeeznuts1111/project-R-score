#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/glob — Bun.Glob
/**
 * Workspace Validator (Dependency-free version)
 *
 * Ensures every package.json in the repository is covered by the root
 * workspaces configuration.
 *
 * Preferred:
 *   bun run validate:workspaces
 *   bun run validate:workspaces --verbose
 */

/** Repo-relative join (avoid node:path). */
function joinPath(...parts: string[]): string {
  return parts.join('/').replace(/\/+/g, '/');
}

function relativeFrom(root: string, file: string): string {
  const prefix = root.endsWith('/') ? root : `${root}/`;
  return file.startsWith(prefix) ? file.slice(prefix.length) : file;
}

// ---------- CLI Argument Parsing (simple) ----------
const args = Bun.argv.slice(2);
const verbose = args.includes('--verbose') || Bun.env.VERBOSE === '1';

// ---------- Configuration ----------
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
  '**/test/**',
  '**/__tests__/**',
  '**/examples/**',
  '**/template/**',
];

/**
 * These top-level package.json files are allowed to exist but are intentionally
 * NOT included in the root workspaces. This is currently the case for large
 * applications now all live under projects/active/ (barbershop, peer, kimiremote, factorywager)
 * that maintain their own internal workspaces.
 *
 * WARNING: This creates an inconsistency — we pull in their internal packages
 * (e.g. projects/active/kimiremote/packages/*) into the root workspace for unified `bun install`,
 * but we do NOT manage the app's own dependencies (from projects/active/kimiremote/package.json).
 * This is a known design trade-off for Phase 4. A cleaner long-term model would be
 * either fully include these apps or fully exclude them.
 */
const EXEMPT_PATHS = [
  'projects/active/kimiremote/package.json',
  'projects/active/factorywager/package.json',
  'projects/active/barbershop/package.json',
  'projects/active/peer/package.json',
  'tools/package.json',
  'lib/package.json',
  'examples/package.json',
];

// Simple ANSI colors (no external dependency)
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
};

// ---------- Load root workspace config ----------
const rootDir = joinPath(import.meta.dir, '..');
let rootPkg: any;
try {
  // Use require() because Bun supports comments in package.json when loaded this way
  rootPkg = require(joinPath(rootDir, 'package.json'));
} catch (err) {
  console.error(`${colors.red}❌ Failed to parse root package.json${colors.reset}`);
  console.error(err);
  process.exit(1);
}

let workspaceGlobs: string[] = [];

if (Array.isArray(rootPkg.workspaces)) {
  workspaceGlobs = rootPkg.workspaces;
} else if (rootPkg.workspaces?.packages) {
  workspaceGlobs = rootPkg.workspaces.packages;
}

if (workspaceGlobs.length === 0) {
  console.error(`${colors.red}❌ No 'workspaces' field found in root package.json${colors.reset}`);
  process.exit(1);
}

const normalizedGlobs = workspaceGlobs.map((g: string) => g.replace(/^\.\//, ''));

/**
 * Important note on glob behavior:
 * A glob like "projects/*" will match "projects/foo/package.json" but will NOT match
 * "projects/foo/bar/package.json". This is intentional based on the current root
 * workspaces configuration. Deeper nesting under `projects/` will be reported as
 * orphaned unless more specific globs are added.
 */

// Helper to check if a relative path matches any workspace glob (including negation)
function matchesWorkspaceGlob(relPath: string): boolean {
  let isMatch = false;

  for (const pattern of normalizedGlobs) {
    const isNegation = pattern.startsWith('!');
    const cleanPattern = isNegation ? pattern.slice(1) : pattern;

    const glob = new Bun.Glob(cleanPattern);
    if (glob.match(relPath)) {
      if (isNegation) {
        isMatch = false;
      } else {
        isMatch = true;
      }
    }
  }

  return isMatch;
}

// ---------- Find all package.json files ----------
const allPackageFiles: string[] = [];

const pkgGlob = new Bun.Glob('**/package.json');

for await (const pkgFile of pkgGlob.scan({
  cwd: rootDir,
  absolute: true,
  // Note: Bun.Glob.scan does not support 'ignore' directly in all versions.
  // We will filter manually after.
})) {
  // Manual ignore filtering
  const rel = relativeFrom(rootDir, pkgFile).replace(/\\/g, '/');
  let shouldIgnore = false;
  for (const ignorePattern of IGNORE_GLOBS) {
    if (new Bun.Glob(ignorePattern).match(rel)) {
      shouldIgnore = true;
      break;
    }
  }
  if (!shouldIgnore) {
    allPackageFiles.push(pkgFile);
  }
}

// ---------- Check coverage ----------
const covered: string[] = [];
const orphaned: string[] = [];

for (const pkgFile of allPackageFiles) {
  const relPath = relativeFrom(rootDir, pkgFile).replace(/\\/g, '/');

  if (EXEMPT_PATHS.includes(relPath)) {
    covered.push(pkgFile);
    continue;
  }

  if (matchesWorkspaceGlob(relPath)) {
    covered.push(pkgFile);
  } else {
    orphaned.push(pkgFile);
  }
}

// ---------- Output ----------
console.info(`${colors.bold}\n📦 Workspace Coverage Report\n${colors.reset}`);
console.info(
  `  Root workspaces globs: ${colors.cyan}${normalizedGlobs.join(', ')}${colors.reset}\n`
);

console.info(`${colors.green}✅ Covered packages: ${covered.length}${colors.reset}`);
if (covered.length > 0 && verbose) {
  covered.forEach(f => console.info(`   ${relativeFrom(rootDir, f)}`));
}

console.info(`${colors.red}\n❌ Orphaned packages: ${orphaned.length}${colors.reset}`);
if (orphaned.length > 0) {
  orphaned.forEach(f => console.info(`   ${colors.red}${relativeFrom(rootDir, f)}${colors.reset}`));
  console.info(
    `${colors.yellow}\n💡 Tip: Use --verbose to see all covered packages. Add missing paths to 'workspaces.packages' or move the package.json.${colors.reset}`
  );
}

// ---------- Exit code ----------
if (orphaned.length > 0) {
  console.error(
    `${colors.red}\n❌ Workspace validation failed. Fix the orphaned packages above.\n${colors.reset}`
  );
  process.exit(1);
} else {
  console.info(
    `${colors.green}\n✅ All packages are correctly covered by root workspaces.\n${colors.reset}`
  );
  process.exit(0);
}
