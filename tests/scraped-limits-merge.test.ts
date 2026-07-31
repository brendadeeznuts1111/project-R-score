// @see https://bun.com/docs/test/index#run-tests — bun:test
// @see https://bun.com/docs/test — bun:test
import { describe, expect, test } from 'bun:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { asStateCode } from '../lib/types/branded.ts';
import {
  buildScrapedLimitsObservedArtifact,
  expandScrapedLimitSeeds,
  mergeScrapedSeeds,
  observationToScrapedSeed,
  syncScrapedLimits,
} from '../lib/operations/baseline-scraped-limits.ts';
import { appendLimitObservations } from '../lib/operations/scrapers/raw-limits-store.ts';
import type { LimitObservation } from '../lib/operations/scrapers/limit-observation-wire.ts';
import {
  loadScrapeLabSnapshots,
  mergeLabSnapshots,
  observationToLabSnapshot,
  scrapeLabNodeId,
} from '../lib/prediction/limit-forecast-scrape-ingest.ts';
import { buildLimitForecastLab, buildLimitTransitions } from '../lib/prediction/limit-forecast-lab.ts';
import { asTreeNodeId } from '../lib/types/branded.ts';

function obs(partial: Partial<LimitObservation> & Pick<LimitObservation, 'openingMaxUsd'>): LimitObservation {
  return {
    sportsbook: 'draftkings',
    sport: 'basketball',
    market: 'match_winner',
    jurisdiction: asStateCode('NJ'),
    structure: 'straight',
    phase: 'pregame',
    openingMinUsd: 1,
    dailyLimitUsd: null,
    weeklyLimitUsd: null,
    vipLimitUsd: null,
    league: 'nba',
    eventType: 'regular',
    referenceUrl: null,
    sourceRef: 'scrape:test/dk',
    observedAt: '2026-07-31T12:00:00.000Z',
    agent: 'draftkings-agent',
    mode: 'fixture',
    ...partial,
  };
}

describe('Tier 4 JSONL → baseline merge + Lab ingest', () => {
  test('observation overlays fixture cell and appends new cells', () => {
    const fixture = expandScrapedLimitSeeds();
    const override = observationToScrapedSeed(
      obs({ openingMaxUsd: 9_999, sourceRef: 'scrape:live/dk' })
    )!;
    const extra = observationToScrapedSeed(
      obs({
        sportsbook: 'draftkings',
        sport: 'american_football',
        market: 'match_winner',
        openingMaxUsd: 2_500,
        sourceRef: 'scrape:live/dk-nfl',
      })
    )!;
    const { seeds, overridden, appended } = mergeScrapedSeeds(fixture, [override, extra]);
    expect(overridden).toBe(1);
    expect(appended).toBe(1);
    expect(seeds.find(s => s.sourceRef === 'scrape:live/dk')?.openingMaxUsd).toBe(9_999);
    expect(seeds).toHaveLength(fixture.length + 1);
  });

  test('sync preferObservations merges JSONL into Tier 4 companion', async () => {
    const root = mkdtempSync(join(tmpdir(), 'scraped-merge-'));
    try {
      await appendLimitObservations(root, 'draftkings', [
        obs({ openingMaxUsd: 2_222, observedAt: '2026-07-31T10:00:00.000Z' }),
        obs({ openingMaxUsd: 3_333, observedAt: '2026-07-31T11:00:00.000Z' }),
      ]);
      const sync = await syncScrapedLimits({
        root,
        preferObservations: true,
        extractedAt: '2026-07-31T12:00:00.000Z',
      });
      expect(sync.mode).toBe('merged');
      expect(sync.observedCells).toBeGreaterThan(0);
      const cell = sync.rows.find(
        r =>
          r.sportsbook === 'draftkings' &&
          r.sport === 'basketball' &&
          r.market === 'match_winner' &&
          r.structure === 'straight' &&
          r.phase === 'pregame'
      );
      expect(cell?.openingMaxUsd).toBe(3_333);

      const artifact = await buildScrapedLimitsObservedArtifact(root);
      expect(artifact.kind).toBe('scraped-limits-observed');
      expect(artifact.mode).toBe('merged');
      expect(artifact.summary.mergedRows).toBe(sync.count);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test('Lab ingest builds transitions from JSONL history', async () => {
    const root = mkdtempSync(join(tmpdir(), 'scraped-lab-'));
    try {
      await appendLimitObservations(root, 'draftkings', [
        obs({ openingMaxUsd: 500, observedAt: '2026-07-31T10:00:00.000Z' }),
        obs({ openingMaxUsd: 800, observedAt: '2026-07-31T11:00:00.000Z' }),
        obs({ openingMaxUsd: 1_200, observedAt: '2026-07-31T12:00:00.000Z' }),
      ]);
      const scrape = await loadScrapeLabSnapshots(root);
      expect(scrape).toHaveLength(3);
      expect(scrape[0]!.nodeId).toBe(scrapeLabNodeId('draftkings'));
      const transitions = buildLimitTransitions(scrape);
      expect(transitions).toHaveLength(2);
      expect(transitions.every(t => t.raised)).toBe(true);

      const partner = [
        {
          nodeId: asTreeNodeId('partner-1'),
          sportsbook: 'fanduel',
          sportKey: 'basketball',
          marketKey: 'point_spread',
          phase: 'pregame',
          maxWager: 1_000,
          recordedAt: 1_700_000_000,
        },
        {
          nodeId: asTreeNodeId('partner-1'),
          sportsbook: 'fanduel',
          sportKey: 'basketball',
          marketKey: 'point_spread',
          phase: 'pregame',
          maxWager: 1_500,
          recordedAt: 1_700_000_100,
        },
      ];
      const merged = mergeLabSnapshots(partner, scrape);
      const lab = buildLimitForecastLab(merged, '2026-07-31T12:00:00.000Z', undefined, {
        database: 'data/operations.db',
        table: 'partner_account_limits',
        mode: 'read-only',
        scrapeJsonl: 'artifacts/raw-limits',
        partnerSnapshots: partner.length,
        scrapeSnapshots: scrape.length,
      });
      expect(lab.source.scrapeSnapshots).toBe(3);
      expect(lab.dataset.snapshots).toBe(5);
      expect(lab.dataset.transitions).toBe(3);
      expect(
        observationToLabSnapshot({ ...obs({ openingMaxUsd: 100 }), openingMaxUsd: null })
      ).toBeNull();
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
