// @see https://bun.com/docs/runtime/file-io — Bun.file

import { joinPath, relativePath, resolvePath } from '../../lib/path-bun.ts';
import { validateJunitXml, type JunitSummary } from './release-junit-contract.ts';
import {
  validateExpectedBinaries,
  validatePackageFiles,
  validatePackageReleaseMetadata,
  type PackageManifest,
} from './release-package-contract.ts';
import { validateChannel } from './release-target-contract.ts';
import { loadTarget } from './release-artifact-lifecycle.ts';
import { writeReleaseReceipt } from './release-receipt-io.ts';
import {
  assertPackedBytes,
  assertRealPathInside,
  commandText,
  packageUntracked,
  repositoryRoot,
  sha256File,
  tarballEntryBytes,
  tarballFiles,
} from './release-artifact-io.ts';

export interface GateOptions {
  manifest: string;
  target: string;
  channel: string;
  junit?: string;
  tarball?: string;
  receipt?: string;
}
export interface ReleaseReceipt {
  schemaVersion: 1;
  target: string;
  packageName: string;
  packageVersion: string;
  channel: string;
  gitCommit: string;
  sourceTreeClean: true;
  manifest: { path: string; sha256: string };
  sources: Array<{ path: string; sha256: string }>;
  junit: JunitSummary & { path: string; sha256: string };
  tarball: { path: string; sha256: string; bytes: number };
  artifacts: Array<{ path: string; sha256: string }>;
}

const display = (root: string, path: string): string => {
  return relativePath(root, path);
};

export async function runReleaseGate(
  options: GateOptions,
  cwd = process.cwd()
): Promise<ReleaseReceipt> {
  const root = await repositoryRoot(cwd);
  const target = await loadTarget(root, options.manifest, options.target);
  validateChannel(target, options.channel);
  const directory = resolvePath(root, target.packageDirectory);
  await assertRealPathInside(root, directory, 'release package directory');
  const pkg = (await Bun.file(joinPath(directory, 'package.json')).json()) as PackageManifest;
  if (pkg.name !== target.packageName || typeof pkg.version !== 'string' || !pkg.version)
    throw new Error('package identity/version mismatch');
  validateExpectedBinaries(pkg, target);
  validatePackageReleaseMetadata(pkg, target);
  await validatePackageFiles(directory, pkg, target);
  for (const file of target.requiredPackageFiles)
    await assertRealPathInside(root, joinPath(directory, file), 'required package file');
  const sources = await Promise.all(
    target.sourceInputs.map(async path => {
      const source = resolvePath(root, path);
      await commandText(['git', 'ls-files', '--error-unmatch', '--', path], root);
      await assertRealPathInside(root, source, 'release source input');
      return { path, sha256: await sha256File(source) };
    })
  );
  const allowed = new Set(
    target.requiredPackageFiles.map(path => `${target.packageDirectory}/${path}`)
  );
  const unexpected = [...(await packageUntracked(root, target.packageDirectory))].filter(
    path => !allowed.has(path) && !path.startsWith(`${target.packageDirectory}/node_modules/`)
  );
  if (unexpected.length)
    throw new Error(`release package has untracked build inputs/files: ${unexpected.join(', ')}`);
  const tarball = resolvePath(
    root,
    options.tarball || joinPath(target.archiveDirectory, `${target.target}-${pkg.version}.tgz`)
  );
  const packed = await tarballFiles(tarball, root);
  const expected = new Set(target.requiredPackageFiles);
  const missing = target.requiredPackageFiles.filter(file => !packed.has(file));
  const extra = [...packed].filter(file => !expected.has(file));
  if (missing.length || extra.length)
    throw new Error(
      `tarball file contract mismatch: missing=${JSON.stringify(missing)}, extra=${JSON.stringify(extra)}`
    );
  await assertPackedBytes(tarball, directory, target.requiredPackageFiles, root);
  const packedManifest = JSON.parse(
    new TextDecoder().decode(await tarballEntryBytes(tarball, 'package.json', root))
  ) as PackageManifest;
  if (packedManifest.name !== target.packageName || packedManifest.version !== pkg.version)
    throw new Error('embedded tarball package identity/version mismatch');
  validatePackageReleaseMetadata(packedManifest, target);
  const gitCommit = await commandText(['git', 'rev-parse', 'HEAD'], root);
  const junitPath = resolvePath(root, options.junit || target.junitPath);
  const junit = validateJunitXml(
    await Bun.file(junitPath).text(),
    gitCommit,
    target.expectedJunitFiles
  );
  if (await commandText(['git', 'status', '--porcelain', '--untracked-files=no'], root))
    throw new Error('release gate requires a clean tracked source tree');
  const artifacts = await Promise.all(
    target.hashArtifacts.map(async path => ({
      path: `${target.packageDirectory}/${path}`,
      sha256: await sha256File(joinPath(directory, path)),
    }))
  );
  const manifestPath = resolvePath(root, options.manifest);
  const receipt: ReleaseReceipt = {
    schemaVersion: 1,
    target: target.target,
    packageName: target.packageName,
    packageVersion: pkg.version,
    channel: options.channel,
    gitCommit,
    sourceTreeClean: true,
    manifest: { path: display(root, manifestPath), sha256: await sha256File(manifestPath) },
    sources,
    junit: { ...junit, path: display(root, junitPath), sha256: await sha256File(junitPath) },
    tarball: {
      path: display(root, tarball),
      sha256: await sha256File(tarball),
      bytes: Bun.file(tarball).size,
    },
    artifacts,
  };
  const receiptPath = resolvePath(
    root,
    options.receipt ||
      `tmp/releases/${target.target}-${pkg.version}-${options.channel}.receipt.json`
  );
  await writeReleaseReceipt(receiptPath, receipt);
  return receipt;
}
