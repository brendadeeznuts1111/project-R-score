#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/hashing#bun-cryptohasher — Bun.CryptoHasher
/**
 * Bake portal doctor state → public/registry/doctor-state.json
 *
 *   bun run bake:doctor
 *   bun run bake:doctor --check   # fingerprint gate (offline pure checks only)
 *   bun tools/bake-doctor.ts --full
 *
 * Bake/check always skip live Access probes so the artifact is CI-stable.
 * Board: /portal/doctor/
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
  state.fingerprint = doctorStateFingerprint(state);
  return state;
}

/** Stable payload for CI fingerprint (no timestamps, no free-text messages). */
export function stableDoctorState(state: DoctorState): DoctorStateStable {
  const byGroupEntries = Object.entries(state.byGroup).sort(([a], [b]) => a.localeCompare(b));
  const byGroup: DoctorState['byGroup'] = {};
  for (const [k, v] of byGroupEntries) byGroup[k] = v;
  const checks = state.checks
    .map(c => ({
      id: c.id, // brand-ok — opaque doctor check key
      group: c.group,
      level: c.level,
      ok: c.ok,
    }))
    .sort((a, b) => a.id.localeCompare(b.id));
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

/** Canonical sha256 over stable doctor-state fields. */
export function doctorStateFingerprint(state: DoctorState): string {
  const payload = JSON.stringify(stableDoctorState(state));
  return new Bun.CryptoHasher('sha256').update(payload).digest('hex');
}

/** Field-level drift lines for CI logs (empty when equal). */
export function diffDoctorStates(fresh: DoctorState, onDisk: DoctorState): string[] {
  const a = stableDoctorState(fresh);
  const b = stableDoctorState(onDisk);
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

/** Run doctor and write public/registry/doctor-state.json. */
export async function bakeDoctorState(
  opts: PortalDoctorOpts = {}
): Promise<{ state: DoctorState; path: string; report: PortalDoctorReport }> {
  const report = await runPortalDoctor(bakeOpts(opts));
  const state = toDoctorState(report);
  const path = joinPath(opts.cwd ?? process.cwd(), DOCTOR_STATE_REL);
  await Bun.write(path, `${JSON.stringify(state, null, 2)}\n`);
  return { state, path, report };
}

/**
 * Compare freshly computed state to on-disk bake (no write).
 * Uses sha256 fingerprint of stable fields — not free-text message equality.
 */
export async function checkDoctorState(opts: PortalDoctorOpts = {}): Promise<{
  ok: boolean;
  path: string;
  present: boolean;
  fresh: DoctorState;
  onDisk: DoctorState | null;
  reason?: string;
  fingerprintFresh?: string;
  fingerprintDisk?: string;
  drift?: string[];
}> {
  const cwd = opts.cwd ?? process.cwd();
  const path = joinPath(cwd, DOCTOR_STATE_REL);
  const report = await runPortalDoctor(bakeOpts(opts));
  const fresh = toDoctorState(report);
  const fingerprintFresh = doctorStateFingerprint(fresh);
  const file = Bun.file(path);
  if (!(await file.exists())) {
    return {
      ok: false,
      path,
      present: false,
      fresh,
      onDisk: null,
      fingerprintFresh,
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
        reason: `unexpected kind ${String(onDisk.kind)}`,
      };
    }
    const fingerprintDisk = doctorStateFingerprint(onDisk);
    const drift = diffDoctorStates(fresh, onDisk);
    const equal = fingerprintFresh === fingerprintDisk && drift.length === 0;
    return {
      ok: equal,
      path,
      present: true,
      fresh,
      onDisk,
      fingerprintFresh,
      fingerprintDisk,
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
      console.error(`doctor-state:check  result=fail`);
      console.error(`  path: ${result.path}`);
      console.error(`  reason: ${result.reason ?? 'drift'}`);
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
        `fingerprint=${result.fingerprintFresh}`,
      ].join('  ')
    );
    process.exit(0);
  }
  const { state, path } = await bakeDoctorState({ full });
  console.log(
    [
      'doctor-state:bake  result=ok',
      `path=${path}`,
      `tone=${state.tone}`,
      `passed=${state.summary.passed}/${state.summary.checkCount}`,
      `fatal_failed=${state.summary.failedFatal}`,
      `fingerprint=${state.fingerprint}`,
    ].join('  ')
  );
  process.exit(state.ok ? 0 : 1);
}
