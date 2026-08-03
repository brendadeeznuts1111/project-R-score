// @see https://bun.com/docs/test — bun:test
import { describe, expect, test } from 'bun:test';

import {
  countPortalConceptUsages,
  countPortalConceptUsagesDetailed,
} from '../lib/portal/concept-usage.ts';

describe('concept usage scan', () => {
  test('surface-mapped chrome concepts have non-zero usage', async () => {
    const counts = await countPortalConceptUsages();
    expect(counts.get('ops.metric.raises') ?? 0).toBeGreaterThan(0);
    expect(counts.get('ops.panel.partner_limit_history') ?? 0).toBeGreaterThan(0);
    expect(counts.get('page.partnerHistory') ?? 0).toBeGreaterThan(0);
  });

  test('breakdown separates surface inventory from html/href', async () => {
    const detailed = await countPortalConceptUsagesDetailed();
    const raises = detailed.get('ops.metric.raises');
    expect(raises).toBeDefined();
    expect(raises!.surface).toBeGreaterThan(0);
    expect(raises!.total).toBe(
      raises!.html + raises!.href + raises!.map + raises!.surface
    );
  });
});
