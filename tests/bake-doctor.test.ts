// @see https://bun.com/docs/test
// @see https://bun.com/docs/runtime/hashing#bun-cryptohasher — Bun.CryptoHasher
// @see https://bun.com/docs/runtime/utils#bun-deepequals — Bun.deepEquals (stable twin)
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
/**
 * bake-doctor portable fingerprint — CI/laptop compare ignores infra|gates.
 * Check-report helpers: forensics JSON shape · step summary · GHA annotations.
 * Product gate = sha256 fingerprint; Bun.deepEquals is the stable-payload twin for tests.
 */
import { afterAll, describe, expect, test } from 'bun:test';
import { joinPath, resolvePath } from '../scripts/lib/fs-bun.ts';
import {
  DOCTOR_STATE_CHECK_REPORT_REL,
  DOCTOR_STATE_KIND,
  PORTABLE_DOCTOR_GROUPS,
  diffDoctorStates,
  doctorStateFingerprint,
  doctorStatesFingerprintAgree,
  doctorStatesStableEqual,
  escapeGithubActionsMessage,
  formatDoctorStateCheckSummary,
  formatDoctorStateGithubAnnotations,
  isPortableDoctorGroup,
  shouldEmitDoctorStateCheckReport,
  stableDoctorState,
  toDoctorStateCheckReport,
  writeDoctorStateCheckReport,
  type DoctorState,
  type DoctorStateCheckReport,
  type DoctorStateCheckResult,
} from '../tools/bake-doctor.ts';

const ROOT = resolvePath(import.meta.dir, '..');
const TMP = joinPath(ROOT, 'tmp/bake-doctor-report-test');

afterAll(async () => {
  await Bun.$`rm -rf ${TMP}`.quiet().nothrow();
});

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

  test('deepEquals stable twin agrees with fingerprint (portable)', () => {
    const a = baseState();
    const b = baseState({
      generatedAt: '1999-01-01T00:00:00.000Z',
      checks: baseState().checks.map(c =>
        c.group === 'infra'
          ? { ...c, ok: false, message: 'infra noise' }
          : { ...c, message: 'host path /Users/other/.bunfig.toml' }
      ),
    });
    expect(doctorStatesStableEqual(a, b)).toBe(true);
    expect(doctorStateFingerprint(a)).toBe(doctorStateFingerprint(b));
    expect(doctorStatesFingerprintAgree(a, b)).toBe(true);

    const drifted = baseState({
      checks: baseState().checks.map(c =>
        c.id === 'catalog-json-schema' ? { ...c, ok: false } : c
      ),
    });
    expect(doctorStatesStableEqual(a, drifted)).toBe(false);
    expect(doctorStateFingerprint(a)).not.toBe(doctorStateFingerprint(drifted));
    expect(doctorStatesFingerprintAgree(a, drifted)).toBe(false);
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

function failCheckResult(overrides: Partial<DoctorStateCheckResult> = {}): DoctorStateCheckResult {
  const fresh = baseState();
  const drift = [
    'ok: disk=true fresh=false',
    'check linker-config-version: disk={ok:true,level:fatal,group:linker} fresh={ok:false,level:fatal,group:linker}',
  ];
  return {
    ok: false,
    path: joinPath(ROOT, 'public/registry/doctor-state.json'),
    present: true,
    fresh,
    onDisk: fresh,
    reason: 'doctor-state fingerprint mismatch',
    fingerprintFresh: 'a'.repeat(64),
    fingerprintDisk: 'b'.repeat(64),
    drift,
    portable: true,
    ...overrides,
  };
}

describe('bake-doctor check report (CI forensics)', () => {
  test('DEFAULT report rel is reports/doctor-state-check.json', () => {
    expect(DOCTOR_STATE_CHECK_REPORT_REL).toBe('reports/doctor-state-check.json');
  });

  test('toDoctorStateCheckReport maps required forensics fields', () => {
    const result = failCheckResult();
    const report = toDoctorStateCheckReport(result);
    expect(report.ok).toBe(false);
    expect(report.fingerprintFresh).toBe(result.fingerprintFresh);
    expect(report.fingerprintDisk).toBe(result.fingerprintDisk);
    expect(report.drift).toEqual(result.drift);
    expect(report.portable).toBe(true);
    expect(report.tone).toBe(result.fresh.tone);
    expect(report.path).toBe(result.path);
    expect(report.present).toBe(true);
    expect(report.reason).toBe('doctor-state fingerprint mismatch');
  });

  test('formatDoctorStateCheckSummary includes fingerprint mismatch + drift bullets', () => {
    const report = toDoctorStateCheckReport(failCheckResult());
    const md = formatDoctorStateCheckSummary(report);
    expect(md).toContain('## Doctor-state fingerprint');
    expect(md).toContain('| result | `fail` |');
    expect(md).toContain('### Fingerprint mismatch');
    expect(md).toContain(`- fresh: \`${report.fingerprintFresh}\``);
    expect(md).toContain(`- disk: \`${report.fingerprintDisk}\``);
    expect(md).toContain('### Drift');
    expect(md).toContain(`- ${report.drift[0]}`);
    expect(md).toContain('bun run bake:doctor');
  });

  test('formatDoctorStateCheckSummary ok path has no drift section noise', () => {
    const ok: DoctorStateCheckReport = {
      ok: true,
      fingerprintFresh: 'c'.repeat(64),
      fingerprintDisk: 'c'.repeat(64),
      drift: [],
      portable: true,
      tone: 'green',
      path: '/tmp/doctor-state.json',
      present: true,
    };
    const md = formatDoctorStateCheckSummary(ok);
    expect(md).toContain('| result | `ok` |');
    expect(md).toContain('_No fingerprint drift._');
    expect(md).not.toContain('### Fingerprint mismatch');
    expect(md).not.toContain('### Repair');
  });

  test('formatDoctorStateGithubAnnotations emits ::error title=doctor-state:: per drift', () => {
    const report = toDoctorStateCheckReport(failCheckResult());
    const lines = formatDoctorStateGithubAnnotations(report);
    expect(lines).toHaveLength(2);
    expect(lines[0]).toBe(`::error title=doctor-state::${report.drift[0]}`);
    expect(lines[1]).toBe(`::error title=doctor-state::${report.drift[1]}`);
  });

  test('formatDoctorStateGithubAnnotations escapes newlines and reason-only fail', () => {
    const report = toDoctorStateCheckReport(
      failCheckResult({
        drift: undefined,
        reason: 'missing doctor-state.json — run: bun run bake:doctor',
        fingerprintDisk: undefined,
        present: false,
        onDisk: null,
      })
    );
    // toDoctorStateCheckReport normalizes undefined drift → []
    expect(report.drift).toEqual([]);
    const lines = formatDoctorStateGithubAnnotations(report);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toBe(
      '::error title=doctor-state::missing doctor-state.json — run: bun run bake:doctor'
    );

    const multi: DoctorStateCheckReport = {
      ...report,
      drift: ['line one\nline two', 'pct%value'],
      reason: 'doctor-state fingerprint mismatch',
    };
    const multiLines = formatDoctorStateGithubAnnotations(multi);
    expect(multiLines).toHaveLength(2);
    expect(multiLines[0]).toBe('::error title=doctor-state::line one%0Aline two');
    expect(multiLines[1]).toBe('::error title=doctor-state::pct%25value');
    expect(multiLines[0]!.includes('\n')).toBe(false);
    expect(escapeGithubActionsMessage('a\nb')).toBe('a%0Ab');
  });

  test('formatDoctorStateGithubAnnotations empty when ok', () => {
    const report: DoctorStateCheckReport = {
      ok: true,
      fingerprintFresh: 'd'.repeat(64),
      fingerprintDisk: 'd'.repeat(64),
      drift: [],
      portable: true,
      tone: 'green',
      path: '/x',
      present: true,
    };
    expect(formatDoctorStateGithubAnnotations(report)).toEqual([]);
  });

  test('shouldEmitDoctorStateCheckReport force and GHA env', () => {
    expect(shouldEmitDoctorStateCheckReport(true)).toBe(true);
    const prevActions = Bun.env.GITHUB_ACTIONS;
    const prevSummary = Bun.env.GITHUB_STEP_SUMMARY;
    try {
      delete Bun.env.GITHUB_ACTIONS;
      delete Bun.env.GITHUB_STEP_SUMMARY;
      expect(shouldEmitDoctorStateCheckReport(false)).toBe(false);
      Bun.env.GITHUB_ACTIONS = 'true';
      expect(shouldEmitDoctorStateCheckReport(false)).toBe(true);
      Bun.env.GITHUB_ACTIONS = 'false';
      Bun.env.GITHUB_STEP_SUMMARY = '/tmp/summary.md';
      expect(shouldEmitDoctorStateCheckReport(false)).toBe(true);
    } finally {
      if (prevActions === undefined) delete Bun.env.GITHUB_ACTIONS;
      else Bun.env.GITHUB_ACTIONS = prevActions;
      if (prevSummary === undefined) delete Bun.env.GITHUB_STEP_SUMMARY;
      else Bun.env.GITHUB_STEP_SUMMARY = prevSummary;
    }
  });

  test('writeDoctorStateCheckReport writes JSON + appends step summary', async () => {
    const outDir = joinPath(TMP, 'write-report');
    await Bun.$`rm -rf ${outDir}`.quiet().nothrow();
    await Bun.$`mkdir -p ${outDir}`.quiet();
    const outPath = joinPath(outDir, 'doctor-state-check.json');
    const summaryPath = joinPath(outDir, 'step-summary.md');
    await Bun.write(summaryPath, '# prior\n');

    const prevSummary = Bun.env.GITHUB_STEP_SUMMARY;
    Bun.env.GITHUB_STEP_SUMMARY = summaryPath;
    try {
      const result = failCheckResult();
      const written = await writeDoctorStateCheckReport(result, {
        outPath,
        quiet: true,
      });
      expect(written.jsonPath).toBe(outPath);
      expect(written.summaryWritten).toBe(true);
      expect(written.annotations).toHaveLength(2);
      expect(await Bun.file(outPath).exists()).toBe(true);

      const json = (await Bun.file(outPath).json()) as DoctorStateCheckReport;
      expect(json.ok).toBe(false);
      expect(json.fingerprintFresh).toBe(result.fingerprintFresh);
      expect(json.fingerprintDisk).toBe(result.fingerprintDisk);
      expect(json.drift).toEqual(result.drift);
      expect(json.portable).toBe(true);
      expect(json.tone).toBe(result.fresh.tone);
      expect(json.path).toBe(result.path);

      const summary = await Bun.file(summaryPath).text();
      expect(summary.startsWith('# prior\n')).toBe(true);
      expect(summary).toContain('## Doctor-state fingerprint');
      expect(summary).toContain('### Drift');
    } finally {
      if (prevSummary === undefined) delete Bun.env.GITHUB_STEP_SUMMARY;
      else Bun.env.GITHUB_STEP_SUMMARY = prevSummary;
    }
  });
});
