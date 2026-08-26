// @see https://bun.com/docs/runtime/file-io — Bun.file

import { dirname, join, resolve } from 'node:path';
import { parseReleaseTargets, type ReleaseTarget } from './release-target-contract.ts';
import { repositoryRoot, runCommand } from './release-artifact-io.ts';
import type { PackageManifest } from './release-package-contract.ts';

const DEFAULT_MANIFEST = 'config/release-targets.json';

export async function loadTarget(
  root: string,
  manifestPath: string,
  name: string
): Promise<ReleaseTarget> {
  const manifest = parseReleaseTargets(await Bun.file(resolve(root, manifestPath)).json());
  const target = manifest.targets.find(item => item.target === name);
  if (!target) throw new Error(`unknown release target: ${name}`);
  return target;
}

export async function runReleaseBuild(
  name: string,
  manifest = DEFAULT_MANIFEST,
  cwd = process.cwd()
): Promise<void> {
  const root = await repositoryRoot(cwd);
  const target = await loadTarget(root, manifest, name);
  await runCommand(target.buildCommand, resolve(root, target.packageDirectory));
}

export async function runReleaseTest(
  name: string,
  manifest = DEFAULT_MANIFEST,
  cwd = process.cwd()
): Promise<string> {
  const root = await repositoryRoot(cwd);
  const target = await loadTarget(root, manifest, name);
  const junit = resolve(root, target.junitPath);
  await runCommand(['mkdir', '-p', dirname(junit)], root);
  if (await Bun.file(junit).exists()) await Bun.file(junit).delete();
  await runCommand(target.testCommand, root);
  if (!(await Bun.file(junit).exists()))
    throw new Error(`test command did not create ${target.junitPath}`);
  return junit;
}

export async function runReleasePack(
  name: string,
  manifest = DEFAULT_MANIFEST,
  cwd = process.cwd()
): Promise<string> {
  const root = await repositoryRoot(cwd);
  const target = await loadTarget(root, manifest, name);
  const directory = resolve(root, target.packageDirectory);
  const pkg = (await Bun.file(join(directory, 'package.json')).json()) as PackageManifest;
  if (pkg.name !== target.packageName || typeof pkg.version !== 'string')
    throw new Error(`package identity/version does not match release target ${target.target}`);
  const archiveDirectory = resolve(root, target.archiveDirectory);
  const archive = join(archiveDirectory, `${target.target}-${pkg.version}.tgz`);
  await runCommand(['mkdir', '-p', archiveDirectory], root);
  await runCommand(
    ['bun', 'pm', 'pack', '--filename', archive, '--gzip-level', '9', '--quiet'],
    directory
  );
  if (!(await Bun.file(archive).exists())) throw new Error(`pack did not create ${archive}`);
  return archive;
}
