// @see https://bun.sh/docs/runtime/file-io#reading-files-bunfile — Bun.file (mocked)
// @see https://bun.sh/docs/test/mocks#basic-function-mocks — bun:test mock
/**
 * registry.test.ts — RegistryClient via in-memory object store (no fetch mocks).
 */

import { describe, expect, test, mock, beforeEach, afterEach } from 'bun:test';
import { RegistryClient } from '../lib/factory/registry.ts';
import { createMemoryObjectStore } from '../lib/factory/object-store.ts';
import type { RegistryIndex } from '../lib/factory/artifact.ts';

function mockClient(): RegistryClient {
  return new RegistryClient({ store: createMemoryObjectStore() });
}

async function seedIndex(
  client: RegistryClient,
  index: RegistryIndex
): Promise<void> {
  // publish path uses writeIndex; for readme/install fixtures, put index directly
  const store = (client as unknown as { store: ReturnType<typeof createMemoryObjectStore> }).store;
  await store.putJson('registry.json', index);
}

describe('RegistryClient — publish with README', () => {
  let originalBunFile: typeof Bun.file;

  beforeEach(() => {
    originalBunFile = Bun.file;
    Bun.file = mock(() => ({
      exists: async () => false,
      text: async () => '',
    } as unknown as ReturnType<typeof Bun.file>));
  });

  afterEach(() => {
    Bun.file = originalBunFile;
  });

  test('publish with readme: true (auto-detect) when no README exists', async () => {
    const client = mockClient();
    const existsMock = mock(async () => false);
    Bun.file = mock(
      () => ({ exists: existsMock, text: async () => '' }) as unknown as ReturnType<typeof Bun.file>
    );

    const release = await client.publish('test-lib', '1.0.0', new Blob(['data']), {
      type: 'library',
      readme: true,
    });

    expect(release.name).toBe('test-lib');
    expect(release.version).toBe('1.0.0');
    expect(release.readme).toBeUndefined();
    expect(existsMock).toHaveBeenCalledTimes(1);
  });

  test('publish with readme: true auto-detects README.md', async () => {
    const client = mockClient();
    const readmeContent = '# Test Lib\n\nThis is a test.';
    Bun.file = mock(
      () =>
        ({
          exists: async () => true,
          text: async () => readmeContent,
        }) as unknown as ReturnType<typeof Bun.file>
    );

    const release = await client.publish('test-lib', '1.0.0', new Blob(['data']), {
      type: 'library',
      readme: true,
    });
    expect(release.readme).toBe(readmeContent);
  });

  test('publish with readme: false skips detection', async () => {
    const client = mockClient();
    const readFileMock = mock(async () => 'should-not-be-called');
    Bun.file = mock(
      () =>
        ({
          exists: readFileMock,
          text: readFileMock,
        }) as unknown as ReturnType<typeof Bun.file>
    );

    const release = await client.publish('test-lib', '1.0.0', new Blob(['data']), {
      type: 'library',
      readme: false,
    });
    expect(release.readme).toBeUndefined();
    expect(readFileMock).not.toHaveBeenCalled();
  });

  test('publish with explicit readme string', async () => {
    const client = mockClient();
    const release = await client.publish('test-lib', '1.0.0', new Blob(['data']), {
      type: 'library',
      readme: '# Explicit README',
    });
    expect(release.readme).toBe('# Explicit README');
  });

  test('publish without readme option defaults to auto-detect (no README)', async () => {
    const client = mockClient();
    Bun.file = mock(
      () =>
        ({
          exists: async () => false,
          text: async () => '',
        }) as unknown as ReturnType<typeof Bun.file>
    );
    const release = await client.publish('test-lib', '1.0.0', new Blob(['data']), {
      type: 'library',
    });
    expect(release.readme).toBeUndefined();
  });

  test('publish without readme option auto-detects when README exists', async () => {
    const client = mockClient();
    Bun.file = mock(
      () =>
        ({
          exists: async () => true,
          text: async () => '# Auto-detected README',
        }) as unknown as ReturnType<typeof Bun.file>
    );
    const release = await client.publish('test-lib', '1.0.0', new Blob(['data']), {
      type: 'library',
    });
    expect(release.readme).toBe('# Auto-detected README');
  });

  test('publish handles binary README without crashing', async () => {
    const client = mockClient();
    Bun.file = mock(
      () =>
        ({
          exists: async () => true,
          text: async () => {
            throw new Error('Binary file');
          },
        }) as unknown as ReturnType<typeof Bun.file>
    );
    const release = await client.publish('test-lib', '1.0.0', new Blob(['data']), {
      type: 'library',
    });
    expect(release.readme).toBeUndefined();
  });

  test('publish with empty README text', async () => {
    const client = mockClient();
    Bun.file = mock(
      () =>
        ({
          exists: async () => true,
          text: async () => '',
        }) as unknown as ReturnType<typeof Bun.file>
    );
    const release = await client.publish('test-lib', '1.0.0', new Blob(['data']), {
      type: 'library',
    });
    expect(release.readme).toBe('');
  });
});

describe('RegistryClient — publish name validation', () => {
  test('rejects names with spaces', async () => {
    const client = mockClient();
    await expect(
      client.publish('bad name', '1.0.0', new Blob(['data']), { type: 'library' })
    ).rejects.toThrow('Invalid artifact name');
  });

  test('rejects names with path traversal', async () => {
    const client = mockClient();
    await expect(
      client.publish('../etc/passwd', '1.0.0', new Blob(['data']), { type: 'library' })
    ).rejects.toThrow('Invalid artifact name');
  });

  test('rejects names with special chars', async () => {
    const client = mockClient();
    await expect(
      client.publish('foo@bar', '1.0.0', new Blob(['data']), { type: 'library' })
    ).rejects.toThrow('Invalid artifact name');
  });

  test('accepts valid names: alphanumeric, hyphen, underscore', async () => {
    const client = mockClient();
    const release = await client.publish('my-valid_lib', '1.0.0', new Blob(['data']), {
      type: 'library',
    });
    expect(release.name).toBe('my-valid_lib');
  });
});

describe('RegistryClient — publish duplicate version', () => {
  test('overwrites existing version in index', async () => {
    const client = mockClient();
    const r1 = await client.publish('dup-lib', '1.0.0', new Blob(['v1']), {
      type: 'library',
      description: 'first',
    });
    expect(r1.description).toBe('first');

    const r2 = await client.publish('dup-lib', '1.0.0', new Blob(['v2']), {
      type: 'library',
      description: 'second',
    });
    expect(r2.description).toBe('second');

    const info = await client.list('dup-lib');
    expect(info).toBeDefined();
    expect(info!.versions.length).toBe(1);
  });
});

describe('RegistryClient — fetchReadme', () => {
  test('returns readme for an existing release', async () => {
    const client = mockClient();
    await seedIndex(client, {
      schemaVersion: 1,
      lastUpdated: new Date().toISOString(),
      packages: {
        'my-pkg': {
          versions: ['1.0.0' as never],
          'dist-tags': { latest: '1.0.0' as never },
          releases: {
            '1.0.0': {
              id: 'my-pkg@1.0.0' as never,
              name: 'my-pkg' as never,
              version: '1.0.0' as never,
              type: 'library',
              publishedAt: new Date().toISOString(),
              publisher: 'test',
              readme: '# My Package\n\nHello world.',
              storage: {
                r2Key: '@factorywager/my-pkg/1.0.0.tgz',
                size: 100,
                checksum: 'abc123',
                contentType: 'application/gzip',
              },
            },
          },
        },
      },
    });

    const readme = await client.fetchReadme('my-pkg', 'latest');
    expect(readme).toBe('# My Package\n\nHello world.');
  });

  test('returns undefined for non-existent package', async () => {
    const client = mockClient();
    await seedIndex(client, {
      schemaVersion: 1,
      lastUpdated: new Date().toISOString(),
      packages: {},
    });
    expect(await client.fetchReadme('no-such-pkg', 'latest')).toBeUndefined();
  });

  test('returns undefined when release has no readme', async () => {
    const client = mockClient();
    await seedIndex(client, {
      schemaVersion: 1,
      lastUpdated: new Date().toISOString(),
      packages: {
        'bare-pkg': {
          versions: ['1.0.0' as never],
          'dist-tags': { latest: '1.0.0' as never },
          releases: {
            '1.0.0': {
              id: 'bare-pkg@1.0.0' as never,
              name: 'bare-pkg' as never,
              version: '1.0.0' as never,
              type: 'library',
              publishedAt: new Date().toISOString(),
              publisher: 'test',
              storage: {
                r2Key: '@factorywager/bare-pkg/1.0.0.tgz',
                size: 50,
                checksum: 'def456',
                contentType: 'application/gzip',
              },
            },
          },
        },
      },
    });
    expect(await client.fetchReadme('bare-pkg', 'latest')).toBeUndefined();
  });
});

describe('RegistryClient — checksum verification (install)', () => {
  test('install verifies checksum and throws on mismatch', async () => {
    const store = createMemoryObjectStore();
    const client = new RegistryClient({ store });
    const data = new Uint8Array([0x00, 0x01, 0x02, 0x03]);
    await store.putBytes('@factorywager/corrupt-pkg/1.0.0.tgz', data, {
      contentType: 'application/gzip',
    });
    await store.putJson('registry.json', {
      schemaVersion: 1,
      lastUpdated: new Date().toISOString(),
      packages: {
        'corrupt-pkg': {
          versions: ['1.0.0'],
          'dist-tags': { latest: '1.0.0' },
          releases: {
            '1.0.0': {
              id: 'corrupt-pkg@1.0.0',
              name: 'corrupt-pkg',
              version: '1.0.0',
              type: 'library',
              publishedAt: new Date().toISOString(),
              publisher: 'test',
              storage: {
                r2Key: '@factorywager/corrupt-pkg/1.0.0.tgz',
                size: 4,
                checksum: 'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
                contentType: 'application/gzip',
              },
            },
          },
        },
      },
    });

    await expect(client.install('corrupt-pkg', 'latest')).rejects.toThrow('Checksum mismatch');
  });

  test('install succeeds when checksum matches', async () => {
    const store = createMemoryObjectStore();
    const client = new RegistryClient({ store });
    const data = new Uint8Array([0x00, 0x01, 0x02, 0x03]);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashHex = [...new Uint8Array(hashBuffer)]
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    await store.putBytes('@factorywager/good-pkg/1.0.0.tgz', data);
    await store.putJson('registry.json', {
      schemaVersion: 1,
      lastUpdated: new Date().toISOString(),
      packages: {
        'good-pkg': {
          versions: ['1.0.0'],
          'dist-tags': { latest: '1.0.0' },
          releases: {
            '1.0.0': {
              id: 'good-pkg@1.0.0',
              name: 'good-pkg',
              version: '1.0.0',
              type: 'library',
              publishedAt: new Date().toISOString(),
              publisher: 'test',
              storage: {
                r2Key: '@factorywager/good-pkg/1.0.0.tgz',
                size: 4,
                checksum: hashHex,
                contentType: 'application/gzip',
              },
            },
          },
        },
      },
    });

    const result = await client.install('good-pkg', 'latest');
    expect(result).toBeDefined();
    expect(result!.release.name).toBe('good-pkg');
  });
});

describe('memory object store — If-Match', () => {
  test('putJson with wrong ifMatch throws 412', async () => {
    const store = createMemoryObjectStore();
    await store.putJson('registry.json', { ok: 1 });
    const hit = await store.getJson<{ ok: number }>('registry.json');
    expect(hit?.etag).toBeTruthy();
    await expect(
      store.putJson('registry.json', { ok: 2 }, { ifMatch: '"wrong"' })
    ).rejects.toThrow('412');
  });

  test('putJson with matching ifMatch succeeds', async () => {
    const store = createMemoryObjectStore();
    await store.putJson('registry.json', { ok: 1 });
    const hit = await store.getJson<{ ok: number }>('registry.json');
    await store.putJson('registry.json', { ok: 2 }, { ifMatch: hit!.etag });
    const next = await store.getJson<{ ok: number }>('registry.json');
    expect(next?.value.ok).toBe(2);
  });
});

describe('RegistryClient — writeIndex conflict retry', () => {
  test('retries when a concurrent writer changes the etag', async () => {
    const store = createMemoryObjectStore();
    const client = new RegistryClient({ store });
    await store.putJson('registry.json', {
      schemaVersion: 1,
      lastUpdated: new Date().toISOString(),
      packages: {},
    });

    let attempts = 0;
    const updated = await client.writeIndex(index => {
      attempts++;
      if (attempts === 1) {
        // Simulate another writer winning the race between fetch and put
        // by mutating the memory store synchronously.
        const body = new TextEncoder().encode(
          JSON.stringify({
            schemaVersion: 1,
            lastUpdated: new Date().toISOString(),
            packages: { other: { versions: [], 'dist-tags': {}, releases: {} } },
          })
        );
        store.objects.set('registry.json', {
          body,
          etag: '"concurrent-writer"',
          contentType: 'application/json',
        });
      }
      return {
        ...index,
        packages: {
          ...index.packages,
          winner: {
            versions: [],
            'dist-tags': { latest: '1.0.0' as never },
            releases: {},
          },
        },
      };
    });

    expect(attempts).toBeGreaterThan(1);
    expect(updated.packages.winner).toBeDefined();
  });
});
