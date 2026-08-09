import { describe, expect, it } from 'bun:test';
import {
  PARTNER_DASHBOARD_SEMANTIC_GAPS,
  PARTNERS_PACKAGE_TARGET,
} from '../packages/partners/src/index.ts';

describe('@factorywager/partners core', () => {
  it('exports the canonical workspace target', () => {
    expect(PARTNERS_PACKAGE_TARGET).toEqual({
      target_name: '@factorywager/partners',
      target_workspace: 'packages/partners',
      implementation_status: 'artifact-core-implemented',
    });
  });

  it('exports unique semantic gap keys and candidate concepts', () => {
    // Gaps closed when plan reached implementation-ready (#621).
    expect(PARTNER_DASHBOARD_SEMANTIC_GAPS).toHaveLength(0);
    expect(new Set(PARTNER_DASHBOARD_SEMANTIC_GAPS.map(gap => gap.key)).size).toBe(0);
    expect(
      new Set(PARTNER_DASHBOARD_SEMANTIC_GAPS.map(gap => gap.candidate_concept_id)).size
    ).toBe(0);
  });
});
