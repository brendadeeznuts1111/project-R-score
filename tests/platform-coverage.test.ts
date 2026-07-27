// @see https://bun.com/docs/test/index#run-tests
import { describe, expect, test } from 'bun:test';
import { openOperationsDb } from '../lib/operations/db.ts';
import {
  agentHasPlatformAccount,
  canOfferOnPlatform,
  detectPlatformFromText,
  getCoverageSummary,
  getPlatformCapacities,
  platformSlug,
  recordCoverageSnapshot,
} from '../lib/operations/platform-coverage.ts';
import { ensurePosition } from '../lib/operations/liquidity.ts';
import { DODVerifier } from '../lib/dod/verifier.ts';

const PNG_1PX = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
);

describe('platform-coverage', () => {
  test('platformSlug normalizes Hard Rock Bet → hardrock', () => {
    expect(platformSlug('Hard Rock Bet')).toBe('hardrock');
    expect(platformSlug('DraftKings')).toBe('draftkings');
  });

  test('coverage + capacities + canOffer gate', () => {
    const db = openOperationsDb({ path: ':memory:' });
    const now = new Date().toISOString();

    db.run(
      `INSERT INTO platforms (id, name, category, url, active, status, created_at)
       VALUES ('draftkings', 'DraftKings', 'sportsbook', 'https://draftkings.com', 1, 'active', $n),
              ('fanduel', 'FanDuel', 'sportsbook', 'https://fanduel.com', 1, 'active', $n),
              ('kalshi', 'Kalshi', 'exchange', 'https://kalshi.com', 1, 'active', $n)`,
      { $n: now }
    );

    const partnerId = Bun.randomUUIDv7();
    db.run(
      `INSERT INTO tree_nodes (id, type, name, active, status, created_at)
       VALUES ($id, 'partner', 'P', 1, 'partner', $n)`,
      { $id: partnerId, $n: now }
    );

    db.run(
      `INSERT INTO partner_platform_accounts
         (id, platform_id, partner_id, account_identifier, balance, status, opened_at, created_at)
       VALUES ($id, 'draftkings', $p, 'dk-1', 1000, 'active', $n, $n)`,
      { $id: Bun.randomUUIDv7(), $p: partnerId, $n: now }
    );

    ensurePosition(db, partnerId, 'draftkings', 5000);
    db.run(
      `UPDATE positions SET available = 5000, deposited = 5000 WHERE node_id = $n AND book = 'draftkings'`,
      { $n: partnerId }
    );

    const summary = getCoverageSummary(db);
    expect(summary.total).toBe(3);
    expect(summary.covered).toBe(1);
    expect(summary.pct).toBeCloseTo(33.33, 1);

    const caps = getPlatformCapacities(db);
    const dk = caps.find(c => c.platformId === 'draftkings');
    expect(dk?.totalAvailable).toBe(5000);
    expect(dk?.coverageScore).toBeGreaterThan(0);

    expect(canOfferOnPlatform(db, 'draftkings', 100, 30)).toBe(true);
    expect(canOfferOnPlatform(db, 'fanduel', 100, 30)).toBe(false);

    const snap = recordCoverageSnapshot(db);
    expect(snap.covered).toBe(1);

    expect(detectPlatformFromText(db, 'DraftKings balance $1,234.56')).toBe('draftkings');
    expect(agentHasPlatformAccount(db, partnerId, 'draftkings')).toBe(true);
    expect(agentHasPlatformAccount(db, partnerId, 'fanduel')).toBe(false);

    db.close();
  });

  test('is_test accounts are excluded from coverage covered counts', () => {
    const db = openOperationsDb({ path: ':memory:' });
    const now = new Date().toISOString();
    db.run(
      `INSERT INTO platforms (id, name, category, url, active, status, created_at)
       VALUES ('sandbox-book', 'Sandbox', 'sportsbook', 'https://sandbox.example', 1, 'active', $n),
              ('draftkings', 'DraftKings', 'sportsbook', 'https://draftkings.com', 1, 'active', $n)`,
      { $n: now }
    );
    const partnerId = Bun.randomUUIDv7();
    db.run(
      `INSERT INTO tree_nodes (id, type, name, active, status, created_at)
       VALUES ($id, 'partner', 'P', 1, 'partner', $n)`,
      { $id: partnerId, $n: now }
    );
    db.run(
      `INSERT INTO partner_platform_accounts
         (id, platform_id, partner_id, account_identifier, balance, status, is_test, opened_at, created_at)
       VALUES ($id, 'sandbox-book', $p, 't1', 100, 'active', 1, $n, $n)`,
      { $id: Bun.randomUUIDv7(), $p: partnerId, $n: now }
    );
    const summary = getCoverageSummary(db);
    expect(summary.total).toBe(2);
    expect(summary.covered).toBe(0);
    db.close();
  });

  test('DOD balance with platformHint flags unknown book', async () => {
    // Skip headless WebView watermark only — platform detect must stay on for this case.
    Bun.env.DOD_WATERMARK = '0';
    const scratch = `.tmp/dod-cov-${Bun.randomUUIDv7()}`;
    await Bun.$`rm -rf ${scratch} && mkdir -p ${scratch}`.quiet();

    const dbPath = `${scratch}/ops.db`;
    const db = openOperationsDb({ path: dbPath });
    const now = new Date().toISOString();
    db.run(
      `INSERT INTO platforms (id, name, category, active, status, created_at)
       VALUES ('draftkings', 'DraftKings', 'sportsbook', 1, 'active', $n)`,
      { $n: now }
    );
    const agentId = Bun.randomUUIDv7();
    db.run(
      `INSERT INTO tree_nodes (id, type, name, active, status, created_at)
       VALUES ($id, 'agent', 'A', 1, 'active', $n)`,
      { $id: agentId, $n: now }
    );
    db.close();

    const png2x2 = await new Bun.Image(new Uint8Array(PNG_1PX)).resize(2, 2).png().bytes();
    const verifier = new DODVerifier(dbPath, {
      evidenceRoot: `${scratch}/evidence`,
      registryPath: `${scratch}/registry.json`,
    });

    const flagged = await verifier.process({
      id: Bun.randomUUIDv7(),
      agentId,
      type: 'balance',
      rawImage: png2x2,
      submittedAt: now,
      platformHint: 'draftkings',
    });
    expect(flagged.status).toBe('flagged');
    expect(flagged.flagReason).toMatch(/draftkings/i);
    expect(flagged.platformId).toBe('draftkings');
    expect(flagged.tamperScore).toBeGreaterThanOrEqual(50);

    // Give them an account — next submit should not add the account flag
    const db2 = openOperationsDb({ path: dbPath, skipInit: true });
    db2.run(
      `INSERT INTO partner_platform_accounts
         (id, platform_id, partner_id, account_identifier, balance, status, opened_at, created_at)
       VALUES ($id, 'draftkings', $a, 'x', 100, 'active', $n, $n)`,
      { $id: Bun.randomUUIDv7(), $a: agentId, $n: now }
    );
    db2.close();

    const ok = await verifier.process({
      id: Bun.randomUUIDv7(),
      agentId,
      type: 'balance',
      rawImage: png2x2,
      submittedAt: now,
      platformHint: 'draftkings',
    });
    expect(ok.platformId).toBe('draftkings');
    expect(ok.flagReason).toBeUndefined();
    expect(ok.status).not.toBe('flagged');

    await Bun.$`rm -rf ${scratch}`.quiet();
  });
});
