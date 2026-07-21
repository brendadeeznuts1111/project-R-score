/**
 * Every spine tenant must have a typed TenantRunbook + markdown runbook.
 * Structure + live execution of runbook freshRerun and linked proof freshRerun.
 * @see lib/harness/maintenance.ts
 * @see docs/harness/tenants/
 */
import { describe, expect, test } from 'bun:test';
import { assertScheduledJobCoverage } from '../lib/harness/discover-scheduled';
import { assertInterventionCommandsValid } from '../lib/harness/intervention-validity';
import {
  assertLinkedProofFreshRerunsPass,
  assertRetirementCheckShape,
  assertRetirementConditionCheck,
  assertRetirementEnforcement,
  assertRunbookFieldsNonEmpty,
  assertRunbookFreshRerunsPass,
  assertRunbookInterventionContainsProofFreshRerun,
  assertRunbookProofLinks,
  assertRunbookTenantLinks,
  MAINTENANCE_RUNBOOKS,
  RETIRED_TENANT_RUNBOOKS,
  runbookByTenant,
} from '../lib/harness/maintenance';
import { CRITICAL_PROOF_PATHS } from '../lib/harness/proof';
import {
  assertSignalMonitorAlignedWithRunbook,
  assertSignalMonitorFields,
  assertSignalMonitorFreshness,
  assertSignalMonitorTenantLinks,
  SIGNAL_MONITORS,
} from '../lib/harness/signal-monitoring';
import { joinPath } from '../lib/path-bun';
import { SPINE_TENANTS } from '../spine/tenants';

const ROOT = joinPath(import.meta.dir, '..');

describe('spine maintenance runbooks', () => {
  test('bidirectional: SPINE_TENANTS ↔ MAINTENANCE_RUNBOOKS', () => {
    expect(assertRunbookTenantLinks(SPINE_TENANTS.map(t => t.id))).toEqual([]);
    expect(MAINTENANCE_RUNBOOKS.length).toBe(SPINE_TENANTS.length);
  });

  test('retirement attestation: active unverified · retired verified tombstones', () => {
    expect(assertRetirementEnforcement(SPINE_TENANTS.map(t => t.id))).toEqual([]);
    for (const r of MAINTENANCE_RUNBOOKS) {
      expect(r.retirementVerified, r.tenant).toBe(false);
    }
    for (const r of RETIRED_TENANT_RUNBOOKS) {
      expect(r.retirementVerified, r.tenant).toBe(true);
    }
  });

  test('retirementCheck shape (description · command/proofId)', () => {
    expect(assertRetirementCheckShape()).toEqual([]);
    for (const r of MAINTENANCE_RUNBOOKS) {
      expect(r.retirementCheck, r.tenant).toBeDefined();
    }
  });

  test('retirementCheck executes for tombstones (none today)', async () => {
    const { failures, warnings } = await assertRetirementConditionCheck(ROOT);
    expect(failures).toEqual([]);
    for (const w of warnings) console.warn(`⚠️ ${w}`);
  }, 180_000);

  test('bidirectional: SPINE_TENANTS ↔ SIGNAL_MONITORS', () => {
    expect(assertSignalMonitorTenantLinks(SPINE_TENANTS.map(t => t.id))).toEqual([]);
    expect(SIGNAL_MONITORS.length).toBe(SPINE_TENANTS.length);
  });

  test('signal monitors have probe · alert · spine-tick shape', () => {
    expect(assertSignalMonitorFields()).toEqual([]);
  });

  test('signal monitors align with runbook.signal', () => {
    expect(assertSignalMonitorAlignedWithRunbook()).toEqual([]);
  });

  test('discovered schedules are owned tenants or exempted', async () => {
    expect(await assertScheduledJobCoverage(ROOT, SPINE_TENANTS.map(t => t.id))).toEqual([]);
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

  test('TenantRunbook.freshRerun ≠ linked ProofPath.freshRerun (doc vs claim)', () => {
    for (const r of MAINTENANCE_RUNBOOKS) {
      const p = CRITICAL_PROOF_PATHS.find(x => x.id === r.proofId);
      expect(p, r.tenant).toBeDefined();
      expect(r.freshRerun, r.tenant).not.toBe(p!.freshRerun);
    }
  });

  test('intervention commands are valid (catalog + markdown)', async () => {
    expect(await assertInterventionCommandsValid(ROOT)).toEqual([]);
  });

  test('every runbook doc exists and has signal · intervention · retirement', async () => {
    for (const r of MAINTENANCE_RUNBOOKS) {
      const abs = joinPath(ROOT, r.docPath);
      expect(await Bun.file(abs).exists(), r.docPath).toBe(true);
      const md = await Bun.file(abs).text();
      expect(md, r.tenant).toMatch(/## Signal/i);
      expect(md, r.tenant).toMatch(/## Intervention/i);
      expect(md, r.tenant).toMatch(/## Retirement/i);
      expect(md, r.tenant).toMatch(/\*\*Retirement verified\*\*\s*`false`/i);
      expect(md, r.tenant).toContain(r.proofId);
      expect(md, r.tenant).toContain(r.freshRerun);
    }
  });

  test('install-verify runbook points at install-verify-journey', () => {
    const r = runbookByTenant('install-verify');
    expect(r?.proofId).toBe('install-verify-journey');
    expect(CRITICAL_PROOF_PATHS.some(p => p.id === 'install-verify-journey')).toBe(true);
  });

  test('each TenantRunbook.freshRerun exits 0', async () => {
    expect(await assertRunbookFreshRerunsPass(ROOT)).toEqual([]);
  }, 60_000);

  test('each linked proof freshRerun exits 0', async () => {
    expect(await assertLinkedProofFreshRerunsPass(ROOT)).toEqual([]);
  }, 180_000);

  test('signal monitor last-check artifacts are fresh when present', async () => {
    expect(await assertSignalMonitorFreshness(ROOT)).toEqual([]);
  });
});
