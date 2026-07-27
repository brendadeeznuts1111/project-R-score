// @see https://bun.com/docs/test — bun:test
// @see https://bun.com/docs/runtime/hashing#bun-cryptohasher — Bun.CryptoHasher
import { describe, test, expect } from 'bun:test';
import {
  buildReportProofFromValue,
  canonicalReportJson,
  digestBytes,
  hmacSha256Hex,
  proofScoreHints,
} from '../lib/security/report-proof.ts';

describe('report-proof', () => {
  test('canonical JSON is key-order stable', () => {
    const a = canonicalReportJson({ b: 1, a: 2 });
    const b = canonicalReportJson({ a: 2, b: 1 });
    expect(a).toBe(b);
  });

  test('same body same sha3-256 digest', () => {
    const body = { kind: 't', x: 1, nested: { z: true } };
    const p1 = buildReportProofFromValue(body, { tryHmac: false });
    const p2 = buildReportProofFromValue(body, { tryHmac: false });
    expect(p1.algorithm).toBe('sha3-256');
    expect(p1.digest).toBe(p2.digest);
    expect(p1.digest).toBe(digestBytes(canonicalReportJson(body), 'sha3-256'));
  });

  test('HMAC differs from bare digest and verifies with secret', () => {
    const payload = '{"a":1}';
    const secret = 'test-report-secret';
    const hmac = hmacSha256Hex(payload, secret);
    expect(hmac).not.toBe(digestBytes(payload, 'sha256'));
    expect(hmac).toBe(hmacSha256Hex(payload, secret));
  });

  test('proofScoreHints reflects hmac absence', () => {
    const p = buildReportProofFromValue({ k: 1 }, { tryHmac: false });
    const h = proofScoreHints(p);
    expect(h.hasDigest).toBe(true);
    expect(h.hasHmac).toBe(false);
    expect(h.scoreHint).toContain('integrity-only');
  });
});
