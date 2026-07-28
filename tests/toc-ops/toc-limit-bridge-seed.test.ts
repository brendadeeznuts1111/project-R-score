/**
 * TOC identity treeNodeId → partner_account_limits bridge seed + join proof.
 */
import { describe, expect, test } from 'bun:test';
import { queryRecentLimitChanges } from '../../lib/account-limits-repo.ts';
import { openOperationsDb } from '../../lib/operations/db.ts';
import {
  seedTocLimitBridgeSync,
  type TocBridgeIdentityInput,
} from '../../lib/operations/toc-limit-bridge-seed.ts';
import {
  joinLimitChangesToPartners,
  partnerJoinKeysFromToc,
  raiseCountForPartner,
} from '../../lib/toc-ops/limit-raises-join.ts';

const ASH_PARTNER = '019f92bf-40d6-72e3-aa09-f0a9b8a95824';
const ASH_001 = '019f92ee-5ef8-71e9-b207-5ae20c07d095';
const ASH_002 = '019f92ee-5ef9-728d-950c-6c02a59903a2';
const PAT_PARTNER = '019f92bf-40d6-72e4-bfd9-0c06e5891188';
const PAT_001 = '019fa2d3-c5a0-74f9-b159-730b0c911784';

const demoIdentity: TocBridgeIdentityInput = {
  partners: [
    {
      partnerCode: 'ASH',
      treeNodeId: ASH_PARTNER,
      accounts: [
        { callSign: 'ASH-001', treeNodeId: ASH_001 },
        { callSign: 'ASH-002', treeNodeId: ASH_002 },
      ],
    },
    {
      partnerCode: 'PAT',
      treeNodeId: PAT_PARTNER,
      accounts: [{ callSign: 'PAT-001', treeNodeId: PAT_001 }],
    },
  ],
};

const tocPartners = [
  {
    partnerCode: 'ASH',
    accounts: [{ callSign: 'ASH-001' }, { callSign: 'ASH-002' }],
  },
  {
    partnerCode: 'PAT',
    accounts: [{ callSign: 'PAT-001' }],
  },
];

describe('toc-ops · toc-limit-bridge-seed', () => {
  test('seeds raises on identity UUIDs and joinLimitRaises hasPerPartner for ASH+PAT', () => {
    const db = openOperationsDb({ path: ':memory:' });
    const now = Math.floor(Date.now() / 1000);

    const seeded = seedTocLimitBridgeSync(db, {
      identity: demoIdentity,
      force: true,
      nowSec: now,
      maxAccountsPerPartner: 2,
    });

    expect(seeded.source).toBe('identity-arg');
    expect(seeded.targets).toHaveLength(2);
    expect(seeded.nodes.some(n => n.nodeId === ASH_PARTNER && n.seeded)).toBe(true);
    expect(seeded.nodes.some(n => n.nodeId === PAT_PARTNER && n.seeded)).toBe(true);
    expect(seeded.raises).toBeGreaterThanOrEqual(2);
    expect(seeded.limitRows).toBeGreaterThanOrEqual(6);

    const changes = queryRecentLimitChanges(db, 48);
    expect(changes.some(c => c.node_id === ASH_PARTNER && c.direction === 'up')).toBe(true);
    expect(changes.some(c => c.node_id === PAT_PARTNER && c.direction === 'up')).toBe(true);
    // limit-demo / partner-42 not touched
    expect(changes.every(c => !String(c.node_id).startsWith('limit-demo-'))).toBe(true);
    expect(changes.every(c => c.node_id !== 'partner-42')).toBe(true);

    const keys = partnerJoinKeysFromToc(tocPartners, demoIdentity);
    const join = joinLimitChangesToPartners(
      changes.map(c => ({ node_id: c.node_id, direction: c.direction })),
      keys
    );

    expect(join.hasPerPartner).toBe(true);
    expect(raiseCountForPartner(join, 'ASH')).toBeGreaterThanOrEqual(1);
    expect(raiseCountForPartner(join, 'PAT')).toBeGreaterThanOrEqual(1);
    // Account UUID raises attribute to partner (not callSign badge unless node_id is callSign)
    expect(join.byPartnerCode.ASH).toBeGreaterThanOrEqual(1);

    db.close();
  });

  test('without force, second seed skips existing TOC nodes', () => {
    const db = openOperationsDb({ path: ':memory:' });
    const now = Math.floor(Date.now() / 1000);
    const first = seedTocLimitBridgeSync(db, {
      identity: demoIdentity,
      force: true,
      nowSec: now,
      maxAccountsPerPartner: 1,
    });
    expect(first.nodes.every(n => n.seeded)).toBe(true);

    const second = seedTocLimitBridgeSync(db, {
      identity: demoIdentity,
      force: false,
      nowSec: now,
      maxAccountsPerPartner: 1,
    });
    expect(second.nodes.every(n => n.skipped)).toBe(true);
    expect(second.limitRows).toBe(0);

    db.close();
  });

  test('force re-seed does not require wiping unrelated limit-demo rows', () => {
    const db = openOperationsDb({ path: ':memory:' });
    const now = Math.floor(Date.now() / 1000);

    // Pre-seed a demo slug that must survive force on TOC bridge nodes
    db.run(
      `INSERT INTO partner_account_limits
         (node_id, sportsbook, sport_id, market_id, bet_type, max_wager, recorded_at, effective_from)
       VALUES ('limit-demo-atlantic', 'draftkings', 'nba', 'totals', 'straight', 1000, $at, $at)`,
      { $at: now - 3600 }
    );

    seedTocLimitBridgeSync(db, {
      identity: demoIdentity,
      force: true,
      nowSec: now,
      maxAccountsPerPartner: 0,
    });
    seedTocLimitBridgeSync(db, {
      identity: demoIdentity,
      force: true,
      nowSec: now,
      maxAccountsPerPartner: 0,
    });

    const demoLeft = db
      .query(
        `SELECT COUNT(*) AS n FROM partner_account_limits WHERE node_id = 'limit-demo-atlantic'`
      )
      .get() as { n: number };
    expect(demoLeft.n).toBe(1);

    db.close();
  });
});
