#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/utils#bun-deepequals — Bun.deepEquals
/**
 * Bake portal doctor state → public/registry/doctor-state.json
 *
 *   bun run bake:doctor
 *   bun run bake:doctor --check   # drift vs on-disk bake (stable payload)
 *   bun tools/bake-doctor.ts --full   # include spawn gates
 *
 * Consumed by /portal/doctor/ board and command-centre widget.
 */
import { joinPath } from '../scripts/lib/fs-bun.ts';
import {
  runPortalDoctor,
  type PortalDoctorOpts,
  type PortalDoctorReport,
} from './lib/portal-cli-doctor.ts';

export const DOCTOR_STATE_REL = 'public/registry/doctor-state.json';
export const DOCTOR_STATE_KIND = 'portal-doctor-state' as const;

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
  /** Compact check rows for widgets (no long docs). */
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
};

export function toneFromReport(r: PortalDoctorReport): DoctorStateTone {
  if (r.summary.failedFatal > 0) return 'red';
  if (r.summary.failedWarn > 0 || r.summary.failed > 0) return 'yellow';
  return r.ok ? 'green' : 'yellow';
}

export function toDoctorState(r: PortalDoctorReport): DoctorState {
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
  return {
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
}

/**
 * Strip volatile fields for bake drift comparison.
 * Omits generatedAt and check messages (age labels change every run).
 */
export function stableDoctorState(state: DoctorState): {
  kind: DoctorState['kind'];
  schemaVersion: DoctorState['schemaVersion'];
  ok: boolean;
  tone: DoctorStateTone;
  full: boolean;
  summary: DoctorState['summary'];
  byGroup: DoctorState['byGroup'];
  checks: Array<{
    id: string /* brand-ok — opaque doctor check key */;
    group: string;
    level: string;
    ok: boolean;
  }>;
  cli: string;
  board: string;
  href: string;
} {
  return {
    kind: state.kind,
    schemaVersion: state.schemaVersion,
    ok: state.ok,
    tone: state.tone,
    full: state.full,
    summary: state.summary,
    byGroup: state.byGroup,
    checks: state.checks.map(c => ({
      id: c.id, // brand-ok — opaque doctor check key
      group: c.group,
      level: c.level,
      ok: c.ok,
    })),
    cli: state.cli,
    board: state.board,
    href: state.href,
  };
}

export function doctorStatesDeepEqual(a: DoctorState, b: DoctorState): boolean {
  return Bun.deepEquals(stableDoctorState(a), stableDoctorState(b), true);
}

/** Run doctor and write public/registry/doctor-state.json. */
export async function bakeDoctorState(
  opts: PortalDoctorOpts = {}
): Promise<{ state: DoctorState; path: string; report: PortalDoctorReport }> {
  const report = await runPortalDoctor(opts);
  const state = toDoctorState(report);
  const path = joinPath(opts.cwd ?? process.cwd(), DOCTOR_STATE_REL);
  await Bun.write(path, `${JSON.stringify(state, null, 2)}\n`);
  return { state, path, report };
}

/**
 * Compare freshly computed state to on-disk bake (no write).
 * Returns ok=true when stable payload matches.
 */
export async function checkDoctorState(opts: PortalDoctorOpts = {}): Promise<{
  ok: boolean;
  path: string;
  present: boolean;
  fresh: DoctorState;
  onDisk: DoctorState | null;
  reason?: string;
}> {
  const cwd = opts.cwd ?? process.cwd();
  const path = joinPath(cwd, DOCTOR_STATE_REL);
  const report = await runPortalDoctor(opts);
  const fresh = toDoctorState(report);
  const file = Bun.file(path);
  if (!(await file.exists())) {
    return {
      ok: false,
      path,
      present: false,
      fresh,
      onDisk: null,
      reason: 'missing doctor-state.json — run bake:doctor',
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
        reason: `unexpected kind ${String(onDisk.kind)}`,
      };
    }
    const equal = doctorStatesDeepEqual(fresh, onDisk);
    return {
      ok: equal,
      path,
      present: true,
      fresh,
      onDisk,
      reason: equal ? undefined : 'stable doctor-state drift (tone/summary/checks/byGroup)',
    };
  } catch (e) {
    return {
      ok: false,
      path,
      present: true,
      fresh,
      onDisk: null,
      reason: e instanceof Error ? e.message : String(e),
    };
  }
}

if (import.meta.main) {
  const full = Bun.argv.includes('--full');
  const check = Bun.argv.includes('--check');
  if (check) {
    const result = await checkDoctorState({ full });
    if (!result.ok) {
      console.error(`doctor-state check FAIL · ${result.reason ?? 'drift'} · path=${result.path}`);
      console.error(
        `  fresh tone=${result.fresh.tone} · ${result.fresh.summary.passed}/${result.fresh.summary.checkCount} passed`
      );
      process.exit(1);
    }
    console.log(
      `doctor-state check OK · tone=${result.fresh.tone} · ${result.fresh.summary.passed}/${result.fresh.summary.checkCount} passed · path=${result.path}`
    );
    process.exit(0);
  }
  const { state, path } = await bakeDoctorState({ full });
  console.log(
    `doctor-state: wrote ${path} · tone=${state.tone} · ${state.summary.passed}/${state.summary.checkCount} passed · fatalFailed=${state.summary.failedFatal}`
  );
  process.exit(state.ok ? 0 : 1);
}
