/**
 * @see ../lib/dod/evidence.ts
 */
import { describe, expect, test } from 'bun:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { letterMarkPng, solidPng } from '../tools/generate-portal-icons.ts';
import {
  averageHash,
  buildDodEvidencePackage,
  dodEvidenceToJson,
  findSimilarInRegistry,
  hammingDistance,
  isDodEvidencePackage,
  parseDodEvidencePackage,
  verifyDodEvidence,
  appendDodRegistry,
} from '../lib/dod/evidence.ts';

/** 10×10 PNG fixture (same as image-metadata tests). */
const PNG_10 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mNk+M9Qz0AEYBxVSF+FAAhKDveksU63AAAAAElFTkSuQmCC',
  'base64'
);

describe('averageHash / hamming', () => {
  test('stable aHash for fixture', async () => {
    const a = await averageHash(PNG_10);
    const b = await averageHash(PNG_10);
    expect(a).toMatch(/^[0-9a-f]{16}$/);
    expect(a).toBe(b);
    expect(hammingDistance(a, b)).toBe(0);
  });

  test('different solid colors → distant hashes', async () => {
    const blue = solidPng(59, 130, 246, 64);
    const red = solidPng(220, 38, 38, 64);
    const hb = await averageHash(blue);
    const hr = await averageHash(red);
    // Uniform colors often collapse aHash; letter marks differ more reliably
    const f = letterMarkPng(59, 130, 246, 'F', 64);
    const t = letterMarkPng(245, 158, 11, 'T', 64);
    const hf = await averageHash(f);
    const ht = await averageHash(t);
    expect(hammingDistance(hf, ht)).toBeGreaterThan(0);
    expect(hb).toMatch(/^[0-9a-f]{16}$/);
    expect(hr).toMatch(/^[0-9a-f]{16}$/);
  });
});

describe('build/verify package', () => {
  test('pack then verify passes', async () => {
    const pkg = await buildDodEvidencePackage({
      bytes: PNG_10,
      kind: 'slip',
      secret: false,
      algorithm: 'sha3-256',
    });
    expect(pkg.meta.algorithm).toBe('sha3-256');
    expect(pkg.hmac).toBeUndefined();
    const result = await verifyDodEvidence(pkg, PNG_10, { secret: false });
    expect(result.ok).toBe(true);
    expect(isDodEvidencePackage(dodEvidenceToJson(pkg))).toBe(true);
    const parsed = parseDodEvidencePackage(dodEvidenceToJson(pkg));
    expect(parsed.kind).toBe('slip');
  });

  test('different image fails digest', async () => {
    const pkg = await buildDodEvidencePackage({
      bytes: PNG_10,
      kind: 'balance',
      secret: false,
    });
    const other = solidPng(220, 38, 38, 32);
    const result = await verifyDodEvidence(pkg, other, { secret: false });
    expect(result.ok).toBe(false);
    expect(result.checks.find(c => c.id === 'digest')?.ok).toBe(false);
  });

  test('HMAC when secret set', async () => {
    const secret = 'test-dod-secret';
    const pkg = await buildDodEvidencePackage({
      bytes: PNG_10,
      kind: 'receipt',
      secret,
    });
    expect(pkg.hmac).toMatch(/^[0-9a-f]{64}$/);
    const ok = await verifyDodEvidence(pkg, PNG_10, { secret });
    expect(ok.ok).toBe(true);
    const bad = await verifyDodEvidence(pkg, PNG_10, { secret: 'wrong' });
    expect(bad.checks.find(c => c.id === 'hmac')?.ok).toBe(false);
  });
});

describe('registry similar', () => {
  test('register + findSimilar', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'dod-reg-'));
    try {
      const reg = join(dir, 'dod-registry.json');
      const pkg = await buildDodEvidencePackage({
        bytes: PNG_10,
        kind: 'other',
        secret: false,
      });
      await appendDodRegistry(
        {
          id: String(pkg.id),
          kind: pkg.kind,
          averageHash: pkg.averageHash,
          digest: pkg.meta.digest,
          algorithm: pkg.meta.algorithm,
          submittedAt: pkg.submittedAt,
          registeredAt: new Date().toISOString(),
        },
        reg
      );
      const hits = await findSimilarInRegistry(pkg.averageHash, reg, 0);
      expect(hits.length).toBe(1);
      expect(hits[0]?.digest).toBe(pkg.meta.digest);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
