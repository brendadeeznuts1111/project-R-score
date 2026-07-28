// @see https://bun.com/docs/test
// @see https://bun.com/docs/runtime/hashing#bun-cryptohasher — Bun.CryptoHasher
/**
 * bake-doctor portable fingerprint — CI/laptop compare ignores infra|gates.
 */
import { describe, expect, test } from 'bun:test';
import {
  DOCTOR_STATE_KIND,
  PORTABLE_DOCTOR_GROUPS,
  diffDoctorStates,
  doctorStateFingerprint,
  isPortableDoctorGroup,
  stableDoctorState,
  type DoctorState,
} from '../tools/bake-doctor.ts';

function baseState(overrides: Partial<DoctorState> = {}): DoctorState {
  const checks: DoctorState['checks'] = [
    {
      id: 'linker-config-version',
      group: 'linker',
      level: 'fatal',
      ok: true,
      message: 'ok',
    },
    {
      id: 'machine-isolated-linker',
      group: 'linker',
      level: 'fatal',
      ok: true,
      message: 'ok',
    },
    {
      id: 'vault-health-bake',
      group: 'bakes',
      level: 'warn',
      ok: true,
      message: 'ok',
    },
    {
      id: 'capability-map-subset',
      group: 'bakes',
      level: 'warn',
      ok: true,
      message: 'ok',
    },
    {
      id: 'bunfig-state-bake',
      group: 'bakes',
      level: 'info',
      ok: true,
      message: 'ok',
    },
    {
      id: 'catalog-json-schema',
      group: 'catalog',
      level: 'fatal',
      ok: true,
      message: 'ok',
    },
    {
      id: 'bunfig-machine-ssot',
      group: 'bunfig',
      level: 'fatal',
      ok: true,
      message: 'machine /Users/alice/.bunfig.toml has keys',
    },
    {
      id: 'bunfig-project-no-machine-keys',
      group: 'bunfig',
      level: 'fatal',
      ok: true,
      message: 'ok',
    },
    {
      id: 'infra-ledger-access',
      group: 'infra',
      level: 'fatal',
      ok: true,
      message: 'offline',
    },
    {
      id: 'infra-portal-access',
      group: 'infra',
      level: 'warn',
      ok: true,
      message: 'offline',
    },
  ];
  const byGroup: DoctorState['byGroup'] = {
    linker: { total: 2, failed: 0, fatalFailed: 0 },
    bakes: { total: 3, failed: 0, fatalFailed: 0 },
    catalog: { total: 1, failed: 0, fatalFailed: 0 },
    bunfig: { total: 2, failed: 0, fatalFailed: 0 },
    infra: { total: 2, failed: 0, fatalFailed: 0 },
  };
  return {
    kind: DOCTOR_STATE_KIND,
    schemaVersion: 1,
    generatedAt: '2026-07-28T00:00:00.000Z',
    ok: true,
    tone: 'green',
    full: false,
    summary: {
      checkCount: checks.length,
      passed: checks.length,
      failed: 0,
      fatal: 5,
      warn: 3,
      info: 1,
      failedFatal: 0,
      failedWarn: 0,
      autoFixableFailed: 0,
      suggested: [],
    },
    byGroup,
    checks,
    cli: 'bun run portal:doctor',
    board: '/portal/doctor/',
    href: '/registry/doctor-state.json',
    ...overrides,
  };
}

describe('bake-doctor portable fingerprint', () => {
  test('PORTABLE_DOCTOR_GROUPS is linker|bakes|catalog|bunfig', () => {
    expect([...PORTABLE_DOCTOR_GROUPS]).toEqual(['linker', 'bakes', 'catalog', 'bunfig']);
    expect(isPortableDoctorGroup('linker')).toBe(true);
    expect(isPortableDoctorGroup('infra')).toBe(false);
    expect(isPortableDoctorGroup('gates')).toBe(false);
  });

  test('stableDoctorState portable excludes infra and gates checks', () => {
    const state = baseState({
      checks: [
        ...baseState().checks,
        {
          id: 'gate-install-verify',
          group: 'gates',
          level: 'fatal',
          ok: false,
          message: 'spawn failed',
        },
      ],
      full: true,
      ok: false,
      tone: 'red',
    });
    const stable = stableDoctorState(state);
    expect(stable.checks.every(c => isPortableDoctorGroup(c.group))).toBe(true);
    expect(stable.checks.some(c => c.group === 'infra')).toBe(false);
    expect(stable.checks.some(c => c.group === 'gates')).toBe(false);
    expect(stable.full).toBe(false);
    expect(stable.byGroup.infra).toBeUndefined();
    expect(stable.byGroup.gates).toBeUndefined();
    expect(Object.keys(stable.byGroup).sort()).toEqual(['bakes', 'bunfig', 'catalog', 'linker']);
  });

  test('two reports with different infra ok → same portable fingerprint', () => {
    const a = baseState();
    const b = baseState({
      generatedAt: '2099-01-01T00:00:00.000Z',
      checks: baseState().checks.map(c =>
        c.group === 'infra'
          ? { ...c, ok: false, message: 'live probe fail on laptop' }
          : { ...c, message: 'host-path noise /Users/bob/.bunfig.toml' }
      ),
      // Full-report summary would fail if infra fatal failed; board may show red.
      ok: false,
      tone: 'red',
      summary: {
        ...baseState().summary,
        failed: 1,
        failedFatal: 1,
        passed: baseState().summary.passed - 1,
      },
      byGroup: {
        ...baseState().byGroup,
        infra: { total: 2, failed: 1, fatalFailed: 1 },
      },
    });
    expect(doctorStateFingerprint(a)).toBe(doctorStateFingerprint(b));
    expect(doctorStateFingerprint(a)).toMatch(/^[0-9a-f]{64}$/);
    expect(diffDoctorStates(a, b)).toEqual([]);
  });

  test('gates differ → same portable fingerprint', () => {
    const a = baseState({ full: false });
    const b = baseState({
      full: true,
      checks: [
        ...baseState().checks,
        {
          id: 'gate-install-verify',
          group: 'gates',
          level: 'fatal',
          ok: false,
          message: 'install:verify failed',
        },
        {
          id: 'gate-vault-health',
          group: 'gates',
          level: 'warn',
          ok: false,
          message: 'vault gate failed',
        },
      ],
      ok: false,
      tone: 'red',
      summary: {
        ...baseState().summary,
        checkCount: baseState().summary.checkCount + 2,
        failed: 2,
        failedFatal: 1,
        failedWarn: 1,
        passed: baseState().summary.passed,
      },
      byGroup: {
        ...baseState().byGroup,
        gates: { total: 2, failed: 2, fatalFailed: 1 },
      },
    });
    expect(doctorStateFingerprint(a)).toBe(doctorStateFingerprint(b));
    expect(diffDoctorStates(a, b)).toEqual([]);
  });

  test('portable check ok drift still fails fingerprint', () => {
    const a = baseState();
    const b = baseState({
      checks: baseState().checks.map(c =>
        c.id === 'linker-config-version' ? { ...c, ok: false } : c
      ),
    });
    expect(doctorStateFingerprint(a)).not.toBe(doctorStateFingerprint(b));
    const drift = diffDoctorStates(a, b);
    expect(drift.some(l => l.includes('linker-config-version'))).toBe(true);
  });

  test('--no-portable includes infra in fingerprint', () => {
    const a = baseState();
    const b = baseState({
      checks: baseState().checks.map(c =>
        c.id === 'infra-ledger-access' ? { ...c, ok: false } : c
      ),
    });
    expect(doctorStateFingerprint(a, { portable: true })).toBe(
      doctorStateFingerprint(b, { portable: true })
    );
    expect(doctorStateFingerprint(a, { portable: false })).not.toBe(
      doctorStateFingerprint(b, { portable: false })
    );
  });

  test('messages and generatedAt never affect fingerprint', () => {
    const a = baseState();
    const b = {
      ...a,
      generatedAt: '1999-01-01T00:00:00.000Z',
      checks: a.checks.map(c => ({ ...c, message: `noise-${c.id}` })),
    };
    expect(doctorStateFingerprint(a)).toBe(doctorStateFingerprint(b));
  });
});
