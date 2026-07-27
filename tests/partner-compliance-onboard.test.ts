// @see https://bun.com/docs/test — bun:test
import { describe, test, expect } from 'bun:test';
import { openOperationsDb } from '../lib/operations/db.ts';
import {
  applyPartnerComplianceOnboard,
  parseComplianceOnboardFields,
} from '../lib/operations/partner-compliance-onboard.ts';
import { ComplianceRepository, getPartnerGeoProfile } from '../lib/operations/state-regulation.ts';
import { asTreeNodeId } from '../lib/types/branded.ts';
import { bindPartnerProfile } from '../lib/operations/partner-profile-bridge.ts';

describe('partner-compliance-onboard', () => {
  test('applies license + discrete geo + NJ identity default', () => {
    const db = openOperationsDb({ path: ':memory:' });
    const now = new Date().toISOString();
    const id = 'onboard-nj-1';
    db.run(
      `INSERT INTO tree_nodes (id, type, parent_id, expert_id, name, active, status, created_at)
       VALUES ($id, 'partner', NULL, NULL, $id, 1, 'active', $now)`,
      { $id: id, $now: now }
    );
    bindPartnerProfile(db, asTreeNodeId(id));

    const result = applyPartnerComplianceOnboard(db, id, {
      stateCode: 'NJ',
      age: 29,
      location: 'Jersey City',
      zipCode: '07302',
    });
    expect(result.applied).toBe(true);
    expect(result.stateCode).toBe('NJ');
    expect(result.identityVerified).toBe(true);

    const geo = getPartnerGeoProfile(db, id);
    expect(geo?.location).toBe('Jersey City');
    expect(geo?.zipCode).toBe('07302');
    expect(geo?.age).toBe(29);

    const ok = new ComplianceRepository(db).isBetAllowed({
      nodeId: id,
      stateCode: 'NJ',
      sportId: 'soccer',
      marketId: 'match_winner',
      wagerAmount: 100,
      betType: 'straight',
    });
    expect(ok).toEqual({ allowed: true });
    db.close();
  });

  test('parseComplianceOnboardFields maps form wire', () => {
    const opts = parseComplianceOnboardFields({
      state: 'ma',
      age: '32',
      location: 'Boston',
      zip: '02108',
      identityVerified: 'true',
    });
    expect(opts?.stateCode).toBe('MA');
    expect(opts?.age).toBe(32);
    expect(opts?.zipCode).toBe('02108');
    expect(opts?.identityVerified).toBe(true);
  });
});
