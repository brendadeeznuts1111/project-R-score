#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/reference/bun/argv — Bun.argv
/**
 * Bake /registry/partners-dashboard.json — single canonical partner dashboard
 * read model for /portal/partners/.
 *
 * Joins existing public registry sources via pure package builders:
 *   buildPartnerDashboardRecords + evaluateConnectorFreshness + assemblePartnerDashboardArtifact
 *
 * Empty accounting + empty activeOutIds are intentional until those connectors join.
 */
import { applyUnknownLongOptionGuardFor } from '../lib/docs/ref-id-tool-flags.ts';
import {
  PARTNER_CONNECTOR_SNAPSHOT_KEYS,
  PARTNER_DASHBOARD_ARTIFACT_REF,
  PARTNER_DASHBOARD_CONNECTOR_INPUT_REFS,
  assemblePartnerDashboardArtifact,
  buildPartnerDashboardRecords,
  evaluateConnectorFreshness,
  parseLegacyPartnersOpsProjection,
  parsePartnerDashboardArtifact,
  parsePartnerProfileCoverageArtifact,
  parseTelegramHandshakeArtifact,
  type ConnectorSnapshot,
} from '../packages/partners/src/index.ts';

const argv = import.meta.main
  ? applyUnknownLongOptionGuardFor('partner:dashboard:bake', Bun.argv.slice(2))
  : Bun.argv.slice(2);

const outputPath = `public${PARTNER_DASHBOARD_ARTIFACT_REF}`;

const PROFILE_PATH = 'public/registry/partner-profiles.json';
const COVERAGE_PATH = 'public/registry/partner-profile-coverage.json';
const OPS_PATH = 'public/registry/partners-ops.json';
const TELEGRAM_PATH = 'public/registry/telegram-handshake.json';

function connectorSnapshots(asOf: string): Record<string, ConnectorSnapshot> {
  return Object.fromEntries(
    PARTNER_CONNECTOR_SNAPSHOT_KEYS.map(key => {
      const decision = evaluateConnectorFreshness({
        asOf,
        expectedInputRef: PARTNER_DASHBOARD_CONNECTOR_INPUT_REFS[key],
        required: key === 'profiles',
        ...(key === 'sportsTerminal'
          ? {}
          : {
              current: {
                observedAt: asOf,
                inputRef: PARTNER_DASHBOARD_CONNECTOR_INPUT_REFS[key],
              },
            }),
      });
      if (decision.disposition === 'fail_bake') {
        throw new TypeError(
          `connector ${key} fail_bake: ${decision.reasonCode} (input ${PARTNER_DASHBOARD_CONNECTOR_INPUT_REFS[key]})`
        );
      }
      return [key, decision.snapshot];
    })
  ) as Record<string, ConnectorSnapshot>;
}

async function loadJson(path: string): Promise<unknown> {
  const file = Bun.file(path);
  if (!(await file.exists())) {
    throw new TypeError(`missing bake input: ${path}`);
  }
  return file.json();
}

export async function buildPartnersDashboardArtifact(
  generatedAt = new Date().toISOString()
): Promise<ReturnType<typeof assemblePartnerDashboardArtifact>> {
  const [profiles, coverageRaw, legacyRaw, telegramRaw] = await Promise.all([
    loadJson(PROFILE_PATH),
    loadJson(COVERAGE_PATH),
    loadJson(OPS_PATH),
    loadJson(TELEGRAM_PATH),
  ]);

  const coverage = parsePartnerProfileCoverageArtifact(coverageRaw);
  const legacyOps = parseLegacyPartnersOpsProjection(legacyRaw);
  const telegram = parseTelegramHandshakeArtifact(telegramRaw);

  const built = buildPartnerDashboardRecords({
    generatedAt,
    partnerProfiles: profiles,
    profileCoverage: coverage,
    legacyOps,
    telegram,
  });

  return assemblePartnerDashboardArtifact({
    generatedAt,
    connectorSnapshots: connectorSnapshots(generatedAt) as never,
    canonicalProfileCodes: built.canonicalProfileCodes,
    activeOutIds: built.activeOutIds,
    partners: built.partners,
  });
}

async function main(): Promise<void> {
  if (argv.includes('--check')) {
    const current = await Bun.file(outputPath)
      .json()
      .catch(() => null);
    if (current == null || typeof current !== 'object') {
      throw new TypeError(`${outputPath} is missing; run bun run partner:dashboard:bake`);
    }
    // Rebuild with the committed bake clock so nested observedAt/lifecycle stamps match.
    const asOf =
      typeof (current as { generatedAt?: unknown }).generatedAt === 'string'
        ? (current as { generatedAt: string }).generatedAt
        : new Date().toISOString();
    const next = await buildPartnersDashboardArtifact(asOf);
    parsePartnerDashboardArtifact(next);
    if (JSON.stringify(current) !== JSON.stringify(next)) {
      throw new TypeError(`${outputPath} is stale; run bun run partner:dashboard:bake`);
    }
    console.log(
      `partners-dashboard is current (${next.summary.partnerCount} partners · ` +
        `${next.summary.canonicalProfileCount} canonical · ` +
        `${next.summary.registeredOutCount} outs)`
    );
    return;
  }

  const artifact = await buildPartnersDashboardArtifact();
  // Re-parse for bake-time structural guarantee (assemble already parses; defense in depth).
  parsePartnerDashboardArtifact(artifact);
  const body = `${JSON.stringify(artifact, null, 2)}\n`;
  await Bun.write(outputPath, body);
  console.log(
    `wrote ${outputPath} (${artifact.summary.partnerCount} partners · ` +
      `${artifact.summary.canonicalProfileCount} canonical · ` +
      `${artifact.summary.registeredOutCount} outs · schema ${artifact.schema})`
  );
}

if (import.meta.main) {
  await main();
}
