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
  decodePngRgba,
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

describe('decodePngRgba (Bun.inflateSync IDAT)', () => {
  test('decodes fixture PNG dimensions and RGBA length', () => {
    const { width, height, rgba } = decodePngRgba(PNG_10);
    expect(width).toBe(10);
    expect(height).toBe(10);
    expect(rgba.byteLength).toBe(10 * 10 * 4);
  });

  test('solid color PNG yields uniform RGB', () => {
    const blue = solidPng(59, 130, 246, 8);
    const { width, height, rgba } = decodePngRgba(blue);
    expect(width).toBe(8);
    expect(height).toBe(8);
    expect(rgba[0]).toBe(59);
    expect(rgba[1]).toBe(130);
    expect(rgba[2]).toBe(246);
    expect(rgba[3]).toBe(255);
  });

  test('Bun.inflateSync windowBits 15 matches node:zlib inflateSync on IDAT', () => {
    const { inflateSync: nodeInflateSync } = require('node:zlib') as typeof import('node:zlib');
    const png = new Uint8Array(PNG_10);
    const idat: Buffer[] = [];
    let o = 8;
    while (o + 8 <= png.byteLength) {
      const len = (png[o]! << 24) | (png[o + 1]! << 16) | (png[o + 2]! << 8) | png[o + 3]!;
      const type = String.fromCharCode(png[o + 4]!, png[o + 5]!, png[o + 6]!, png[o + 7]!);
      const data = png.subarray(o + 8, o + 8 + len);
      o += 12 + len;
      if (type === 'IDAT') idat.push(Buffer.from(data));
      if (type === 'IEND') break;
    }
    const concat = Buffer.concat(idat);
    // zlib CMF/FLG magic (0x78 …) — not raw DEFLATE
    expect(concat[0]).toBe(0x78);
    const nodeOut = nodeInflateSync(concat);
    const bunOut = Bun.inflateSync(concat, { windowBits: 15 });
    expect(Buffer.from(bunOut).equals(nodeOut)).toBe(true);
  });
});

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
