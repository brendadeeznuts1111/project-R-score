// @see https://bun.sh/docs/runtime/file-io#reading-files-bunfile — Bun.file (mocked)
// @see https://bun.sh/docs/test/mocks#basic-function-mocks — bun:test mock
/**
 * registry.test.ts — RegistryClient: README auto-detect, checksum verification,
 * fetchReadme, fallback behavior.
 *
 * Mock strategy:
 *   - Replace `globalThis.fetch` at test scope to intercept R2 calls.
 *   - The RegistryClient is exercised without real R2 credentials.
 *   - We test the coordination logic (README detection, index updates).
 */

import { describe, expect, test, mock, beforeEach, afterEach } from 'bun:test';
import { RegistryClient, registry } from '../lib/factory/registry.ts';

// ── Helpers ────────────────────────────────────────────────────────────────

/** Build a fake R2 response. */
function r2Response(
  body: unknown,
  status = 200,
  etag?: string,
): Response {
  const headers = new Headers();
  if (etag) headers.set('etag', etag);
  if (status === 404) return new Response(null, { status: 404 });
  return new Response(JSON.stringify(body), {
    status,
    headers,
  });
}

/** Capture fetch calls made during a test. */
function captureFetch(
  handler: (url: string, init?: RequestInit) => Response | Promise<Response>,
): void {
  globalThis.fetch = mock((url: string, init?: RequestInit) => handler(url, init));
}

// ── RegistryClient mock helpers ────────────────────────────────────────────

/**
 * Create a fresh RegistryClient with an empty index for testing.
 * Sets up fetch to return an empty registry index first, then accept writes.
 */
function mockEmptyRegistry(): RegistryClient {
  const client = new RegistryClient();
  let currentIndex = {
    schemaVersion: 1 as const,
    lastUpdated: new Date().toISOString(),
    packages: {},
  };

  const handler = mock((url: string, init?: RequestInit) => {
    const urlStr = typeof url === 'string' ? url : String(url);

    // Artifact upload PUT — body is Blob, not JSON; return 200
    if (init?.method === 'PUT' && urlStr.includes('.tgz')) {
      return new Response(null, { status: 200 });
    }

    // GET / fetchIndex
    if (init?.method === undefined || init?.method === 'GET') {
      return r2Response(currentIndex, 200, '"etag-abc"');
    }

    // PUT / writeIndex (registry.json)
    if (init?.method === 'PUT') {
      const bodyText = typeof init?.body === 'string' ? init.body : '';
      currentIndex = JSON.parse(bodyText);
      return new Response(null, { status: 200 });
    }

    return new Response(null, { status: 404 });
  });

  globalThis.fetch = handler;
  return client;
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('RegistryClient — publish with README', () => {
  let originalBunFile: typeof Bun.file;

  beforeEach(() => {
    originalBunFile = Bun.file;
    // Mock Bun.file for README detection
    Bun.file = mock(() => ({
      exists: async () => false,
      text: async () => '',
    } as unknown as ReturnType<typeof Bun.file>));
  });

  afterEach(() => {
    Bun.file = originalBunFile;
  });

  test('publish with readme: true (auto-detect) when no README exists', async () => {
    const client = mockEmptyRegistry();

    // Mock Bun.file to return "not found"
    const existsMock = mock(async () => false);
    Bun.file = mock(() => ({ exists: existsMock, text: async () => '' }) as unknown as ReturnType<typeof Bun.file>);

    const release = await client.publish('test-lib', '1.0.0', new Blob(['data']), {
      type: 'library',
      readme: true,
    });

    expect(release.name).toBe('test-lib');
    expect(release.version).toBe('1.0.0');
    expect(release.readme).toBeUndefined(); // no README found
    expect(existsMock).toHaveBeenCalledTimes(1);
  });

  test('publish with readme: true auto-detects README.md', async () => {
    const client = mockEmptyRegistry();
    const readmeContent = '# Test Lib\n\nThis is a test.';

    Bun.file = mock(() => ({
      exists: async () => true,
      text: async () => readmeContent,
    }) as unknown as ReturnType<typeof Bun.file>);

    const release = await client.publish('test-lib', '1.0.0', new Blob(['data']), {
      type: 'library',
      readme: true,
    });

    expect(release.readme).toBe(readmeContent);
  });

  test('publish with readme: false skips detection', async () => {
    const client = mockEmptyRegistry();

    const readFileMock = mock(async () => 'should-not-be-called');
    Bun.file = mock(() => ({
      exists: readFileMock,
      text: readFileMock,
    }) as unknown as ReturnType<typeof Bun.file>);

    const release = await client.publish('test-lib', '1.0.0', new Blob(['data']), {
      type: 'library',
      readme: false,
    });

    expect(release.readme).toBeUndefined();
    expect(readFileMock).not.toHaveBeenCalled();
  });

  test('publish with explicit readme string', async () => {
    const client = mockEmptyRegistry();

    const release = await client.publish('test-lib', '1.0.0', new Blob(['data']), {
      type: 'library',
      readme: '# Explicit README',
    });

    expect(release.readme).toBe('# Explicit README');
  });

  test('publish without readme option defaults to auto-detect (no README)', async () => {
    const client = mockEmptyRegistry();

    Bun.file = mock(() => ({
      exists: async () => false,
      text: async () => '',
    }) as unknown as ReturnType<typeof Bun.file>);

    const release = await client.publish('test-lib', '1.0.0', new Blob(['data']), {
      type: 'library',
    });

    expect(release.readme).toBeUndefined();
  });

  test('publish without readme option auto-detects when README exists', async () => {
    const client = mockEmptyRegistry();

    Bun.file = mock(() => ({
      exists: async () => true,
      text: async () => '# Auto-detected README',
    }) as unknown as ReturnType<typeof Bun.file>);

    const release = await client.publish('test-lib', '1.0.0', new Blob(['data']), {
      type: 'library',
    });

    expect(release.readme).toBe('# Auto-detected README');
  });

  test('publish handles binary README without crashing', async () => {
    const client = mockEmptyRegistry();

    // Mock Bun.file where exists() returns true but text() throws (binary file)
    Bun.file = mock(() => ({
      exists: async () => true,
      text: async () => { throw new Error('Binary file'); },
    }) as unknown as ReturnType<typeof Bun.file>);

    const release = await client.publish('test-lib', '1.0.0', new Blob(['data']), {
      type: 'library',
    });

    // Should not crash — readme silently skipped
    expect(release.readme).toBeUndefined();
  });

  test('publish with empty README text', async () => {
    const client = mockEmptyRegistry();

    Bun.file = mock(() => ({
      exists: async () => true,
      text: async () => '',
    }) as unknown as ReturnType<typeof Bun.file>);

    const release = await client.publish('test-lib', '1.0.0', new Blob(['data']), {
      type: 'library',
    });

    expect(release.readme).toBe('');
  });
});

describe('RegistryClient — publish name validation', () => {
  test('rejects names with spaces', async () => {
    const client = mockEmptyRegistry();
    await expect(
      client.publish('bad name', '1.0.0', new Blob(['data']), { type: 'library' }),
    ).rejects.toThrow('Invalid artifact name');
  });

  test('rejects names with path traversal', async () => {
    const client = mockEmptyRegistry();
    await expect(
      client.publish('../etc/passwd', '1.0.0', new Blob(['data']), { type: 'library' }),
    ).rejects.toThrow('Invalid artifact name');
  });

  test('rejects names with special chars', async () => {
    const client = mockEmptyRegistry();
    await expect(
      client.publish('foo@bar', '1.0.0', new Blob(['data']), { type: 'library' }),
    ).rejects.toThrow('Invalid artifact name');
  });

  test('accepts valid names: alphanumeric, hyphen, underscore', async () => {
    const client = mockEmptyRegistry();
    const release = await client.publish('my-valid_lib', '1.0.0', new Blob(['data']), {
      type: 'library',
    });
    expect(release.name).toBe('my-valid_lib');
  });
});

describe('RegistryClient — publish duplicate version', () => {
  test('overwrites existing version in index', async () => {
    const client = mockEmptyRegistry();

    // Publish version 1.0.0 once
    const r1 = await client.publish('dup-lib', '1.0.0', new Blob(['v1']), {
      type: 'library',
      description: 'first',
    });
    expect(r1.description).toBe('first');

    // Publish the same version again
    const r2 = await client.publish('dup-lib', '1.0.0', new Blob(['v2']), {
      type: 'library',
      description: 'second',
    });
    expect(r2.description).toBe('second');

    // List should show one version (not duplicated in versions array)
    const info = await client.list('dup-lib');
    expect(info).toBeDefined();
    expect(info!.versions.length).toBe(1);
  });
});

describe('RegistryClient — fetchReadme', () => {
  test('returns readme for an existing release', async () => {
    const client = new RegistryClient();

    // Seed the registry with a package that has a readme
    const seededIndex = {
      schemaVersion: 1 as const,
      lastUpdated: new Date().toISOString(),
      packages: {
        'my-pkg': {
          versions: ['1.0.0'],
          'dist-tags': { latest: '1.0.0' },
          releases: {
            '1.0.0': {
              id: 'my-pkg@1.0.0',
              name: 'my-pkg',
              version: '1.0.0',
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
    };

    globalThis.fetch = mock((url: string, init?: RequestInit) => {
      return r2Response(seededIndex, 200, '"etag-xyz"');
    });

    const readme = await client.fetchReadme('my-pkg', 'latest');
    expect(readme).toBe('# My Package\n\nHello world.');
  });

  test('returns undefined for non-existent package', async () => {
    const client = new RegistryClient();

    globalThis.fetch = mock(() => r2Response({
      schemaVersion: 1,
      lastUpdated: new Date().toISOString(),
      packages: {},
    }, 200, '"etag-empty"'));

    const readme = await client.fetchReadme('no-such-pkg', 'latest');
    expect(readme).toBeUndefined();
  });

  test('returns undefined when release has no readme', async () => {
    const client = new RegistryClient();

    const seededIndex = {
      schemaVersion: 1 as const,
      lastUpdated: new Date().toISOString(),
      packages: {
        'bare-pkg': {
          versions: ['1.0.0'],
          'dist-tags': { latest: '1.0.0' },
          releases: {
            '1.0.0': {
              id: 'bare-pkg@1.0.0',
              name: 'bare-pkg',
              version: '1.0.0',
              type: 'library',
              publishedAt: new Date().toISOString(),
              publisher: 'test',
              // no readme field
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
    };

    globalThis.fetch = mock(() => r2Response(seededIndex, 200, '"etag-bare"'));

    const readme = await client.fetchReadme('bare-pkg', 'latest');
    expect(readme).toBeUndefined();
  });
});

describe('RegistryClient — checksum verification (install)', () => {
  test('install verifies checksum and throws on mismatch', async () => {
    const client = new RegistryClient();

    const seededIndex = {
      schemaVersion: 1 as const,
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
    };

    const data = new Uint8Array([0x00, 0x01, 0x02, 0x03]);
    let callCount = 0;

    globalThis.fetch = mock((url: string, init?: RequestInit) => {
      if (callCount === 0) {
        callCount++;
        return r2Response(seededIndex, 200, '"etag-c"'); // fetchIndex
      }
      return new Response(data, { status: 200 }); // download
    });

    await expect(
      client.install('corrupt-pkg', 'latest'),
    ).rejects.toThrow('Checksum mismatch');
  });

  test('install succeeds when checksum matches', async () => {
    const client = new RegistryClient();

    // SHA-256 of [0x00, 0x01, 0x02, 0x03]
    const data = new Uint8Array([0x00, 0x01, 0x02, 0x03]);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashHex = [...new Uint8Array(hashBuffer)].map(b => b.toString(16).padStart(2, '0')).join('');

    const seededIndex = {
      schemaVersion: 1 as const,
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
    };

    let callCount = 0;
    globalThis.fetch = mock((url: string, init?: RequestInit) => {
      if (callCount === 0) {
        callCount++;
        return r2Response(seededIndex, 200, '"etag-g"');
      }
      return new Response(data, { status: 200 });
    });

    const result = await client.install('good-pkg', 'latest');
    expect(result).toBeDefined();
    expect(result!.release.name).toBe('good-pkg');
  });
});
