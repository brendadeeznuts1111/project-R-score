// @see https://bun.com/docs/test — bun:test
// @see https://bun.com/docs/runtime/hashing#bun-cryptohasher — Bun.CryptoHasher
import { describe, expect, test } from 'bun:test';
import { mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { requireMintableSecret } from '../lib/security/mintable-secret.ts';
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

  test('HMAC resolves from machine-local mint when env unset', () => {
    const dir = join(tmpdir(), `report-proof-mint-${Date.now()}`);
    mkdirSync(dir, { recursive: true });
    const prevDir = Bun.env.FACTORYWAGER_MINTED_SECRETS_DIR;
    const prevReport = Bun.env.REPORT_SIGNING_SECRET;
    const prevPlay = Bun.env.PLAY_SIGNING_SECRET;
    try {
      Bun.env.FACTORYWAGER_MINTED_SECRETS_DIR = dir;
      delete Bun.env.REPORT_SIGNING_SECRET;
      delete Bun.env.PLAY_SIGNING_SECRET;
      requireMintableSecret('REPORT_SIGNING_SECRET');
      const p = buildReportProofFromValue({ mint: true }, { tryHmac: true });
      expect(p.hmac).toBeTruthy();
      expect(proofScoreHints(p).hasHmac).toBe(true);
    } finally {
      if (prevDir === undefined) delete Bun.env.FACTORYWAGER_MINTED_SECRETS_DIR;
      else Bun.env.FACTORYWAGER_MINTED_SECRETS_DIR = prevDir;
      if (prevReport === undefined) delete Bun.env.REPORT_SIGNING_SECRET;
      else Bun.env.REPORT_SIGNING_SECRET = prevReport;
      if (prevPlay === undefined) delete Bun.env.PLAY_SIGNING_SECRET;
      else Bun.env.PLAY_SIGNING_SECRET = prevPlay;
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
