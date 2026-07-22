// @see https://bun.com/docs/runtime/hashing#bun-cryptohasher — Bun.CryptoHasher
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/blog/bun-v1.3.13#sha3-support-in-webcrypto-and-node-crypto — SHA3-256
/**
 * AuditFinding — FactoryWager sibling SSOT for verifiable audit findings.
 * Not BunToken / CANONICAL_REFS. Parse at the wire boundary (JSON files).
 *
 * Evidence fingerprint (Phase 2):
 * - Wire: `{ path, algorithm, digest, mediaType }`
 * - Legacy `{ path, sha256, mediaType }` and dual-write `sha256` companion rejected.
 */
import {
  type AuditEntryId,
  type AuditFindingId,
  parseAuditEntryId,
  parseAuditFindingId,
} from '../types/branded.ts';
import { joinPath } from '../path-bun.ts';
import { isRecord, parseNonEmptyString, parseOptionalStringArray } from './parse-helpers.ts';

export type AuditFindingStatus = 'confirmed' | 'mitigated' | 'open';

/** Supported evidence digest algorithms. */
export type AuditHashAlgorithm = 'sha256' | 'sha3-256';

export type AuditEvidence = {
  /** Repo-relative path to the evidence artefact. */
  path: string;
  /** Digest algorithm (normalized from wire). */
  algorithm: AuditHashAlgorithm;
  /** Lowercase hex digest of evidence file bytes (primary fingerprint). */
  digest: string;
  /** IANA media type. */
  mediaType: string;
};

export type AuditFinding = {
  id: AuditFindingId;
  kind: 'AuditFinding';
  title: string;
  description: string;
  status: AuditFindingStatus;
  /** ISO calendar date (YYYY-MM-DD). */
  publishedAt: string;
  /** Product version or ISO date when first observed (legacy alias of discoveredIn). */
  since?: string;
  /** Software / product version where the issue was discovered. */
  discoveredIn?: string;
  /** Software / product version where mitigated (when status is mitigated). */
  mitigatedIn?: string;
  evidence: AuditEvidence;
  /** Related audit entry ids (concepts / findings). */
  related?: AuditEntryId[];
  /** Opaque BunToken / doc token names for reverse navigation (not catalog merge). */
  relatedDocs?: string[];
  meta?: {
    buildPin?: string;
    emitter?: string;
  };
};

function parseRelatedEntryIds(raw: unknown, field: string): AuditEntryId[] | undefined {
  const arr = parseOptionalStringArray(raw, field);
  if (arr === undefined) return undefined;
  return arr.map(s => parseAuditEntryId(s));
}

const STATUS = new Set<AuditFindingStatus>(['confirmed', 'mitigated', 'open']);
const ALGORITHMS = new Set<AuditHashAlgorithm>(['sha256', 'sha3-256']);
const HEX64 = /^[a-f0-9]{64}$/;

export function isAuditFindingStatus(value: string): value is AuditFindingStatus {
  return STATUS.has(value as AuditFindingStatus);
}

export function isAuditHashAlgorithm(value: string): value is AuditHashAlgorithm {
  return ALGORITHMS.has(value as AuditHashAlgorithm);
}

function parseHex64(raw: string, label: string): string {
  const hex = raw.toLowerCase();
  if (!HEX64.test(hex)) {
    throw new Error(`${label}: expected 64 lowercase hex chars`);
  }
  return hex;
}

function parseEvidence(raw: unknown): AuditEvidence {
  if (!isRecord(raw)) throw new Error('AuditFinding.evidence: expected object');
  const path = parseNonEmptyString(raw.path, 'AuditFinding.evidence.path');
  const mediaType = parseNonEmptyString(raw.mediaType, 'AuditFinding.evidence.mediaType');

  if (raw.sha256 !== undefined) {
    throw new Error(
      'AuditFinding.evidence: sha256 companion removed (Phase 2); use algorithm+digest only — run bun run audit:migrate:sha3'
    );
  }

  const hasAlgorithm = raw.algorithm !== undefined;
  const hasDigest = raw.digest !== undefined;
  if (!hasAlgorithm || !hasDigest) {
    throw new Error(
      'AuditFinding.evidence: algorithm and digest are required (legacy {sha256}-only wire rejected)'
    );
  }

  const algorithmRaw = parseNonEmptyString(raw.algorithm, 'AuditFinding.evidence.algorithm');
  if (!isAuditHashAlgorithm(algorithmRaw)) {
    throw new Error(
      `AuditFinding.evidence.algorithm: invalid "${algorithmRaw}" (want sha256|sha3-256)`
    );
  }
  const digest = parseHex64(
    parseNonEmptyString(raw.digest, 'AuditFinding.evidence.digest'),
    'AuditFinding.evidence.digest'
  );
  return { path, algorithm: algorithmRaw, digest, mediaType };
}

/** Wire `unknown` → AuditFinding (boundary). */
export function parseAuditFinding(raw: unknown): AuditFinding {
  if (!isRecord(raw)) throw new Error('AuditFinding: expected object');
  if (raw.kind !== 'AuditFinding') {
    throw new Error(`AuditFinding.kind: expected "AuditFinding", got ${String(raw.kind)}`);
  }
  const id = parseAuditFindingId(raw.id);
  const title = parseNonEmptyString(raw.title, 'AuditFinding.title');
  const description = parseNonEmptyString(raw.description, 'AuditFinding.description');
  const statusRaw = parseNonEmptyString(raw.status, 'AuditFinding.status');
  if (!isAuditFindingStatus(statusRaw)) {
    throw new Error(`AuditFinding.status: invalid "${statusRaw}"`);
  }
  const publishedAt = parseNonEmptyString(raw.publishedAt, 'AuditFinding.publishedAt');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(publishedAt)) {
    throw new Error('AuditFinding.publishedAt: expected YYYY-MM-DD');
  }
  const evidence = parseEvidence(raw.evidence);
  const finding: AuditFinding = {
    id,
    kind: 'AuditFinding',
    title,
    description,
    status: statusRaw,
    publishedAt,
    evidence,
  };
  if (raw.since !== undefined) {
    finding.since = parseNonEmptyString(raw.since, 'AuditFinding.since');
  }
  if (raw.discoveredIn !== undefined) {
    finding.discoveredIn = parseNonEmptyString(raw.discoveredIn, 'AuditFinding.discoveredIn');
  } else if (finding.since) {
    finding.discoveredIn = finding.since;
  }
  if (raw.mitigatedIn !== undefined) {
    finding.mitigatedIn = parseNonEmptyString(raw.mitigatedIn, 'AuditFinding.mitigatedIn');
  }
  finding.related = parseRelatedEntryIds(raw.related, 'AuditFinding.related');
  finding.relatedDocs = parseOptionalStringArray(raw.relatedDocs, 'AuditFinding.relatedDocs');
  if (raw.meta !== undefined) {
    if (!isRecord(raw.meta)) throw new Error('AuditFinding.meta: expected object');
    const meta: NonNullable<AuditFinding['meta']> = {};
    if (raw.meta.buildPin !== undefined) {
      meta.buildPin = parseNonEmptyString(raw.meta.buildPin, 'AuditFinding.meta.buildPin');
    }
    if (raw.meta.emitter !== undefined) {
      meta.emitter = parseNonEmptyString(raw.meta.emitter, 'AuditFinding.meta.emitter');
    }
    finding.meta = meta;
  }
  return finding;
}

/** Hex digest of file bytes with the given algorithm. */
export async function hashFile(
  filePath: string,
  algorithm: AuditHashAlgorithm = 'sha3-256'
): Promise<string> {
  const bytes = await Bun.file(filePath).arrayBuffer();
  return new Bun.CryptoHasher(algorithm).update(bytes).digest('hex');
}

/** SHA-256 hex digest (thin wrapper for call-site compatibility). */
export async function sha256File(filePath: string): Promise<string> {
  return hashFile(filePath, 'sha256');
}

/** Evidence must live under tools/audit-evidence/ (no .. traversal). */
export function assertEvidencePathAllowed(
  relPath: string
): { ok: true } | { ok: false; reason: string } {
  const n = relPath.replace(/\\/g, '/');
  if (n.includes('..') || n.startsWith('/') || n.includes('\0')) {
    return { ok: false, reason: `evidence.path rejects traversal: ${relPath}` };
  }
  if (!n.startsWith('tools/audit-evidence/')) {
    return {
      ok: false,
      reason: `evidence.path must be under tools/audit-evidence/: ${relPath}`,
    };
  }
  return { ok: true };
}

/** Resolve evidence path against repo root and verify primary digest. */
export async function verifyEvidenceHash(
  finding: AuditFinding,
  repoRoot: string
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const pathOk = assertEvidencePathAllowed(finding.evidence.path);
  if (!pathOk.ok) return pathOk;
  const abs = joinPath(repoRoot, finding.evidence.path);
  const file = Bun.file(abs);
  if (!(await file.exists())) {
    return { ok: false, reason: `missing evidence file: ${finding.evidence.path}` };
  }
  const { algorithm, digest } = finding.evidence;
  const actual = await hashFile(abs, algorithm);
  if (actual !== digest.toLowerCase()) {
    return {
      ok: false,
      reason: `${algorithm} mismatch for ${finding.evidence.path}: expected ${digest}, got ${actual}`,
    };
  }
  return { ok: true };
}
