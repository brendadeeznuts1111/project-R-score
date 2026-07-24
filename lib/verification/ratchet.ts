/**
 * Ratchet mechanism — locks verification results to a specific channel version.
 *
 * Detects regressions when a channel moves (e.g., bun upgrade) and provides
 * a clear signal for upgrades or rollbacks.
 *
 * Usage:
 *   bun tools/ratchet.ts                    # check + verify latest
 *   bun tools/ratchet.ts --channel=canary   # check canary
 *   bun tools/ratchet.ts --force            # re-verify same version
 */
import { $ } from 'bun';

export interface RatchetRecord {
  version: string;
  verifiedAt: string;
  proofHash: string;
  provenance: {
    testSuiteCommit: string;
    ciRunId?: string;
  };
  summary: {
    total: number;
    passed: number;
  };
}

export interface RatchetDB {
  schemaVersion: 1;
  channels: Record<string, RatchetRecord>;
}

const RATCHET_PATH = 'public/registry/ratchet.json';

export async function loadRatchet(): Promise<RatchetDB> {
  try {
    const file = Bun.file(RATCHET_PATH);
    if (await file.exists()) return await file.json();
  } catch {}
  return { schemaVersion: 1, channels: {} };
}

export async function saveRatchet(db: RatchetDB): Promise<void> {
  await Bun.write(RATCHET_PATH, JSON.stringify(db, null, 2));
}

export async function getChannelRatchet(channel: string): Promise<RatchetRecord | null> {
  const db = await loadRatchet();
  return db.channels[channel] || null;
}

export async function updateRatchet(channel: string, record: RatchetRecord): Promise<void> {
  const db = await loadRatchet();
  db.channels[channel] = record;
  await saveRatchet(db);
}

export async function getChannelDelta(channel: string): Promise<{
  currentVersion: string;
  previousVersion: string | null;
  isNew: boolean;
}> {
  const currentVersion = Bun.version;
  const previous = await getChannelRatchet(channel);
  const isNew = !previous || previous.version !== currentVersion;
  return { currentVersion, previousVersion: previous?.version || null, isNew };
}

export async function ratchetVerify(options?: { channel?: string; force?: boolean }): Promise<{
  regressed: boolean;
  previous: RatchetRecord | null;
  current: RatchetRecord;
  diff: { previousPassed: number; currentPassed: number; failingTests: string[] } | null;
}> {
  const channel = options?.channel || 'latest';
  const force = options?.force || false;
  const delta = await getChannelDelta(channel);
  const previous = await getChannelRatchet(channel);

  if (!force && !delta.isNew) {
    return { regressed: false, previous, current: previous!, diff: null };
  }

  const commit = await $`git rev-parse HEAD`.text().catch(() => 'unknown').then(s => s.trim());
  const proof = await Bun.file('public/registry/release-features.json').json().catch(() => ({ results: [] }));
  const results = proof.results || [];
  const summary = { total: results.length, passed: results.filter((r: any) => r.passed).length };
  const proofHash = proof.proofHash || 'unknown';

  const currentRecord: RatchetRecord = {
    version: delta.currentVersion,
    verifiedAt: new Date().toISOString(),
    proofHash,
    provenance: { testSuiteCommit: commit, ciRunId: process.env.CI_RUN_ID },
    summary,
  };

  let regressed = false;
  let diff = null;
  if (previous) {
    regressed = summary.passed < previous.summary.passed;
    if (regressed) {
      diff = {
        previousPassed: previous.summary.passed,
        currentPassed: summary.passed,
        failingTests: results.filter((r: any) => !r.passed).map((r: any) => r.name),
      };
    }
  }

  if (!regressed || force) await updateRatchet(channel, currentRecord);

  return { regressed, previous, current: currentRecord, diff };
}
