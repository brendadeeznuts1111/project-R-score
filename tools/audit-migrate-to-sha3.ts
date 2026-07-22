#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/runtime/hashing#bun-cryptohasher — Bun.CryptoHasher
// @see https://bun.com/docs/runtime/glob#quickstart — Bun.Glob
// @see https://bun.com/blog/bun-v1.3.13#sha3-support-in-webcrypto-and-node-crypto — SHA3-256
/**
 * One-shot normalize inbound/old AuditFinding JSON → Phase 2 evidence shape:
 *   algorithm: sha3-256, digest (strip legacy sha256 companion / sha256-only wire).
 * SSOT sample under tools/audit-findings/ is already Phase 2 — use this for external or
 * leftover dual-write findings only.
 *
 * Operates on raw JSON first (parse rejects companion). Evidence blobs untouched.
 *
 *   bun tools/audit-migrate-to-sha3.ts
 *   bun run audit:migrate:sha3
 */
import {
  hashFile,
  parseAuditFinding,
  verifyEvidenceHash,
  type AuditFinding,
} from '../lib/audit/audit-finding.ts';
import { joinPath } from '../lib/path-bun.ts';
import { isRecord } from '../lib/audit/parse-helpers.ts';

const REPO_ROOT = joinPath(import.meta.dir, '..');
const FINDINGS_DIR = joinPath(REPO_ROOT, 'tools/audit-findings');

type WireEvidence = {
  path?: unknown;
  algorithm?: unknown;
  digest?: unknown;
  sha256?: unknown;
  mediaType?: unknown;
};

export type MigrateResult = 'migrated' | 'refreshed' | 'skipped';

/** Normalize one finding JSON file under findingsDir (evidence paths relative to repoRoot). */
export async function migrateOneFinding(
  findingsDir: string,
  repoRoot: string,
  name: string
): Promise<MigrateResult> {
  const path = joinPath(findingsDir, name);
  const raw: unknown = await Bun.file(path).json();
  if (!isRecord(raw) || !isRecord(raw.evidence)) {
    throw new Error(`${name}: expected finding object with evidence`);
  }

  const evidence = raw.evidence as WireEvidence;
  const absEvidence =
    typeof evidence.path === 'string' ? joinPath(repoRoot, evidence.path) : undefined;
  if (!absEvidence) {
    throw new Error(`${name}: evidence.path required`);
  }

  const digest = await hashFile(absEvidence, 'sha3-256');
  const hadCompanion = evidence.sha256 !== undefined;
  const wasLegacyOnly = evidence.algorithm === undefined || evidence.digest === undefined;

  const nextEvidence = {
    path: evidence.path,
    algorithm: 'sha3-256' as const,
    digest,
    mediaType: evidence.mediaType,
  };

  const nextRaw = {
    ...raw,
    evidence: nextEvidence,
  };

  const finding = parseAuditFinding(nextRaw);
  const verified = await verifyEvidenceHash(finding, repoRoot);
  if (!verified.ok) {
    throw new Error(`${name}: ${verified.reason}`);
  }

  const already =
    !hadCompanion &&
    !wasLegacyOnly &&
    evidence.algorithm === 'sha3-256' &&
    evidence.digest === digest;

  if (already) {
    console.info(`⏭  ${name} already Phase 2 sha3-256`);
    return 'skipped';
  }

  const wire: AuditFinding = finding;
  await Bun.write(path, `${JSON.stringify(wire, null, 2)}\n`);
  const label = wasLegacyOnly || hadCompanion ? 'migrated' : 'refreshed';
  console.info(`✅ ${label} ${name}`);
  console.info(`   digest=${digest}`);
  if (hadCompanion) console.info('   stripped sha256 companion');
  return label === 'refreshed' ? 'refreshed' : 'migrated';
}

/** Scan findingsDir for *.json and normalize each. */
export async function migrateFindingsDir(
  findingsDir: string,
  repoRoot: string
): Promise<{ migrated: number; refreshed: number; skipped: number }> {
  const glob = new Bun.Glob('*.json');
  let migrated = 0;
  let refreshed = 0;
  let skipped = 0;
  for await (const name of glob.scan({ cwd: findingsDir, onlyFiles: true })) {
    const result = await migrateOneFinding(findingsDir, repoRoot, name);
    if (result === 'migrated') migrated++;
    else if (result === 'refreshed') refreshed++;
    else skipped++;
  }
  return { migrated, refreshed, skipped };
}

async function main(): Promise<void> {
  const { migrated, refreshed, skipped } = await migrateFindingsDir(FINDINGS_DIR, REPO_ROOT);
  console.info(`done — migrated=${migrated} refreshed=${refreshed} skipped=${skipped}`);
}

if (import.meta.main) {
  await main();
}
