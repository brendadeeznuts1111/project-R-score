#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/shell#getting-started — Bun.$
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/utils#bun-randomuuidv7 — Bun.randomUUIDv7
// @see https://bun.com/reference/bun/argv — Bun.argv
import { applyUnknownLongOptionGuardFor } from '../lib/docs/ref-id-tool-flags.ts';
/**
 * Bake public-safe Tennis partner contracts join.
 *
 *   bun tools/bake-tennis-partner-contracts.ts
 *   bun tools/bake-tennis-partner-contracts.ts --offline
 *   bun tools/bake-tennis-partner-contracts.ts --check
 *
 * Live mode uses PARTNER_API_TOKEN (never written to the artifact).
 * Offline mode joins partners-ops + telegram-handshake only.
 *
 * Atomic write + keep-last-good: failed/empty live runs never clobber a useful bake.
 */
import { joinPath } from '../lib/path-bun.ts';
import { TENNIS_HQ_RUNTIME_URL } from '../lib/tennis/agent-auth.ts';

const argv = import.meta.main
  ? applyUnknownLongOptionGuardFor('tennis:partner-contracts:bake', Bun.argv.slice(2))
  : Bun.argv.slice(2);
import {
  buildPartnerContractsFromLive,
  buildPartnerContractsFromOfflineJoin,
  mergeFactoryDeskHints,
  TENNIS_PARTNER_CONTRACTS_PATH,
  type TennisPartnerContractsArtifact,
} from '../lib/tennis/partner-contracts.ts';

const root = joinPath(import.meta.dir, '..');
const outPath = joinPath(root, 'public', 'registry', 'tennis', 'partner-contracts.json');
const partnersOpsPath = joinPath(root, 'public', 'registry', 'partners-ops.json');
const handshakePath = joinPath(root, 'public', 'registry', 'telegram-handshake.json');

const check = argv.includes('--check');
const forceOffline = argv.includes('--offline');

async function loadOffline(): Promise<TennisPartnerContractsArtifact> {
  const partnersOps = (await Bun.file(partnersOpsPath).json()) as unknown;
  const handshake = (await Bun.file(handshakePath).json()) as unknown;
  return buildPartnerContractsFromOfflineJoin({ partnersOps, handshake });
}

async function loadExisting(): Promise<TennisPartnerContractsArtifact | null> {
  try {
    if (!(await Bun.file(outPath).exists())) return null;
    return (await Bun.file(outPath).json()) as TennisPartnerContractsArtifact;
  } catch {
    return null;
  }
}

async function fetchLive(token: string): Promise<{ capacity: unknown; finance: unknown } | null> {
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/json',
    'X-Request-ID': Bun.randomUUIDv7(),
  };
  const ctrl = AbortSignal.timeout(15_000);
  const [capRes, finRes] = await Promise.all([
    fetch(`${TENNIS_HQ_RUNTIME_URL}/api/v1/partners/capacity`, { headers, signal: ctrl }),
    fetch(`${TENNIS_HQ_RUNTIME_URL}/api/v1/accounting/finance`, { headers, signal: ctrl }),
  ]);
  if (!capRes.ok || !finRes.ok) {
    console.warn(
      `⚠️ live fetch failed capacity=${capRes.status} finance=${finRes.status}` +
        ` request=${headers['X-Request-ID']} — falling back offline`
    );
    return null;
  }
  return {
    capacity: await capRes.json(),
    finance: await finRes.json(),
  };
}

async function build(): Promise<TennisPartnerContractsArtifact> {
  const offline = await loadOffline();
  if (forceOffline) return offline;

  const token = Bun.env.PARTNER_API_TOKEN?.trim();
  if (!token) {
    console.info('ℹ️ PARTNER_API_TOKEN unset — offline join bake');
    return offline;
  }

  const liveWire = await fetchLive(token);
  if (!liveWire) return offline;

  const live = buildPartnerContractsFromLive(liveWire);
  return mergeFactoryDeskHints(live, offline);
}

/** Prefer keeping last good bake when new artifact is empty/broken. */
function shouldKeepExisting(
  next: TennisPartnerContractsArtifact,
  prev: TennisPartnerContractsArtifact | null
): boolean {
  if (!prev || prev.kind !== next.kind) return false;
  if (next.summary.partnerCount > 0) return false;
  return prev.summary.partnerCount > 0;
}

async function atomicWriteJson(
  path: string,
  // eslint-disable-next-line harness/no-unknown-function-param -- JSON artifact boundary
  data: unknown
): Promise<void> {
  const tmp = `${path}.${Bun.randomUUIDv7()}.tmp`;
  await Bun.write(tmp, `${JSON.stringify(data, null, 2)}\n`);
  // rename is atomic on same filesystem
  await Bun.$`mv ${tmp} ${path}`.quiet();
}

const existing = await loadExisting();

if (check) {
  if (!existing) {
    console.error(
      `❌ missing ${TENNIS_PARTNER_CONTRACTS_PATH}; run bun tools/bake-tennis-partner-contracts.ts`
    );
    process.exit(1);
  }
  console.info(
    `✅ tennis partner-contracts present (${existing.source} · ${existing.summary.partnerCount} partners · ${existing.summary.activeOuts} active outs · baked ${existing.generatedAt})`
  );
  process.exit(0);
}

let artifact: TennisPartnerContractsArtifact;
try {
  artifact = await build();
} catch (err) {
  if (existing && existing.summary.partnerCount > 0) {
    console.error(
      `❌ bake failed — keeping last good bake (${existing.summary.partnerCount} partners · ${existing.generatedAt})`,
      err instanceof Error ? err.message : err
    );
    process.exit(1);
  }
  throw err;
}

if (shouldKeepExisting(artifact, existing)) {
  console.warn(
    `⚠️ new bake empty (source=${artifact.source}) — keeping last good ` +
      `(${existing!.summary.partnerCount} partners · ${existing!.generatedAt})`
  );
  process.exit(1);
}

await atomicWriteJson(outPath, artifact);
console.info(
  `✅ wrote ${TENNIS_PARTNER_CONTRACTS_PATH} (${artifact.source} · ${artifact.summary.partnerCount} partners · ${artifact.summary.activeOuts} active outs · ${artifact.generatedAt})`
);
