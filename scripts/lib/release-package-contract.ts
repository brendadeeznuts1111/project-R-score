// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @updated Bun.file · fixed v0.2.2 · 2022-10-27 · https://bun.com/blog/bun-v0.2.2
// @updated Bun.file · changed v0.6.0 · 2023-05-16 · https://bun.com/blog/bun-v0.6.0
// @updated Bun.file · fixed v0.6.5 · 2023-05-29 · https://bun.com/blog/bun-v0.6.5
// @updated Bun.file · changed v0.6.12 · 2023-06-30 · https://bun.com/blog/bun-v0.6.12
// @updated Bun.file · fixed v1.0.1 · 2023-09-12 · https://bun.com/blog/bun-v1.0.1
// @updated Bun.file · fixed v1.0.2 · 2023-09-15 · https://bun.com/blog/bun-v1.0.2
// @updated Bun.file · changed v1.0.16 · 2023-12-10 · https://bun.com/blog/bun-v1.0.16
// @updated Bun.file · changed v1.0.21 · 2024-01-02 · https://bun.com/blog/bun-v1.0.21
// @updated Bun.file · fixed v1.0.21 · 2024-01-02 · https://bun.com/blog/bun-v1.0.21
// @updated Bun.file · fixed v1.0.23 · 2024-01-16 · https://bun.com/blog/bun-v1.0.23
// @updated Bun.file · fixed v1.0.24 · 2024-01-20 · https://bun.com/blog/bun-v1.0.24
// @updated Bun.file · fixed v1.0.25 · 2024-01-21 · https://bun.com/blog/bun-v1.0.25
// @updated Bun.file · fixed v1.0.26 · 2024-02-03 · https://bun.com/blog/bun-v1.0.26
// @updated Bun.file · fixed v1.0.27 · 2024-02-17 · https://bun.com/blog/bun-v1.0.27
// @updated Bun.file · fixed v1.0.28 · 2024-02-19 · https://bun.com/blog/bun-v1.0.28
// @updated Bun.file · changed v1.0.36 · 2024-03-29 · https://bun.com/blog/bun-v1.0.36
// @updated Bun.file · changed v1.1.0 · 2024-04-01 · https://bun.com/blog/bun-v1.1
// @updated Bun.file · fixed v1.1.0 · 2024-04-01 · https://bun.com/blog/bun-v1.1
// @updated Bun.file · fixed v1.1.6 · 2024-04-28 · https://bun.com/blog/bun-v1.1.6
// @updated Bun.file · changed v1.1.9 · 2024-05-22 · https://bun.com/blog/bun-v1.1.9
// @updated Bun.file · fixed v1.1.11 · 2024-06-01 · https://bun.com/blog/bun-v1.1.11
// @updated Bun.file · fixed v1.1.22 · 2024-08-07 · https://bun.com/blog/bun-v1.1.22
// @updated Bun.file · fixed v1.1.27 · 2024-09-07 · https://bun.com/blog/bun-v1.1.27
// @updated Bun.file · fixed v1.1.28 · 2024-09-18 · https://bun.com/blog/bun-v1.1.28
// @updated Bun.file · fixed v1.1.37 · 2024-11-26 · https://bun.com/blog/bun-v1.1.37
// @updated Bun.file · changed v1.1.39 · 2024-12-17 · https://bun.com/blog/bun-v1.1.39
// @updated Bun.file · changed v1.1.43 · 2025-01-08 · https://bun.com/blog/bun-v1.1.43
// @updated Bun.file · changed v1.2.0 · 2025-01-22 · https://bun.com/blog/bun-v1.2
// @updated Bun.file · fixed v1.2.2 · 2025-02-01 · https://bun.com/blog/bun-v1.2.2
// @updated Bun.file · changed v1.2.3 · 2025-02-22 · https://bun.com/blog/bun-v1.2.3
// @updated Bun.file · fixed v1.2.3 · 2025-02-22 · https://bun.com/blog/bun-v1.2.3
// @updated Bun.file · changed v1.2.19 · 2025-07-19 · https://bun.com/blog/bun-v1.2.19
// @updated Bun.file · fixed v1.2.19 · 2025-07-19 · https://bun.com/blog/bun-v1.2.19
// @updated Bun.file · fixed v1.2.20 · 2025-08-10 · https://bun.com/blog/bun-v1.2.20
// @updated Bun.file · changed v1.3.0 · 2025-10-10 · https://bun.com/blog/bun-v1.3
// @updated Bun.file · fixed v1.3.0 · 2025-10-10 · https://bun.com/blog/bun-v1.3
// @updated Bun.file · fixed v1.3.6 · 2026-01-13 · https://bun.com/blog/bun-v1.3.6
// @updated Bun.file · fixed v1.3.10 · 2026-02-26 · https://bun.com/blog/bun-v1.3.10
// @updated Bun.file · fixed v1.3.11 · 2026-03-18 · https://bun.com/blog/bun-v1.3.11
// @updated Bun.file · fixed v1.3.12 · 2026-04-09 · https://bun.com/blog/bun-v1.3.12
// @updated Bun.file · changed v1.3.13 · 2026-04-20 · https://bun.com/blog/bun-v1.3.13
// @updated Bun.file · fixed v1.3.13 · 2026-04-20 · https://bun.com/blog/bun-v1.3.13
// @updated Bun.file · changed v1.3.14 · 2026-05-13 · https://bun.com/blog/bun-v1.3.14
// @updated Bun.file · fixed v1.3.14 · 2026-05-13 · https://bun.com/blog/bun-v1.3.14
// @verified Bun.file · Bun v1.4.0 · 2026-08-25 · https://bun.com/docs/runtime/file-io
import { joinPath } from '../../lib/path-bun.ts';
import { isRecord, type ExpectedBinary, type ReleaseTarget } from './release-target-contract.ts';

export interface PackageManifest {
  name?: unknown;
  version?: unknown;
  private?: unknown;
  license?: unknown;
  repository?: unknown;
  publishConfig?: unknown;
  peerDependenciesMeta?: unknown;
  dependencies?: unknown;
  bin?: unknown;
  files?: unknown;
  exports?: unknown;
  main?: unknown;
  module?: unknown;
  types?: unknown;
}

function parseBinaries(value: unknown): ExpectedBinary[] {
  if (value === undefined) return [];
  if (typeof value === 'string') return [{ name: '', path: value }];
  if (!isRecord(value)) throw new Error('package bin must be a string or object');
  return Object.entries(value).map(([name, path]) => {
    if (typeof path !== 'string' || !path) throw new Error(`package bin.${name} must be a path`);
    return { name, path };
  });
}

export function validateExpectedBinaries(pkg: PackageManifest, target: ReleaseTarget): void {
  const sort = (items: ExpectedBinary[]) =>
    [...items].sort((a, b) => `${a.name}:${a.path}`.localeCompare(`${b.name}:${b.path}`));
  if (
    JSON.stringify(sort(parseBinaries(pkg.bin))) !== JSON.stringify(sort(target.expectedBinaries))
  ) {
    throw new Error(`binary contract mismatch for ${target.target}`);
  }
}

export function parseExportTargets(value: unknown): string[] {
  const targets: string[] = [];
  const parseNode = (node: unknown): void => {
    if (typeof node === 'string' && node.startsWith('./')) targets.push(node.slice(2));
    else if (Array.isArray(node)) node.forEach(parseNode);
    else if (isRecord(node)) Object.values(node).forEach(parseNode);
  };
  parseNode(value);
  return [...new Set(targets)].sort();
}

export function isPackageFileIncluded(file: string, files: unknown): boolean {
  if (file === 'package.json' || !Array.isArray(files)) return true;
  const normalized = file.replace(/^\.\//, '');
  return files.some(entry => {
    if (typeof entry !== 'string') return false;
    const allowed = entry.replace(/^\.\//, '').replace(/\/$/, '');
    return normalized === allowed || normalized.startsWith(`${allowed}/`);
  });
}

export function validatePackageReleaseMetadata(pkg: PackageManifest, target: ReleaseTarget): void {
  if (pkg.private !== false)
    throw new Error(`release package ${target.packageName} must explicitly set private=false`);
  if (typeof pkg.license !== 'string' || !pkg.license)
    throw new Error(`release package ${target.packageName} must declare a license`);
  if (!isRecord(pkg.repository) || pkg.repository.directory !== target.packageDirectory)
    throw new Error(`release package repository.directory must be ${target.packageDirectory}`);
  if (!isRecord(pkg.publishConfig) || pkg.publishConfig.access !== 'public')
    throw new Error(`release package ${target.packageName} must declare public access`);
  const peerMeta = pkg.peerDependenciesMeta;
  if (
    !isRecord(peerMeta) ||
    !isRecord(peerMeta['bun-types']) ||
    peerMeta['bun-types'].optional !== true
  )
    throw new Error('peerDependenciesMeta.bun-types.optional must be boolean true');
  if (isRecord(pkg.dependencies))
    for (const [name, version] of Object.entries(pkg.dependencies)) {
      if (typeof version === 'string' && /^(workspace|catalog):/.test(version))
        throw new Error(`runtime dependency ${name} cannot use ${version} in a public package`);
    }
}

export async function validatePackageFiles(
  packageDirectory: string,
  pkg: PackageManifest,
  target: ReleaseTarget
): Promise<string[]> {
  const targets = await validateExportClosure(packageDirectory, pkg);
  for (const file of target.requiredPackageFiles) {
    if (!isPackageFileIncluded(file, pkg.files))
      throw new Error(`package file is excluded by package files: ${file}`);
    if (!(await Bun.file(joinPath(packageDirectory, file)).exists()))
      throw new Error(`required package file does not exist: ${file}`);
  }
  return targets;
}

export async function validateExportClosure(
  packageDirectory: string,
  pkg: PackageManifest
): Promise<string[]> {
  const entries = [pkg.main, pkg.module, pkg.types]
    .filter((value): value is string => typeof value === 'string' && value.startsWith('./'))
    .map(value => value.slice(2));
  const targets = [...new Set([...parseExportTargets(pkg.exports), ...entries])].sort();
  for (const file of targets) {
    if (!isPackageFileIncluded(file, pkg.files))
      throw new Error(`package file is excluded by package files: ${file}`);
    if (!(await Bun.file(joinPath(packageDirectory, file)).exists()))
      throw new Error(`required package file does not exist: ${file}`);
  }
  return targets;
}
