#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/child-process#spawn-a-process-bun-spawn — Bun.spawn
// @updated Bun.spawn · changed v0.2.0 · 2022-10-13 · https://bun.com/blog/bun-v0.2.0
// @updated Bun.spawn · changed v0.3.0 · 2022-12-07 · https://bun.com/blog/bun-v0.3.0
// @updated Bun.spawn · fixed v0.6.0 · 2023-05-16 · https://bun.com/blog/bun-v0.6.0
// @updated Bun.spawn · fixed v0.6.6 · 2023-05-31 · https://bun.com/blog/bun-v0.6.6
// @updated Bun.spawn · fixed v0.7.2 · 2023-08-03 · https://bun.com/blog/bun-v0.7.2
// @updated Bun.spawn · fixed v1.0.8 · 2023-11-02 · https://bun.com/blog/bun-v1.0.8
// @updated Bun.spawn · fixed v1.0.9 · 2023-11-05 · https://bun.com/blog/bun-v1.0.9
// @updated Bun.spawn · fixed v1.0.23 · 2024-01-16 · https://bun.com/blog/bun-v1.0.23
// @updated Bun.spawn · fixed v1.0.26 · 2024-02-03 · https://bun.com/blog/bun-v1.0.26
// @updated Bun.spawn · fixed v1.0.31 · 2024-03-14 · https://bun.com/blog/bun-v1.0.31
// @updated Bun.spawn · fixed v1.0.32 · 2024-03-17 · https://bun.com/blog/bun-v1.0.32
// @updated Bun.spawn · fixed v1.0.36 · 2024-03-29 · https://bun.com/blog/bun-v1.0.36
// @updated Bun.spawn · changed v1.1.0 · 2024-04-01 · https://bun.com/blog/bun-v1.1
// @updated Bun.spawn · fixed v1.1.5 · 2024-04-26 · https://bun.com/blog/bun-v1.1.5
// @updated Bun.spawn · changed v1.1.8 · 2024-05-10 · https://bun.com/blog/bun-v1.1.8
// @updated Bun.spawn · fixed v1.1.8 · 2024-05-10 · https://bun.com/blog/bun-v1.1.8
// @updated Bun.spawn · fixed v1.1.30 · 2024-10-08 · https://bun.com/blog/bun-v1.1.30
// @updated Bun.spawn · changed v1.1.39 · 2024-12-17 · https://bun.com/blog/bun-v1.1.39
// @updated Bun.spawn · fixed v1.1.39 · 2024-12-17 · https://bun.com/blog/bun-v1.1.39
// @updated Bun.spawn · changed v1.2.0 · 2025-01-22 · https://bun.com/blog/bun-v1.2
// @updated Bun.spawn · fixed v1.2.1 · 2025-01-27 · https://bun.com/blog/bun-v1.2.1
// @updated Bun.spawn · changed v1.2.6 · 2025-03-25 · https://bun.com/blog/bun-v1.2.6
// @updated Bun.spawn · fixed v1.2.6 · 2025-03-25 · https://bun.com/blog/bun-v1.2.6
// @updated Bun.spawn · changed v1.2.9 · 2025-04-09 · https://bun.com/blog/bun-v1.2.9
// @updated Bun.spawn · fixed v1.2.16 · 2025-06-11 · https://bun.com/blog/bun-v1.2.16
// @updated Bun.spawn · fixed v1.2.17 · 2025-06-21 · https://bun.com/blog/bun-v1.2.17
// @updated Bun.spawn · changed v1.2.18 · 2025-07-03 · https://bun.com/blog/bun-v1.2.18
// @updated Bun.spawn · fixed v1.2.18 · 2025-07-03 · https://bun.com/blog/bun-v1.2.18
// @updated Bun.spawn · changed v1.3.0 · 2025-10-10 · https://bun.com/blog/bun-v1.3
// @updated Bun.spawn · fixed v1.3.0 · 2025-10-10 · https://bun.com/blog/bun-v1.3
// @updated Bun.spawn · fixed v1.3.2 · 2025-11-08 · https://bun.com/blog/bun-v1.3.2
// @updated Bun.spawn · changed v1.3.3 · 2025-11-21 · https://bun.com/blog/bun-v1.3.3
// @updated Bun.spawn · fixed v1.3.3 · 2025-11-21 · https://bun.com/blog/bun-v1.3.3
// @updated Bun.spawn · changed v1.3.5 · 2025-12-17 · https://bun.com/blog/bun-v1.3.5
// @updated Bun.spawn · changed v1.3.6 · 2026-01-13 · https://bun.com/blog/bun-v1.3.6
// @updated Bun.spawn · fixed v1.3.10 · 2026-02-26 · https://bun.com/blog/bun-v1.3.10
// @updated Bun.spawn · fixed v1.3.14 · 2026-05-13 · https://bun.com/blog/bun-v1.3.14
// @verified Bun.spawn · Bun v1.3.14 · 2026-08-06 · https://bun.com/docs/runtime/child-process
// @see https://bun.com/docs/runtime/glob#quickstart — Bun.Glob
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/reference/bun/semver/satisfies — Bun.semver.satisfies
// @see https://bun.com/reference/bun/argv — Bun.argv
/**
 * Product-leaf structure and Bun compatibility contract.
 *
 * Active products fail closed. Experimental findings are reported for triage.
 * Archive products remain structurally checked but runtime-frozen.
 */
import { applyUnknownLongOptionGuardFor } from '../lib/docs/ref-id-tool-flags.ts';
import { joinPath, resolvePath } from '../lib/path-bun';

const argv = import.meta.main
  ? applyUnknownLongOptionGuardFor('projects:roots:check', Bun.argv.slice(2))
  : Bun.argv.slice(2);
const REPO = resolvePath(import.meta.dir, '..');

const ACTIVE_SPECIALS = new Set([
  'factorywager',
  'sports-terminal-os',
  'kimiremote',
  'f402-openapi',
  'playwriter-skill',
]);

const CATEGORY_DIRS = new Set([
  'analysis',
  'automation',
  'dashboards',
  'development',
  'enterprise',
  'tools',
  'utilities',
]);

export type ProjectTier = 'active' | 'experimental' | 'archive';
export type ProjectLeaf = { tier: ProjectTier; path: string };
export type ProjectIssueKind =
  | 'missing-readme'
  | 'missing-package'
  | 'invalid-package'
  | 'missing-bun-engine'
  | 'unsupported-bun-engine'
  | 'missing-bun-lock'
  | 'missing-workspace-package'
  | 'foreign-lockfile'
  | 'foreign-package-manager'
  | 'unexpected';
export type ProjectIssue = { kind: ProjectIssueKind; path: string; message?: string };

export type PackageManifest = {
  name?: string;
  engines?: { bun?: string };
  packageManager?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  workspaces?: string[] | { packages?: string[] };
};

export type WorkspaceManifest = { path: string; manifest: PackageManifest };

type BunContractInput = {
  leaf: ProjectLeaf;
  manifest: PackageManifest;
  reviewedBunVersion: string;
  rootWorkspace: boolean;
  lockfiles: string[];
};

const DEPENDENCY_FIELDS = [
  'dependencies',
  'devDependencies',
  'optionalDependencies',
  'peerDependencies',
] as const;
const FOREIGN_LOCKFILES = ['package-lock.json', 'pnpm-lock.yaml', 'yarn.lock'] as const;

async function isDir(abs: string): Promise<boolean> {
  const proc = Bun.spawn(['test', '-d', abs], { stdout: 'ignore', stderr: 'ignore' });
  return (await proc.exited) === 0;
}

async function exists(abs: string): Promise<boolean> {
  if (await Bun.file(abs).exists()) return true;
  return isDir(abs);
}

async function listDirs(abs: string): Promise<string[]> {
  const out: string[] = [];
  for await (const name of new Bun.Glob('*').scan({ cwd: abs, onlyFiles: false })) {
    if (name.includes('/') || name.startsWith('.')) continue;
    if (await isDir(joinPath(abs, name))) out.push(name);
  }
  return out.sort();
}

function nonEmptyRecord(value: Record<string, string> | undefined): boolean {
  return value !== undefined && Object.keys(value).length > 0;
}

function hasInstallGraph(manifest: PackageManifest): boolean {
  return (
    DEPENDENCY_FIELDS.some(field => nonEmptyRecord(manifest[field])) ||
    (Array.isArray(manifest.workspaces) && manifest.workspaces.length > 0) ||
    (!Array.isArray(manifest.workspaces) && (manifest.workspaces?.packages?.length ?? 0) > 0)
  );
}

function manifestWorkspacePatterns(manifest: PackageManifest): string[] {
  return Array.isArray(manifest.workspaces)
    ? manifest.workspaces
    : (manifest.workspaces?.packages ?? []);
}

export function findMissingWorkspacePackages(packages: WorkspaceManifest[]): ProjectIssue[] {
  const providers = new Set(
    packages
      .map(entry => entry.manifest.name)
      .filter((name): name is string => typeof name === 'string' && name.length > 0)
  );
  const findings = new Map<string, ProjectIssue>();

  for (const entry of packages) {
    for (const field of DEPENDENCY_FIELDS) {
      for (const [name, range] of Object.entries(entry.manifest[field] ?? {})) {
        if (!range.startsWith('workspace:') || providers.has(name)) continue;
        const key = `${entry.path}\0${name}`;
        findings.set(key, {
          kind: 'missing-workspace-package',
          path: entry.path,
          message: `${name}@${range}`,
        });
      }
    }
  }

  return [...findings.values()].sort(
    (left, right) =>
      left.path.localeCompare(right.path) || left.message!.localeCompare(right.message!)
  );
}

async function auditWorkspacePackages(
  root: string,
  leaf: ProjectLeaf,
  manifest: PackageManifest
): Promise<ProjectIssue[]> {
  const leafRoot = joinPath(root, leaf.path);
  const workspaceRoots: WorkspaceManifest[] = [{ path: `${leaf.path}/package.json`, manifest }];
  for await (const relative of new Bun.Glob('**/package.json').scan({ cwd: leafRoot })) {
    if (
      relative === 'package.json' ||
      relative.includes('/node_modules/') ||
      relative.startsWith('node_modules/') ||
      /\/(?:dist|build|coverage|\.cache)\//.test(`/${relative}`)
    ) {
      continue;
    }
    try {
      const nested = (await Bun.file(joinPath(leafRoot, relative)).json()) as PackageManifest;
      if (manifestWorkspacePatterns(nested).length > 0) {
        workspaceRoots.push({ path: `${leaf.path}/${relative}`, manifest: nested });
      }
    } catch {
      // The existing invalid-package contract owns malformed nested manifests.
    }
  }

  const findings = new Map<string, ProjectIssue>();
  for (const workspaceRoot of workspaceRoots) {
    const patterns = manifestWorkspacePatterns(workspaceRoot.manifest);
    if (patterns.length === 0) continue;
    const workspaceRelative = workspaceRoot.path.slice(
      leaf.path.length + 1,
      -'/package.json'.length
    );
    const workspaceAbsolute = workspaceRelative ? joinPath(leafRoot, workspaceRelative) : leafRoot;
    const packages: WorkspaceManifest[] = [workspaceRoot];
    const seen = new Set(['package.json']);

    for (const pattern of patterns) {
      const manifestPattern = `${pattern.replace(/\/$/, '')}/package.json`;
      for await (const relative of new Bun.Glob(manifestPattern).scan({ cwd: workspaceAbsolute })) {
        if (seen.has(relative)) continue;
        seen.add(relative);
        try {
          packages.push({
            path: `${workspaceRoot.path.slice(0, -'package.json'.length)}${relative}`,
            manifest: (await Bun.file(
              joinPath(workspaceAbsolute, relative)
            ).json()) as PackageManifest,
          });
        } catch {
          // The existing invalid-package contract owns malformed nested manifests.
        }
      }
    }

    for (const finding of findMissingWorkspacePackages(packages)) {
      findings.set(`${finding.path}\0${finding.message}`, finding);
    }
  }

  return [...findings.values()].sort(
    (left, right) =>
      left.path.localeCompare(right.path) || left.message!.localeCompare(right.message!)
  );
}

export function validateProjectBunContract(input: BunContractInput): ProjectIssue[] {
  if (input.leaf.tier === 'archive') return [];

  const findings: ProjectIssue[] = [];
  const engine = input.manifest.engines?.bun;
  if (typeof engine !== 'string' || !engine.trim()) {
    findings.push({ kind: 'missing-bun-engine', path: `${input.leaf.path}/package.json` });
  } else if (!Bun.semver.satisfies(input.reviewedBunVersion, engine)) {
    findings.push({
      kind: 'unsupported-bun-engine',
      path: `${input.leaf.path}/package.json`,
      message: `${engine} does not accept repository Bun ${input.reviewedBunVersion}`,
    });
  }

  const packageManager = input.manifest.packageManager;
  if (typeof packageManager === 'string' && !packageManager.startsWith('bun@')) {
    findings.push({
      kind: 'foreign-package-manager',
      path: `${input.leaf.path}/package.json`,
      message: packageManager,
    });
  }

  const foreignLocks = input.lockfiles.filter(lockfile =>
    FOREIGN_LOCKFILES.includes(lockfile as (typeof FOREIGN_LOCKFILES)[number])
  );
  for (const lockfile of foreignLocks) {
    findings.push({ kind: 'foreign-lockfile', path: `${input.leaf.path}/${lockfile}` });
  }

  const hasBunLock = input.lockfiles.includes('bun.lock');
  if (hasInstallGraph(input.manifest) && !input.rootWorkspace && !hasBunLock) {
    findings.push({ kind: 'missing-bun-lock', path: `${input.leaf.path}/bun.lock` });
  }
  return findings;
}

export async function discoverProjectLeaves(root = REPO): Promise<{
  leaves: ProjectLeaf[];
  issues: ProjectIssue[];
}> {
  const leaves: ProjectLeaf[] = [];
  const issues: ProjectIssue[] = [];

  const activeRoot = joinPath(root, 'projects/active');
  for (const name of await listDirs(activeRoot)) {
    if (ACTIVE_SPECIALS.has(name)) {
      leaves.push({ tier: 'active', path: `projects/active/${name}` });
      continue;
    }
    if (!CATEGORY_DIRS.has(name)) {
      issues.push({ kind: 'unexpected', path: `projects/active/${name}` });
      continue;
    }
    for (const child of await listDirs(joinPath(activeRoot, name))) {
      leaves.push({ tier: 'active', path: `projects/active/${name}/${child}` });
    }
  }

  for (const tier of ['experimental', 'archive'] as const) {
    const tierRoot = joinPath(root, `projects/${tier}`);
    if (!(await isDir(tierRoot))) continue;
    for (const name of await listDirs(tierRoot)) {
      leaves.push({ tier, path: `projects/${tier}/${name}` });
    }
  }
  return { leaves: leaves.sort((left, right) => left.path.localeCompare(right.path)), issues };
}

async function rootProjectContract(root: string): Promise<{
  workspacePatterns: string[];
  reviewedBunVersion: string;
}> {
  const manifest = (await Bun.file(joinPath(root, 'package.json')).json()) as {
    workspaces?: string[] | { packages?: string[] };
    packageManager?: string;
  };
  const workspacePatterns = Array.isArray(manifest.workspaces)
    ? manifest.workspaces
    : (manifest.workspaces?.packages ?? []);
  if (typeof manifest.packageManager !== 'string' || !manifest.packageManager.startsWith('bun@')) {
    throw new Error('root package.json.packageManager must pin bun@<version>');
  }
  const reviewedBunVersion = manifest.packageManager.slice('bun@'.length);
  if (!Bun.semver.satisfies(reviewedBunVersion, reviewedBunVersion)) {
    throw new Error('root package.json.packageManager must contain a valid Bun version');
  }
  return { workspacePatterns, reviewedBunVersion };
}

function matchesWorkspace(path: string, patterns: string[]): boolean {
  return patterns.some(pattern => new Bun.Glob(pattern).match(path));
}

async function lockfilesFor(root: string, leaf: ProjectLeaf): Promise<string[]> {
  const found: string[] = [];
  for (const filename of ['bun.lock', 'bun.lockb', ...FOREIGN_LOCKFILES]) {
    if (await Bun.file(joinPath(root, leaf.path, filename)).exists()) found.push(filename);
  }
  return found;
}

async function checkIndex(root: string, rel: string, issues: ProjectIssue[]): Promise<void> {
  if (!(await exists(joinPath(root, rel, 'README.md')))) {
    issues.push({ kind: 'missing-readme', path: `${rel}/README.md` });
  }
}

export async function auditProjectRoots(root = REPO): Promise<{
  leaves: ProjectLeaf[];
  issues: ProjectIssue[];
  advisories: ProjectIssue[];
}> {
  const issues: ProjectIssue[] = [];
  const advisories: ProjectIssue[] = [];
  for (const rel of ['projects', 'projects/active', 'projects/experimental', 'projects/archive']) {
    await checkIndex(root, rel, issues);
  }

  const discovered = await discoverProjectLeaves(root);
  issues.push(...discovered.issues);
  const rootContract = await rootProjectContract(root);

  for (const leaf of discovered.leaves) {
    const readme = joinPath(root, leaf.path, 'README.md');
    const packagePath = joinPath(root, leaf.path, 'package.json');
    if (!(await exists(readme))) issues.push({ kind: 'missing-readme', path: leaf.path });
    if (!(await Bun.file(packagePath).exists())) {
      issues.push({ kind: 'missing-package', path: leaf.path });
      continue;
    }

    let manifest: PackageManifest;
    try {
      manifest = (await Bun.file(packagePath).json()) as PackageManifest;
    } catch (cause) {
      issues.push({
        kind: 'invalid-package',
        path: `${leaf.path}/package.json`,
        message: cause instanceof Error ? cause.message : String(cause),
      });
      continue;
    }

    const findings = validateProjectBunContract({
      leaf,
      manifest,
      reviewedBunVersion: rootContract.reviewedBunVersion,
      rootWorkspace: matchesWorkspace(leaf.path, rootContract.workspacePatterns),
      lockfiles: await lockfilesFor(root, leaf),
    });
    if (leaf.tier === 'active') issues.push(...findings);
    else advisories.push(...findings);
    if (leaf.tier === 'active') {
      advisories.push(...(await auditWorkspacePackages(root, leaf, manifest)));
    }
  }
  return { leaves: discovered.leaves, issues, advisories };
}

async function main(): Promise<void> {
  const asJson = argv.includes('--json');
  const report = await auditProjectRoots();
  const tierCounts = Object.fromEntries(
    (['active', 'experimental', 'archive'] as const).map(tier => [
      tier,
      report.leaves.filter(leaf => leaf.tier === tier).length,
    ])
  );

  if (asJson) {
    process.stdout.write(
      `${JSON.stringify(
        {
          leaves: report.leaves.length,
          tierCounts,
          count: report.issues.length,
          advisoryCount: report.advisories.length,
          issues: report.issues,
          advisories: report.advisories,
        },
        null,
        2
      )}\n`
    );
  } else {
    if (report.issues.length === 0) {
      console.info(
        `✅ projects-root-check: ${report.leaves.length} product leaves, active Bun contracts and indexes OK`
      );
    } else {
      console.info(`\n❌ projects-root-check: ${report.issues.length} issue(s)\n`);
      for (const issue of report.issues) {
        console.info(
          `  [${issue.kind}] ${issue.path}${issue.message ? ` — ${issue.message}` : ''}`
        );
      }
    }
    if (report.advisories.length > 0) {
      console.info(`\n⚠ project advisories: ${report.advisories.length}\n`);
      for (const advisory of report.advisories) {
        console.info(
          `  [${advisory.kind}] ${advisory.path}${advisory.message ? ` — ${advisory.message}` : ''}`
        );
      }
    }
  }

  if (report.issues.length > 0) process.exitCode = 1;
}

if (import.meta.main) await main();
