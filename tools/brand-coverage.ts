#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/file-io — Bun.file
// @see https://bun.com/docs/runtime/child-process — Bun.spawn
// @see https://bun.com/reference/bun/argv — Bun.argv
import { applyUnknownLongOptionGuardFor } from '../lib/docs/ref-id-tool-flags.ts';
/**
 * Read-only brand coverage report.
 *
 * Reports consumer references, constructor calls, wire parses, and guard usage
 * for every catalog value. The scanner deliberately excludes the forge,
 * generated manifest, and tests so definitions do not count as adoption.
 *
 * Usage:
 *   bun tools/brand-coverage.ts
 *   bun tools/brand-coverage.ts --attention
 *   bun tools/brand-coverage.ts --json
 *   bun tools/brand-coverage.ts --strict
 */

import { BRAND_CATALOG, type CatalogBrandName } from '../lib/types/branded/index.ts';

export type BrandCoverageFile = {
  path: string;
  text: string;
  project?: string;
};

export type BrandCoverageStatus = 'covered' | 'referenced-unconstructed' | 'unused';

export type BrandCoverageSlice = {
  files: string[];
  references: number;
  asCalls: number;
  tryCalls: number;
  parseCalls: number;
  guardCalls: number;
  constructionCalls: number;
  status: BrandCoverageStatus;
};

export type BrandCoverageRow = {
  name: CatalogBrandName;
  domain: string;
  files: string[];
  references: number;
  asCalls: number;
  tryCalls: number;
  parseCalls: number;
  guardCalls: number;
  constructionCalls: number;
  status: BrandCoverageStatus;
  scopes: {
    spine: BrandCoverageSlice;
    projects: BrandCoverageSlice;
  };
};

export type ProjectBrandAdoptionStatus =
  'adopted' | 'local-pattern' | 'types-only' | 'governed-no-usage' | 'external-or-untracked';

export type ProjectBrandAdoptionRow = {
  project: string;
  sourceFiles: number;
  brandedFiles: number;
  brands: CatalogBrandName[];
  localBrandTypes: string[];
  constructorCalls: number;
  guardCalls: number;
  status: ProjectBrandAdoptionStatus;
};

function escaped(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Remove comments while preserving strings. Coverage is identifier-oriented:
 * prose such as "not the ops RunId mint" must not count as adoption evidence.
 */
export function stripSourceComments(text: string): string {
  let result = '';
  let index = 0;
  let state: 'code' | 'line-comment' | 'block-comment' | 'single' | 'double' | 'template' = 'code';

  while (index < text.length) {
    const char = text[index]!;
    const next = text[index + 1];

    if (state === 'line-comment') {
      if (char === '\n') {
        result += '\n';
        state = 'code';
      } else {
        result += ' ';
      }
      index++;
      continue;
    }
    if (state === 'block-comment') {
      if (char === '*' && next === '/') {
        result += '  ';
        index += 2;
        state = 'code';
      } else {
        result += char === '\n' ? '\n' : ' ';
        index++;
      }
      continue;
    }
    if (state === 'single' || state === 'double' || state === 'template') {
      result += char;
      if (char === '\\' && next !== undefined) {
        result += next;
        index += 2;
        continue;
      }
      if (
        (state === 'single' && char === "'") ||
        (state === 'double' && char === '"') ||
        (state === 'template' && char === '`')
      ) {
        state = 'code';
      }
      index++;
      continue;
    }
    if (char === '/' && next === '/') {
      result += '  ';
      index += 2;
      state = 'line-comment';
      continue;
    }
    if (char === '/' && next === '*') {
      result += '  ';
      index += 2;
      state = 'block-comment';
      continue;
    }
    if (char === "'") state = 'single';
    if (char === '"') state = 'double';
    if (char === '`') state = 'template';
    result += char;
    index++;
  }
  return result;
}

function statusFor(
  references: number,
  constructionCalls: number,
  guardCalls: number
): BrandCoverageStatus {
  if (references === 0 && constructionCalls === 0 && guardCalls === 0) return 'unused';
  if (references > 0 && constructionCalls === 0 && guardCalls === 0) {
    return 'referenced-unconstructed';
  }
  return 'covered';
}

type MutableCoverageSlice = {
  files: Set<string>;
  references: number;
  asCalls: number;
  tryCalls: number;
  parseCalls: number;
  guardCalls: number;
};

function emptyMutableSlice(): MutableCoverageSlice {
  return {
    files: new Set(),
    references: 0,
    asCalls: 0,
    tryCalls: 0,
    parseCalls: 0,
    guardCalls: 0,
  };
}

function freezeSlice(slice: MutableCoverageSlice): BrandCoverageSlice {
  const constructionCalls = slice.asCalls + slice.tryCalls + slice.parseCalls;
  return {
    files: [...slice.files],
    references: slice.references,
    asCalls: slice.asCalls,
    tryCalls: slice.tryCalls,
    parseCalls: slice.parseCalls,
    guardCalls: slice.guardCalls,
    constructionCalls,
    status: statusFor(slice.references, constructionCalls, slice.guardCalls),
  };
}

export function analyzeBrandCoverage(files: readonly BrandCoverageFile[]): BrandCoverageRow[] {
  const names = BRAND_CATALOG.map(spec => spec.name);
  const byName = new Map(
    names.map(name => [
      name,
      {
        total: emptyMutableSlice(),
        spine: emptyMutableSlice(),
        projects: emptyMutableSlice(),
      },
    ])
  );
  const nameAlternation = names
    .map(escaped)
    .sort((a, b) => b.length - a.length)
    .join('|');
  const symbolPattern = new RegExp(
    `\\b((?:as|try|parse|is)?(?:${nameAlternation}))\\b\\s*(\\()?`,
    'g'
  );
  const genericGuardPattern = new RegExp(
    `\\bisBrandedValue\\s*\\(\\s*['"](${nameAlternation})['"]\\s*,`,
    'g'
  );

  for (const file of files) {
    const source = stripSourceComments(file.text);
    const scope = file.path.startsWith('projects/') ? 'projects' : 'spine';
    const touched = new Set<CatalogBrandName>();
    for (const match of source.matchAll(symbolPattern)) {
      const symbol = match[1]!;
      const called = match[2] === '(';
      let name = symbol as CatalogBrandName;
      let kind: 'reference' | 'as' | 'try' | 'parse' | 'guard' = 'reference';
      for (const prefix of ['parse', 'try', 'as', 'is'] as const) {
        if (symbol.startsWith(prefix)) {
          name = symbol.slice(prefix.length) as CatalogBrandName;
          kind = prefix === 'is' ? 'guard' : prefix;
          break;
        }
      }
      if (!byName.has(name) || (kind !== 'reference' && !called)) continue;
      const target = byName.get(name)!;
      for (const slice of [target.total, target[scope]]) {
        if (kind === 'reference') slice.references++;
        if (kind === 'as') slice.asCalls++;
        if (kind === 'try') slice.tryCalls++;
        if (kind === 'parse') slice.parseCalls++;
        if (kind === 'guard') slice.guardCalls++;
      }
      touched.add(name);
    }
    for (const match of source.matchAll(genericGuardPattern)) {
      const name = match[1] as CatalogBrandName;
      const target = byName.get(name);
      if (!target) continue;
      target.total.guardCalls++;
      target[scope].guardCalls++;
      touched.add(name);
    }
    for (const name of touched) {
      const target = byName.get(name)!;
      target.total.files.add(file.path);
      target[scope].files.add(file.path);
    }
  }

  return BRAND_CATALOG.map(spec => {
    const slices = byName.get(spec.name)!;
    const total = freezeSlice(slices.total);
    return {
      name: spec.name,
      domain: spec.domain,
      ...total,
      scopes: {
        spine: freezeSlice(slices.spine),
        projects: freezeSlice(slices.projects),
      },
    };
  });
}

const EXCLUDED = [
  /^lib\/types\/branded(?:\.ts|\/)/,
  /^lib\/types\/brand-manifest\.json$/,
  /^tools\/brand-(?:catalog|coverage|manifest)\.ts$/,
  /^tools\/branded-id-check\.ts$/,
  /(?:^|\/)(?:test|tests|__tests__|fixtures?)(?:\/|$)/,
  /\.(?:test|spec)\.[cm]?tsx?$/,
  /(?:^|\/)node_modules\//,
  /(?:^|\/)(?:dist|build|coverage|vendor|\.cache)\//,
  /^projects\/archive\//,
];
const CONSUMER_ROOTS = [
  'lib',
  'scripts',
  'tools',
  'config',
  'functions',
  'packages',
  'projects',
] as const;
const SOURCE_FILE = /\.[cm]?tsx?$/;
const CANONICAL_IMPORT =
  /(?:from|import)\s*\(?\s*['"][^'"]*(?:\/lib\/types\/branded|@factorywager\/branded)/;
const LOCAL_BRAND_TYPE =
  /\b(?:type|interface)\s+([A-Z][A-Za-z0-9]*(?:Id|Key|Code))\b[^;\n]*(?:unique symbol|readonly\s+\[[^\]]+\]|__brand)/g;
const ACTIVE_PROJECT_CATEGORIES = new Set([
  'analysis',
  'automation',
  'dashboards',
  'development',
  'enterprise',
  'tools',
  'utilities',
]);

export function inferProjectRoot(path: string): string | undefined {
  const parts = path.split('/');
  if (parts[0] !== 'projects') return undefined;
  if (parts[1] === 'experimental' && parts[2] && parts.length > 3) {
    if (parts[2]!.includes('.')) return undefined;
    return parts.slice(0, 3).join('/');
  }
  if (parts[1] !== 'active' || !parts[2]) return undefined;
  if (ACTIVE_PROJECT_CATEGORIES.has(parts[2]!)) {
    if (!parts[3] || parts[3]!.includes('.')) return undefined;
    return parts.slice(0, 4).join('/');
  }
  if (parts.length <= 3 || parts[2]!.includes('.')) return undefined;
  return parts.slice(0, 3).join('/');
}

/**
 * Enumerate projects/ paths for coverage/adoption. Normally a scoped
 * `git ls-files`; the staged-scratch test runner
 * (scripts/bun-test-changed-staged.ts) symlinks projects/ instead of
 * materializing it, so `git ls-files -- projects` is empty there — it exports
 * the real index's projects paths via KIMI_STAGED_PROJECTS_LS_FILES
 * (NUL-separated) and file content is read through the symlink (worktree
 * content, matching how bakes are generated locally).
 */
export async function listProjectsPaths(root: string): Promise<string[]> {
  const exported = Bun.env.KIMI_STAGED_PROJECTS_LS_FILES;
  if (exported && (await Bun.file(exported).exists())) {
    return (await Bun.file(exported).text()).split('\0').filter(Boolean);
  }
  const proc = Bun.spawn(['git', 'ls-files', '-z', '--', 'projects'], {
    cwd: root,
    stdout: 'pipe',
    stderr: 'pipe',
  });
  const [stdout, exitCode] = await Promise.all([new Response(proc.stdout).text(), proc.exited]);
  return exitCode === 0 ? stdout.split('\0').filter(Boolean) : [];
}

export async function loadProjectRoots(root: string): Promise<string[]> {
  const registryPath = `${root}/public/registry/projects-registry.json`;
  const registry = (await Bun.file(registryPath).exists())
    ? ((await Bun.file(registryPath).json()) as {
        projects?: Array<{ path?: unknown }>;
      })
    : { projects: [] };
  const trackedRoots = (await listProjectsPaths(root))
    .map(inferProjectRoot)
    .filter((path): path is string => typeof path === 'string');
  return [
    ...new Set([
      ...(registry.projects ?? [])
        .map(project => project.path)
        .filter((path): path is string => typeof path === 'string'),
      ...trackedRoots,
    ]),
  ].sort((a, b) => b.length - a.length);
}

function projectForPath(path: string, projectRoots: readonly string[]): string | undefined {
  return (
    projectRoots.find(root => path === root || path.startsWith(`${root}/`)) ??
    inferProjectRoot(path)
  );
}

export async function loadBrandConsumerFiles(root: string): Promise<BrandCoverageFile[]> {
  const proc = Bun.spawn(['git', 'ls-files', '-z'], {
    cwd: root,
    stdout: 'pipe',
    stderr: 'pipe',
  });
  const [stdout, stderr, exitCode, projectRoots] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
    loadProjectRoots(root),
  ]);
  if (exitCode !== 0) {
    throw new Error(`git ls-files failed (${exitCode}): ${stderr.trim()}`);
  }

  const files: BrandCoverageFile[] = [];
  const paths = stdout.split('\0').filter(Boolean);
  // Scratch/snapshot repos (staged-test runner): projects/ is a symlink, so
  // the main ls-files has no projects entries — pull them from the runner's
  // export (or a scoped ls-files) instead of scanning the 1.8G dir blindly.
  if (!paths.some(path => path.startsWith('projects/'))) {
    paths.push(...(await listProjectsPaths(root)));
  }
  // The scratch runner appends exported projects after its local index paths;
  // normalize order so bounded evidence lists match a normal checkout bake.
  paths.sort((left, right) => left.localeCompare(right));
  for (const path of paths) {
    if (!CONSUMER_ROOTS.some(consumerRoot => path.startsWith(`${consumerRoot}/`))) continue;
    if (!SOURCE_FILE.test(path) || EXCLUDED.some(pattern => pattern.test(path))) continue;
    const text = await Bun.file(`${root}/${path}`).text();
    files.push({
      path,
      text,
      project: projectForPath(path, projectRoots),
    });
  }
  return files;
}

export function analyzeProjectBrandAdoption(
  files: readonly BrandCoverageFile[],
  projectRoots: readonly string[]
): ProjectBrandAdoptionRow[] {
  return projectRoots.map(project => {
    const projectFiles = files.filter(file => file.project === project);
    const brandedFiles = projectFiles.filter(file =>
      CANONICAL_IMPORT.test(stripSourceComments(file.text))
    );
    const localBrandTypes = [
      ...new Set(
        projectFiles.flatMap(file =>
          [...stripSourceComments(file.text).matchAll(LOCAL_BRAND_TYPE)].map(match => match[1]!)
        )
      ),
    ].sort();
    const rows = analyzeBrandCoverage(brandedFiles);
    const brands = rows.filter(row => row.status !== 'unused').map(row => row.name);
    const constructorCalls = rows.reduce((total, row) => total + row.constructionCalls, 0);
    const guardCalls = rows.reduce((total, row) => total + row.guardCalls, 0);
    const status: ProjectBrandAdoptionStatus =
      projectFiles.length === 0
        ? 'external-or-untracked'
        : constructorCalls + guardCalls > 0
          ? 'adopted'
          : localBrandTypes.length > 0
            ? 'local-pattern'
            : brands.length > 0
              ? 'types-only'
              : 'governed-no-usage';
    return {
      project,
      sourceFiles: projectFiles.length,
      brandedFiles: brandedFiles.length,
      brands,
      localBrandTypes,
      constructorCalls,
      guardCalls,
      status,
    };
  });
}

function printRows(rows: readonly BrandCoverageRow[], attentionOnly: boolean): void {
  const visible = attentionOnly ? rows.filter(row => row.status !== 'covered') : rows;
  console.info(
    `\nBrand coverage — ${rows.length} values · ` +
      `${rows.filter(row => row.status === 'covered').length} covered · ` +
      `${rows.filter(row => row.status === 'referenced-unconstructed').length} referenced-unconstructed · ` +
      `${rows.filter(row => row.status === 'unused').length} unused\n`
  );
  for (const row of visible) {
    console.info(
      `${row.name.padEnd(24)} ${row.status.padEnd(26)} ` +
        `refs=${String(row.references).padStart(3)} ` +
        `as=${String(row.asCalls).padStart(3)} ` +
        `try=${String(row.tryCalls).padStart(3)} ` +
        `parse=${String(row.parseCalls).padStart(3)} ` +
        `guard=${String(row.guardCalls).padStart(3)}`
    );
  }
  console.info('');
}

async function main(): Promise<void> {
  const args = applyUnknownLongOptionGuardFor('brand:coverage', Bun.argv.slice(2));
  const root = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
  const files = await loadBrandConsumerFiles(root);
  const rows = analyzeBrandCoverage(files);
  const projects = analyzeProjectBrandAdoption(files, await loadProjectRoots(root));
  if (args.includes('--json')) {
    process.stdout.write(`${JSON.stringify({ version: 2, rows, projects }, null, 2)}\n`);
  } else {
    printRows(rows, args.includes('--attention'));
    const adopted = projects.filter(project => project.status === 'adopted').length;
    const governed = projects.filter(project => project.status !== 'external-or-untracked').length;
    console.info(
      `Project adoption — ${projects.length} catalogued · ${governed} tracked/governed · ` +
        `${adopted} with canonical constructor or guard usage\n`
    );
  }
  if (args.includes('--strict') && rows.some(row => row.status === 'referenced-unconstructed')) {
    process.exitCode = 1;
  }
}

if (import.meta.main) {
  await main();
}
