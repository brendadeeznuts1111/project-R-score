/**
 * TOC ↔ ops identity bridge — partner codes / call signs → tree_nodes.
 */
import { describe, expect, test } from 'bun:test';
import { buildDemoTocOpsFixture } from '../lib/toc-ops/fixture.ts';
import {
  enrichTocFixtureWithIdentity,
  seedTocIdentityBindings,
  buildTocIdentityBridge,
} from '../lib/operations/toc-identity-bridge.ts';
import { openOperationsDb } from '../lib/operations/db.ts';
import { seedOperationsDemo } from '../lib/operations/ops-seed.ts';

describe('toc identity bridge', () => {
  test('binds ASH/PAT/NOV to ops partners and hardrock accounts', async () => {
    const db = openOperationsDb({ path: ':memory:' });
    try {
      await seedOperationsDemo(db, { force: true, ifEmpty: false });
      const fixture = buildDemoTocOpsFixture();
      const seeded = seedTocIdentityBindings(db, fixture.partners, { force: true });
      expect(seeded.partnersBound).toBeGreaterThanOrEqual(3);
      expect(seeded.accountsBound).toBeGreaterThanOrEqual(6);
      expect(seeded.createdNov).toBe(true);

      const ash = db
        .query(`SELECT id, call_sign FROM tree_nodes WHERE call_sign = 'ASH'`)
        .get() as { id: string; call_sign: string } | null; // brand-ok — SQLite wire
      expect(ash?.call_sign).toBe('ASH');

      const agent = db
        .query(`SELECT id FROM tree_nodes WHERE call_sign = 'ASH-001'`)
        .get() as { id: string } | null; // brand-ok — SQLite wire
      expect(agent).toBeTruthy();

      const hr = db
        .query(
          `SELECT book FROM sb_accounts WHERE agent_id = $id AND book = 'hardrock'`
        )
        .get({ $id: agent!.id }) as { book: string } | null;
      expect(hr?.book).toBe('hardrock');

      const bridge = buildTocIdentityBridge(db, fixture.partners);
      expect(bridge.linked).toBe(true);
      expect(bridge.plane).toBe('linked');
      expect(bridge.warning).toContain('DEMO');
      expect(bridge.partners.filter(p => p.linked).length).toBe(3);
      expect(bridge.partners.find(p => p.partnerCode === 'NOV')?.opsName).toContain('NOV');

      const enriched = enrichTocFixtureWithIdentity(db, fixture, { seed: false });
      expect(enriched.plane).toBe('demo-readonly');
      expect(enriched.identity?.linkedPartners).toBe(3);
    } finally {
      db.close();
    }
  });
});
