import { describe, expect, it } from 'bun:test';
import {
  FACTORY_WAGER_NPM_READ_URL,
  fetchRegistryReadTokenless,
  parseLocalRegistryWriteUrl,
  prepareLocalRegistryWrite,
  resolveLocalRegistryWriteUrl,
  resolveRegistryReadUrl,
  tokenlessRegistryReadInit,
} from './registry-planes';

describe('registry runtime planes', () => {
  it('defaults public metadata reads to the canonical tokenless npm endpoint', () => {
    expect(resolveRegistryReadUrl({ env: {} })).toBe(FACTORY_WAGER_NPM_READ_URL);
    const init = tokenlessRegistryReadInit();
    expect(init.credentials).toBe('omit');
    expect(new Headers(init.headers).has('authorization')).toBe(false);
  });

  it('rejects remote metadata reads that bypass the canonical npm path', () => {
    expect(() =>
      resolveRegistryReadUrl({
        explicit: 'https://registry.factory-wager.com',
        env: {},
      })
    ).toThrow('or an HTTP loopback URL');
    expect(() =>
      resolveRegistryReadUrl({ explicit: 'https://registry.example.com', env: {} })
    ).toThrow('or an HTTP loopback URL');
    expect(
      resolveRegistryReadUrl({ explicit: 'http://localhost:4873', env: {} })
    ).toBe('http://localhost:4873');
  });

  it('rejects the public read endpoint as a write destination before reading credentials', () => {
    let credentialReads = 0;
    expect(() =>
      prepareLocalRegistryWrite(
        { explicit: FACTORY_WAGER_NPM_READ_URL, env: {} },
        () => ++credentialReads
      )
    ).toThrow('credential-free HTTP loopback');
    expect(credentialReads).toBe(0);
  });

  it('rejects arbitrary remote writes before reading credentials', () => {
    for (const destination of ['https://registry.example.com', 'http://registry.example.com']) {
      let credentialReads = 0;
      expect(() =>
        prepareLocalRegistryWrite({ explicit: destination, env: {} }, () => ++credentialReads)
      ).toThrow('credential-free HTTP loopback');
      expect(credentialReads).toBe(0);
    }
  });

  it('accepts only explicit credential-free HTTP loopback writes', () => {
    expect(parseLocalRegistryWriteUrl('http://localhost:4873/')).toBe(
      'http://localhost:4873'
    );
    expect(parseLocalRegistryWriteUrl('http://127.0.0.1:4873')).toBe(
      'http://127.0.0.1:4873'
    );
    expect(() => parseLocalRegistryWriteUrl('https://localhost:4873')).toThrow();
    expect(() => parseLocalRegistryWriteUrl('http://user:pass@localhost:4873')).toThrow();
  });

  it('keeps legacy REGISTRY_URL warning-only for reads and fail-closed for writes', () => {
    const warnings: string[] = [];
    expect(
      resolveRegistryReadUrl({
        env: { REGISTRY_URL: 'http://localhost:9999' },
        warn: message => warnings.push(message),
      })
    ).toBe(FACTORY_WAGER_NPM_READ_URL);
    expect(() =>
      resolveLocalRegistryWriteUrl({
        env: { REGISTRY_URL: 'http://localhost:9999' },
        warn: message => warnings.push(message),
      })
    ).toThrow('require --write-registry');
    expect(warnings).toHaveLength(2);
  });

  it('rejects credential forwarding before fetch', () => {
    let fetchCalls = 0;
    const fetcher = (() => {
      fetchCalls++;
      return Promise.resolve(new Response(null, { status: 200 }));
    }) as typeof fetch;

    expect(() =>
      fetchRegistryReadTokenless(
        FACTORY_WAGER_NPM_READ_URL,
        { headers: { Authorization: 'Bearer secret' } },
        fetcher
      )
    ).toThrow('must not forward authorization credentials');
    expect(() =>
      fetchRegistryReadTokenless('https://user:secret@registry.example/package.tgz', {}, fetcher)
    ).toThrow('must not forward URL credentials');
    expect(fetchCalls).toBe(0);
  });

  it('routes CLI writes through the guard and bunx reads through tokenless fetch', async () => {
    const cliSource = await Bun.file(
      new URL('../apps/cli/src/cli.ts', import.meta.url)
    ).text();
    const bunxSource = await Bun.file(
      new URL('../packages/bunx/src/index.ts', import.meta.url)
    ).text();

    expect(cliSource).toContain('prepareLocalRegistryWrite');
    expect(cliSource.match(/redirect: 'error'/g)?.length).toBe(3);
    expect(cliSource).not.toContain('process.env.REGISTRY_URL');
    expect(cliSource).not.toContain('//registry.factory-wager.com/:_authToken');
    expect(bunxSource).not.toContain('RegistrySecretsManager');
    expect(bunxSource).not.toContain('R2StorageAdapter');
    expect(bunxSource).not.toContain('process.env.REGISTRY_URL');
    expect(bunxSource).not.toContain("'Authorization'");
    expect(bunxSource.match(/fetchRegistryReadTokenless/g)?.length).toBeGreaterThanOrEqual(4);
  });
});
