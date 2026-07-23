// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
/**
 * Registry health report — env probe + index stats + last integrity snapshot.
 */

import { joinPath } from '../path-bun';
import { type RegistryClient } from './registry';
import { type IntegrityReport } from './integrity';

export type RegistryHealthReport = {
  status: 'ok' | 'degraded' | 'error';
  uptimeSec: number;
  env: Awaited<ReturnType<RegistryClient['checkEnv']>>;
  indexAvailable: boolean;
  packages: number;
  versions: number;
  lastIntegrity?: IntegrityReport;
  publicUrl?: string;
  error?: string;
};

export type RegistryPublicHealthReport = {
  status: RegistryHealthReport['status'];
  uptimeSec: number;
  indexAvailable: boolean;
  packages: number;
  versions: number;
  integrity?: {
    checkedAt: string;
    total: number;
    ok: number;
    failures: number;
  };
};

const INTEGRITY_REPORT = joinPath(import.meta.dir, '../../reports/registry-integrity.json');

async function readLastIntegrity(): Promise<IntegrityReport | undefined> {
  const file = Bun.file(INTEGRITY_REPORT);
  if (!(await file.exists())) return undefined;
  try {
    const parsed = (await file.json()) as IntegrityReport;
    return parsed;
  } catch {
    return undefined;
  }
}

/** Build a production health payload suitable for `/health` JSON responses. */
export async function buildRegistryHealthReport(
  client: RegistryClient
): Promise<RegistryHealthReport> {
  const env = await client.checkEnv();
  let indexAvailable = false;
  let packages = 0;
  let versions = 0;
  let error: string | undefined;

  try {
    const { index } = await client.fetchIndex({ required: true });
    indexAvailable = true;
    packages = Object.keys(index.packages).length;
    for (const pkg of Object.values(index.packages)) {
      versions += pkg.versions.length;
    }
  } catch (cause) {
    error = cause instanceof Error ? cause.message : String(cause);
  }

  const lastIntegrity = await readLastIntegrity();
  const publicUrl = Bun.env.REGISTRY_PUBLIC_URL?.trim() || undefined;

  let status: RegistryHealthReport['status'] = 'ok';
  if (!env.ok || !indexAvailable) status = 'error';
  else if (lastIntegrity && lastIntegrity.failures.length > 0) status = 'degraded';

  return {
    status,
    uptimeSec: process.uptime(),
    env,
    indexAvailable,
    packages,
    versions,
    lastIntegrity,
    publicUrl,
    error,
  };
}

/** Remove storage configuration and failure details from an HTTP health payload. */
export function publicRegistryHealthReport(
  report: RegistryHealthReport
): RegistryPublicHealthReport {
  const integrity = report.lastIntegrity
    ? {
        checkedAt: report.lastIntegrity.checkedAt,
        total: report.lastIntegrity.total,
        ok: report.lastIntegrity.ok,
        failures: report.lastIntegrity.failures.length,
      }
    : undefined;
  return {
    status: report.status,
    uptimeSec: report.uptimeSec,
    indexAvailable: report.indexAvailable,
    packages: report.packages,
    versions: report.versions,
    integrity,
  };
}

export function healthHttpStatus(report: RegistryHealthReport): number {
  if (report.status === 'error') return 503;
  if (report.status === 'degraded') return 200;
  return 200;
}
