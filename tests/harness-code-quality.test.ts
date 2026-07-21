/**
 * Code-quality tenants: catalog + live freshRerun (types · coverage · orphans · complexity).
 * @see lib/harness/code-quality.ts
 * @see docs/harness/code-quality.md
 */
import { describe, expect, test } from 'bun:test';
import {
  assertCodeQualityFields,
  assertCodeQualityProofLinks,
  CODE_QUALITY_TENANTS,
} from '../lib/harness/code-quality';
import { assertHarnessCoverageBaseline } from '../lib/harness/coverage-ratchet';
import { argvFromCommand, runFreshRerunCommand } from '../lib/harness/maintenance';
import { CRITICAL_PROOF_PATHS } from '../lib/harness/proof';
import { joinPath } from '../lib/path-bun';

const ROOT = joinPath(import.meta.dir, '..');

describe('code quality tenants', () => {
  test('catalog proof links + fields', () => {
    expect(assertCodeQualityProofLinks()).toEqual([]);
    expect(assertCodeQualityFields()).toEqual([]);
    expect(CODE_QUALITY_TENANTS.length).toBeGreaterThanOrEqual(4);
  });

  test('every runbook doc exists with signal · intervention · retirement', async () => {
    for (const t of CODE_QUALITY_TENANTS) {
      const abs = joinPath(ROOT, t.docPath);
      expect(await Bun.file(abs).exists(), t.docPath).toBe(true);
      const md = await Bun.file(abs).text();
      expect(md, t.id).toMatch(/## Signal/i);
      expect(md, t.id).toMatch(/## Intervention/i);
      expect(md, t.id).toMatch(/## Retirement/i);
      expect(md, t.id).toContain(t.proofId);
      expect(md, t.id).toContain(t.freshRerun);
    }
  });

  test('intervention is argv-safe bun command', () => {
    for (const t of CODE_QUALITY_TENANTS) {
      const argv = argvFromCommand(t.intervention);
      expect(argv[0], t.id).toBe('bun');
    }
  });

  test('types-covered freshRerun (type-check) exits 0', async () => {
    const t = CODE_QUALITY_TENANTS.find(x => x.id === 'types-covered');
    expect(t).toBeDefined();
    const { code } = await runFreshRerunCommand(t!.freshRerun, ROOT);
    expect(code).toBe(0);
  }, 120_000);

  test('coverage-floor: harness coverage ≥ baseline', async () => {
    expect(await assertHarnessCoverageBaseline(ROOT)).toEqual([]);
  }, 60_000);

  test('orphan-modules check exits 0', async () => {
    const t = CODE_QUALITY_TENANTS.find(x => x.id === 'orphan-modules');
    expect(t).toBeDefined();
    const { code } = await runFreshRerunCommand(t!.freshRerun, ROOT);
    expect(code).toBe(0);
  }, 60_000);

  test('complexity-floor check exits 0', async () => {
    const t = CODE_QUALITY_TENANTS.find(x => x.id === 'complexity-floor');
    expect(t).toBeDefined();
    const { code } = await runFreshRerunCommand(t!.freshRerun, ROOT);
    expect(code).toBe(0);
  }, 60_000);

  test('proof catalog includes harness coverage · orphans · complexity', () => {
    expect(CRITICAL_PROOF_PATHS.some(p => p.id === 'harness-coverage-ratchet')).toBe(true);
    expect(CRITICAL_PROOF_PATHS.some(p => p.id === 'harness-orphan-modules')).toBe(true);
    expect(CRITICAL_PROOF_PATHS.some(p => p.id === 'harness-complexity-floor')).toBe(true);
  });
});
