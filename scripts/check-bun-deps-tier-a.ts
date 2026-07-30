#!/usr/bin/env bun
/**
 * Tier-A Bun-native direct-dep gate.
 * Fails when a banned wrapper package is declared in workspace package.json
 * (dependencies / devDependencies / optionalDependencies). Transitive lockfile
 * hits are out of scope — see tools/bun-prefer-matrix.ts TIER_A_AVOID_PACKAGES.
 *
 * @see https://bun.com/docs/runtime/file-io — Bun.file
 * @see https://bun.com/docs/runtime/glob#quickstart — Bun.Glob
 */
import { joinPath } from '../lib/path-bun.ts';
import { tierAAvoidPackages } from '../tools/bun-prefer-matrix.ts';

type PackageJson = {
  name?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
};

type Hit = {
  pkgFile: string;
  pkgName: string;
  section: 'dependencies' | 'devDependencies' | 'optionalDependencies';
  name: string;
  version: string;
};

const SECTIONS = ['dependencies', 'devDependencies', 'optionalDependencies'] as const;
const REPO_ROOT = joinPath(import.meta.dir, '..');

async function workspacePackageJsonPaths(repoRoot: string): Promise<string[]> {
  const out = new Set<string>([joinPath(repoRoot, 'package.json')]);
  const globs = [
    'packages/*/package.json',
    'lib/*/package.json',
    'projects/active/sports-terminal-os/package.json',
  ];
  for (const pattern of globs) {
    for await (const rel of new Bun.Glob(pattern).scan({ cwd: repoRoot, onlyFiles: true })) {
      out.add(joinPath(repoRoot, rel));
    }
  }
  return [...out].sort();
}

function listTierAHits(pkgFile: string, pkg: PackageJson, banned: ReadonlySet<string>): Hit[] {
  const hits: Hit[] = [];
  for (const section of SECTIONS) {
    const deps = pkg[section];
    if (!deps) continue;
    for (const name of Object.keys(deps)) {
      if (banned.has(name)) {
        hits.push({
          pkgFile,
          pkgName: pkg.name ?? '(unnamed)',
          section,
          name,
          version: String(deps[name]),
        });
      }
    }
  }
  return hits;
}

export async function collectTierAHits(repoRoot: string = REPO_ROOT): Promise<Hit[]> {
  const banned = new Set(tierAAvoidPackages());
  const hits: Hit[] = [];
  for (const pkgFile of await workspacePackageJsonPaths(repoRoot)) {
    if (!(await Bun.file(pkgFile).exists())) continue;
    const pkg = (await Bun.file(pkgFile).json()) as PackageJson;
    hits.push(...listTierAHits(pkgFile, pkg, banned));
  }
  return hits;
}

async function main(): Promise<void> {
  const hits = await collectTierAHits();
  if (hits.length === 0) {
    console.info('[check:bun-deps:tier-a] ok — no Tier-A direct deps');
    return;
  }

  console.error('[check:bun-deps:tier-a] failed — remove wrappers; use Bun natives');
  for (const h of hits) {
    const rel = h.pkgFile.startsWith(REPO_ROOT + '/')
      ? h.pkgFile.slice(REPO_ROOT.length + 1)
      : h.pkgFile;
    console.error(`  - ${rel} ${h.section}.${h.name}@${h.version} (${h.pkgName})`);
  }
  console.error('  SSOT: tools/bun-prefer-matrix.ts tierAAvoidPackages()');
  process.exit(1);
}

if (import.meta.main) {
  await main();
}
