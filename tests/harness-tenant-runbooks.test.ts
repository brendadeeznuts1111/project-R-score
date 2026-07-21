/**
 * Every spine tenant must have a typed TenantRunbook + markdown runbook.
 * Cross-refs: tenant ↔ runbook ↔ proofId ↔ intervention∋proof.freshRerun.
 * @see lib/harness/maintenance.ts
 * @see docs/harness/tenants/
 */
import { describe, expect, test } from 'bun:test';
import {
  assertRunbookFieldsNonEmpty,
  assertRunbookInterventionContainsProofFreshRerun,
  assertRunbookProofLinks,
  assertRunbookTenantLinks,
  MAINTENANCE_RUNBOOKS,
  runbookByTenant,
} from '../lib/harness/maintenance';
import { CRITICAL_PROOF_PATHS } from '../lib/harness/proof';
import { joinPath } from '../lib/path-bun';
import { SPINE_TENANTS } from '../spine/tenants';

const ROOT = joinPath(import.meta.dir, '..');

describe('spine maintenance runbooks', () => {
  test('bidirectional: SPINE_TENANTS ↔ MAINTENANCE_RUNBOOKS', () => {
    expect(assertRunbookTenantLinks(SPINE_TENANTS.map(t => t.id))).toEqual([]);
    expect(MAINTENANCE_RUNBOOKS.length).toBe(SPINE_TENANTS.length);
  });

  test('every runbook proofId resolves in CRITICAL_PROOF_PATHS', () => {
    expect(assertRunbookProofLinks()).toEqual([]);
  });

  test('catalog signal · intervention · retirement are non-empty', () => {
    expect(assertRunbookFieldsNonEmpty()).toEqual([]);
  });

  test('intervention contains linked proof freshRerun', () => {
    expect(assertRunbookInterventionContainsProofFreshRerun()).toEqual([]);
  });

  test('every runbook doc exists and has signal · intervention · retirement', async () => {
    for (const r of MAINTENANCE_RUNBOOKS) {
      const abs = joinPath(ROOT, r.docPath);
      expect(await Bun.file(abs).exists(), r.docPath).toBe(true);
      const md = await Bun.file(abs).text();
      expect(md, r.tenant).toMatch(/## Signal/i);
      expect(md, r.tenant).toMatch(/## Intervention/i);
      expect(md, r.tenant).toMatch(/## Retirement/i);
      expect(md, r.tenant).toContain(r.proofId);
      expect(md, r.tenant).toContain(r.freshRerun);
    }
  });

  test('install-verify runbook points at install-verify-journey', () => {
    const r = runbookByTenant('install-verify');
    expect(r?.proofId).toBe('install-verify-journey');
    expect(CRITICAL_PROOF_PATHS.some(p => p.id === 'install-verify-journey')).toBe(true);
  });
});
