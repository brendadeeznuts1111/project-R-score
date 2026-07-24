/**
 * TOC play routing — weightedScore rank + rope throttle defer matrix.
 */
import { describe, expect, test } from 'bun:test';
import { randomUUIDv7 } from 'bun';
import { openOperationsDb } from '../lib/operations/db.ts';
import {
  loadTocRoutingContext,
  rankPlayRecipients,
} from '../lib/operations/toc-play-routing.ts';
import { withTocMetrics } from '../lib/toc-ops/export-snapshot.ts';
import { buildDemoTocOpsFixture } from '../lib/toc-ops/fixture.ts';

function seedAgent(
  db: ReturnType<typeof openOperationsDb>,
  expertId: string, // brand-ok
  nodeId: string, // brand-ok
  callSign: string | null,
  telegramId: string // brand-ok
) {
  const now = new Date().toISOString();
  db.run(
    `INSERT INTO tree_nodes (id, type, parent_id, expert_id, name, call_sign, telegram_id, active, status, created_at)
     VALUES ($id, 'agent', NULL, $eid, $name, $cs, $tg, 1, 'active', $now)`,
    {
      $id: nodeId,
      $eid: expertId,
      $name: callSign ?? 'Agent',
      $cs: callSign,
      $tg: telegramId,
      $now: now,
    }
  );
}

describe('toc-play-routing', () => {
  test('loadTocRoutingContext falls back to demo fixture when registry missing', () => {
    const ctx = loadTocRoutingContext('/tmp/nonexistent-toc-registry-root');
    expect(ctx.snap.partners.length).toBeGreaterThan(0);
    expect(ctx.scoreByCallSign.size).toBeGreaterThan(0);
  });

  test('rankPlayRecipients assigns rankedRank after sort', () => {
    const db = openOperationsDb({ path: ':memory:' });
    const expertId = randomUUIDv7();
    const now = new Date().toISOString();
    db.run(
      `INSERT INTO experts (id, name, sport, market, edge_score, active, created_at)
       VALUES ($id, 'E', 'NBA', 'totals', 0.8, 1, $now)`,
      { $id: expertId, $now: now }
    );
    seedAgent(db, expertId, randomUUIDv7(), 'PAT-001', '111');
    seedAgent(db, expertId, randomUUIDv7(), 'NOV-001', '222');

    const snap = withTocMetrics(buildDemoTocOpsFixture('2026-07-24T00:00:00.000Z'));
    const ctx = loadTocRoutingContext();
    const ranked = rankPlayRecipients(db, expertId, {
      context: {
        ...ctx,
        snap,
        scoreByCallSign: new Map([
          ['PAT-001', 0.9],
          ['NOV-001', 0.15],
        ]),
        throttleOnboarding: false,
        ropeBroken: false,
      },
    });

    expect(ranked[0]!.callSign).toBe('PAT-001');
    expect(ranked[0]!.rankedRank).toBe(1);
    expect(ranked[1]!.rankedRank).toBe(2);
    db.close();
  });

  test('ropeBlocked when throttle on and weightedScore in (0, 0.5)', () => {
    const db = openOperationsDb({ path: ':memory:' });
    const expertId = randomUUIDv7();
    const now = new Date().toISOString();
    db.run(
      `INSERT INTO experts (id, name, sport, market, edge_score, active, created_at)
       VALUES ($id, 'E', 'NBA', 'totals', 0.8, 1, $now)`,
      { $id: expertId, $now: now }
    );
    seedAgent(db, expertId, randomUUIDv7(), 'NOV-001', '333');

    const ctx = loadTocRoutingContext();
    const blocked = rankPlayRecipients(db, expertId, {
      context: {
        ...ctx,
        scoreByCallSign: new Map([['NOV-001', 0.2]]),
        throttleOnboarding: true,
        ropeBroken: false,
      },
    });
    expect(blocked[0]!.ropeBlocked).toBe(true);

    const clear = rankPlayRecipients(db, expertId, {
      context: {
        ...ctx,
        scoreByCallSign: new Map([['NOV-001', 0.2]]),
        throttleOnboarding: false,
        ropeBroken: false,
      },
    });
    expect(clear[0]!.ropeBlocked).toBe(false);

    const high = rankPlayRecipients(db, expertId, {
      context: {
        ...ctx,
        scoreByCallSign: new Map([['NOV-001', 0.85]]),
        throttleOnboarding: true,
        ropeBroken: false,
      },
    });
    expect(high[0]!.ropeBlocked).toBe(false);

    db.close();
  });

  test('no call sign → score 0 and never ropeBlocked', () => {
    const db = openOperationsDb({ path: ':memory:' });
    const expertId = randomUUIDv7();
    const now = new Date().toISOString();
    db.run(
      `INSERT INTO experts (id, name, sport, market, edge_score, active, created_at)
       VALUES ($id, 'E', 'NBA', 'totals', 0.8, 1, $now)`,
      { $id: expertId, $now: now }
    );
    seedAgent(db, expertId, randomUUIDv7(), null, '444');

    const ctx = loadTocRoutingContext();
    const ranked = rankPlayRecipients(db, expertId, {
      context: { ...ctx, throttleOnboarding: true, ropeBroken: false },
    });
    expect(ranked[0]!.weightedScore).toBe(0);
    expect(ranked[0]!.ropeBlocked).toBe(false);
    db.close();
  });
});
