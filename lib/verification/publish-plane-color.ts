// @see https://bun.com/docs/runtime/color#flexible-input — Bun.color
/**
 * Publish-plane soft-pass → partner-ops color kernel.
 * Concept ids live in PARTNER_OPS_CONCEPT_COLORS; this module resolves wires for proofs/board.
 *
 * @see lib/telegram/partner-ops-color-kernel.ts
 */
import {
  partnerOpsConceptColorWire,
  type PartnerOpsColorKey,
  type PartnerOpsColorWire,
  type PartnerOpsConceptColorId,
} from '../telegram/partner-ops-color-kernel.ts';

/** Stable concept id for SSOT soft-pass (maps artifactId `ssot-flow-soft`). */
export const PUBLISH_SSOT_FLOW_SOFT_CONCEPT_ID =
  'publish.ssot_flow_soft' as const satisfies PartnerOpsConceptColorId;

/** Stable concept id for PM proof (maps artifactId `pm-proof`). */
export const PUBLISH_PM_PROOF_CONCEPT_ID =
  'publish.pm_proof' as const satisfies PartnerOpsConceptColorId;

export const PUBLISH_MODE_SOFT_CONCEPT_ID =
  'publish.mode.soft' as const satisfies PartnerOpsConceptColorId;

export const PUBLISH_MODE_STRICT_CONCEPT_ID =
  'publish.mode.strict' as const satisfies PartnerOpsConceptColorId;

export type PublishPlaneColorBlock = PartnerOpsColorWire & {
  conceptId: PartnerOpsConceptColorId;
};

export function publishPlaneColorForConcept(
  conceptId: PartnerOpsConceptColorId
): PublishPlaneColorBlock {
  const wire = partnerOpsConceptColorWire(conceptId);
  return { conceptId, ...wire };
}

export function publishPlaneModeConceptId(
  mode: 'soft' | 'strict'
): typeof PUBLISH_MODE_SOFT_CONCEPT_ID | typeof PUBLISH_MODE_STRICT_CONCEPT_ID {
  return mode === 'strict' ? PUBLISH_MODE_STRICT_CONCEPT_ID : PUBLISH_MODE_SOFT_CONCEPT_ID;
}

export function publishPlaneModeColorKey(mode: 'soft' | 'strict'): PartnerOpsColorKey {
  return publishPlaneColorForConcept(publishPlaneModeConceptId(mode)).colorKey;
}
