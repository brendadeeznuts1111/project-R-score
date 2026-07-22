// @see https://bun.com/docs/runtime/hashing#bun-cryptohasher — Bun.CryptoHasher
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/blog/bun-v1.3.13#sha3-support-in-webcrypto-and-node-crypto — SHA3-256
/**
 * AuditFinding — FactoryWager sibling SSOT for verifiable audit findings.
 * Not BunToken / CANONICAL_REFS. Parse at the wire boundary (JSON files).
 *
 * Evidence fingerprint (Phase 1 transitional):
 * - Legacy wire: `{ path, sha256, mediaType }` → interior algorithm sha256
 * - New / dual: `{ path, algorithm, digest, mediaType, sha256? }`
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

/** Supported evidence digest algorithms (Phase 1). */
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
  /**
   * Optional SHA-256 companion during transition (dual-write / rollback).
   * When algorithm is sha256, equals digest. When sha3-256, independently verified.
   */
  sha256?: string;
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

  const hasAlgorithm = raw.algorithm !== undefined;
  const hasDigest = raw.digest !== undefined;
  const hasSha256 = raw.sha256 !== undefined;

  // New / dual: algorithm + digest required
  if (hasAlgorithm || hasDigest) {
    if (!hasAlgorithm || !hasDigest) {
      throw new Error(
        'AuditFinding.evidence: algorithm and digest must both be present (new/dual shape)'
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
    const evidence: AuditEvidence = { path, algorithm: algorithmRaw, digest, mediaType };
    if (hasSha256) {
      const companion = parseHex64(
        parseNonEmptyString(raw.sha256, 'AuditFinding.evidence.sha256'),
        'AuditFinding.evidence.sha256'
      );
      if (algorithmRaw === 'sha256' && companion !== digest) {
        throw new Error(
          'AuditFinding.evidence: sha256 companion must equal digest when algorithm is sha256'
        );
      }
      evidence.sha256 = companion;
    } else if (algorithmRaw === 'sha256') {
      evidence.sha256 = digest;
    }
    return evidence;
  }

  // Legacy: sha256 only (no algorithm/digest)
  if (!hasSha256) {
    throw new Error('AuditFinding.evidence: expected legacy {sha256} or new {algorithm,digest}');
  }
  const sha256 = parseHex64(
    parseNonEmptyString(raw.sha256, 'AuditFinding.evidence.sha256'),
    'AuditFinding.evidence.sha256'
  );
  return {
    path,
    algorithm: 'sha256',
    digest: sha256,
    mediaType,
    sha256,
  };
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

/** Resolve evidence path against repo root and verify primary (+ companion) digests. */
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
  const { algorithm, digest, sha256: companion } = finding.evidence;
  const actual = await hashFile(abs, algorithm);
  if (actual !== digest.toLowerCase()) {
    return {
      ok: false,
      reason: `${algorithm} mismatch for ${finding.evidence.path}: expected ${digest}, got ${actual}`,
    };
  }
  if (companion !== undefined && algorithm === 'sha3-256') {
    const actualSha256 = await hashFile(abs, 'sha256');
    if (actualSha256 !== companion.toLowerCase()) {
      return {
        ok: false,
        reason: `sha256 companion mismatch for ${finding.evidence.path}: expected ${companion}, got ${actualSha256}`,
      };
    }
  }
  return { ok: true };
}
