#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv

import {
  assertPublicationRouteEnabled,
  parseReleaseTargets,
} from './lib/release-target-contract.ts';
import { runReleaseGate } from './lib/release-artifact-runner.ts';
import {
  loadTarget,
  runReleaseBuild,
  runReleasePack,
  runReleaseTest,
} from './lib/release-artifact-lifecycle.ts';
import { repositoryRoot } from './lib/release-artifact-io.ts';

export {
  assertPublicationRouteEnabled,
  parseReleaseTargets,
} from './lib/release-target-contract.ts';
export { validateChannel } from './lib/release-target-contract.ts';
export {
  validateExpectedBinaries,
  validateExportClosure,
  validatePackageReleaseMetadata,
} from './lib/release-package-contract.ts';
export { validateJunitXml } from './lib/release-junit-contract.ts';
export { runReleaseGate } from './lib/release-artifact-runner.ts';
export {
  runReleaseBuild,
  runReleasePack,
  runReleaseTest,
} from './lib/release-artifact-lifecycle.ts';
export type { ReleaseTarget, ReleaseTargetsManifest } from './lib/release-target-contract.ts';
export type { GateOptions, ReleaseReceipt } from './lib/release-artifact-runner.ts';

const DEFAULT_MANIFEST = 'config/release-targets.json';
function option(args: string[], name: string, required = true): string | undefined {
  const prefix = `--${name}=`;
  const value = args.find(arg => arg.startsWith(prefix))?.slice(prefix.length);
  if (required && !value) throw new Error(`missing required option ${prefix}<value>`);
  return value;
}

async function main(): Promise<void> {
  const [command, ...args] = Bun.argv.slice(2);
  const manifest = option(args, 'manifest', false) ?? DEFAULT_MANIFEST;
  const targetName = option(args, 'target')!;
  if (command === 'build') return runReleaseBuild(targetName, manifest);
  if (command === 'test') {
    console.info(await runReleaseTest(targetName, manifest));
    return;
  }
  if (command === 'pack') {
    console.info(await runReleasePack(targetName, manifest));
    return;
  }
  if (command === 'gate') {
    const receipt = await runReleaseGate({
      manifest,
      target: targetName,
      channel: option(args, 'channel')!,
      junit: option(args, 'junit', false),
      tarball: option(args, 'tarball', false),
      receipt: option(args, 'receipt', false),
    });
    console.info(JSON.stringify(receipt, null, 2)); // console-ok — explicit machine receipt
    return;
  }
  if (command === 'publish') {
    const root = await repositoryRoot(process.cwd());
    assertPublicationRouteEnabled(
      await loadTarget(root, manifest, targetName),
      option(args, 'route')!
    );
  }
  throw new Error('usage: release-artifact.ts <build|test|pack|gate|publish> --target=<name>');
}

if (import.meta.main) {
  try {
    await main();
  } catch (error) {
    console.error(`release-artifact: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}
