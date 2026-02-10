import { describe, expect, test } from 'bun:test';
import { loadSearchPolicies, resolveScoreThresholdsForQueryPack } from '../lib/docs/canonical-family';

describe('search policy thresholds by query pack', () => {
  test('falls back to global thresholds for unknown packs', async () => {
    const policies = await loadSearchPolicies('.');
    const unknown = resolveScoreThresholdsForQueryPack(policies, 'unknown_pack');
    expect(unknown.strictLatencyP95WarnMs).toBe(policies.scoreThresholds.strictLatencyP95WarnMs);
  });

  test('applies core_delivery_wide override without changing other thresholds', async () => {
    const policies = await loadSearchPolicies('.');
    const base = resolveScoreThresholdsForQueryPack(policies, 'core_delivery');
    const wide = resolveScoreThresholdsForQueryPack(policies, 'core_delivery_wide');

    expect(base.strictLatencyP95WarnMs).toBe(900);
    expect(wide.strictLatencyP95WarnMs).toBe(base.strictLatencyP95WarnMs);
    expect(wide.strictPeakHeapWarnMB).toBe(base.strictPeakHeapWarnMB);
    expect(wide.strictPeakRssWarnMB).toBe(base.strictPeakRssWarnMB);
    expect(wide.strictReliabilityFloor).toBe(base.strictReliabilityFloor);
  });
});
