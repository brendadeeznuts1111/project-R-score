// @see https://bun.com/docs/test
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
/**
 * Portal doctor CI report — JSON artifact, exit/ok, step-summary FAIL lines.
 * Offline pure: skipLiveAccess + no live HTTPS (runPortalDoctor inject path).
 */
import { afterAll, describe, expect, test } from 'bun:test';
import { joinPath, resolvePath } from '../scripts/lib/fs-bun';
import {
  DEFAULT_REPORT_REL,
  formatDoctorStepSummary,
  runDoctorCiReport,
  writeDoctorCiReport,
} from '../scripts/doctor-ci-report.ts';
import {
  formatPortalDoctorPlain,
  runPortalDoctor,
  type PortalDoctorReport,
} from '../tools/lib/portal-cli-doctor.ts';

const ROOT = resolvePath(import.meta.dir, '..');
const TMP = joinPath(ROOT, 'tmp/doctor-ci-report-test');

afterAll(async () => {
  await Bun.$`rm -rf ${TMP}`.quiet().nothrow();
});

describe('doctor-ci-report', () => {
  test('writes JSON with kind portal-cli-doctor and matching ok/exitCode', async () => {
    const outDir = joinPath(TMP, 'ok-run');
    await Bun.$`rm -rf ${outDir}`.quiet().nothrow();
    await Bun.$`mkdir -p ${outDir}`.quiet();
    const outPath = joinPath(outDir, 'portal-doctor-ci.json');

    const result = await runDoctorCiReport({
      cwd: ROOT,
      outPath,
      noSummary: true,
      quiet: true,
    });

    expect(result.report.kind).toBe('portal-cli-doctor');
    expect(result.report.env).toBe('ci');
    expect(result.report.liveAccess).toBe(false);
    expect(result.exitCode).toBe(result.report.ok ? 0 : 1);
    expect(result.jsonPath).toBe(outPath);
    expect(await Bun.file(outPath).exists()).toBe(true);

    const written = (await Bun.file(outPath).json()) as PortalDoctorReport;
    expect(written.kind).toBe('portal-cli-doctor');
    expect(written.ok).toBe(result.report.ok);
    expect(written.schemaVersion).toBe(result.report.schemaVersion);
    expect(Array.isArray(written.checks)).toBe(true);
    expect(written.checks.length).toBeGreaterThan(0);
    expect(written.env).toBe('ci');
    expect(written.liveAccess).toBe(false);

    // plain text is the CI formatter shape
    expect(result.plain).toContain('portal-doctor');
    expect(result.plain).toMatch(/result=(ok|fail)/);
    expect(formatPortalDoctorPlain(result.report)).toBe(result.plain);
  });

  test('DEFAULT_REPORT_REL is reports/portal-doctor-ci.json', () => {
    expect(DEFAULT_REPORT_REL).toBe('reports/portal-doctor-ci.json');
  });

  test('forced fail: exit 1, summary markdown contains FAIL, no network', async () => {
    const failRoot = joinPath(TMP, 'fail-cwd');
    const outDir = joinPath(TMP, 'fail-out');
    const summaryPath = joinPath(TMP, 'step-summary.md');
    await Bun.$`rm -rf ${failRoot} ${outDir}`.quiet().nothrow();
    await Bun.$`mkdir -p ${failRoot} ${outDir}`.quiet();
    await Bun.write(
      joinPath(failRoot, 'bun.lock'),
      `{\n  "lockfileVersion": 1,\n  "configVersion": 0,\n  "workspaces": { "": {} }\n}\n`
    );
    // Project bunfig leaking machine keys → extra fatal/warn for bunfig group
    await Bun.write(
      joinPath(failRoot, 'bunfig.toml'),
      `[install]\nlinker = "hoisted"\nglobalStore = false\n`
    );
    // Empty HOME so machine bunfig SSOT cannot pass from the real machine file
    const emptyHome = joinPath(TMP, 'empty-home');
    await Bun.$`rm -rf ${emptyHome}`.quiet().nothrow();
    await Bun.$`mkdir -p ${emptyHome}`.quiet();

    const outPath = joinPath(outDir, 'portal-doctor-ci.json');
    const prevSummary = Bun.env.GITHUB_STEP_SUMMARY;
    Bun.env.GITHUB_STEP_SUMMARY = summaryPath;
    try {
      await Bun.write(summaryPath, '# prior\n');

      const result = await runDoctorCiReport({
        cwd: failRoot,
        outPath,
        quiet: true,
        machineEnv: {
          HOME: emptyHome,
          // strip install-cache overrides that could mask probes
          BUN_INSTALL_CACHE_DIR: undefined,
          BUN_INSTALL_GLOBAL_STORE: undefined,
        },
      });

      expect(result.report.kind).toBe('portal-cli-doctor');
      expect(result.report.ok).toBe(false);
      expect(result.exitCode).toBe(1);
      expect(result.report.liveAccess).toBe(false);
      expect(result.report.summary.failedFatal).toBeGreaterThan(0);
      expect(result.summaryWritten).toBe(true);

      const plain = result.plain;
      expect(plain).toContain('FAIL');
      expect(plain).toMatch(/linker-config-version|bunfig-machine-ssot|bunfig-project/);

      const md = await Bun.file(summaryPath).text();
      expect(md).toContain('# prior');
      expect(md).toContain('## Portal doctor (CI)');
      expect(md).toContain('### FAIL checks');
      expect(md).toMatch(/result.*fail|`fail`/);
      // at least one failed check id line
      expect(md).toMatch(/`linker-config-version`|`bunfig-machine-ssot`|`bunfig-project-no-machine-keys`/);

      const written = (await Bun.file(outPath).json()) as PortalDoctorReport;
      expect(written.ok).toBe(false);
      expect(written.kind).toBe('portal-cli-doctor');
      expect(written.checks.some(c => !c.ok)).toBe(true);
    } finally {
      if (prevSummary === undefined) delete Bun.env.GITHUB_STEP_SUMMARY;
      else Bun.env.GITHUB_STEP_SUMMARY = prevSummary;
    }
  });

  test('formatDoctorStepSummary lists FAIL checks from synthetic report', () => {
    const report: PortalDoctorReport = {
      kind: 'portal-cli-doctor',
      schemaVersion: 4,
      ok: false,
      full: false,
      verbose: false,
      failedOnly: false,
      env: 'ci',
      liveAccess: false,
      generatedAt: '2026-07-28T00:00:00.000Z',
      checks: [
        {
          id: 'linker-config-version',
          level: 'fatal',
          group: 'linker',
          ok: false,
          message: 'configVersion=0 (need 1)',
          fixCommand: 'bun run install:verify',
        },
        {
          id: 'capability-map-subset',
          level: 'warn',
          group: 'bakes',
          ok: true,
          message: 'present',
        },
      ],
      summary: {
        checkCount: 2,
        passed: 1,
        failed: 1,
        fatal: 1,
        warn: 1,
        info: 0,
        failedFatal: 1,
        failedWarn: 0,
        autoFixableFailed: 0,
        suggested: ['bun run install:verify'],
      },
      docs: {
        isolatedInstalls: 'https://bun.com/docs/pm/isolated-installs',
        defaultStrategy: 'https://bun.com/docs/pm/cli/install#default-strategy',
        installIsolated: 'https://bun.com/docs/pm/isolated-installs',
        installHoisted: 'https://bun.com/docs/pm/cli/install',
      },
    };

    const md = formatDoctorStepSummary(report);
    expect(md).toContain('### FAIL checks');
    expect(md).toContain('`linker-config-version`');
    expect(md).toContain('configVersion=0');
    expect(md).toContain('bun run install:verify');
    expect(md).not.toContain('capability-map-subset');
    expect(md).toMatch(/`fail`/);
  });

  test('writeDoctorCiReport noJson skips file; noSummary skips env append', async () => {
    const report = await runPortalDoctor({
      cwd: ROOT,
      env: 'ci',
      skipLiveAccess: true,
      group: 'linker',
    });
    const out = await writeDoctorCiReport(report, {
      cwd: ROOT,
      noJson: true,
      noSummary: true,
    });
    expect(out.jsonPath).toBeUndefined();
    expect(out.summaryWritten).toBe(false);
  });
});
