#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/hashing#bun-cryptohasher — Bun.CryptoHasher
/**
 * Bake portal doctor state → public/registry/doctor-state.json
 *
 *   bun run bake:doctor
 *   bun run bake:doctor --check   # fingerprint gate (portable groups; offline Access)
 *   bun run bake:doctor:check:report  # check + JSON forensics + GHA summary/annotations
 *   bun tools/bake-doctor.ts --full
 *   bun tools/bake-doctor.ts --check --no-portable  # full-group fingerprint (rare)
 *   bun tools/bake-doctor.ts --check --report
 *
 * Bake/check always skip live Access probes so the artifact is CI-stable.
 * Fingerprint covers portable groups only (linker|bakes|catalog|bunfig) so
 * host-dependent infra ok bits and --full gates do not break CI/laptop compare.
 * Board JSON still lists all checks.
 * Board: /portal/doctor/
 *
 * Check report (when --report, or GITHUB_ACTIONS / GITHUB_STEP_SUMMARY set):
 *   reports/doctor-state-check.json · step summary · ::error title=doctor-state::
 */
import { dirnamePath, ensureDir, joinPath, resolvePath } from '../scripts/lib/fs-bun.ts';
import {
  runPortalDoctor,
  type PortalDoctorOpts,
  type PortalDoctorReport,
} from './lib/portal-cli-doctor.ts';

export const DOCTOR_STATE_REL = 'public/registry/doctor-state.json';
export const DOCTOR_STATE_KIND = 'portal-doctor-state' as const;
/** CI forensics JSON for fingerprint check (gitignored under reports/). */
export const DOCTOR_STATE_CHECK_REPORT_REL = 'reports/doctor-state-check.json';

/**
 * Groups included in doctor-state fingerprint (CI/laptop portable).
 * Excludes `infra` (Access offline/live ok bits) and `gates` (--full spawns).
 * Messages are never fingerprinted; this filters check ok/level membership.
 */
export const PORTABLE_DOCTOR_GROUPS = ['linker', 'bakes', 'catalog', 'bunfig'] as const;
export type PortableDoctorGroup = (typeof PORTABLE_DOCTOR_GROUPS)[number];

export type DoctorStateTone = 'green' | 'yellow' | 'red';

export type DoctorState = {
  kind: typeof DOCTOR_STATE_KIND;
  schemaVersion: 1;
  generatedAt: string;
  ok: boolean;
  tone: DoctorStateTone;
  full: boolean;
  summary: PortalDoctorReport['summary'];
  byGroup: Record<string, { total: number; failed: number; fatalFailed: number }>;
  checks: Array<{
    id: string; // brand-ok — opaque doctor check key (bunfig-machine-ssot, …)
    group: string;
    level: string;
    ok: boolean;
    message: string;
    fixCommand?: string;
    autoFixable?: boolean;
  }>;
  cli: string;
  board: string;
  href: string;
  /** sha256 of stable fingerprint payload (set at bake time). */
  fingerprint?: string;
  /**
   * When true (default bake), fingerprint is over {@link PORTABLE_DOCTOR_GROUPS} only.
   * Board still lists all groups/checks.
   */
  fingerprintPortable?: boolean;
};

export type DoctorStateStable = {
  kind: typeof DOCTOR_STATE_KIND;
  schemaVersion: 1;
  ok: boolean;
  tone: DoctorStateTone;
  full: boolean;
  summary: DoctorState['summary'];
  byGroup: DoctorState['byGroup'];
  checks: Array<{
    id: string; // brand-ok — opaque doctor check key
    group: string;
    level: string;
    ok: boolean;
  }>;
};

export type StableDoctorOpts = {
  /**
   * When true (default), only portable groups enter the fingerprint payload.
   * Set false for rare full-group compare (`--no-portable`).
   */
  portable?: boolean;
};

export function isPortableDoctorGroup(group: string): boolean {
  return (PORTABLE_DOCTOR_GROUPS as readonly string[]).includes(group);
}

export function toneFromReport(r: PortalDoctorReport): DoctorStateTone {
  if (r.summary.failedFatal > 0) return 'red';
  if (r.summary.failedWarn > 0 || r.summary.failed > 0) return 'yellow';
  return r.ok ? 'green' : 'yellow';
}

function toneFromSummary(summary: DoctorState['summary'], ok: boolean): DoctorStateTone {
  if (summary.failedFatal > 0) return 'red';
  if (summary.failedWarn > 0 || summary.failed > 0) return 'yellow';
  return ok ? 'green' : 'yellow';
}

/** Summary counts for fingerprint (no suggested fix strings — host-stable). */
function summaryFromStableChecks(
  checks: Array<{ ok: boolean; level: string }>
): DoctorState['summary'] {
  let fatal = 0;
  let warn = 0;
  let info = 0;
  let failed = 0;
  let failedFatal = 0;
  let failedWarn = 0;
  let passed = 0;
  for (const c of checks) {
    if (c.level === 'fatal') fatal++;
    else if (c.level === 'warn') warn++;
    else info++;
    if (c.ok) {
      passed++;
    } else {
      failed++;
      if (c.level === 'fatal') failedFatal++;
      if (c.level === 'warn') failedWarn++;
    }
  }
  return {
    checkCount: checks.length,
    passed,
    failed,
    fatal,
    warn,
    info,
    failedFatal,
    failedWarn,
    autoFixableFailed: 0,
    suggested: [],
  };
}

function byGroupFromChecks(
  checks: Array<{ group: string; ok: boolean; level: string }>
): DoctorState['byGroup'] {
  const byGroup: DoctorState['byGroup'] = {};
  for (const c of checks) {
    const g = byGroup[c.group] ?? { total: 0, failed: 0, fatalFailed: 0 };
    g.total++;
    if (!c.ok) {
      g.failed++;
      if (c.level === 'fatal') g.fatalFailed++;
    }
    byGroup[c.group] = g;
  }
  const sorted: DoctorState['byGroup'] = {};
  for (const [k, v] of Object.entries(byGroup).sort(([a], [b]) => a.localeCompare(b))) {
    sorted[k] = v;
  }
  return sorted;
}

export function toDoctorState(r: PortalDoctorReport, opts: StableDoctorOpts = {}): DoctorState {
  const portable = opts.portable !== false;
  const byGroup: DoctorState['byGroup'] = {};
  for (const c of r.checks) {
    const g = byGroup[c.group] ?? { total: 0, failed: 0, fatalFailed: 0 };
    g.total++;
    if (!c.ok) {
      g.failed++;
      if (c.level === 'fatal') g.fatalFailed++;
    }
    byGroup[c.group] = g;
  }
  const state: DoctorState = {
    kind: DOCTOR_STATE_KIND,
    schemaVersion: 1,
    generatedAt: r.generatedAt,
    ok: r.ok,
    tone: toneFromReport(r),
    full: r.full,
    summary: r.summary,
    byGroup,
    checks: r.checks.map(c => ({
      id: c.id,
      group: c.group,
      level: c.level,
      ok: c.ok,
      message: c.message,
      fixCommand: c.fixCommand,
      autoFixable: c.autoFixable,
    })),
    cli: 'bun run portal:doctor',
    board: '/portal/doctor/',
    href: '/registry/doctor-state.json',
  };
  state.fingerprintPortable = portable;
  state.fingerprint = doctorStateFingerprint(state, { portable });
  return state;
}

/**
 * Stable payload for CI fingerprint (no timestamps, no free-text messages).
 * Default portable=true: only linker|bakes|catalog|bunfig; recomputes ok/tone/summary/byGroup
 * so infra/gates drift never fails the gate.
 */
export function stableDoctorState(
  state: DoctorState,
  opts: StableDoctorOpts = {}
): DoctorStateStable {
  const portable = opts.portable !== false;

  let checks = state.checks
    .map(c => ({
      id: c.id, // brand-ok — opaque doctor check key
      group: c.group,
      level: c.level,
      ok: c.ok,
    }))
    .sort((a, b) => a.id.localeCompare(b.id));

  if (portable) {
    checks = checks.filter(c => isPortableDoctorGroup(c.group));
    const byGroup = byGroupFromChecks(checks);
    const summary = summaryFromStableChecks(checks);
    const ok = checks.filter(c => c.level === 'fatal').every(c => c.ok);
    const tone = toneFromSummary(summary, ok);
    return {
      kind: state.kind,
      schemaVersion: state.schemaVersion,
      ok,
      tone,
      // Normalize: gates are out of fingerprint scope, so full flag must not drift.
      full: false,
      summary,
      byGroup,
      checks,
    };
  }

  const byGroupEntries = Object.entries(state.byGroup).sort(([a], [b]) => a.localeCompare(b));
  const byGroup: DoctorState['byGroup'] = {};
  for (const [k, v] of byGroupEntries) byGroup[k] = v;
  return {
    kind: state.kind,
    schemaVersion: state.schemaVersion,
    ok: state.ok,
    tone: state.tone,
    full: state.full,
    summary: state.summary,
    byGroup,
    checks,
  };
}

/** Canonical sha256 over stable doctor-state fields (portable by default). */
export function doctorStateFingerprint(state: DoctorState, opts: StableDoctorOpts = {}): string {
  const payload = JSON.stringify(stableDoctorState(state, opts));
  return new Bun.CryptoHasher('sha256').update(payload).digest('hex');
}

/** Field-level drift lines for CI logs (empty when equal). Portable by default. */
export function diffDoctorStates(
  fresh: DoctorState,
  onDisk: DoctorState,
  opts: StableDoctorOpts = {}
): string[] {
  const a = stableDoctorState(fresh, opts);
  const b = stableDoctorState(onDisk, opts);
  const lines: string[] = [];
  if (a.ok !== b.ok) lines.push(`ok: disk=${b.ok} fresh=${a.ok}`);
  if (a.tone !== b.tone) lines.push(`tone: disk=${b.tone} fresh=${a.tone}`);
  if (a.full !== b.full) lines.push(`full: disk=${b.full} fresh=${a.full}`);
  if (a.summary.checkCount !== b.summary.checkCount) {
    lines.push(`summary.checkCount: disk=${b.summary.checkCount} fresh=${a.summary.checkCount}`);
  }
  if (a.summary.passed !== b.summary.passed) {
    lines.push(`summary.passed: disk=${b.summary.passed} fresh=${a.summary.passed}`);
  }
  if (a.summary.failed !== b.summary.failed) {
    lines.push(`summary.failed: disk=${b.summary.failed} fresh=${a.summary.failed}`);
  }
  if (a.summary.failedFatal !== b.summary.failedFatal) {
    lines.push(`summary.failedFatal: disk=${b.summary.failedFatal} fresh=${a.summary.failedFatal}`);
  }
  const aMap = new Map(a.checks.map(c => [c.id, c]));
  const bMap = new Map(b.checks.map(c => [c.id, c]));
  for (const id of new Set([...aMap.keys(), ...bMap.keys()]).values()) {
    const x = aMap.get(id);
    const y = bMap.get(id);
    if (!y) {
      lines.push(`check +${id} (fresh only)`);
      continue;
    }
    if (!x) {
      lines.push(`check -${id} (disk only)`);
      continue;
    }
    if (x.ok !== y.ok || x.level !== y.level || x.group !== y.group) {
      lines.push(
        `check ${id}: disk={ok:${y.ok},level:${y.level},group:${y.group}} fresh={ok:${x.ok},level:${x.level},group:${x.group}}`
      );
    }
  }
  return lines;
}

/** @deprecated use doctorStateFingerprint equality */
export function doctorStatesDeepEqual(a: DoctorState, b: DoctorState): boolean {
  return doctorStateFingerprint(a) === doctorStateFingerprint(b);
}

/** Offline pure opts for bake/check (no live Access). */
function bakeOpts(opts: PortalDoctorOpts = {}): PortalDoctorOpts {
  return {
    ...opts,
    skipLiveAccess: opts.skipLiveAccess ?? true,
  };
}

export type BakeDoctorOpts = PortalDoctorOpts & StableDoctorOpts;

/** Run doctor and write public/registry/doctor-state.json. */
export async function bakeDoctorState(
  opts: BakeDoctorOpts = {}
): Promise<{ state: DoctorState; path: string; report: PortalDoctorReport }> {
  const portable = opts.portable !== false;
  const report = await runPortalDoctor(bakeOpts(opts));
  const state = toDoctorState(report, { portable });
  const path = joinPath(opts.cwd ?? process.cwd(), DOCTOR_STATE_REL);
  await Bun.write(path, `${JSON.stringify(state, null, 2)}\n`);
  return { state, path, report };
}

/** Result of {@link checkDoctorState} (no write). */
export type DoctorStateCheckResult = {
  ok: boolean;
  path: string;
  present: boolean;
  fresh: DoctorState;
  onDisk: DoctorState | null;
  reason?: string;
  fingerprintFresh?: string;
  fingerprintDisk?: string;
  drift?: string[];
  portable?: boolean;
};

/**
 * Portable forensics artifact for CI (`reports/doctor-state-check.json`).
 * No free-text doctor messages — fingerprint + drift only.
 */
export type DoctorStateCheckReport = {
  ok: boolean;
  fingerprintFresh?: string;
  fingerprintDisk?: string;
  drift: string[];
  portable: boolean;
  tone: DoctorStateTone;
  path: string;
  reason?: string;
  present: boolean;
};

export type DoctorStateCheckReportOpts = {
  cwd?: string;
  /** JSON path (default: reports/doctor-state-check.json under cwd). */
  outPath?: string;
  /** Skip GITHUB_STEP_SUMMARY even if env is set. */
  noSummary?: boolean;
  /** Skip JSON forensics file. */
  noJson?: boolean;
  /** Suppress console report path / summary lines. */
  quiet?: boolean;
};

/**
 * Compare freshly computed state to on-disk bake (no write).
 * Uses sha256 fingerprint of stable portable fields — not free-text message equality.
 */
export async function checkDoctorState(opts: BakeDoctorOpts = {}): Promise<DoctorStateCheckResult> {
  const portable = opts.portable !== false;
  const cwd = opts.cwd ?? process.cwd();
  const path = joinPath(cwd, DOCTOR_STATE_REL);
  const report = await runPortalDoctor(bakeOpts(opts));
  const fresh = toDoctorState(report, { portable });
  const fingerprintFresh = doctorStateFingerprint(fresh, { portable });
  const file = Bun.file(path);
  if (!(await file.exists())) {
    return {
      ok: false,
      path,
      present: false,
      fresh,
      onDisk: null,
      fingerprintFresh,
      portable,
      reason: 'missing doctor-state.json — run: bun run bake:doctor',
    };
  }
  try {
    const onDisk = (await file.json()) as DoctorState;
    if (onDisk.kind !== DOCTOR_STATE_KIND) {
      return {
        ok: false,
        path,
        present: true,
        fresh,
        onDisk,
        fingerprintFresh,
        portable,
        reason: `unexpected kind ${String(onDisk.kind)}`,
      };
    }
    const fingerprintDisk = doctorStateFingerprint(onDisk, { portable });
    const drift = diffDoctorStates(fresh, onDisk, { portable });
    const equal = fingerprintFresh === fingerprintDisk && drift.length === 0;
    return {
      ok: equal,
      path,
      present: true,
      fresh,
      onDisk,
      fingerprintFresh,
      fingerprintDisk,
      portable,
      drift: equal ? undefined : drift,
      reason: equal ? undefined : 'doctor-state fingerprint mismatch',
    };
  } catch (e) {
    return {
      ok: false,
      path,
      present: true,
      fresh,
      onDisk: null,
      fingerprintFresh,
      portable,
      reason: e instanceof Error ? e.message : String(e),
    };
  }
}

/** Map check result → portable forensics JSON shape. */
export function toDoctorStateCheckReport(result: DoctorStateCheckResult): DoctorStateCheckReport {
  return {
    ok: result.ok,
    fingerprintFresh: result.fingerprintFresh,
    fingerprintDisk: result.fingerprintDisk,
    drift: result.drift ?? [],
    portable: result.portable !== false,
    tone: result.fresh.tone,
    path: result.path,
    reason: result.reason,
    present: result.present,
  };
}

/**
 * Escape a value for GitHub Actions workflow-command message bodies.
 * @see https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-commands#setting-an-error-message
 */
export function escapeGithubActionsMessage(text: string): string {
  return text.replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
}

/**
 * Concise markdown for GITHUB_STEP_SUMMARY (fingerprint mismatch + drift bullets).
 * Pure — no I/O.
 */
export function formatDoctorStateCheckSummary(report: DoctorStateCheckReport): string {
  const result = report.ok ? 'ok' : 'fail';
  const lines: string[] = [
    '## Doctor-state fingerprint',
    '',
    `| Field | Value |`,
    `| --- | --- |`,
    `| result | \`${result}\` |`,
    `| tone | \`${report.tone}\` |`,
    `| portable | ${report.portable ? 'yes' : 'no'} |`,
    `| present | ${report.present ? 'yes' : 'no'} |`,
    `| path | \`${report.path}\` |`,
  ];
  if (report.fingerprintFresh) {
    lines.push(`| fingerprint_fresh | \`${report.fingerprintFresh}\` |`);
  }
  if (report.fingerprintDisk) {
    lines.push(`| fingerprint_disk | \`${report.fingerprintDisk}\` |`);
  }
  if (report.reason) {
    lines.push(`| reason | ${report.reason} |`);
  }
  lines.push('');

  if (!report.ok) {
    const fresh = report.fingerprintFresh ?? '(none)';
    const disk = report.fingerprintDisk ?? '(none)';
    if (fresh !== disk) {
      lines.push('### Fingerprint mismatch');
      lines.push('');
      lines.push(`- fresh: \`${fresh}\``);
      lines.push(`- disk: \`${disk}\``);
      lines.push('');
    }
  }

  if (report.drift.length > 0) {
    lines.push('### Drift');
    lines.push('');
    for (const d of report.drift) {
      lines.push(`- ${d}`);
    }
    lines.push('');
  } else if (report.ok) {
    lines.push('_No fingerprint drift._');
    lines.push('');
  } else if (report.reason) {
    lines.push(`_${report.reason}_`);
    lines.push('');
  }

  if (!report.ok) {
    lines.push('### Repair');
    lines.push('');
    lines.push('- `bun run bake:doctor`');
    lines.push('- `bun run bake:doctor:check`');
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Pure formatter: one GHA `::error title=doctor-state::` per drift line (or reason).
 * Newlines in drift text are escaped. Empty when check is ok.
 */
export function formatDoctorStateGithubAnnotations(report: DoctorStateCheckReport): string[] {
  if (report.ok) return [];
  const lines: string[] = [];
  const drift = report.drift;
  if (drift.length > 0) {
    for (const d of drift) {
      lines.push(`::error title=doctor-state::${escapeGithubActionsMessage(d)}`);
    }
    return lines;
  }
  // Missing file / bad kind / parse — single error from reason
  const body = report.reason?.trim() || 'doctor-state fingerprint mismatch';
  lines.push(`::error title=doctor-state::${escapeGithubActionsMessage(body)}`);
  return lines;
}

function resolveCheckReportPath(cwd: string, outPath?: string): string {
  const rel = outPath?.trim() || DOCTOR_STATE_CHECK_REPORT_REL;
  return rel.startsWith('/') ? rel : resolvePath(cwd, rel);
}

/**
 * Write forensics JSON + optional GITHUB_STEP_SUMMARY for a check result.
 * Annotations are returned for the caller to print when GITHUB_ACTIONS=true.
 */
export async function writeDoctorStateCheckReport(
  result: DoctorStateCheckResult,
  opts: DoctorStateCheckReportOpts = {}
): Promise<{
  report: DoctorStateCheckReport;
  jsonPath?: string;
  summaryWritten: boolean;
  annotations: string[];
}> {
  const cwd = opts.cwd ?? process.cwd();
  const report = toDoctorStateCheckReport(result);
  let jsonPath: string | undefined;
  let summaryWritten = false;

  if (!opts.noJson) {
    jsonPath = resolveCheckReportPath(cwd, opts.outPath);
    await ensureDir(dirnamePath(jsonPath));
    await Bun.write(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  }

  if (!opts.noSummary) {
    const summaryPath = Bun.env.GITHUB_STEP_SUMMARY;
    if (summaryPath && summaryPath.length > 0) {
      const md = formatDoctorStateCheckSummary(report);
      const existing = (await Bun.file(summaryPath).exists())
        ? await Bun.file(summaryPath).text()
        : '';
      const sep = existing.length > 0 && !existing.endsWith('\n') ? '\n' : '';
      await Bun.write(summaryPath, `${existing}${sep}${md}`);
      summaryWritten = true;
    }
  }

  const annotations = formatDoctorStateGithubAnnotations(report);
  return { report, jsonPath, summaryWritten, annotations };
}

/** True when CI should emit forensics (explicit --report or GHA env). */
export function shouldEmitDoctorStateCheckReport(forceReport: boolean): boolean {
  if (forceReport) return true;
  if (Bun.env.GITHUB_ACTIONS === 'true') return true;
  const summary = Bun.env.GITHUB_STEP_SUMMARY;
  return typeof summary === 'string' && summary.length > 0;
}

if (import.meta.main) {
  const full = Bun.argv.includes('--full');
  const check = Bun.argv.includes('--check');
  // Portable fingerprint is default; --no-portable includes infra|gates in hash.
  const portable = !Bun.argv.includes('--no-portable');
  // Explicit --report, or auto when GITHUB_ACTIONS / GITHUB_STEP_SUMMARY set.
  const forceReport = Bun.argv.includes('--report');
  if (check) {
    const result = await checkDoctorState({ full, portable });
    if (shouldEmitDoctorStateCheckReport(forceReport)) {
      const written = await writeDoctorStateCheckReport(result);
      if (written.jsonPath) {
        console.error(`doctor-state:check  report=${written.jsonPath}`);
      }
      if (written.summaryWritten) {
        console.error('doctor-state:check  GITHUB_STEP_SUMMARY updated');
      }
      if (Bun.env.GITHUB_ACTIONS === 'true') {
        for (const line of written.annotations) {
          // Workflow commands must be on stdout for Actions to parse them.
          console.log(line);
        }
      }
    }
    if (!result.ok) {
      console.error(`doctor-state:check  result=fail`);
      console.error(`  path: ${result.path}`);
      console.error(`  reason: ${result.reason ?? 'drift'}`);
      console.error(`  portable: ${portable}`);
      if (result.fingerprintFresh) console.error(`  fingerprint_fresh: ${result.fingerprintFresh}`);
      if (result.fingerprintDisk) console.error(`  fingerprint_disk:  ${result.fingerprintDisk}`);
      for (const line of result.drift ?? []) {
        console.error(`  drift: ${line}`);
      }
      console.error(`  repair: bun run bake:doctor`);
      process.exit(1);
    }
    console.log(
      [
        'doctor-state:check  result=ok',
        `path=${result.path}`,
        `tone=${result.fresh.tone}`,
        `passed=${result.fresh.summary.passed}/${result.fresh.summary.checkCount}`,
        `portable=${portable}`,
        `fingerprint=${result.fingerprintFresh}`,
      ].join('  ')
    );
    process.exit(0);
  }
  const { state, path } = await bakeDoctorState({ full, portable });
  console.log(
    [
      'doctor-state:bake  result=ok',
      `path=${path}`,
      `tone=${state.tone}`,
      `passed=${state.summary.passed}/${state.summary.checkCount}`,
      `fatal_failed=${state.summary.failedFatal}`,
      `portable=${portable}`,
      `fingerprint=${state.fingerprint}`,
    ].join('  ')
  );
  process.exit(state.ok ? 0 : 1);
}
