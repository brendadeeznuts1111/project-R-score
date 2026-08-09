#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/reference/bun/argv — Bun.argv
/**
 * Bake redacted partner-profile-coverage.json from private profile TOMLs.
 *
 * Completeness gate: every CODE with a private profile TOML must appear in the
 * coverage artifact (outs inventory SSOT is profile-owned; partners-ops is not
 * required for this gate).
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

const argv = import.meta.main
  ? applyUnknownLongOptionGuardFor('partner-profile:coverage:bake', Bun.argv.slice(2))
  : Bun.argv.slice(2);
const outputPath = `public${PARTNER_PROFILE_COVERAGE_INPUT_REF}`;

const { profiles, issues } = await loadAllProfiles();
if (issues.length > 0) {
  throw new AggregateError(
    issues.map(issue => new TypeError(issue)),
    'profile coverage input failed'
  );
}

const required = Object.keys(profiles)
  .sort()
  .map(code => parsePartnerCode(code));
if (required.length === 0) {
  throw new TypeError(
    'config/partner-profiles has no valid profile TOMLs — cannot gate coverage completeness'
  );
}

const artifact = buildPartnerProfileCoverageArtifact(profiles, new Date().toISOString());
const completeness = derivePartnerProfileCoverage(
  parsePartnerProfileCoverageArtifact(artifact),
  required
);
if (!completeness.complete) {
  throw new TypeError(
    `partner profile coverage incomplete for private profile CODEs; missing ${completeness.missingCodes.join(', ')} ` +
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
