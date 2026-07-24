// @see https://bun.com/docs/runtime/shell#getting-started — Bun.$
// @see https://bun.com/docs/runtime/hashing#bun-cryptohasher — Bun.CryptoHasher
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see ./channels.ts — channel resolution
// @see ./proof-diff.ts — regression diff machinery
/**
 * Ratchet — version-locked verification per release channel.
 *
 * Stores the last verified version + proof hash per channel in
 * `public/registry/ratchet.json` (committed). Detects regressions when a
 * channel moves (fewer passes than the previous record) and blocks the
 * update; `--force` re-verifies even when the version is unchanged.
 */

import { getRuntimeChannel, type ChannelResolution } from './channels.ts';
import { runBunRuntimeNitsVerification } from './bun-runtime-nits-probes.ts';
import { runRegistryClientVerification } from './registry-client-probes.ts';
import type { VerificationResult } from './types.ts';

export type RatchetRecord = {
  version: string;
  verifiedAt: string;
  proofHash: string;
  provenance: {
    testSuiteCommit: string;
    ciRunId?: string; // brand-ok — opaque CI run id
  };
  summary: { total: number; passed: number };
};

export type RatchetDB = {
  schemaVersion: 1;
  channels: Record<string, RatchetRecord>;
};

export const RATCHET_PATH = 'public/registry/ratchet.json';

export async function loadRatchet(): Promise<RatchetDB> {
  try {
    const file = Bun.file(RATCHET_PATH);
    if (await file.exists()) return (await file.json()) as RatchetDB;
  } catch {
    /* malformed → start fresh */
  }
  return { schemaVersion: 1, channels: {} };
}

export async function saveRatchet(db: RatchetDB): Promise<void> {
  await Bun.write(RATCHET_PATH, JSON.stringify(db, null, 2) + '\n');
}

export async function getChannelRatchet(channel: string): Promise<RatchetRecord | null> {
  const db = await loadRatchet();
  return db.channels[channel] ?? null;
}

export async function updateRatchet(channel: string, record: RatchetRecord): Promise<void> {
  const db = await loadRatchet();
  db.channels[channel] = record;
  await saveRatchet(db);
}

export type ChannelDelta = {
  currentVersion: string;
  previousVersion: string | null;
  isNew: boolean;
  resolution: ChannelResolution;
};

/** Has the channel moved to a new version since the last verification? */
export async function getChannelDelta(channel: string): Promise<ChannelDelta> {
  // Runtime channel resolution (Bun.version) — deterministic, no network.
  // resolveChannel(channel) does full GitHub resolution when needed.
  const resolution = getRuntimeChannel();
  const previous = await getChannelRatchet(channel);
  const currentVersion = resolution.resolvedVersion;
  return {
    currentVersion,
    previousVersion: previous?.version ?? null,
    isNew: !previous || previous.version !== currentVersion,
    resolution,
  };
}

async function gitCommitShort(): Promise<string> {
  try {
    return (await Bun.$`git rev-parse --short HEAD`.text()).trim();
  } catch {
    return 'unknown';
  }
}

export type RatchetRunResult = {
  results: VerificationResult[];
  proofHash: string;
  summary: { total: number; passed: number };
};

/** Compose all probe suites into one verification run. */
export async function runRatchetVerification(): Promise<RatchetRunResult> {
  const nits = await runBunRuntimeNitsVerification();
  const sdk = await runRegistryClientVerification();
  const results = [...nits.results, ...sdk.results] as VerificationResult[];
  const passed = results.filter(r => r.passed).length;
  const proofHash = new Bun.CryptoHasher('sha256').update(JSON.stringify(results)).digest('hex');
  return { results, proofHash, summary: { total: results.length, passed } };
}

export type RatchetVerifyResult = {
  regressed: boolean;
  skipped: boolean;
  previous: RatchetRecord | null;
  current: RatchetRecord;
  diff: { previousPassed: number; currentPassed: number; failingTests: string[] } | null;
};

/**
 * Run verification and update the ratchet if it passes (or if forced).
 * Returns regressed=true (and does NOT update) when the current run has
 * fewer passes than the previous record.
 */
export async function ratchetVerify(
  channel: string,
  options: { force?: boolean } = {}
): Promise<RatchetVerifyResult> {
  const delta = await getChannelDelta(channel);
  const previous = await getChannelRatchet(channel);

  if (!options.force && !delta.isNew && previous) {
    return { regressed: false, skipped: true, previous, current: previous, diff: null };
  }

  const run = await runRatchetVerification();
  const current: RatchetRecord = {
    version: delta.currentVersion,
    verifiedAt: new Date().toISOString(),
    proofHash: run.proofHash,
    provenance: {
      testSuiteCommit: await gitCommitShort(),
      ...(Bun.env.CI_RUN_ID ? { ciRunId: Bun.env.CI_RUN_ID } : {}),
    },
    summary: run.summary,
  };

  let diff: RatchetVerifyResult['diff'] = null;
  const regressed = previous != null && run.summary.passed < previous.summary.passed;
  if (regressed) {
    diff = {
      previousPassed: previous.summary.passed,
      currentPassed: run.summary.passed,
      failingTests: run.results.filter(r => !r.passed).map(r => r.name),
    };
  }

  if (!regressed || options.force) {
    await updateRatchet(channel, current);
  }

  return { regressed, skipped: false, previous, current, diff };
}
