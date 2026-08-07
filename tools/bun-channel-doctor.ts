#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write
import { applyUnknownLongOptionGuardFor } from '../lib/docs/ref-id-tool-flags.ts';
/** Read-only Bun channel check with an explicit opt-in status-artifact write. */
import { isModuleEntrypoint } from '../lib/bun-executable.ts';
import { jsonOut } from '../lib/console-depth.ts';
import { joinPath } from '../lib/path-bun.ts';
import {
  loadBunChannelConfig,
  runBunChannelDoctor,
} from '../lib/verification/bun-channel-doctor.ts';
import {
  resolveBunChannelArtifactPath,
  writeBunChannelStatus,
} from './bun-channel-doctor-worker.ts';

export type BunChannelDoctorCliArgs = {
  root: string;
  save: boolean;
  json: boolean;
};

const DEFAULT_ROOT = joinPath(import.meta.dir, '..');

export function parseBunChannelDoctorCliArgs(argv: string[]): BunChannelDoctorCliArgs {
  let root = DEFAULT_ROOT;
  let save = false;
  let json = false;

  for (let index = 0; index < argv.length; index++) {
    const value = argv[index]!;
    if (value === '--root' && argv[index + 1]) root = argv[++index]!;
    else if (value.startsWith('--root=')) root = value.slice('--root='.length);
    else if (value === '--save') save = true;
    else if (value === '--json') json = true;
    else if (value !== '--check') throw new Error(`Unknown Bun channel doctor option: ${value}`);
  }

  return { root, save, json };
}

export async function runBunChannelDoctorCli(args: BunChannelDoctorCliArgs): Promise<number> {
  const config = await loadBunChannelConfig(args.root);
  const report = await runBunChannelDoctor({ root: args.root, config });
  let artifactPath: string | undefined;

  if (args.save) {
    artifactPath = resolveBunChannelArtifactPath(args.root, config.monitor.artifact);
    await writeBunChannelStatus(report, artifactPath);
  }

  if (args.json) {
    jsonOut({ ...report, artifactPath });
  } else {
    console.log(
      `Bun channel doctor: ${report.summary.status} ` +
        `(actionable=${report.summary.actionable}, sourceErrors=${report.summary.sourceErrors}, ` +
        `intentional=${report.summary.intentional}, informational=${report.summary.informational})`
    );
    console.log(
      `  runtime ${report.local.installedVersion} · @types/bun ${report.local.resolvedWrapperVersion ?? 'unresolved'} · ` +
        `bun-types ${report.local.resolvedDefinitionsVersion ?? 'unresolved'}`
    );
    if (artifactPath) console.log(`  wrote ${artifactPath}`);
    for (const item of report.drift) {
      if (item.kind === 'intentional' || item.kind === 'informational') continue;
      console.log(`  ${item.kind}: ${item.code} — ${item.message}`);
    }
  }

  return report.summary.exitCode;
}

async function main(): Promise<void> {
  try {
    process.exitCode = await runBunChannelDoctorCli(
      parseBunChannelDoctorCliArgs(
        applyUnknownLongOptionGuardFor('bun:channel:report', Bun.argv.slice(2))
      )
    );
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 2;
  }
}

if (isModuleEntrypoint(import.meta)) await main();
