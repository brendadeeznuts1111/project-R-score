// @see https://bun.com/docs/test/index#run-tests
// @see https://bun.com/docs/runtime/sqlite
import type { Database } from 'bun:sqlite';
import { describe, expect, test } from 'bun:test';
import { openOperationsDb } from '../lib/operations/db.ts';
import {
  addPhone,
  addPhoneSportsbook,
  isOnboardPhoneGeoHardGateEnabled,
  phoneHasActiveGeoEvidence,
} from '../lib/operations/phone-sportsbook-journal.ts';
import { planPartnerOnboardPackage } from '../lib/operations/partner-onboard-package.ts';
import { asTreeNodeId } from '../lib/types/branded.ts';

function freshDb(): Database {
  const db = openOperationsDb({ path: ':memory:' });
  db.run(`
    INSERT INTO tree_nodes (id, name, type, active, telegram_id, call_sign, created_at)
    VALUES ('node-phone-1', 'Phone Seat', 'agent', 1, '424242', 'PHN-001', datetime('now'))
  `);
  return db;
}

describe('phone sportsbook journal', () => {
  test('addPhone + addPhoneSportsbook journals active geo evidence', () => {
    const db = freshDb();
    const { phoneId, created } = addPhone(db, { model: 'Pixel', carrier: 'Verizon' });
    expect(created).toBe(true);
    const row = addPhoneSportsbook(db, {
      phoneId,
      sportsbook: 'draftkings',
      jurisdiction: 'NJ',
      evidenceNote: 'geo ok',
    });
    expect(row.status).toBe('active');
    expect(row.sportsbook).toBe('draftkings');
    expect(phoneHasActiveGeoEvidence(db, phoneId)).toBe(true);
  });

  test('hard gate blocks welcome without geo evidence; allows with evidence', () => {
    const db = freshDb();
    const nodeId = asTreeNodeId('node-phone-1');

    const blocked = planPartnerOnboardPackage(db, nodeId, { hardGatePhoneGeo: true });
    expect(blocked.wouldEnqueueWelcome).toBe(false);
    expect(blocked.phoneWarning).toContain('welcome blocked');

    const { phoneId } = addPhone(db, { id: 'phone_gate_1', model: 'iPhone' });
    db.run(`UPDATE phones SET assigned_to = $n, status = 'issued' WHERE id = $p`, {
      $n: 'node-phone-1',
      $p: phoneId,
    });
    db.run(`UPDATE tree_nodes SET phone_id = $p WHERE id = $n`, {
      $p: phoneId,
      $n: 'node-phone-1',
    });
    addPhoneSportsbook(db, {
      phoneId,
      sportsbook: 'fanduel',
      jurisdiction: 'MA',
    });

    const ok = planPartnerOnboardPackage(db, nodeId, { hardGatePhoneGeo: true });
    expect(ok.wouldEnqueueWelcome).toBe(true);
    expect(ok.phoneWarning).toBeNull();
    expect(ok.welcomeSkipReason).toBeNull();
  });

  test('isOnboardPhoneGeoHardGateEnabled respects opts over env', () => {
    expect(isOnboardPhoneGeoHardGateEnabled({ hardGatePhoneGeo: true })).toBe(true);
    expect(isOnboardPhoneGeoHardGateEnabled({ hardGatePhoneGeo: false })).toBe(false);
  });
});
