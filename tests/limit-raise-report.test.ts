// @see https://bun.com/docs/test/index#run-tests
// @see https://bun.com/docs/runtime/utils#bun-inspect-custom — Bun.inspect.custom
// @see https://bun.com/docs/runtime/utils#bun-inspect-table-tabulardata-properties-options — Bun.inspect.table
import { describe, expect, test } from 'bun:test';
import { Database } from 'bun:sqlite';
import {
  ensureAccountLimitsSchema,
  seedAccountLimitsDemo,
} from '../lib/account-limits-repo.ts';
import { PartnerAnalyticsRepository } from '../lib/operations/partner-analytics-repo.ts';
import {
  LIMIT_RAISE_TABLE_PROPERTIES,
  LimitRaiseReport,
} from '../lib/operations/limit-raise-report.ts';
import { inspectCustom } from '../lib/console-depth.ts';

describe('LimitRaiseReport · Bun.inspect.table + custom', () => {
  test('inspect.custom renders tables with explicit properties', () => {
    const db = new Database(':memory:');
    ensureAccountLimitsSchema(db);
    const now = Math.floor(Date.now() / 1000);
    const { nodeId } = seedAccountLimitsDemo(db, { nowSec: now, force: true });
    const analytics = new PartnerAnalyticsRepository(db, nodeId);
    analytics.sealMissingRaiseContextProofs(now - 86400);
    const raises = analytics.getEnrichedRaisesWithContext(now - 86400);
    const report = new LimitRaiseReport(raises, {
      nodeId,
      hours: 24,
      multi: true,
    });

    const text = report[inspectCustom](undefined, { colors: false });
    expect(text).toContain('LimitRaiseReport');
    expect(text).toContain('RAISES');
    expect(text).toContain('Bun.inspect.table');
    expect(text).toContain('draftkings');
    expect(text).toContain('MULTI-FACTOR DRIVERS');
    expect(text).toContain('CLV MOVERS');
    expect(text).toContain('DEEP');

    const rendered = report.render({ colors: false });
    expect(rendered.raises).toContain('book');
    expect(rendered.raises).toContain('draftkings');

    const proof = report.tableProof();
    expect(proof.raises.properties).toEqual([...LIMIT_RAISE_TABLE_PROPERTIES]);
    expect(proof.raises.renderIdempotent).toBe(true);
    expect(proof.raises.rowsStable).toBe(true);
    expect(proof.raises.columnWidths.book).toBeGreaterThan(0);

    const deep = report.deepPayload() as Array<Record<string, unknown>>;
    expect(Array.isArray(deep)).toBe(true);
    expect(Array.isArray(deep[0]!.top_contributing_factors)).toBe(true);
    expect(Array.isArray(deep[0]!.peak_betting_hours)).toBe(true);
    // Uint8Array when proof digest sealed on context
    const bytes = deep[0]!.proof_digest_bytes;
    if (bytes != null) {
      expect(bytes).toBeInstanceOf(Uint8Array);
      expect((bytes as Uint8Array).byteLength).toBeGreaterThan(0);
    }

    const json = report.toJSON() as { tableProof: { raises: { renderIdempotent: boolean } } };
    expect(json.tableProof.raises.renderIdempotent).toBe(true);
    db.close();
  });

  test('console.log path uses inspect.custom (string contains table borders)', () => {
    const db = new Database(':memory:');
    ensureAccountLimitsSchema(db);
    const now = Math.floor(Date.now() / 1000);
    const { nodeId } = seedAccountLimitsDemo(db, { nowSec: now, force: true });
    const raises = new PartnerAnalyticsRepository(db, nodeId).getEnrichedRaisesWithContext(
      now - 86400
    );
    const report = new LimitRaiseReport(raises, { nodeId, multi: true });
    const viaInspect = Bun.inspect(report, { colors: false });
    expect(viaInspect).toContain('┌');
    expect(viaInspect).toContain('score');
    db.close();
  });
});
