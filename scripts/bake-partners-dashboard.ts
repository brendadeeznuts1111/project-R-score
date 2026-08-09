#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/hashing#bun-cryptohasher — Bun.CryptoHasher
/**
 * Bake /registry/partners-dashboard.json — single canonical partner dashboard
 * read model for /portal/partners/.
 *
 * Pipeline (pure package, I/O only at edges):
 *   1. buildPartnerDashboardRecords (profiles · coverage · telegram · legacy · optional ledger)
 *   2. reconcilePartnerDashboardFacts (tennis · sports-terminal · limits · bookmakers)
 *   3. assemblePartnerDashboardArtifact
 *
 * Connector freshness:
 *   Observation clocks come from each input artifact's generatedAt (not the bake
 *   clock). Default bake asOf is max-input so offline fixture composition stays
 *   honest without wall-clock false failures on required profiles. Use
 *   `--as-of now` for production wall-clock semantics.
 *
 * Optional last-known-good:
 *   Successful optional connector loads are cached under
 *   `.cache/partner-dashboard-lkg/<key>.json` (gitignored). Missing optional
 *   inputs fall back to LKG when still inside the 24h window.
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
  connectorSnapshotRefFromPayload,
  extractConnectorObservedAt,
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
  resolveConnectorSnapshotMap,
  resolvePartnerDashboardBakeAsOf,
  type BookmakerCatalogProjection,
  type ConnectorObservation,
  type ConnectorObservationBundle,
  type ConnectorSnapshot,
  type LimitChangeProjection,
  type PartnerAccountingObservation,
  type PartnerConnectorSnapshotKey,
  type SportsTerminalIntegrationProjection,
  type TennisCapacityProjection,
} from '../packages/partners/src/index.ts';

const argv = import.meta.main
  ? applyUnknownLongOptionGuardFor('partner:dashboard:bake', Bun.argv.slice(2))
  : Bun.argv.slice(2);

const outputPath = `public${PARTNER_DASHBOARD_ARTIFACT_REF}`;
const LKG_DIR = '.cache/partner-dashboard-lkg';

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

type LkgEnvelope = {
  key: string;
  observedAt: string;
  inputRef: string;
  snapshotRef: string;
  savedAt: string;
  payload: unknown;
};

function flagValue(name: string): string | undefined {
  const idx = argv.indexOf(name);
  if (idx === -1) return undefined;
  const next = argv[idx + 1];
  if (next === undefined || next.startsWith('--')) {
    throw new TypeError(`${name} requires a value`);
  }
  return next;
}

function observationFromRaw(
  // eslint-disable-next-line harness/no-unknown-function-param -- registry JSON wire edge
  raw: unknown,
  inputRef: string,
  path: string
): ConnectorObservation {
  const observedAt = extractConnectorObservedAt(raw, path);
  const body = JSON.stringify(raw);
  return {
    observedAt,
    inputRef,
    snapshotRef: connectorSnapshotRefFromPayload(body),
  };
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

async function readLkg(key: PartnerConnectorSnapshotKey): Promise<LkgEnvelope | undefined> {
  const path = `${LKG_DIR}/${key}.json`;
  const file = Bun.file(path);
  if (!(await file.exists())) return undefined;
  const raw = await file.json();
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return undefined;
  const env = raw as Record<string, unknown>;
  if (
    env.key !== key ||
    typeof env.observedAt !== 'string' ||
    typeof env.inputRef !== 'string' ||
    typeof env.snapshotRef !== 'string' ||
    env.payload === undefined
  ) {
    return undefined;
  }
  return {
    key,
    observedAt: env.observedAt,
    inputRef: env.inputRef,
    snapshotRef: env.snapshotRef,
    savedAt: typeof env.savedAt === 'string' ? env.savedAt : env.observedAt,
    payload: env.payload,
  };
}

async function writeLkg(
  key: PartnerConnectorSnapshotKey,
  observation: ConnectorObservation,
  // eslint-disable-next-line harness/no-unknown-function-param -- LKG cache stores pre-parse connector JSON
  payload: unknown,
  savedAt: string
): Promise<void> {
  await Bun.write(
    `${LKG_DIR}/${key}.json`,
    `${JSON.stringify(
      {
        key,
        observedAt: observation.observedAt,
        inputRef: observation.inputRef,
        snapshotRef: observation.snapshotRef,
        savedAt,
        payload,
      } satisfies LkgEnvelope,
      null,
      2
    )}\n`
  );
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

export type BuildPartnersDashboardOptions = {
  /** Explicit bake clock; when omitted, resolved from --as-of / max-input. */
  generatedAt?: string;
  /** `now` | `max-input` | ISO. Default max-input. */
  asOfMode?: string;
  /** When false, skip writing LKG cache (tests / check). Default true on write. */
  persistLkg?: boolean;
};

export async function buildPartnersDashboardArtifact(
  generatedAtOrOptions: string | BuildPartnersDashboardOptions = {}
): Promise<ReturnType<typeof assemblePartnerDashboardArtifact>> {
  const options: BuildPartnersDashboardOptions =
    typeof generatedAtOrOptions === 'string'
      ? { generatedAt: generatedAtOrOptions, asOfMode: generatedAtOrOptions }
      : generatedAtOrOptions;

  const [
    profiles,
    coverageRaw,
    legacyRaw,
    telegramFile,
    tennisFile,
    ledgerFile,
    sportsTerminalFile,
    limitsFile,
    bookmakersFile,
  ] = await Promise.all([
    loadJson(PROFILE_PATH),
    loadJson(COVERAGE_PATH),
    loadJson(OPS_PATH),
    loadOptionalJson(TELEGRAM_PATH),
    loadOptionalJson(TENNIS_PATH),
    loadOptionalJson(LEDGER_PATH),
    loadOptionalJson(SPORTS_TERMINAL_PATH),
    loadOptionalJson(LIMITS_PATH),
    loadOptionalJson(BOOKMAKERS_PATH),
  ]);

  // Optional connectors: prefer live file; else LKG payload.
  async function resolveOptional(
    key: PartnerConnectorSnapshotKey,
    fileRaw: unknown | undefined
  ): Promise<{
    raw: unknown | undefined;
    current?: ConnectorObservation;
    lkg?: ConnectorObservation;
  }> {
    const inputRef = PARTNER_DASHBOARD_CONNECTOR_INPUT_REFS[key];
    if (fileRaw !== undefined) {
      const current = observationFromRaw(fileRaw, inputRef, `${key}Artifact`);
      return { raw: fileRaw, current };
    }
    const lkgEnv = await readLkg(key);
    if (lkgEnv && lkgEnv.inputRef === inputRef) {
      return {
        raw: lkgEnv.payload,
        lkg: {
          observedAt: lkgEnv.observedAt,
          inputRef: lkgEnv.inputRef,
          snapshotRef: lkgEnv.snapshotRef,
        },
      };
    }
    return { raw: undefined };
  }

  const telegramResolved = await resolveOptional('telegram', telegramFile);
  const tennisResolved = await resolveOptional('tennis', tennisFile);
  const accountingResolved = await resolveOptional('accounting', ledgerFile);
  const sportsTerminalResolved = await resolveOptional('sportsTerminal', sportsTerminalFile);
  const limitsResolved = await resolveOptional('limits', limitsFile);
  const bookmakersResolved = await resolveOptional('bookmakers', bookmakersFile);

  const profilesObservation = observationFromRaw(
    profiles,
    PARTNER_DASHBOARD_CONNECTOR_INPUT_REFS.profiles,
    'profilesArtifact'
  );

  const observationTimes = [
    profilesObservation.observedAt,
    telegramResolved.current?.observedAt ?? telegramResolved.lkg?.observedAt,
    tennisResolved.current?.observedAt ?? tennisResolved.lkg?.observedAt,
    accountingResolved.current?.observedAt ?? accountingResolved.lkg?.observedAt,
    sportsTerminalResolved.current?.observedAt ?? sportsTerminalResolved.lkg?.observedAt,
    limitsResolved.current?.observedAt ?? limitsResolved.lkg?.observedAt,
    bookmakersResolved.current?.observedAt ?? bookmakersResolved.lkg?.observedAt,
  ].filter((t): t is string => typeof t === 'string');

  const asOfMode =
    options.asOfMode ??
    (typeof options.generatedAt === 'string' && options.generatedAt !== 'max-input'
      ? options.generatedAt
      : 'max-input');
  // When caller passes an explicit ISO as generatedAt (legacy --check path), use it as asOf.
  const asOf =
    options.generatedAt !== undefined &&
    options.generatedAt !== 'max-input' &&
    options.generatedAt !== 'now' &&
    options.asOfMode === undefined
      ? options.generatedAt
      : resolvePartnerDashboardBakeAsOf(
          asOfMode === 'max-input' || asOfMode === 'now' ? asOfMode : asOfMode,
          observationTimes
        );

  const generatedAt =
    options.generatedAt !== undefined &&
    options.generatedAt !== 'max-input' &&
    options.generatedAt !== 'now'
      ? options.generatedAt
      : asOf;

  const bundles: Record<PartnerConnectorSnapshotKey, ConnectorObservationBundle> = {
    profiles: {
      expectedInputRef: PARTNER_DASHBOARD_CONNECTOR_INPUT_REFS.profiles,
      required: true,
      current: profilesObservation,
    },
    accounting: {
      expectedInputRef: PARTNER_DASHBOARD_CONNECTOR_INPUT_REFS.accounting,
      required: false,
      ...(accountingResolved.current ? { current: accountingResolved.current } : {}),
      ...(accountingResolved.lkg ? { lastKnownGood: accountingResolved.lkg } : {}),
    },
    telegram: {
      expectedInputRef: PARTNER_DASHBOARD_CONNECTOR_INPUT_REFS.telegram,
      required: false,
      ...(telegramResolved.current ? { current: telegramResolved.current } : {}),
      ...(telegramResolved.lkg ? { lastKnownGood: telegramResolved.lkg } : {}),
    },
    limits: {
      expectedInputRef: PARTNER_DASHBOARD_CONNECTOR_INPUT_REFS.limits,
      required: false,
      ...(limitsResolved.current ? { current: limitsResolved.current } : {}),
      ...(limitsResolved.lkg ? { lastKnownGood: limitsResolved.lkg } : {}),
    },
    bookmakers: {
      expectedInputRef: PARTNER_DASHBOARD_CONNECTOR_INPUT_REFS.bookmakers,
      required: false,
      ...(bookmakersResolved.current ? { current: bookmakersResolved.current } : {}),
      ...(bookmakersResolved.lkg ? { lastKnownGood: bookmakersResolved.lkg } : {}),
    },
    tennis: {
      expectedInputRef: PARTNER_DASHBOARD_CONNECTOR_INPUT_REFS.tennis,
      required: false,
      ...(tennisResolved.current ? { current: tennisResolved.current } : {}),
      ...(tennisResolved.lkg ? { lastKnownGood: tennisResolved.lkg } : {}),
    },
    sportsTerminal: {
      expectedInputRef: PARTNER_DASHBOARD_CONNECTOR_INPUT_REFS.sportsTerminal,
      required: false,
      ...(sportsTerminalResolved.current ? { current: sportsTerminalResolved.current } : {}),
      ...(sportsTerminalResolved.lkg ? { lastKnownGood: sportsTerminalResolved.lkg } : {}),
    },
  };

  // Optional current older than 24h → mark_unavailable (still may retain payload
  // for offline fixture join; snapshot honesty is the P0).

  const connectorSnapshots = resolveConnectorSnapshotMap(asOf, bundles) as Record<
    PartnerConnectorSnapshotKey,
    ConnectorSnapshot
  >;

  // Persist LKG for optional connectors that loaded from live files and are usable.
  if (options.persistLkg !== false) {
    const persistJobs: Array<Promise<void>> = [];
    for (const key of PARTNER_CONNECTOR_SNAPSHOT_KEYS) {
      if (key === 'profiles') continue;
      const snap = connectorSnapshots[key];
      const resolved =
        key === 'telegram'
          ? telegramResolved
          : key === 'tennis'
            ? tennisResolved
            : key === 'accounting'
              ? accountingResolved
              : key === 'sportsTerminal'
                ? sportsTerminalResolved
                : key === 'limits'
                  ? limitsResolved
                  : bookmakersResolved;
      if (
        resolved.current &&
        resolved.raw !== undefined &&
        (snap.dataStatus === 'ok' || snap.dataStatus === 'stale') &&
        snap.sourceMode === 'current'
      ) {
        persistJobs.push(writeLkg(key, resolved.current, resolved.raw, generatedAt));
      }
    }
    await Promise.all(persistJobs);
  }

  const coverage = parsePartnerProfileCoverageArtifact(coverageRaw);
  const legacyOps = parseLegacyPartnersOpsProjection(legacyRaw);

  if (telegramResolved.raw === undefined) {
    throw new TypeError(
      `missing bake input: ${TELEGRAM_PATH} (and no usable LKG under ${LKG_DIR}/telegram.json)`
    );
  }
  const telegram = parseTelegramHandshakeArtifact(telegramResolved.raw);

  let bookmakers: BookmakerCatalogProjection | undefined;
  if (bookmakersResolved.raw !== undefined) {
    bookmakers = parseBookmakerCatalogArtifact(bookmakersResolved.raw);
  }

  let accounting: PartnerAccountingObservation[] | undefined;
  if (accountingResolved.raw !== undefined) {
    accounting = adaptAccountingFromLedgerSnapshot(accountingResolved.raw, {
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
  if (tennisResolved.raw !== undefined) {
    tennis = parseTennisCapacityArtifact(tennisResolved.raw, {
      ...(bookmakers ? { bookRefMap: bookRefMapFromCatalog(bookmakers) } : {}),
    });
  }

  let sportsTerminal: SportsTerminalIntegrationProjection | undefined;
  if (sportsTerminalResolved.raw !== undefined) {
    sportsTerminal = parseSportsTerminalIntegrationHealth(sportsTerminalResolved.raw);
  }

  let limits: LimitChangeProjection | undefined;
  if (limitsResolved.raw !== undefined && bookmakers) {
    limits = parseLimitChangesArtifact(limitsResolved.raw, {
      treeNodePartnerCodes: parseTreeNodePartnerCodesFromLimitRaises(limitsResolved.raw),
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
    connectorSnapshots: connectorSnapshots as never,
    canonicalProfileCodes: built.canonicalProfileCodes,
    activeOutIds: reconciled.activeOutIds,
    partners: reconciled.partners,
    conflicts: reconciled.conflicts,
  });
}

async function main(): Promise<void> {
  const asOfFlag = flagValue('--as-of') ?? 'max-input';

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
    const next = await buildPartnersDashboardArtifact({
      generatedAt: asOf,
      persistLkg: false,
    });
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

  const artifact = await buildPartnersDashboardArtifact({
    asOfMode: asOfFlag,
    persistLkg: true,
  });
  // Re-parse for bake-time structural guarantee (assemble already parses; defense in depth).
  parsePartnerDashboardArtifact(artifact);
  const body = `${JSON.stringify(artifact, null, 2)}\n`;
  await Bun.write(outputPath, body);
  const snapSummary = PARTNER_CONNECTOR_SNAPSHOT_KEYS.map(key => {
    const s = artifact.connectorSnapshots[key];
    return `${key}=${s.dataStatus}/${s.sourceMode}`;
  }).join(' · ');
  console.log(
    `wrote ${outputPath} (${artifact.summary.partnerCount} partners · ` +
      `${artifact.summary.canonicalProfileCount} canonical · ` +
      `${artifact.summary.activeOutCount} active outs · ` +
      `${artifact.summary.registeredOutCount} outs · schema ${artifact.schema})\n` +
      `  connectors: ${snapSummary}`
  );
}

if (import.meta.main) {
  await main();
}
