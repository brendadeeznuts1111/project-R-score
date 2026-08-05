#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/cron#bun-cron-path-schedule-title-os-level
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write
/** OS-persistent worker for the read-only Bun channel doctor. */
// Bun 1.3 has no native rename primitive; its fs compatibility API provides
// the atomic sibling-file replacement while Bun.write handles content I/O.
// eslint-disable-next-line no-restricted-imports
import { rename } from 'node:fs/promises';
import { joinPath, normalizePath } from '../lib/path-bun.ts';
import {
  loadBunChannelConfig,
  runBunChannelDoctor,
  type BunChannelConfig,
  type BunChannelDoctorReport,
} from '../lib/verification/bun-channel-doctor.ts';

export const BUN_CHANNEL_DOCTOR_ROOT = joinPath(import.meta.dir, '..');

export type BunChannelDoctorWorkerDependencies = {
  loadConfig: (root?: string) => Promise<BunChannelConfig>;
  runDoctor: (options?: {
    root?: string;
    config?: BunChannelConfig;
  }) => Promise<BunChannelDoctorReport>;
  persistReport: (report: BunChannelDoctorReport, path: string) => Promise<void>;
};

const DEFAULT_DEPENDENCIES: BunChannelDoctorWorkerDependencies = {
  loadConfig: loadBunChannelConfig,
  runDoctor: runBunChannelDoctor,
  persistReport: writeBunChannelStatus,
};

export function resolveBunChannelArtifactPath(root: string, artifact: string): string {
  if (artifact.startsWith('/')) {
    throw new Error('bun channel artifact must be a root-relative path');
  }
  const normalizedRoot = normalizePath(root);
  const target = joinPath(normalizedRoot, artifact);
  if (target !== normalizedRoot && !target.startsWith(`${normalizedRoot}/`)) {
    throw new Error('bun channel artifact must remain inside the repository root');
  }
  return target;
}

/** Persist one complete report with a sibling temp file + atomic rename. */
export async function writeBunChannelStatus(
  report: BunChannelDoctorReport,
  path: string
): Promise<void> {
  const temporaryPath = `${path}.${process.pid}.${crypto.randomUUID()}.tmp`;
  try {
    await Bun.write(temporaryPath, `${JSON.stringify(report, null, 2)}\n`);
    await rename(temporaryPath, path);
  } finally {
    if (await Bun.file(temporaryPath).exists()) await Bun.file(temporaryPath).delete();
  }
}

export async function runBunChannelDoctorWorker(
  options: {
    root?: string;
    dependencies?: BunChannelDoctorWorkerDependencies;
  } = {}
): Promise<BunChannelDoctorReport> {
  const root = options.root ?? BUN_CHANNEL_DOCTOR_ROOT;
  const dependencies = options.dependencies ?? DEFAULT_DEPENDENCIES;
  const config = await dependencies.loadConfig(root);
  const report = await dependencies.runDoctor({ root, config });
  const artifactPath = resolveBunChannelArtifactPath(root, config.monitor.artifact);
  await dependencies.persistReport(report, artifactPath);
  return report;
}

export default {
  async scheduled(_controller: Bun.CronController) {
    const report = await runBunChannelDoctorWorker();
    console.info(
      `Bun channel doctor: ${report.summary.status} ` +
        `(actionable=${report.summary.actionable}, sourceErrors=${report.summary.sourceErrors})`
    );
    if (report.summary.exitCode !== 0) {
      throw new Error(
        `Bun channel doctor exited ${report.summary.exitCode}: ${report.summary.reason}`
      );
    }
  },
};
