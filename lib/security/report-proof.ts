// @see https://bun.com/docs/runtime/hashing#bun-cryptohasher — Bun.CryptoHasher
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
import { isMintableSecretKey, readMintedSecret } from './mintable-secret.ts';

/**
 * Report integrity fingerprints — shared by deep-audit / compliance reports.
 *
 * Honesty contract:
 *   - `digest` = unkeyed content hash (tamper-detect only)
 *   - `hmac`   = keyed MAC when REPORT_SIGNING_SECRET / PLAY_SIGNING_SECRET set
 *   - Audit SSOT prefers **sha3-256** for digests; HMAC uses sha256 (play-signing parity)
 *
 * Not a play signature — use PlaySigner for wager HMACs.
 */
export type ReportHashAlgorithm = 'sha3-256' | 'sha256';

export type ReportProof = {
  /** Primary integrity algorithm (default sha3-256). */
  algorithm: ReportHashAlgorithm;
  /** Hex digest of canonical payload (unkeyed). */
  digest: string;
  /** Optional HMAC-SHA256 hex when a signing secret is available. */
  hmac?: string;
  /** Bun.version baked into envelope for upgrade diffs. */
  bunVersion: string;
  /** ISO time of proof generation (outside digest body when body is pre-built). */
  generatedAt: string;
  /** Optional stable run id (caller-supplied or UUIDv7). */
  runId?: string; // brand-ok — opaque report run handle (not ops RunId mint)
};

export type BuildReportProofOpts = {
  /** Override algorithm (default sha3-256). */
  algorithm?: ReportHashAlgorithm;
  /** When true (default), read HMAC material from env or an existing local mint. */
  tryHmac?: boolean;
  /** Secret env key (default REPORT_SIGNING_SECRET, then PLAY_SIGNING_SECRET). */
  secretEnvKey?: string;
  runId?: string; // brand-ok — opaque report run handle
};

/** Stable JSON for hashing — sorted keys, no whitespace variance. */
// eslint-disable-next-line harness/no-unknown-function-param -- wire/report body boundary
export function canonicalReportJson(value: unknown): string {
  return JSON.stringify(sortKeys(value));
}

// eslint-disable-next-line harness/no-unknown-function-param -- recursive JSON tree walk
function sortKeys(value: unknown): unknown {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(sortKeys);
  const obj = value as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(obj).sort()) {
    out[k] = sortKeys(obj[k]);
  }
  return out;
}

export function digestBytes(
  payload: string | Uint8Array,
  algorithm: ReportHashAlgorithm = 'sha3-256'
): string {
  const h = new Bun.CryptoHasher(algorithm);
  h.update(payload);
  return h.digest('hex');
}

export function hmacSha256Hex(payload: string | Uint8Array, secret: string): string {
  return new Bun.CryptoHasher('sha256', secret).update(payload).digest('hex');
}

/**
 * Build a report proof from a **stable** payload string (no wall-clock inside).
 * `generatedAt` is attached outside the hashed body for display only when
 * you pass a pre-hashed body; if you hash via {@link buildReportProofFromValue},
 * generatedAt is excluded from the canonical body unless you put it in value.
 */
export function buildReportProof(
  stablePayload: string | Uint8Array,
  opts?: BuildReportProofOpts
): ReportProof {
  const algorithm = opts?.algorithm ?? 'sha3-256';
  const digest = digestBytes(stablePayload, algorithm);
  const generatedAt = new Date().toISOString();
  const runId = opts?.runId;
  const proof: ReportProof = {
    algorithm,
    digest,
    bunVersion: Bun.version,
    generatedAt,
    ...(runId ? { runId } : {}),
  };

  if (opts?.tryHmac !== false) {
    const secret = tryReportSigningSecret(opts?.secretEnvKey);
    if (secret) {
      proof.hmac = hmacSha256Hex(stablePayload, secret);
    }
  }
  return proof;
}

/** Canonical-JSON hash of a structured value (recommended). */
export function buildReportProofFromValue(
  // eslint-disable-next-line harness/no-unknown-function-param -- structured report body at edge
  value: unknown,
  opts?: BuildReportProofOpts
): ReportProof {
  return buildReportProof(canonicalReportJson(value), opts);
}

function tryReportSigningSecret(envKey?: string): string | undefined {
  const keys = envKey ? [envKey] : ['REPORT_SIGNING_SECRET', 'PLAY_SIGNING_SECRET'];
  for (const k of keys) {
    const fromEnv = Bun.env[k]?.trim();
    if (fromEnv) return fromEnv;
  }
  // Existing local mint only — never auto-mint during bake/CI proof build
  for (const k of keys) {
    if (!isMintableSecretKey(k)) continue;
    const fromMint = readMintedSecret(k);
    if (fromMint) return fromMint;
  }
  return undefined;
}

/** Format proof lines for terminal reports (honest labels). */
export function formatReportProofLines(proof: ReportProof): string[] {
  const lines = [
    `🔐 Integrity (${proof.algorithm}): ${proof.digest}`,
    `   Bun ${proof.bunVersion} · ${proof.generatedAt}`,
  ];
  if (proof.runId) lines.push(`   runId: ${proof.runId}`);
  if (proof.hmac) {
    lines.push(`🔏 HMAC-SHA256: ${proof.hmac}`);
  } else {
    lines.push(
      '   (no HMAC — set REPORT_SIGNING_SECRET for keyed auth; digest is tamper-detect only)'
    );
  }
  return lines;
}

/** Short scoreboard for ops tables. */
export function proofScoreHints(proof: ReportProof): {
  hasDigest: true;
  hasHmac: boolean;
  algorithm: ReportHashAlgorithm;
  scoreHint: string;
} {
  const hasHmac = Boolean(proof.hmac);
  return {
    hasDigest: true,
    hasHmac,
    algorithm: proof.algorithm,
    scoreHint: hasHmac ? 'integrity+hmac' : 'integrity-only (add REPORT_SIGNING_SECRET for HMAC)',
  };
}
