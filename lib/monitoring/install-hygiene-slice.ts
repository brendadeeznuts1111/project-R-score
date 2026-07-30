// @see https://bun.com/docs/runtime/bun-apis — Bun.mmap
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
/**
 * Install-hygiene audit report → monitoring / portal slice.
 *
 * Baked artifact: public/registry/install-hygiene-report.json
 * (`bun run bake:install-hygiene` · `bun run ops:snapshot`).
 *
 * @see scripts/bake-install-hygiene-report.ts
 * @see docs/UNIFIED.md
 */

export const INSTALL_HYGIENE_REGISTRY_REL = 'public/registry/install-hygiene-report.json';
export const INSTALL_HYGIENE_BOARD_PATH = '/registry/install-hygiene-report.json' as const;
export const INSTALL_HYGIENE_PORTAL_PATH = '/portal/install-hygiene/' as const;

export type InstallHygieneMonitoringSlice = {
  available: boolean;
  ok: boolean;
  /** Install-cache slice availability from the report. */
  cacheAvailable: boolean | null;
  /** True when the cache is over its prune threshold. */
  cacheWouldPrune: boolean | null;
  /** True when no npm/yarn/pnpm install commands were found in production paths. */
  npmInstallOk: boolean | null;
  /** Count of npm-install violations (0 when clean). */
  npmInstallViolations: number | null;
  /** True when `bun run install:verify --dry-run` passes. */
  installVerifyOk: boolean | null;
  /** Number of failed install:verify checks. */
  installVerifyFailed: number | null;
  generatedAt: string | null;
  path: typeof INSTALL_HYGIENE_BOARD_PATH;
  portal: typeof INSTALL_HYGIENE_PORTAL_PATH;
};

/** Alias for ops-summary / diagnose consumers. */
export type InstallHygieneSummarySlice = InstallHygieneMonitoringSlice;

export type InstallHygieneReport = {
  schemaVersion?: number;
  generatedAt?: string;
  ok?: boolean;
  installCache?: {
    available?: boolean;
    wouldPrune?: boolean;
  };
  npmInstall?: {
    ok?: boolean;
    violations?: unknown[];
  };
  installVerify?: {
    ok?: boolean;
    failed?: number;
  };
};

function emptyUnavailable(): InstallHygieneMonitoringSlice {
  return {
    available: false,
    ok: false,
    cacheAvailable: null,
    cacheWouldPrune: null,
    npmInstallOk: null,
    npmInstallViolations: null,
    installVerifyOk: null,
    installVerifyFailed: null,
    generatedAt: null,
    path: INSTALL_HYGIENE_BOARD_PATH,
    portal: INSTALL_HYGIENE_PORTAL_PATH,
  };
}

function projectReport(raw: InstallHygieneReport): InstallHygieneMonitoringSlice {
  if (raw.schemaVersion !== 1) return emptyUnavailable();
  const cacheAvailable = raw.installCache?.available ?? null;
  const cacheWouldPrune = raw.installCache?.wouldPrune ?? null;
  const npmInstallOk = raw.npmInstall?.ok ?? null;
  const npmInstallViolations = Array.isArray(raw.npmInstall?.violations)
    ? raw.npmInstall.violations.length
    : null;
  const installVerifyOk = raw.installVerify?.ok ?? null;
  const installVerifyFailed =
    typeof raw.installVerify?.failed === 'number' ? raw.installVerify.failed : null;

  const ok = Boolean(
    raw.ok && cacheWouldPrune !== true && npmInstallOk !== false && installVerifyOk !== false
  );

  return {
    available: true,
    ok,
    cacheAvailable,
    cacheWouldPrune,
    npmInstallOk,
    npmInstallViolations,
    installVerifyOk,
    installVerifyFailed,
    generatedAt: raw.generatedAt ?? null,
    path: INSTALL_HYGIENE_BOARD_PATH,
    portal: INSTALL_HYGIENE_PORTAL_PATH,
  };
}

/**
 * Async load for monitoring collect / bake inject.
 * Returns `null` when the report is missing (optional plane).
 */
export async function loadInstallHygieneMonitoringSlice(
  reportPath: string = INSTALL_HYGIENE_REGISTRY_REL
): Promise<InstallHygieneMonitoringSlice | null> {
  try {
    const f = Bun.file(reportPath);
    if (!(await f.exists())) return null;
    const report = (await f.json()) as InstallHygieneReport;
    return projectReport(report);
  } catch {
    return null;
  }
}

/** Sync load for diagnose / tools (Bun.mmap). */
export function loadInstallHygieneSummarySliceSync(
  reportPath: string = INSTALL_HYGIENE_REGISTRY_REL
): InstallHygieneSummarySlice {
  try {
    const mapped = Bun.mmap(reportPath);
    const report = JSON.parse(new TextDecoder().decode(mapped)) as InstallHygieneReport;
    return projectReport(report);
  } catch {
    return emptyUnavailable();
  }
}

export const loadInstallHygieneSummarySlice = loadInstallHygieneSummarySliceSync;
