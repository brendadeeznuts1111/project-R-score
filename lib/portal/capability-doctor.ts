// @see https://bun.com/reference/bun/semver/satisfies — Bun.semver.satisfies
// @see https://bun.com/docs/runtime/child-process#spawn-a-process-bun-spawn — Bun.spawn
// @see https://bun.com/docs/runtime/semver#bun-semver-satisfies-version-string-range-string-boolean — Bun.semver.satisfies
// @see https://bun.com/docs/runtime/utils#bun-version — Bun.version
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/utils#bun-inspect-table-tabulardata-properties-options — Bun.inspect.table
// @see https://bun.com/docs/runtime/utils#bun-stringwidth — Bun.stringWidth
// @see https://bun.com/docs/runtime/utils#bun-stripansi — Bun.stripANSI
// @see https://bun.com/docs/runtime/utils#bun-wrapansi — Bun.wrapAnsi
// @see https://bun.com/docs/runtime/utils#bun-nanoseconds — Bun.nanoseconds
// @see https://bun.com/docs/runtime/utils#bun-fileurltopath — Bun.fileURLToPath
/**
 * Capability doctor — machine readiness vs baked minBun / minPassCli.
 *
 * Reads public/registry/capability-map-subset.json (bake SSOT) and checks
 * whether this runtime can satisfy every structured version floor.
 *
 *   portal-cli capabilities doctor
 *   bun run capabilities:doctor
 *
 * Grounded on Bun.semver + Bun.version (+ optional pass-cli --version).
 * Human output uses Bun.inspect.table · stringWidth · stripANSI · wrapAnsi.
 * No invented flags.
 */
import { cliTone, columnTable, frameBlock, kvLines, msFromNs } from './cli-chrome.ts';
import {
  CAPABILITY_MAP_SUBSET_REL,
  type CapabilityMapRow,
  type CapabilityMapSubset,
} from './capability-map-subset.ts';

export const CAPABILITY_DOCTOR_KIND = 'capability-doctor' as const;

export type CapabilityDoctorFail = {
  id: string; // brand-ok — capability row slug from bake, not domain *Id
  capability: string;
  field: 'minBun' | 'minPassCli';
  required: string;
  actual: string;
  range: string;
};

export type CapabilityDoctorReport = {
  kind: typeof CAPABILITY_DOCTOR_KIND;
  generatedAt: string;
  source: string;
  schemaVersion: number;
  rowCount: number;
  bunVersion: string;
  passCliVersion: string | null;
  passCliAvailable: boolean;
  /** All minBun rows satisfy Bun.version. */
  bunOk: boolean;
  /** All minPassCli rows satisfy pass-cli version; null if pass-cli missing and no minPassCli rows. */
  passCliOk: boolean | null;
  ok: boolean;
  checked: {
    minBunRows: number;
    minPassCliRows: number;
  };
  failing: CapabilityDoctorFail[];
  summary: {
    protocolCounts: Record<string, number>;
  };
};

/** True if `version` satisfies `>=min` (Bun.semver). */
export function satisfiesMin(version: string, min: string): boolean {
  const range = `>=${min}`;
  try {
    return Bun.semver.satisfies(version, range);
  } catch {
    return false;
  }
}

/**
 * Parse pass-cli version strings like "pass-cli 2.2.0" or "2.2.0".
 */
export function parsePassCliVersion(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  const m = t.match(/(\d+\.\d+\.\d+(?:-[^\s]+)?)/);
  return m?.[1] ?? null;
}

export function doctorFromSubset(
  subset: CapabilityMapSubset,
  opts: {
    bunVersion?: string;
    passCliVersion?: string | null;
    passCliAvailable?: boolean;
    /** When true, skip minPassCli floors (CI without pass-cli). */
    bunOnly?: boolean;
    generatedAt?: string;
  } = {}
): CapabilityDoctorReport {
  const bunVersion = opts.bunVersion ?? Bun.version;
  const passCliVersion = opts.passCliVersion ?? null;
  const passCliAvailable = opts.passCliAvailable ?? passCliVersion != null;
  const bunOnly = opts.bunOnly ?? false;
  const generatedAt = opts.generatedAt ?? new Date().toISOString();

  const failing: CapabilityDoctorFail[] = [];
  let minBunRows = 0;
  let minPassCliRows = 0;

  for (const row of subset.rows as CapabilityMapRow[]) {
    if (row.minBun) {
      minBunRows++;
      const range = `>=${row.minBun}`;
      if (!satisfiesMin(bunVersion, row.minBun)) {
        failing.push({
          id: row.id ?? slugFallback(row.capability),
          capability: row.capability,
          field: 'minBun',
          required: row.minBun,
          actual: bunVersion,
          range,
        });
      }
    }
    if (!bunOnly && row.minPassCli) {
      minPassCliRows++;
      if (!passCliAvailable || !passCliVersion) {
        failing.push({
          id: row.id ?? slugFallback(row.capability),
          capability: row.capability,
          field: 'minPassCli',
          required: row.minPassCli,
          actual: passCliAvailable ? '(unknown version)' : '(pass-cli not found)',
          range: `>=${row.minPassCli}`,
        });
      } else if (!satisfiesMin(passCliVersion, row.minPassCli)) {
        failing.push({
          id: row.id ?? slugFallback(row.capability),
          capability: row.capability,
          field: 'minPassCli',
          required: row.minPassCli,
          actual: passCliVersion,
          range: `>=${row.minPassCli}`,
        });
      }
    }
  }

  const bunOk = !failing.some(f => f.field === 'minBun');
  const passFails = failing.filter(f => f.field === 'minPassCli');
  const passCliOk = minPassCliRows === 0 ? null : passFails.length === 0;

  return {
    kind: CAPABILITY_DOCTOR_KIND,
    generatedAt,
    source: CAPABILITY_MAP_SUBSET_REL,
    schemaVersion: subset.schemaVersion,
    rowCount: subset.rowCount,
    bunVersion,
    passCliVersion,
    passCliAvailable,
    bunOk,
    passCliOk,
    ok: bunOk && (passCliOk === null || passCliOk),
    checked: { minBunRows, minPassCliRows },
    failing,
    summary: {
      protocolCounts: subset.summary?.protocolCounts ?? {},
    },
  };
}

function slugFallback(capability: string): string {
  return capability
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Load baked subset from repo root (or absolute path). */
export async function loadCapabilitySubset(rootOrFile: string): Promise<CapabilityMapSubset> {
  const path = rootOrFile.endsWith('.json')
    ? rootOrFile
    : `${rootOrFile.replace(/\/$/, '')}/${CAPABILITY_MAP_SUBSET_REL}`;
  const f = Bun.file(path);
  if (!(await f.exists())) {
    throw new Error(`missing ${path} — run: bun run bake:capabilities`);
  }
  return (await f.json()) as CapabilityMapSubset;
}

/**
 * Probe pass-cli version via `pass-cli --version` (real binary only).
 * Returns null when not installed or unparseable.
 */
export async function probePassCliVersion(): Promise<{
  available: boolean;
  version: string | null;
  which: string | null;
}> {
  const which = Bun.which('pass-cli');
  if (!which) return { available: false, version: null, which: null };
  try {
    const proc = Bun.spawn(['pass-cli', '--version'], {
      stdout: 'pipe',
      stderr: 'pipe',
    });
    const [stdout, code] = await Promise.all([new Response(proc.stdout).text(), proc.exited]);
    if (code !== 0) {
      // some builds print on stderr
      const err = await new Response(proc.stderr).text();
      const v = parsePassCliVersion(stdout + '\n' + err);
      return { available: true, version: v, which };
    }
    return { available: true, version: parsePassCliVersion(stdout), which };
  } catch {
    return { available: true, version: null, which };
  }
}

export async function runCapabilityDoctor(
  root: string,
  opts: { generatedAt?: string; bunOnly?: boolean } = {}
): Promise<CapabilityDoctorReport> {
  const subset = await loadCapabilitySubset(root);
  const bunOnly = opts.bunOnly ?? false;
  const pass = bunOnly
    ? { available: false, version: null as string | null, which: null as string | null }
    : await probePassCliVersion();
  return doctorFromSubset(subset, {
    bunVersion: Bun.version,
    passCliVersion: pass.version,
    passCliAvailable: pass.available,
    bunOnly,
    generatedAt: opts.generatedAt ?? new Date().toISOString(),
  });
}

/**
 * Human-readable doctor report — framed + aligned (Bun.color · stringWidth · inspect.table).
 * @see https://bun.com/docs/runtime/utils#bun-inspect-table-tabulardata-properties-options
 */
export function formatCapabilityDoctorHuman(
  report: CapabilityDoctorReport,
  opts: { columns?: number; elapsedNs?: number } = {}
): string {
  const columns =
    opts.columns ?? (typeof process !== 'undefined' ? process.stdout?.columns : undefined) ?? 72;

  const proto = Object.entries(report.summary.protocolCounts)
    .map(([k, v]) => `${k}=${v}`)
    .join('  ');

  const pairs: Array<[string, string]> = [
    ['bun', report.bunVersion],
    ['pass-cli', report.passCliVersion ?? (report.passCliAvailable ? '(unknown)' : 'not found')],
    [
      'floors',
      `minBun ${report.checked.minBunRows}  ·  minPassCli ${report.checked.minPassCliRows}  ·  rows ${report.rowCount}`,
    ],
    ['protocols', proto || '—'],
  ];
  if (opts.elapsedNs != null && Number.isFinite(opts.elapsedNs)) {
    pairs.push(['elapsed', msFromNs(opts.elapsedNs)]);
  }
  const body: string[] = [...kvLines(pairs)];

  if (report.failing.length) {
    body.push('');
    body.push(cliTone.fail(`${report.failing.length} version floor(s) not met`));
    // Column layout via Bun.stringWidth (not String.length / inspect.table).
    body.push(
      ...columnTable(
        ['capability', 'field', 'need', 'have'],
        report.failing.slice(0, 12).map(f => [f.capability, f.field, f.range, f.actual]),
        { maxWidths: [28, 12, 12, 16], gap: 2 }
      )
    );
    if (report.failing.length > 12) {
      body.push(cliTone.dim(`… +${report.failing.length - 12} more`));
    }
    body.push('');
    body.push(
      cliTone.dim('fix: upgrade Bun / pass-cli, or bake:capabilities:update after AGENTS edits')
    );
  } else {
    body.push('');
    body.push(cliTone.ok('all structured version floors satisfied'));
  }

  return frameBlock('capability doctor', report.ok ? 'OK' : 'FAIL', body, {
    width: Math.min(columns, 88),
    ok: report.ok,
  });
}

/**
 * Resolve this module's absolute path via file:// URL (Bun.fileURLToPath).
 * Useful when tools need the doctor module path without path-bun join.
 */
export function capabilityDoctorModulePath(metaUrl: string = import.meta.url): string {
  return Bun.fileURLToPath(metaUrl);
}
