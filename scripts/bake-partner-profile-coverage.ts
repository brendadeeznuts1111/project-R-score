#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/reference/bun/argv — Bun.argv
import { loadAllProfiles } from '../lib/partner-profile/bake.ts';
import {
  PARTNER_PROFILE_COVERAGE_INPUT_REF,
  buildPartnerProfileCoverageArtifact,
} from '../packages/partners/src/adapters/profile-coverage.ts';

const outputPath = `public${PARTNER_PROFILE_COVERAGE_INPUT_REF}`;

const { profiles, issues } = await loadAllProfiles();
if (issues.length > 0) {
  throw new AggregateError(
    issues.map(issue => new TypeError(issue)),
    'profile coverage input failed'
  );
}

const artifact = buildPartnerProfileCoverageArtifact(profiles, new Date().toISOString());
const body = `${JSON.stringify(artifact, null, 2)}\n`;

if (Bun.argv.includes('--check')) {
  const current = await Bun.file(outputPath)
    .json()
    .catch(() => null);
  const { generatedAt: _currentGeneratedAt, ...currentStable } = current ?? {};
  const { generatedAt: _nextGeneratedAt, ...nextStable } = artifact;
  if (JSON.stringify(currentStable) !== JSON.stringify(nextStable)) {
    throw new TypeError(`${outputPath} is stale; run bun scripts/bake-partner-profile-coverage.ts`);
  }
  console.log(
    `partner profile coverage is current (${Object.keys(artifact.evidenceByPartnerCode).length} profiles)`
  );
} else {
  await Bun.write(outputPath, body);
  console.log(
    `wrote ${outputPath} (${Object.keys(artifact.evidenceByPartnerCode).length} profiles)`
  );
}
