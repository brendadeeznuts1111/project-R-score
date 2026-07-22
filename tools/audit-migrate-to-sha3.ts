#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/runtime/hashing#bun-cryptohasher — Bun.CryptoHasher
// @see https://bun.com/docs/runtime/glob#quickstart — Bun.Glob
// @see https://bun.com/blog/bun-v1.3.13#sha3-support-in-webcrypto-and-node-crypto — SHA3-256
/**
 * Migrate AuditFinding JSON to Phase 1 dual-write evidence:
 *   algorithm: sha3-256, digest, sha256 companion
 *
 * Rewrites tools/audit-findings/*.json only. Evidence blobs are untouched.
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

const REPO_ROOT = joinPath(import.meta.dir, '..');
const FINDINGS_DIR = joinPath(REPO_ROOT, 'tools/audit-findings');

function toWireFinding(f: AuditFinding): AuditFinding {
  return f;
}

async function migrateOne(name: string): Promise<'migrated' | 'refreshed' | 'skipped'> {
  const path = joinPath(FINDINGS_DIR, name);
  const raw: unknown = await Bun.file(path).json();
  const finding = parseAuditFinding(raw);
  const verified = await verifyEvidenceHash(finding, REPO_ROOT);
  if (!verified.ok) {
    throw new Error(`${name}: ${verified.reason}`);
  }

  const absEvidence = joinPath(REPO_ROOT, finding.evidence.path);
  const digest = await hashFile(absEvidence, 'sha3-256');
  const sha256 = await hashFile(absEvidence, 'sha256');

  if (
    finding.evidence.algorithm === 'sha3-256' &&
    finding.evidence.digest === digest &&
    finding.evidence.sha256 === sha256
  ) {
    console.info(`⏭  ${name} already sha3-256 dual-write`);
    return 'skipped';
  }

  const next: AuditFinding = {
    ...finding,
    evidence: {
      path: finding.evidence.path,
      algorithm: 'sha3-256',
      digest,
      sha256,
      mediaType: finding.evidence.mediaType,
    },
  };
  await Bun.write(path, `${JSON.stringify(toWireFinding(next), null, 2)}\n`);
  const label = finding.evidence.algorithm === 'sha3-256' ? 'refreshed' : 'migrated';
  console.info(`✅ ${label} ${name}`);
  console.info(`   digest=${digest}`);
  console.info(`   sha256=${sha256}`);
  return label === 'refreshed' ? 'refreshed' : 'migrated';
}

async function main(): Promise<void> {
  const glob = new Bun.Glob('*.json');
  let migrated = 0;
  let refreshed = 0;
  let skipped = 0;
  for await (const name of glob.scan({ cwd: FINDINGS_DIR, onlyFiles: true })) {
    const result = await migrateOne(name);
    if (result === 'migrated') migrated++;
    else if (result === 'refreshed') refreshed++;
    else skipped++;
  }
  console.info(`done — migrated=${migrated} refreshed=${refreshed} skipped=${skipped}`);
}

if (import.meta.main) {
  await main();
}
