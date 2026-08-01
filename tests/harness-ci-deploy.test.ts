/**
 * CI / deploy runbooks + discover-ci coverage.
 * @see lib/harness/ci-deploy.ts
 * @see lib/harness/discover-ci.ts
 * @see docs/harness/ci-deploy.md
 */
import { describe, expect, test } from 'bun:test';
import {
  assertCiChildProofBijection,
  assertCiDeployParentChildIds,
  assertCiInterventionNotCatalogFreshRerun,
  assertCiRunbookFields,
  assertCiRunbookProofLinks,
  CI_RUNBOOKS,
} from '../lib/harness/ci-deploy';
import {
  assertCICoverage,
  assertEveryRunbookHasJobOwner,
  CI_JOB_OWNERS,
  discoverCiJobs,
} from '../lib/harness/discover-ci';
import { argvFromCommand } from '../lib/harness/maintenance';
import { CRITICAL_PROOF_PATHS } from '../lib/harness/proof';
import { joinPath } from '../lib/path-bun';

const ROOT = joinPath(import.meta.dir, '..');

describe('CI / deploy runbooks', () => {
  test('catalog proof links + fields', () => {
    expect(assertCiRunbookProofLinks()).toEqual([]);
    expect(assertCiRunbookFields()).toEqual([]);
    expect(CI_RUNBOOKS.length).toBeGreaterThanOrEqual(4);
  });

  test('CI child bijection + intervention ≠ catalog freshRerun', () => {
    expect(assertCiChildProofBijection()).toEqual([]);
    expect(assertCiInterventionNotCatalogFreshRerun()).toEqual([]);
    expect(assertCiDeployParentChildIds()).toEqual([]);
  });

  test('assertCICoverage: every ci/build/deploy/migrate job owned or exempted', async () => {
    expect(await assertCICoverage(ROOT)).toEqual([]);
  });

  test('every CI_RUNBOOKS id appears in CI_JOB_OWNERS values', () => {
    expect(assertEveryRunbookHasJobOwner()).toEqual([]);
  });

  test('local bun:ci boundaries have explicit runbook owners', () => {
    expect(CI_JOB_OWNERS['ci:types']).toBe('typescript-ci');
    expect(CI_JOB_OWNERS['ci:security']).toBe('ci-core');
    expect(CI_JOB_OWNERS['ci:portal-registry']).toBe('ci-core');
    expect(CI_JOB_OWNERS['security-scanner.yml']).toBe('ci-core');
  });

  test('discovery finds package CI scripts and GHA workflows', async () => {
    const jobs = await discoverCiJobs(ROOT);
    expect(jobs.some(j => j.source === 'package-script' && j.detail === 'ci:core')).toBe(true);
    expect(jobs.some(j => j.source === 'gha-workflow' && j.detail === 'harness-gates.yml')).toBe(
      true
    );
  });

  test('every runbook doc exists with signal · intervention · retirement', async () => {
    for (const r of CI_RUNBOOKS) {
      const abs = joinPath(ROOT, r.docPath);
      expect(await Bun.file(abs).exists(), r.docPath).toBe(true);
      const md = await Bun.file(abs).text();
      expect(md, r.id).toMatch(/## Signal/i);
      expect(md, r.id).toMatch(/## Intervention/i);
      expect(md, r.id).toMatch(/## Retirement/i);
      expect(md, r.id).toContain(r.proofId);
      expect(md, r.id).toContain(r.freshRerun);
    }
  });

  test('interventions are bun run <script> that exist in package.json', async () => {
    const pkg = (await Bun.file(joinPath(ROOT, 'package.json')).json()) as {
      scripts?: Record<string, string>;
    };
    const scripts = new Set(Object.keys(pkg.scripts ?? {}));
    for (const r of CI_RUNBOOKS) {
      const argv = argvFromCommand(r.intervention);
      expect(argv[0], r.id).toBe('bun');
      expect(argv[1], r.id).toBe('run');
      expect(scripts.has(argv[2]!), `${r.id} missing script ${argv[2]}`).toBe(true);
    }
  });

  test('proof catalog includes ci-deploy-runbooks', () => {
    expect(CRITICAL_PROOF_PATHS.some(p => p.id === 'ci-deploy-runbooks')).toBe(true);
    expect(CRITICAL_PROOF_PATHS.some(p => p.id === 'ci-core-envelope')).toBe(true);
  });
});
