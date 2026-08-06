// @see https://bun.com/docs/test — bun:test
// tests/partner-health.test.ts — partner-domain runtime health report.

import { beforeEach, describe, expect, test } from 'bun:test';
import { rmSync } from 'node:fs';

import { runPartnerHealth } from '../lib/partner-profile/partner-health.ts';
import { ensurePartnerLedgerSchema } from '../lib/partner-profile/ledger.ts';
import { ensureAccountLimitsSchema } from '../lib/account-limits-repo.ts';
import { openProfileAuditDb } from '../lib/partner-profile/profiles-diff.ts';

import { Database } from 'bun:sqlite';

const FIXTURE = '.tmp/partner-health-fixture';

async function writeProfile(code: string): Promise<void> {
  await Bun.write(
    `${FIXTURE}/${code}.toml`,
    `meta.templateId = "partner-active"\nmeta.name = "Test"\nmeta.version = "1.0.0"\nmeta.source = "referral"\n\nidentity.code = "${code}"\nidentity.callSign = "${code}-001"\nidentity.status = "onboarded"\n\nlifecycle.status = "active"\nlifecycle.phase = "operator_ready"\n`
  );
}

beforeEach(() => {
  rmSync(FIXTURE, { recursive: true, force: true });
});

describe('partner health', () => {
  test('healthy when all subsystems are present', async () => {
    await writeProfile('SPEN');
    const db = openProfileAuditDb(':memory:'); // bindings + audit tables
    ensurePartnerLedgerSchema(db);
    ensureAccountLimitsSchema(db);
    db.query(
      `INSERT INTO tree_nodes (id, type, name, call_sign, created_at)
       VALUES ('node-spen', 'partner', 'SPEN partner', 'SPEN-001', datetime('now'))`
    ).run();
    db.query(
      `INSERT INTO partner_profile_bindings (tree_node_id, template_id, profile_key, lifecycle_status, created_at, updated_at)
       VALUES ('node-spen', 'partner-active', 'pp-node-spen', 'active', datetime('now'), datetime('now'))`
    ).run();
    db.query(
      `INSERT INTO partner_ledger
         (id, partner_code, type, amount_minor, currency, balance_after_minor, created_at)
       VALUES ('l1', 'SPEN', 'deposit', 10000, 'USD', 10000, datetime('now'))`
    ).run();

    const report = await runPartnerHealth({ db, profilesDir: FIXTURE });
    expect(report.ok).toBe(true);
    expect(report.opsDb.ok).toBe(true);
    expect(report.bindings.count).toBe(1);
    expect(report.ledger.count).toBe(1);
    expect(report.ledger.partners).toBe(1);
    expect(report.capacity.ok).toBe(true);
    expect(report.profiles.count).toBe(1);
    expect(report.alignment.profilesWithoutBinding).toEqual([]);
    expect(report.alignment.bindingsWithoutProfile).toEqual([]);
    db.close();
  });

  test('degraded (not throwing) when tables are missing', async () => {
    const db = new Database(':memory:'); // no schema at all
    const report = await runPartnerHealth({ db, profilesDir: FIXTURE });
    expect(report.ok).toBe(false);
    expect(report.bindings.ok).toBe(false);
    expect(report.ledger.ok).toBe(false);
    expect(report.ledger.error).toBeDefined();
    expect(report.capacity.ok).toBe(false);
    expect(report.opsDb.ok).toBe(true); // the db itself opened
    db.close();
  });

  test('reports profile↔binding misalignment', async () => {
    await writeProfile('SPEN');
    const db = openProfileAuditDb(':memory:');
    ensurePartnerLedgerSchema(db);
    ensureAccountLimitsSchema(db);
    // Binding for ASH exists, but only SPEN has a TOML profile.
    db.query(
      `INSERT INTO partner_profile_bindings (tree_node_id, template_id, profile_key, lifecycle_status, created_at, updated_at)
       VALUES ('node-ash', 'partner-active', 'ASH', 'active', datetime('now'), datetime('now'))`
    ).run();

    const report = await runPartnerHealth({ db, profilesDir: FIXTURE });
    expect(report.alignment.profilesWithoutBinding).toEqual(['SPEN']);
    expect(report.alignment.bindingsWithoutProfile).toEqual(['ASH']);
    // Misalignment is informational — all subsystems are present, so health is OK.
    expect(report.ok).toBe(true);
    db.close();
  });
});
