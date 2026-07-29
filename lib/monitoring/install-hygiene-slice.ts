// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/bun-apis — Bun.mmap
/**
 * Fail-closed install-hygiene registry projection for monitoring and ops.
 *
 * Cache pressure/path drift are warnings. npm-install policy violations,
 * install:verify failures, malformed wire data, and stale reports are errors.
 */

export const INSTALL_HYGIENE_REGISTRY_REL = 'public/registry/install-hygiene-report.json';
export const INSTALL_HYGIENE_BOARD_PATH = '/registry/install-hygiene-report.json' as const;
export const INSTALL_HYGIENE_PORTAL_PATH = '/portal/install-hygiene/' as const;
export const INSTALL_HYGIENE_STALE_AFTER_MS = 7 * 24 * 60 * 60 * 1000;

export type InstallHygieneMonitoringSlice = {
  available: boolean;
  ok: boolean;
  warnings: number;
  errors: number;
  stale: boolean;
  reportOk?: boolean;
  cacheAvailable?: boolean;
  cacheWouldPrune?: boolean;
  cachePathMismatch?: boolean;
  npmInstallOk?: boolean;
  npmInstallViolations?: number;
  installVerifyOk?: boolean;
  installVerifyFailed?: number;
  generatedAt?: string;
  path: typeof INSTALL_HYGIENE_BOARD_PATH;
  portal: typeof INSTALL_HYGIENE_PORTAL_PATH;
};

export type InstallHygieneOpsSlice = Pick<
  InstallHygieneMonitoringSlice,
  'available' | 'ok' | 'warnings' | 'errors' | 'stale' | 'path'
>;

type WireInstallCache = {
  available: boolean;
  sizeBytes: number | null;
  sizeHuman: string | null;
  thresholdBytes: number;
  thresholdHuman: string;
  wouldPrune: boolean;
  pruneReason: string;
  cacheDir: string | null;
  bunPmCachePath: string | null;
  bunPmCacheMismatch: string | null;
  collectedAt: string;
};

type WireInstallHygieneReport = {
  schemaVersion: 1;
  kind: 'install-hygiene';
  generatedAt: string;
  bunVersion: string;
  bunRevision: string;
  installCache: WireInstallCache;
  npmInstall: {
    ok: boolean;
    violations: string[];
    violationCount: number;
    allowedPaths: string[];
  };
  installVerify: {
    ok: boolean;
    failed: number;
    strict: boolean;
    dryRun: boolean;
    checks: Array<{ ok: boolean; label: string; detail?: string }>;
  };
  ok: boolean;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

function isIsoTimestamp(value: unknown): value is string {
  return typeof value === 'string' && Number.isFinite(Date.parse(value));
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(item => typeof item === 'string');
}

function parseInstallCache(value: unknown): WireInstallCache | null {
  if (!isRecord(value)) return null;
  if (typeof value.available !== 'boolean') return null;
  if (!(value.sizeBytes === null || isNonNegativeInteger(value.sizeBytes))) return null;
  if (!isNullableString(value.sizeHuman)) return null;
  if (!isNonNegativeInteger(value.thresholdBytes)) return null;
  if (typeof value.thresholdHuman !== 'string') return null;
  if (typeof value.wouldPrune !== 'boolean') return null;
  if (typeof value.pruneReason !== 'string') return null;
  if (!isNullableString(value.cacheDir)) return null;
  if (!isNullableString(value.bunPmCachePath)) return null;
  if (!isNullableString(value.bunPmCacheMismatch)) return null;
  if (!isIsoTimestamp(value.collectedAt)) return null;
  return value as WireInstallCache;
}

export function parseInstallHygieneReport(value: unknown): WireInstallHygieneReport | null {
  if (!isRecord(value)) return null;
  if (value.schemaVersion !== 1 || value.kind !== 'install-hygiene') return null;
  if (!isIsoTimestamp(value.generatedAt)) return null;
  if (typeof value.bunVersion !== 'string' || typeof value.bunRevision !== 'string') return null;
  const installCache = parseInstallCache(value.installCache);
  if (!installCache) return null;

  if (!isRecord(value.npmInstall)) return null;
  const npmInstall = value.npmInstall;
  if (typeof npmInstall.ok !== 'boolean') return null;
  if (!isStringArray(npmInstall.violations) || !isStringArray(npmInstall.allowedPaths)) return null;
  if (!isNonNegativeInteger(npmInstall.violationCount)) return null;
  if (npmInstall.violationCount !== npmInstall.violations.length) return null;
  if (npmInstall.ok !== (npmInstall.violationCount === 0)) return null;

  if (!isRecord(value.installVerify)) return null;
  const installVerify = value.installVerify;
  if (typeof installVerify.ok !== 'boolean') return null;
  if (!isNonNegativeInteger(installVerify.failed)) return null;
  if (typeof installVerify.strict !== 'boolean' || typeof installVerify.dryRun !== 'boolean') {
    return null;
  }
  if (
    !Array.isArray(installVerify.checks) ||
    !installVerify.checks.every(
      check =>
        isRecord(check) &&
        typeof check.ok === 'boolean' &&
        typeof check.label === 'string' &&
        (check.detail === undefined || typeof check.detail === 'string')
    )
  ) {
    return null;
  }
  if (installVerify.failed !== installVerify.checks.filter(check => !check.ok).length) return null;
  if (installVerify.ok !== (installVerify.failed === 0)) return null;

  if (typeof value.ok !== 'boolean') return null;
  const expectedOk = !installCache.wouldPrune && npmInstall.ok && installVerify.ok;
  if (value.ok !== expectedOk) return null;
  return value as WireInstallHygieneReport;
}

function unavailable(invalid = false): InstallHygieneMonitoringSlice {
  return {
    available: false,
    ok: false,
    warnings: 0,
    errors: invalid ? 1 : 0,
    stale: invalid,
    path: INSTALL_HYGIENE_BOARD_PATH,
    portal: INSTALL_HYGIENE_PORTAL_PATH,
  };
}

export function projectInstallHygieneReport(
  // eslint-disable-next-line harness/no-unknown-function-param -- registry JSON wire boundary
  value: unknown,
  nowMs = Date.now()
): InstallHygieneMonitoringSlice {
  const report = parseInstallHygieneReport(value);
  if (!report) return unavailable(true);
  const stale = nowMs - Date.parse(report.generatedAt) > INSTALL_HYGIENE_STALE_AFTER_MS;
  const warnings =
    Number(!report.installCache.available) +
    Number(report.installCache.wouldPrune) +
    Number(report.installCache.bunPmCacheMismatch !== null);
  const errors = report.npmInstall.violationCount + report.installVerify.failed + Number(stale);

  return {
    available: true,
    ok: errors === 0,
    warnings,
    errors,
    stale,
    reportOk: report.ok,
    cacheAvailable: report.installCache.available,
    cacheWouldPrune: report.installCache.wouldPrune,
    cachePathMismatch: report.installCache.bunPmCacheMismatch !== null,
    npmInstallOk: report.npmInstall.ok,
    npmInstallViolations: report.npmInstall.violationCount,
    installVerifyOk: report.installVerify.ok,
    installVerifyFailed: report.installVerify.failed,
    generatedAt: report.generatedAt,
    path: INSTALL_HYGIENE_BOARD_PATH,
    portal: INSTALL_HYGIENE_PORTAL_PATH,
  };
}

export function toInstallHygieneOpsSlice(
  slice: InstallHygieneMonitoringSlice
): InstallHygieneOpsSlice {
  return {
    available: slice.available,
    ok: slice.ok,
    warnings: slice.warnings,
    errors: slice.errors,
    stale: slice.stale,
    path: slice.path,
  };
}

export async function loadInstallHygieneMonitoringSlice(
  reportPath: string = INSTALL_HYGIENE_REGISTRY_REL
): Promise<InstallHygieneMonitoringSlice | null> {
  try {
    const file = Bun.file(reportPath);
    if (!(await file.exists())) return null;
    return projectInstallHygieneReport(await file.json());
  } catch {
    return unavailable(true);
  }
}

export function loadInstallHygieneSummarySliceSync(
  reportPath: string = INSTALL_HYGIENE_REGISTRY_REL
): InstallHygieneMonitoringSlice {
  try {
    const mapped = Bun.mmap(reportPath);
    return projectInstallHygieneReport(JSON.parse(new TextDecoder().decode(mapped)));
  } catch (error) {
    if (error instanceof SyntaxError) return unavailable(true);
    return unavailable();
  }
}
