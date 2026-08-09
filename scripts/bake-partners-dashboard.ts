#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/reference/bun/argv — Bun.argv
/**
 * Bake /registry/partners-dashboard.json — single canonical partner dashboard
 * read model for /portal/partners/.
 *
 * Pipeline (pure package, I/O only at edges):
 *   1. buildPartnerDashboardRecords (profiles · coverage · telegram · legacy · optional ledger)
 *   2. reconcilePartnerDashboardFacts (tennis · sports-terminal · limits · bookmakers)
 *   3. assemblePartnerDashboardArtifact
 *
 * Optional ledger: public/registry/partner-ledger.json (redacted public snapshot;
 * schema factorywager.partner-ledger.v1). Soft plays export is not finance
 * authority and is not consumed here. Limit raises never become max-stake.
 */
import { applyUnknownLongOptionGuardFor } from '../lib/docs/ref-id-tool-flags.ts';
import {
  LIMIT_RAISE_SPORTSBOOK_ALIASES,
  PARTNER_CONNECTOR_SNAPSHOT_KEYS,
  PARTNER_DASHBOARD_ARTIFACT_REF,
  PARTNER_DASHBOARD_CONNECTOR_INPUT_REFS,
  adaptAccountingFromLedgerSnapshot,
  assemblePartnerDashboardArtifact,
  bookRefMapFromCatalog,
  buildPartnerDashboardRecords,
  evaluateConnectorFreshness,
  parseTreeNodePartnerCodesFromLimitRaises,
  parseBookmakerCatalogArtifact,
  parseLegacyPartnersOpsProjection,
  parseLimitChangesArtifact,
  parsePartnerDashboardArtifact,
  parsePartnerProfileCoverageArtifact,
  parseSportsTerminalIntegrationHealth,
  parseTelegramHandshakeArtifact,
  parseTennisCapacityArtifact,
  reconcilePartnerDashboardFacts,
  registeredSportsbookIdsFromCatalog,
  type BookmakerCatalogProjection,
  type ConnectorSnapshot,
  type LimitChangeProjection,
  type PartnerAccountingObservation,
  type SportsTerminalIntegrationProjection,
  type TennisCapacityProjection,
} from '../packages/partners/src/index.ts';

const argv = import.meta.main
  ? applyUnknownLongOptionGuardFor('partner:dashboard:bake', Bun.argv.slice(2))
  : Bun.argv.slice(2);

const outputPath = `public${PARTNER_DASHBOARD_ARTIFACT_REF}`;

const PROFILE_PATH = 'public/registry/partner-profiles.json';
const COVERAGE_PATH = 'public/registry/partner-profile-coverage.json';
const OPS_PATH = 'public/registry/partners-ops.json';
const TELEGRAM_PATH = 'public/registry/telegram-handshake.json';
const TENNIS_PATH = 'public/registry/tennis/partner-contracts.json';
/** Optional redacted partner_ledger snapshot — never Soft plays export. */
const LEDGER_PATH = 'public/registry/partner-ledger.json';
/** Optional Sports Terminal integration-health (exact parsed wire). */
const SPORTS_TERMINAL_PATH = 'public/registry/sports-terminal/partner-integration-health.json';
const LIMITS_PATH = 'public/registry/limit-raises.json';
const BOOKMAKERS_PATH = 'public/registry/bookmakers.json';

function connectorSnapshots(asOf: string): Record<string, ConnectorSnapshot> {
  return Object.fromEntries(
    PARTNER_CONNECTOR_SNAPSHOT_KEYS.map(key => {
      const decision = evaluateConnectorFreshness({
        asOf,
        expectedInputRef: PARTNER_DASHBOARD_CONNECTOR_INPUT_REFS[key],
        required: key === 'profiles',
        current: {
          observedAt: asOf,
          inputRef: PARTNER_DASHBOARD_CONNECTOR_INPUT_REFS[key],
        },
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

async function loadOptionalJson(path: string): Promise<unknown | undefined> {
  const file = Bun.file(path);
  if (!(await file.exists())) return undefined;
  return file.json();
}

function bookKeyMapFromLegacy(
  legacy: ReturnType<typeof parseLegacyPartnersOpsProjection>
): Record<string, string> {
  const map: Record<string, string> = {};
  for (const partner of legacy.partners) {
    for (const out of partner.outs) {
      // bare slug + CODE-qualified for accounting book: scopes
      map[out.observedBookSlug] = out.outId;
      map[`${partner.partnerCode}:${out.observedBookSlug}`] = out.outId;
    }
  }
  return map;
}

export async function buildPartnersDashboardArtifact(
  generatedAt = new Date().toISOString()
): Promise<ReturnType<typeof assemblePartnerDashboardArtifact>> {
  const [
    profiles,
    coverageRaw,
    legacyRaw,
    telegramRaw,
    tennisRaw,
    ledgerRaw,
    sportsTerminalRaw,
    limitsRaw,
    bookmakersRaw,
  ] = await Promise.all([
    loadJson(PROFILE_PATH),
    loadJson(COVERAGE_PATH),
    loadJson(OPS_PATH),
    loadJson(TELEGRAM_PATH),
    loadOptionalJson(TENNIS_PATH),
    loadOptionalJson(LEDGER_PATH),
    loadOptionalJson(SPORTS_TERMINAL_PATH),
    loadOptionalJson(LIMITS_PATH),
    loadOptionalJson(BOOKMAKERS_PATH),
  ]);

  const coverage = parsePartnerProfileCoverageArtifact(coverageRaw);
  const legacyOps = parseLegacyPartnersOpsProjection(legacyRaw);
  const telegram = parseTelegramHandshakeArtifact(telegramRaw);

  let bookmakers: BookmakerCatalogProjection | undefined;
  if (bookmakersRaw !== undefined) {
    bookmakers = parseBookmakerCatalogArtifact(bookmakersRaw);
  }

  let accounting: PartnerAccountingObservation[] | undefined;
  if (ledgerRaw !== undefined) {
    accounting = adaptAccountingFromLedgerSnapshot(ledgerRaw, {
      observedAt: generatedAt,
      bookKeyToOutId: bookKeyMapFromLegacy(legacyOps),
    });
  }

  const built = buildPartnerDashboardRecords({
    generatedAt,
    partnerProfiles: profiles,
    profileCoverage: coverage,
    legacyOps,
    telegram,
    ...(accounting ? { accounting } : {}),
  });

  let tennis: TennisCapacityProjection | undefined;
  if (tennisRaw !== undefined) {
    tennis = parseTennisCapacityArtifact(tennisRaw, {
      ...(bookmakers ? { bookRefMap: bookRefMapFromCatalog(bookmakers) } : {}),
    });
  }

  let sportsTerminal: SportsTerminalIntegrationProjection | undefined;
  if (sportsTerminalRaw !== undefined) {
    sportsTerminal = parseSportsTerminalIntegrationHealth(sportsTerminalRaw);
  }

  let limits: LimitChangeProjection | undefined;
  if (limitsRaw !== undefined && bookmakers) {
    limits = parseLimitChangesArtifact(limitsRaw, {
      treeNodePartnerCodes: parseTreeNodePartnerCodesFromLimitRaises(limitsRaw),
      registeredSportsbookIds: registeredSportsbookIdsFromCatalog(bookmakers),
      sportsbookAliases: LIMIT_RAISE_SPORTSBOOK_ALIASES,
    });
  }

  const reconciled = reconcilePartnerDashboardFacts({
    partners: built.partners,
    ...(tennis ? { tennis } : {}),
    ...(sportsTerminal ? { sportsTerminal } : {}),
    ...(limits ? { limits } : {}),
    ...(bookmakers ? { bookmakers } : {}),
  });

  return assemblePartnerDashboardArtifact({
    generatedAt,
    connectorSnapshots: connectorSnapshots(generatedAt) as never,
    canonicalProfileCodes: built.canonicalProfileCodes,
    activeOutIds: reconciled.activeOutIds,
    partners: reconciled.partners,
    conflicts: reconciled.conflicts,
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
        `${next.summary.activeOutCount} active outs · ` +
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
      `${artifact.summary.activeOutCount} active outs · ` +
      `${artifact.summary.registeredOutCount} outs · schema ${artifact.schema})`
  );
}

if (import.meta.main) {
  await main();
}
