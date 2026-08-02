// @see https://bun.com/docs/test/index#run-tests — bun:test
import { describe, expect, test } from 'bun:test';
import { PARTNER_OPS_CONCEPT_COLORS } from '../lib/telegram/partner-ops-color-kernel.ts';
import {
  PUBLISH_MODE_SOFT_CONCEPT_ID,
  PUBLISH_MODE_STRICT_CONCEPT_ID,
  PUBLISH_PM_PROOF_CONCEPT_ID,
  PUBLISH_SSOT_FLOW_SOFT_CONCEPT_ID,
  publishPlaneColorForConcept,
  publishPlaneModeColorKey,
  publishPlaneModeConceptId,
} from '../lib/verification/publish-plane-color.ts';

describe('publish-plane color kernel', () => {
  test('concept ids are pinned in PARTNER_OPS_CONCEPT_COLORS', () => {
    expect(PARTNER_OPS_CONCEPT_COLORS[PUBLISH_SSOT_FLOW_SOFT_CONCEPT_ID]).toBe('tennis');
    expect(PARTNER_OPS_CONCEPT_COLORS[PUBLISH_PM_PROOF_CONCEPT_ID]).toBe('kalshi');
    expect(PARTNER_OPS_CONCEPT_COLORS[PUBLISH_MODE_SOFT_CONCEPT_ID]).toBe('middleware');
    expect(PARTNER_OPS_CONCEPT_COLORS[PUBLISH_MODE_STRICT_CONCEPT_ID]).toBe('trading');
  });

  test('wires resolve Bun.color HEX + CSS tokens', () => {
    const ssot = publishPlaneColorForConcept(PUBLISH_SSOT_FLOW_SOFT_CONCEPT_ID);
    expect(ssot.colorKey).toBe('tennis');
    expect(ssot.hex).toMatch(/^#[0-9A-F]{6}$/i);
    expect(ssot.token).toBe('--partner-ops-tennis');
    expect(ssot.css.length).toBeGreaterThan(0);

    expect(publishPlaneModeConceptId('soft')).toBe(PUBLISH_MODE_SOFT_CONCEPT_ID);
    expect(publishPlaneModeConceptId('strict')).toBe(PUBLISH_MODE_STRICT_CONCEPT_ID);
    expect(publishPlaneModeColorKey('soft')).toBe('middleware');
    expect(publishPlaneModeColorKey('strict')).toBe('trading');
  });
});
