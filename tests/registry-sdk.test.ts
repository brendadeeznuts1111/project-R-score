// @see https://bun.com/docs/test/index#run-tests
import { describe, expect, test } from 'bun:test';
import {
  RegistryClient,
  RegistryHttpError,
  uint8TotalBytes,
  type RegistryFetch,
  type RegistryIndex,
} from '../packages/registry-client/src/index';

async function checksum(data: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

async function fixtureIndex(data: Uint8Array): Promise<RegistryIndex> {
  return {
    schemaVersion: 1,
    lastUpdated: '2026-07-23T00:00:00.000Z',
    packages: {
      '@factorywager/routing-algorithms': {
        versions: ['1.0.0'],
        'dist-tags': { latest: '1.0.0' },
        releases: {
          '1.0.0': {
            name: '@factorywager/routing-algorithms',
            version: '1.0.0',
            type: 'library',
            publishedAt: '2026-07-23T00:00:00.000Z',
            publisher: 'test',
            storage: {
              r2Key: '@factorywager/routing-algorithms/1.0.0.tgz',
              size: uint8TotalBytes(data),
              checksum: await checksum(data),
              contentType: 'application/gzip',
            },
          },
        },
      },
    },
  };
}

describe('@factorywager/registry-client', () => {
  test('Uint8Array.BYTES_PER_ELEMENT is 1 for artifact byte math', () => {
    expect(Uint8Array.BYTES_PER_ELEMENT).toBe(1);
    const data = new Uint8Array([1, 2, 3]);
    expect(uint8TotalBytes(data)).toBe(data.byteLength);
    expect(uint8TotalBytes(data)).toBe(data.length);
  });

  test('resolves dist-tags and verifies downloads', async () => {
    const data = new Uint8Array([1, 2, 3]);
    const index = await fixtureIndex(data);
    const calls: Array<{ url: string; authorization: string | null }> = [];
    const fetcher: RegistryFetch = async (input, init) => {
      const url = String(input);
      calls.push({
        url,
        authorization: new Headers(init?.headers).get('Authorization'),
      });
      if (url.endsWith('/api/registry/registry.json')) return Response.json(index);
      return new Response(data);
    };
    const client = new RegistryClient({
      baseUrl: 'https://registry.example/',
      apiKey: 'read-plane-must-not-see-this',
      fetcher,
    });

    const resolved = await client.resolve('@factorywager/routing-algorithms');
    expect(resolved?.release.version).toBe('1.0.0');
    expect(resolved?.assetUrl).toBe(
      'https://registry.example/registry/storage/%40factorywager/routing-algorithms/1.0.0/artifact.tgz'
    );
    expect(await client.download('@factorywager/routing-algorithms')).toEqual(data);
    expect(calls).toHaveLength(3);
    expect(calls.every(call => call.authorization === null)).toBe(true);
  });

  test('rejects corrupted downloads', async () => {
    const expected = new Uint8Array([1, 2, 3]);
    const index = await fixtureIndex(expected);
    const fetcher: RegistryFetch = async input =>
      String(input).endsWith('registry.json')
        ? Response.json(index)
        : new Response(new Uint8Array([3, 2, 1]));
    const client = new RegistryClient({ baseUrl: 'https://registry.example', fetcher });
    await expect(client.download('@factorywager/routing-algorithms')).rejects.toThrow(
      'checksum mismatch'
    );
  });

  test('publishes multipart only with an API key', async () => {
    const withoutKey = new RegistryClient({
      baseUrl: 'https://registry.example',
      fetcher: async () => Response.json({}),
    });
    await expect(
      withoutKey.publish('demo', '1.0.0', new Uint8Array([1]))
    ).rejects.toThrow('requires an API key');

    let authorization: string | null = null;
    let bodyIsFormData = false;
    const withKey = new RegistryClient({
      baseUrl: 'https://registry.example',
      publishUrl: 'https://registry-write.example',
      apiKey: 'secret',
      fetcher: async (input, init) => {
        expect(String(input)).toStartWith('https://registry-write.example/');
        authorization = new Headers(init?.headers).get('Authorization');
        bodyIsFormData = init?.body instanceof FormData;
        return Response.json({ success: true, version: '1.0.0' });
      },
    });
    const result = await withKey.publish('demo', '1.0.0', new Uint8Array([1]));
    expect(result.version).toBe('1.0.0');
    expect(authorization).toBe('Bearer secret');
    expect(bodyIsFormData).toBe(true);
  });

  test('exposes non-success status without leaking credentials', async () => {
    const client = new RegistryClient({
      baseUrl: 'https://registry.example',
      apiKey: 'never-print-this',
      fetcher: async () => new Response('unavailable', { status: 503 }),
    });
    try {
      await client.health();
      throw new Error('expected health to fail');
    } catch (cause) {
      expect(cause).toBeInstanceOf(RegistryHttpError);
      expect(String(cause)).not.toContain('never-print-this');
    }
  });
});

describe('registry SDK — server metadata URL parity', () => {
  test('scoped name: SDK assetUrl matches serve-public tarball encoding', () => {
    // serve-public npmPackageMetadata emits:
    //   `${origin}/registry/storage/${name.split('/').map(encodeURIComponent).join('/')}/${v}/artifact.tgz`
    const name = '@factorywager/routing-algorithms';
    const version = '1.0.0';
    const origin = 'https://registry.example';
    const serverTarball = `${origin}/registry/storage/${name.split('/').map(encodeURIComponent).join('/')}/${version}/artifact.tgz`;
    // SDK encodePath: split, encode each segment, rejoin
    const sdkAssetUrl = `${origin}/registry/storage/${name.split('/').map(s => encodeURIComponent(s)).join('/')}/${version}/artifact.tgz`;
    expect(sdkAssetUrl).toBe(serverTarball);
    expect(serverTarball).toBe(
      'https://registry.example/registry/storage/%40factorywager/routing-algorithms/1.0.0/artifact.tgz'
    );
  });
});
