#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/reference/bun/argv — Bun.argv
/**
 * Bake redacted partner-profile-coverage.json from private profile TOMLs.
 *
 * Hardens MVP readiness: coverage must include every PartnerCode currently
 * projected by partners-ops (ASH · BIL · NOV · SPEN).
 */
import { loadAllProfiles } from '../lib/partner-profile/bake.ts';
import {
  PARTNER_PROFILE_COVERAGE_INPUT_REF,
  buildPartnerProfileCoverageArtifact,
  derivePartnerProfileCoverage,
  parsePartnerProfileCoverageArtifact,
} from '../packages/partners/src/adapters/profile-coverage.ts';
import { parsePartnerCode } from '../packages/partners/src/core/identifiers.ts';
import { applyUnknownLongOptionGuardFor } from '../lib/docs/ref-id-tool-flags.ts';
import { parseLegacyPartnersOpsProjection } from '../packages/partners/src/compatibility/legacy-partners-ops.ts';

const argv = import.meta.main
  ? applyUnknownLongOptionGuardFor('partner-profile:coverage:bake', Bun.argv.slice(2))
  : Bun.argv.slice(2);
const outputPath = `public${PARTNER_PROFILE_COVERAGE_INPUT_REF}`;
const PARTNERS_OPS_PATH = 'public/registry/partners-ops.json';

async function requiredPartnerCodes(): Promise<ReturnType<typeof parsePartnerCode>[]> {
  const ops = await Bun.file(PARTNERS_OPS_PATH).json();
  const projection = parseLegacyPartnersOpsProjection(ops);
  const codes = projection.partners.map(partner => parsePartnerCode(partner.partnerCode));
  if (codes.length === 0) {
    throw new TypeError(`${PARTNERS_OPS_PATH} has no partner CODEs — cannot gate coverage completeness`);
  }
  return codes;
}

const { profiles, issues } = await loadAllProfiles();
if (issues.length > 0) {
  throw new AggregateError(
    issues.map(issue => new TypeError(issue)),
    'profile coverage input failed'
  );
}

const artifact = buildPartnerProfileCoverageArtifact(profiles, new Date().toISOString());
const required = await requiredPartnerCodes();
const completeness = derivePartnerProfileCoverage(
  parsePartnerProfileCoverageArtifact(artifact),
  required
);
if (!completeness.complete) {
  throw new TypeError(
    `partner profile coverage incomplete for partners-ops CODEs; missing ${completeness.missingCodes.join(', ')} ` +
      `(add config/partner-profiles/<CODE>.toml then re-bake)`
  );
}

const body = `${JSON.stringify(artifact, null, 2)}\n`;

if (argv.includes('--check')) {
  const current = await Bun.file(outputPath)
    .json()
    .catch(() => null);
  const { generatedAt: _currentGeneratedAt, ...currentStable } = current ?? {};
  const { generatedAt: _nextGeneratedAt, ...nextStable } = artifact;
  if (JSON.stringify(currentStable) !== JSON.stringify(nextStable)) {
    throw new TypeError(`${outputPath} is stale; run bun scripts/bake-partner-profile-coverage.ts`);
  }
  console.log(
    `partner profile coverage is current (${Object.keys(artifact.evidenceByPartnerCode).length} profiles · complete for ${required.join(', ')})`
  );
} else {
  await Bun.write(outputPath, body);
  console.log(
    `wrote ${outputPath} (${Object.keys(artifact.evidenceByPartnerCode).length} profiles · complete for ${required.join(', ')})`
  );
}
