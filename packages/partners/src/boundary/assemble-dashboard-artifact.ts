import { parseCanonicalOutId, parsePartnerCode } from '../core/identifiers.ts';
import {
  CANONICAL_PROFILE_SOURCE_SYSTEM_ID,
  PARTNER_CONNECTOR_SNAPSHOT_KEYS,
  PARTNER_DASHBOARD_ARTIFACT_SCHEMA_V1,
  PROFILE_MIGRATION_REQUIRED_REASON,
  type PartnerDashboardArtifact,
  type PartnerDashboardBuildInput,
  type PartnerDashboardRecord,
  type PartnerSourceConflict,
} from '../core/types.ts';
import { parsePartnerDashboardArtifact } from './dashboard-artifact.ts';

function compareAscii(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function uniqueStrings(values: readonly string[], label: string): Set<string> {
  const result = new Set(values);
  if (result.size !== values.length) throw new TypeError(`${label} must not contain duplicates`);
  return result;
}

function clonePartnerRecord(partner: PartnerDashboardRecord): PartnerDashboardRecord {
  return structuredClone(partner);
}

function cloneConflict(conflict: PartnerSourceConflict): PartnerSourceConflict {
  return structuredClone(conflict);
}

/** Assemble and validate a public artifact from already-reconciled partner records. */
export function assemblePartnerDashboardArtifact(
  input: PartnerDashboardBuildInput
): PartnerDashboardArtifact {
  const canonicalProfileCodes = input.canonicalProfileCodes.map(parsePartnerCode);
  const canonicalProfileCodeSet = uniqueStrings(canonicalProfileCodes, 'canonicalProfileCodes');
  const activeOutIds = input.activeOutIds.map(parseCanonicalOutId);
  const activeOutIdSet = uniqueStrings(activeOutIds, 'activeOutIds');

  const partners = input.partners
    .map(clonePartnerRecord)
    .sort((left, right) => compareAscii(left.partnerCode, right.partnerCode));
  const partnerCodeSet = uniqueStrings(
    partners.map(partner => parsePartnerCode(partner.partnerCode)),
    'partners'
  );
  for (const code of canonicalProfileCodeSet) {
    if (!partnerCodeSet.has(code)) {
      throw new TypeError(`canonical profile ${code} has no dashboard partner record`);
    }
  }

  for (const partner of partners) {
    const hasCanonicalSource =
      partner.identity.profileSourceSystemId === CANONICAL_PROFILE_SOURCE_SYSTEM_ID;
    if (canonicalProfileCodeSet.has(partner.partnerCode) !== hasCanonicalSource) {
      throw new TypeError(
        `canonical profile coverage for ${partner.partnerCode} must match ${CANONICAL_PROFILE_SOURCE_SYSTEM_ID}`
      );
    }
  }

  const registeredOutIds = new Set<string>();
  for (const partner of partners) {
    partner.outs.sort((left, right) => compareAscii(left.outId, right.outId));
    partner.attention.sort((left, right) => compareAscii(left.reasonCode, right.reasonCode));
    for (const out of partner.outs) registeredOutIds.add(parseCanonicalOutId(out.outId));
    if (
      !canonicalProfileCodeSet.has(partner.partnerCode) &&
      !partner.attention.some(item => item.reasonCode === PROFILE_MIGRATION_REQUIRED_REASON)
    ) {
      throw new TypeError(
        `legacy-only partner ${partner.partnerCode} requires ${PROFILE_MIGRATION_REQUIRED_REASON} attention`
      );
    }
  }
  for (const outId of activeOutIdSet) {
    if (!registeredOutIds.has(outId)) {
      throw new TypeError(`active OutId is not registered: ${outId}`);
    }
  }
  const sortedActiveOutIds = [...activeOutIdSet].sort(
    compareAscii
  ) as PartnerDashboardArtifact['activeOutIds'];

  const connectorSnapshots = Object.fromEntries(
    PARTNER_CONNECTOR_SNAPSHOT_KEYS.map(key => [
      key,
      structuredClone(input.connectorSnapshots[key]),
    ])
  ) as PartnerDashboardArtifact['connectorSnapshots'];
  const conflicts = (input.conflicts ?? [])
    .map(cloneConflict)
    .sort(
      (left, right) =>
        compareAscii(left.partnerCode, right.partnerCode) ||
        compareAscii(left.fieldPath, right.fieldPath) ||
        compareAscii(left.adapterIds.join('\u0000'), right.adapterIds.join('\u0000'))
    );
  const balancePositions = partners.flatMap(partner => partner.accounting.balancePositions);
  const artifact: PartnerDashboardArtifact = {
    schema: PARTNER_DASHBOARD_ARTIFACT_SCHEMA_V1,
    generatedAt: input.generatedAt,
    connectorSnapshots,
    activeOutIds: sortedActiveOutIds,
    summary: {
      partnerCount: partners.length,
      canonicalProfileCount: canonicalProfileCodeSet.size,
      operatorReadyPartnerCount: partners.filter(
        partner => partner.operationalPhase === 'operator_ready'
      ).length,
      attentionPartnerCount: partners.filter(partner => partner.attention.length > 0).length,
      registeredOutCount: registeredOutIds.size,
      activeOutCount: activeOutIdSet.size,
      balancePositions,
    },
    conflicts,
    partners,
  };
  return parsePartnerDashboardArtifact(artifact);
}
