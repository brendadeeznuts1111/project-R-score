import { describe, expect, test } from 'bun:test';

import {
  ContentStoreIntegrityError,
  MemoryContentStore,
  contentDigestForBytes,
  contentKeyForDigest,
  createContentSourceLocator,
  isContentRightsUsable,
  parseContentRef,
} from '../lib/content-store/index.ts';
import {
  asContentDigest,
  asEvidenceId,
  asSourceSystemId,
  type SourceSystemId,
  unbrand,
} from '../lib/types/branded.ts';

function authority(sourceSystemId: SourceSystemId) {
  return { kind: 'source-system', sourceSystemId } as const;
}

function validWireRef() {
  const bytes = new TextEncoder().encode('exact content bytes');
  const digest = contentDigestForBytes(bytes);
  const source = createContentSourceLocator('https://feeds.example.test/releases.xml');
  return {
    version: 1,
    digest,
    key: contentKeyForDigest(digest),
    byteLength: bytes.byteLength,
    mediaType: 'application/xml',
    sources: [source],
    dependencies: [
      {
        from: digest,
        to: contentDigestForBytes(new TextEncoder().encode('peer bytes')),
        kind: 'peer',
        peer: { optional: true },
      },
    ],
    rights: {
      state: 'approved',
      reviewEvidenceId: 'evidence-1',
      reviewedAt: '2026-08-26T12:00:00.000Z',
      validUntil: '2027-08-26T12:00:00.000Z',
    },
    authorities: {
      publisher: authority(asSourceSystemId('release-publisher')),
      storageSteward: authority(asSourceSystemId('media-store')),
      rightsReviewAuthority: { kind: 'identity', identityId: 'rights-reviewer' },
      aliasPublisher: authority(asSourceSystemId('channel-alias-publisher')),
    },
  };
}

describe('content identity and wire contract', () => {
  test('hashes exact bytes and derives a separate immutable storage key', () => {
    const digest = contentDigestForBytes(new TextEncoder().encode('abc'));
    expect(unbrand(digest)).toBe(
      'sha256:ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'
    );
    expect(unbrand(contentKeyForDigest(digest))).toBe(
      'sha256/ba/ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'
    );

    const locator = createContentSourceLocator('https://example.test/abc');
    expect(locator.locatorId).toStartWith('locator-sha256:');
    expect(locator.locatorId).not.toBe(digest);
  });

  test('parses a complete ContentRef once and retains optional peer metadata', () => {
    const parsed = parseContentRef(validWireRef());
    expect(parsed.version).toBe(1);
    expect(parsed.dependencies[0]?.kind).toBe('peer');
    expect(parsed.dependencies[0]?.peer?.optional).toBeTrue();
    expect(parsed.authorities.publisher).not.toEqual(parsed.authorities.storageSteward);
    expect(isContentRightsUsable(parsed.rights, new Date('2026-08-27T00:00:00.000Z'))).toBeTrue();
    expect(isContentRightsUsable(parsed.rights, new Date('2028-01-01T00:00:00.000Z'))).toBeFalse();
  });

  test('rejects a key or locator hash that does not match its owned value', () => {
    const badKey = validWireRef();
    badKey.key = contentKeyForDigest(contentDigestForBytes(new TextEncoder().encode('other')));
    expect(() => parseContentRef(badKey)).toThrow('does not derive from digest');

    const badLocator = validWireRef();
    badLocator.sources[0] = {
      ...createContentSourceLocator('https://example.test/other'),
      locator: 'https://example.test/tampered',
    };
    expect(() => parseContentRef(badLocator)).toThrow('does not hash the exact locator');
  });

  test('rejects peer metadata on non-peer dependency edges', () => {
    const wire = validWireRef();
    wire.dependencies[0] = { ...wire.dependencies[0], kind: 'runtime' };
    expect(() => parseContentRef(wire)).toThrow('peer metadata belongs only to peer edges');
  });

  test('bounds wire collections before materializing dependency contracts', () => {
    const tooManySources = validWireRef();
    tooManySources.sources = Array.from({ length: 65 }, (_, index) =>
      createContentSourceLocator(`https://example.test/source/${index}`)
    );
    expect(() => parseContentRef(tooManySources)).toThrow('cannot exceed 64 entries');

    const tooManyDependencies = validWireRef();
    tooManyDependencies.dependencies = Array.from({ length: 4_097 }, () => ({
      ...tooManyDependencies.dependencies[0],
    }));
    expect(() => parseContentRef(tooManyDependencies)).toThrow('cannot exceed 4096 entries');
  });

  test('denied, expired, revoked, and unreviewed rights are unusable', () => {
    expect(isContentRightsUsable({ state: 'unreviewed' })).toBeFalse();
    for (const state of ['denied', 'expired', 'revoked'] as const) {
      expect(
        isContentRightsUsable({
          state,
          reviewEvidenceId: asEvidenceId('evidence-1'),
          reviewedAt: '2026-08-26T12:00:00.000Z',
        })
      ).toBeFalse();
    }
  });
});

describe('MemoryContentStore', () => {
  test('copies exact bytes and deduplicates identical content', async () => {
    const store = new MemoryContentStore();
    const bytes = new Uint8Array([0, 255, 1, 2, 3, 0]);

    const first = await store.put(bytes);
    const second = await store.put(bytes);

    expect(first.created).toBeTrue();
    expect(second.created).toBeFalse();
    expect(second.digest).toBe(first.digest);
    expect(await store.has(first.digest)).toBeTrue();
    expect(await store.get(first.digest)).toEqual(bytes);
    bytes[0] = 99;
    expect(await store.get(first.digest)).toEqual(new Uint8Array([0, 255, 1, 2, 3, 0]));
    expect(await store.verify(first.digest)).toEqual({
      status: 'verified',
      digest: first.digest,
      byteLength: bytes.byteLength,
    });
  });

  test('detects backing corruption instead of returning unverified bytes', async () => {
    const backing = new Map();
    const store = new MemoryContentStore({ backing });
    const stored = await store.put(new TextEncoder().encode('original'));
    backing.set(stored.digest, new TextEncoder().encode('corrupt'));

    const verification = await store.verify(stored.digest);
    expect(verification.status).toBe('corrupt');
    expect(verification.status === 'corrupt' && verification.actualDigest).not.toBe(stored.digest);
    await expect(store.get(stored.digest)).rejects.toBeInstanceOf(ContentStoreIntegrityError);
  });

  test('enforces configured write and read bounds', async () => {
    const backing = new Map();
    const store = new MemoryContentStore({ maxBytes: 3, backing });
    await expect(store.put(new Uint8Array([1, 2, 3, 4]))).rejects.toThrow('exceeds 3 byte');

    const stored = await store.put(new Uint8Array([1, 2, 3]));
    backing.set(stored.digest, new Uint8Array([1, 2, 3, 4]));
    expect(await store.verify(stored.digest)).toEqual({
      status: 'oversized',
      expectedDigest: stored.digest,
      byteLength: 4,
      maxBytes: 3,
    });
    await expect(store.get(stored.digest)).rejects.toThrow('exceeds 3 byte');
  });

  test('reports missing content without confusing the requested digest with locator identity', async () => {
    const store = new MemoryContentStore();
    const digest = asContentDigest(`sha256:${'f'.repeat(64)}`);
    expect(await store.has(digest)).toBeFalse();
    expect(await store.get(digest)).toBeUndefined();
    expect(await store.verify(digest)).toEqual({ status: 'missing', expectedDigest: digest });
  });
});
